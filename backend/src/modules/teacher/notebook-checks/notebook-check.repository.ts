import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';
import { requireAssignedSubjectForMutation } from '../access/teacher-subject.policy.js';
import type {
  CreateNotebookCheckInput,
  FinalizeSubmissionInput,
  UpdateNotebookCheckInput,
} from './notebook-check.schemas.js';

async function lockActivityRow(tx: Prisma.TransactionClient, activityId: string): Promise<void> {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id"
    FROM "activities"
    WHERE "id" = ${activityId}::uuid
    FOR UPDATE
  `);
}

async function lockPeriodRow(tx: Prisma.TransactionClient, periodId: string): Promise<void> {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id"
    FROM "notebook_check_periods"
    WHERE "id" = ${periodId}::uuid
    FOR UPDATE
  `);
}

async function lockSubmissionRow(tx: Prisma.TransactionClient, submissionId: string): Promise<void> {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id"
    FROM "notebook_submissions"
    WHERE "id" = ${submissionId}::uuid
    FOR UPDATE
  `);
}

export const notebookCheckRepository = {
  async listNotebookChecks(classroomSubjectId: string) {
    return prisma.activity.findMany({
      where: {
        classroom_subject_id: classroomSubjectId,
        kind: 'NOTEBOOK_CHECK',
      },
      orderBy: { created_at: 'desc' },
      include: {
        notebookCheck: {
          include: {
            _count: {
              select: {
                referenceFiles: true,
                criteria: true,
                periods: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });
  },

  async findNotebookCheckById(
    activityId: string,
    client: Pick<Prisma.TransactionClient, 'activity'> = prisma
  ) {
    return client.activity.findUnique({
      where: { id: activityId },
      include: {
        notebookCheck: {
          include: {
            referenceFiles: {
              orderBy: { sort_order: 'asc' },
              select: {
                id: true,
                mime_type: true,
                byte_size: true,
                sort_order: true,
              },
            },
            criteria: {
              orderBy: { order_index: 'asc' },
            },
            periods: {
              orderBy: { period_no: 'asc' },
              include: {
                _count: {
                  select: { submissions: true },
                },
              },
            },
          },
        },
        classroomSubject: {
          include: {
            classroom: true,
            subject: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });
  },

  async createNotebookCheckAtomically(
    actorId: string,
    classroomSubjectId: string,
    input: CreateNotebookCheckInput
  ) {
    return prisma.$transaction(async (tx) => {
      await requireAssignedSubjectForMutation(tx, actorId, classroomSubjectId);

      const activity = await tx.activity.create({
        data: {
          classroom_subject_id: classroomSubjectId,
          created_by_id: actorId,
          kind: 'NOTEBOOK_CHECK',
          title: input.title,
          description: input.description ?? '',
          status: 'DRAFT',
          published_at: null,
          closes_at: input.closesAt ? new Date(input.closesAt) : null,
        },
      });

      await tx.notebookCheckActivity.create({
        data: {
          activity_id: activity.id,
          criteria_locked_at: null,
        },
      });

      return this.findNotebookCheckById(activity.id, tx);
    });
  },

  async updateNotebookCheckAtomically(
    actorId: string,
    activityId: string,
    input: UpdateNotebookCheckInput
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.activity.findUnique({
        where: { id: activityId },
      });

      if (existing?.kind !== 'NOTEBOOK_CHECK') {
        throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
      }

      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      await tx.activity.update({
        where: { id: activityId },
        data: {
          title: input.title !== undefined ? input.title : existing.title,
          description: input.description !== undefined ? input.description : existing.description,
          closes_at:
            input.closesAt !== undefined
              ? input.closesAt
                ? new Date(input.closesAt)
                : null
              : existing.closes_at,
        },
      });

      return this.findNotebookCheckById(activityId, tx);
    });
  },

  async deleteNotebookCheckAtomically(actorId: string, activityId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.activity.findUnique({
        where: { id: activityId },
        include: {
          notebookCheck: true,
        },
      });

      if (existing?.kind !== 'NOTEBOOK_CHECK') {
        throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
      }

      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      if (existing.notebookCheck?.criteria_locked_at) {
        throw new ConflictError(
          'Không thể xóa hoạt động kiểm tra vở đã khóa tiêu chí hoặc đã có bài nộp'
        );
      }

      const submissionCount = await tx.notebookSubmission.count({
        where: {
          period: {
            activity_id: activityId,
          },
        },
      });

      if (submissionCount > 0) {
        throw new ConflictError(
          'Không thể xóa hoạt động kiểm tra vở đã có bài nộp của học sinh'
        );
      }

      // Unlink calendar events
      await tx.scheduleEvent.updateMany({
        where: { activity_id: activityId },
        data: { activity_id: null },
      });

      // Delete reference files, criteria, periods, and notebook check
      const refFiles = await tx.notebookReferenceFile.findMany({
        where: { activity_id: activityId },
        select: { storage_key: true },
      });

      await tx.notebookReferenceFile.deleteMany({
        where: { activity_id: activityId },
      });

      await tx.notebookCriterion.deleteMany({
        where: { activity_id: activityId },
      });

      await tx.notebookCheckPeriod.deleteMany({
        where: { activity_id: activityId },
      });

      await tx.notification.deleteMany({
        where: { activity_id: activityId },
      });

      await tx.notebookCheckActivity.delete({
        where: { activity_id: activityId },
      });

      await tx.activity.delete({
        where: { id: activityId },
      });

      return {
        success: true,
        orphanedStorageKeys: refFiles.map((f) => f.storage_key),
      };
    });
  },

  async putCriteriaAtomically(
    actorId: string,
    activityId: string,
    criteria: Array<{ content: string }>
  ) {
    return prisma.$transaction(async (tx) => {
      await lockActivityRow(tx, activityId);

      const existing = await tx.activity.findUnique({
        where: { id: activityId },
        include: { notebookCheck: true },
      });

      if (existing?.kind !== 'NOTEBOOK_CHECK') {
        throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
      }

      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      if (existing.notebookCheck?.criteria_locked_at) {
        throw new ConflictError(
          'Không thể chỉnh sửa tiêu chí vì hoạt động đã bị khóa tiêu chí (đã có bài nộp)'
        );
      }

      // Replace criteria
      await tx.notebookCriterion.deleteMany({
        where: { activity_id: activityId },
      });

      for (let i = 0; i < criteria.length; i++) {
        await tx.notebookCriterion.create({
          data: {
            activity_id: activityId,
            content: criteria[i].content,
            order_index: i + 1,
          },
        });
      }

      return this.findNotebookCheckById(activityId, tx);
    });
  },

  async addReferenceFileAtomically(
    actorId: string,
    activityId: string,
    data: { storageKey: string; mimeType: string; byteSize: number }
  ) {
    return prisma.$transaction(async (tx) => {
      await lockActivityRow(tx, activityId);

      const existing = await tx.activity.findUnique({
        where: { id: activityId },
        include: { notebookCheck: true },
      });

      if (existing?.kind !== 'NOTEBOOK_CHECK') {
        throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
      }

      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      if (existing.notebookCheck?.criteria_locked_at) {
        throw new ConflictError(
          'Không thể thêm ảnh mẫu vì hoạt động đã khóa tiêu chí (đã có bài nộp)'
        );
      }

      const count = await tx.notebookReferenceFile.count({
        where: { activity_id: activityId },
      });

      if (count >= 5) {
        throw new BadRequestError('Mỗi hoạt động kiểm tra vở chỉ được đính kèm tối đa 5 ảnh mẫu');
      }

      const created = await tx.notebookReferenceFile.create({
        data: {
          activity_id: activityId,
          storage_key: data.storageKey,
          mime_type: data.mimeType,
          byte_size: BigInt(data.byteSize),
          sort_order: count + 1,
        },
      });

      return {
        id: created.id,
        activity_id: created.activity_id,
        mime_type: created.mime_type,
        byte_size: Number(created.byte_size),
        sort_order: created.sort_order,
      };
    });
  },

  async deleteReferenceFileAtomically(actorId: string, activityId: string, fileId: string) {
    return prisma.$transaction(async (tx) => {
      await lockActivityRow(tx, activityId);

      const existing = await tx.activity.findUnique({
        where: { id: activityId },
        include: { notebookCheck: true },
      });

      if (existing?.kind !== 'NOTEBOOK_CHECK') {
        throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
      }

      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      if (existing.notebookCheck?.criteria_locked_at) {
        throw new ConflictError(
          'Không thể xóa ảnh mẫu vì hoạt động đã khóa tiêu chí (đã có bài nộp)'
        );
      }

      const file = await tx.notebookReferenceFile.findUnique({
        where: { id: fileId },
      });

      if (!file || file.activity_id !== activityId) {
        throw new NotFoundError('Không tìm thấy ảnh mẫu');
      }

      await tx.notebookReferenceFile.delete({
        where: { id: fileId },
      });

      // Reorder remaining files to be strictly sequential
      const remaining = await tx.notebookReferenceFile.findMany({
        where: { activity_id: activityId },
        orderBy: { sort_order: 'asc' },
      });

      for (let i = 0; i < remaining.length; i++) {
        await tx.notebookReferenceFile.update({
          where: { id: remaining[i].id },
          data: { sort_order: i + 1 },
        });
      }

      return { storageKey: file.storage_key };
    });
  },

  async findReferenceFileForDownload(activityId: string, fileId: string) {
    return prisma.notebookReferenceFile.findFirst({
      where: {
        id: fileId,
        activity_id: activityId,
      },
      select: {
        storage_key: true,
        mime_type: true,
        activity: {
          select: {
            activity: {
              select: { classroom_subject_id: true },
            },
          },
        },
      },
    });
  },

  async publishNotebookCheckAtomically(actorId: string, activityId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.activity.findUnique({
        where: { id: activityId },
        include: {
          notebookCheck: {
            include: {
              _count: {
                select: { referenceFiles: true, criteria: true },
              },
            },
          },
        },
      });

      if (existing?.kind !== 'NOTEBOOK_CHECK' || !existing.notebookCheck) {
        throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
      }

      const context = await requireAssignedSubjectForMutation(
        tx,
        actorId,
        existing.classroom_subject_id
      );

      if (existing.notebookCheck._count.referenceFiles === 0) {
        throw new BadRequestError('Hoạt động phải có ít nhất 1 ảnh mẫu trước khi xuất bản');
      }

      if (existing.notebookCheck._count.criteria === 0) {
        throw new BadRequestError('Hoạt động phải có ít nhất 1 tiêu chí trước khi xuất bản');
      }

      const now = new Date();
      await tx.activity.update({
        where: { id: activityId },
        data: {
          status: 'PUBLISHED',
          published_at: existing.published_at ?? now,
        },
      });

      const activeEnrollments = await tx.classroomEnrollment.findMany({
        where: {
          classroom_id: context.classroomId,
          left_at: null,
        },
        select: { student_id: true },
      });

      if (activeEnrollments.length > 0) {
        const dedupeKey = `activity:${activityId}`;
        const title = `Kiểm tra vở mới: ${existing.title}`;
        const body = `Giáo viên đã công bố hoạt động kiểm tra vở "${existing.title}" môn ${context.subjectName}.`;

        await tx.notification.createMany({
          data: activeEnrollments.map((enr) => ({
            recipient_id: enr.student_id,
            activity_id: activityId,
            dedupe_key: dedupeKey,
            title,
            body,
          })),
          skipDuplicates: true,
        });
      }

      return this.findNotebookCheckById(activityId, tx);
    });
  },

  async findOpenPeriod(
    activityId: string,
    client: Pick<Prisma.TransactionClient, 'notebookCheckPeriod'> = prisma
  ) {
    return client.notebookCheckPeriod.findFirst({
      where: {
        activity_id: activityId,
        closed_at: null,
      },
    });
  },

  async createPeriodAtomically(actorId: string, activityId: string, dueAt: Date) {
    return prisma.$transaction(async (tx) => {
      await lockActivityRow(tx, activityId);

      const existing = await tx.activity.findUnique({
        where: { id: activityId },
      });

      if (existing?.kind !== 'NOTEBOOK_CHECK') {
        throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
      }

      await requireAssignedSubjectForMutation(tx, actorId, existing.classroom_subject_id);

      // Invariant: only one open period at a time
      const openPeriod = await this.findOpenPeriod(activityId, tx);
      if (openPeriod) {
        throw new ConflictError(
          `Hoạt động hiện đang có một kỳ nộp chưa đóng (kỳ số ${openPeriod.period_no})`
        );
      }

      const highestPeriod = await tx.notebookCheckPeriod.findFirst({
        where: { activity_id: activityId },
        orderBy: { period_no: 'desc' },
        select: { period_no: true },
      });

      const nextPeriodNo = (highestPeriod?.period_no ?? 0) + 1;

      return tx.notebookCheckPeriod.create({
        data: {
          activity_id: activityId,
          period_no: nextPeriodNo,
          opened_at: new Date(),
          due_at: dueAt,
          closed_at: null,
        },
        include: {
          _count: {
            select: { submissions: true },
          },
        },
      });
    });
  },

  async findPeriodById(
    periodId: string,
    client: Pick<Prisma.TransactionClient, 'notebookCheckPeriod'> = prisma
  ) {
    return client.notebookCheckPeriod.findUnique({
      where: { id: periodId },
      include: {
        activity: {
          include: {
            activity: true,
            criteria: {
              orderBy: { order_index: 'asc' },
            },
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });
  },

  async closePeriodAtomically(actorId: string, periodId: string) {
    return prisma.$transaction(async (tx) => {
      await lockPeriodRow(tx, periodId);

      const period = await tx.notebookCheckPeriod.findUnique({
        where: { id: periodId },
        include: {
          activity: {
            include: {
              activity: true,
            },
          },
        },
      });

      if (!period) {
        throw new NotFoundError('Không tìm thấy kỳ nộp bài');
      }

      await requireAssignedSubjectForMutation(
        tx,
        actorId,
        period.activity.activity.classroom_subject_id
      );

      // If already closed, return idempotently
      if (period.closed_at) {
        return period;
      }

      const now = new Date();
      const updatedPeriod = await tx.notebookCheckPeriod.update({
        where: { id: periodId },
        data: {
          closed_at: now,
        },
      });

      // Invariant: closing a period locks all its CURRENT submissions to LOCKED in the same transaction
      await tx.notebookSubmission.updateMany({
        where: {
          period_id: periodId,
          status: 'CURRENT',
        },
        data: {
          status: 'LOCKED',
          locked_at: now,
        },
      });

      return updatedPeriod;
    });
  },

  async listPeriods(activityId: string) {
    return prisma.notebookCheckPeriod.findMany({
      where: { activity_id: activityId },
      orderBy: { period_no: 'asc' },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });
  },

  async listSubmissionsByPeriod(periodId: string) {
    return prisma.notebookSubmission.findMany({
      where: { period_id: periodId },
      orderBy: { submitted_at: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            full_name: true,
            username: true,
          },
        },
        files: {
          orderBy: { sort_order: 'asc' },
          select: {
            id: true,
            mime_type: true,
            byte_size: true,
            sort_order: true,
          },
        },
        assessment: {
          include: {
            results: true,
          },
        },
      },
    });
  },

  async findSubmissionForReview(
    submissionId: string,
    client: Pick<Prisma.TransactionClient, 'notebookSubmission'> = prisma
  ) {
    return client.notebookSubmission.findUnique({
      where: { id: submissionId },
      include: {
        period: {
          include: {
            activity: {
              include: {
                activity: true,
                criteria: {
                  orderBy: { order_index: 'asc' },
                },
              },
            },
          },
        },
        files: {
          orderBy: { sort_order: 'asc' },
        },
        aiDraft: true,
        assessment: {
          include: {
            results: {
              include: {
                criterion: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            full_name: true,
            username: true,
          },
        },
      },
    });
  },

  async findSubmissionFileForDownload(submissionId: string, fileId: string) {
    return prisma.notebookSubmissionFile.findFirst({
      where: {
        id: fileId,
        submission_id: submissionId,
      },
      select: {
        storage_key: true,
        mime_type: true,
        submission: {
          select: {
            period: {
              select: {
                activity: {
                  select: {
                    activity: {
                      select: { classroom_subject_id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async startSubmissionAnalysis(
    actorId: string,
    submissionId: string,
    attemptId: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const submission = await this.findSubmissionForReview(submissionId, tx);
      if (!submission) {
        throw new NotFoundError('Không tìm thấy bài nộp');
      }

      await requireAssignedSubjectForMutation(
        tx,
        actorId,
        submission.period.activity.activity.classroom_subject_id
      );

      const result = await tx.notebookSubmission.updateMany({
        where: {
          id: submissionId,
          status: 'LOCKED',
        },
        data: {
          processing_status: 'PROCESSING',
          analysis_attempt_id: attemptId,
        },
      });

      if (result.count === 0) {
        throw new ConflictError('Bài nộp đang được phân tích hoặc không còn ở trạng thái LOCKED');
      }
    });
  },

  async markSubmissionAnalysisFailed(
    actorId: string,
    submissionId: string,
    attemptId: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const submission = await tx.notebookSubmission.findUnique({
        where: { id: submissionId },
        include: {
          period: {
            include: {
              activity: {
                include: { activity: true },
              },
            },
          },
        },
      });

      if (!submission) {
        return;
      }

      await requireAssignedSubjectForMutation(
        tx,
        actorId,
        submission.period.activity.activity.classroom_subject_id
      );

      await tx.notebookSubmission.updateMany({
        where: {
          id: submissionId,
          processing_status: 'PROCESSING',
          analysis_attempt_id: attemptId,
        },
        data: { processing_status: 'FAILED' },
      });
    });
  },

  async saveAiDraftAtomically(
    actorId: string,
    submissionId: string,
    attemptId: string,
    draft: { ocrText?: string; suggestions: Prisma.InputJsonValue }
  ) {
    return prisma.$transaction(async (tx) => {
      const submission = await tx.notebookSubmission.findUnique({
        where: { id: submissionId },
        include: {
          period: {
            include: {
              activity: {
                include: { activity: true },
              },
            },
          },
        },
      });

      if (!submission) {
        return null;
      }

      await requireAssignedSubjectForMutation(
        tx,
        actorId,
        submission.period.activity.activity.classroom_subject_id
      );

      const statusUpdate = await tx.notebookSubmission.updateMany({
        where: {
          id: submissionId,
          processing_status: 'PROCESSING',
          analysis_attempt_id: attemptId,
        },
        data: { processing_status: 'PROCESSED' },
      });

      if (statusUpdate.count === 0) {
        return null;
      }

      const saved = await tx.notebookAIDraft.upsert({
        where: { submission_id: submissionId },
        create: {
          submission_id: submissionId,
          ocr_text: draft.ocrText || null,
          suggestions: draft.suggestions,
        },
        update: {
          ocr_text: draft.ocrText || null,
          suggestions: draft.suggestions,
          generated_at: new Date(),
        },
      });

      return saved;
    });
  },

  async finalizeSubmissionAtomically(
    actorId: string,
    submissionId: string,
    input: FinalizeSubmissionInput
  ) {
    return prisma.$transaction(async (tx) => {
      const initialSubmission = await this.findSubmissionForReview(submissionId, tx);

      if (!initialSubmission) {
        throw new NotFoundError('Không tìm thấy bài nộp');
      }

      await requireAssignedSubjectForMutation(
        tx,
        actorId,
        initialSubmission.period.activity.activity.classroom_subject_id
      );

      await lockSubmissionRow(tx, submissionId);
      const submission = await this.findSubmissionForReview(submissionId, tx);

      if (!submission) {
        throw new NotFoundError('Không tìm thấy bài nộp');
      }

      // Invariant: Only LOCKED submissions can be finalized
      if (submission.status !== 'LOCKED' && submission.status !== 'FINALIZED') {
        throw new ConflictError(
          'Chỉ có thể chốt đánh giá cho bài nộp đã bị khóa (LOCKED)'
        );
      }

      const criterionIds = submission.period.activity.criteria.map((criterion) => criterion.id);
      const submittedCriterionIds = new Set(input.results.map((result) => result.criterionId));
      if (
        input.results.length !== criterionIds.length ||
        submittedCriterionIds.size !== input.results.length ||
        criterionIds.some((criterionId) => !submittedCriterionIds.has(criterionId))
      ) {
        throw new BadRequestError(
          'Kết quả đánh giá phải có đúng một dòng cho mỗi tiêu chí của hoạt động'
        );
      }

      // If already finalized, check idempotency
      if (submission.status === 'FINALIZED' && submission.assessment) {
        const existingResults = submission.assessment.results;
        const matchesOverallComment =
          (submission.assessment.teacher_comment ?? null) ===
          (input.teacherComment ?? null);

        let matchesResults = existingResults.length === input.results.length;
        if (matchesResults) {
          for (const item of input.results) {
            const matched = existingResults.find((r) => r.criterion_id === item.criterionId);
            if (!matched || matched.status !== item.status || (matched.note ?? null) !== (item.note ?? null)) {
              matchesResults = false;
              break;
            }
          }
        }

        if (matchesOverallComment && matchesResults) {
          return submission.assessment;
        }

        throw new ConflictError(
          'Bài nộp đã được chốt đánh giá trước đó với kết quả khác; không thể ghi đè'
        );
      }

      const now = new Date();
      const assessment = await tx.notebookAssessment.create({
        data: {
          submission_id: submissionId,
          evaluator_id: actorId,
          teacher_comment: input.teacherComment ?? null,
          reviewed_at: now,
        },
      });

      for (const res of input.results) {
        await tx.criterionResult.create({
          data: {
            assessment_id: assessment.id,
            criterion_id: res.criterionId,
            status: res.status,
            note: res.note ?? null,
          },
        });
      }

      await tx.notebookSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'FINALIZED',
          locked_at: submission.locked_at ?? now,
        },
      });

      return tx.notebookAssessment.findUnique({
        where: { id: assessment.id },
        include: {
          results: {
            include: {
              criterion: true,
            },
          },
        },
      });
    });
  },
};
