import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { AppError, BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';
import { checkFileSignature, generateStorageKey } from '../../storage/file-validation.js';
import type { StorageProvider } from '../../storage/storage-provider.js';
import { requireAssignedSubject } from '../access/teacher-subject.policy.js';
import {
  notebookAiProvider,
  type AiAnalysisResult,
} from './notebook-ai-analysis.provider.js';
import { notebookCheckRepository } from './notebook-check.repository.js';
import type {
  CreateNotebookCheckInput,
  CreatePeriodInput,
  FinalizeSubmissionInput,
  PutCriteriaInput,
  UpdateNotebookCheckInput,
} from './notebook-check.schemas.js';

type NotebookCheckDetail = Awaited<ReturnType<typeof notebookCheckRepository.findNotebookCheckById>>;
type SubmissionReview = Awaited<ReturnType<typeof notebookCheckRepository.findSubmissionForReview>>;

function toPublicNotebookCheck(activity: NonNullable<NotebookCheckDetail>) {
  if (!activity.notebookCheck) {
    return activity;
  }

  return {
    ...activity,
    notebookCheck: {
      ...activity.notebookCheck,
      referenceFiles: (activity.notebookCheck.referenceFiles ?? []).map((file) => ({
        id: file.id,
        mime_type: file.mime_type,
        byte_size: Number(file.byte_size),
        sort_order: file.sort_order,
      })),
    },
  };
}

function toPublicSubmission(submission: NonNullable<SubmissionReview>) {
  return {
    ...submission,
    files: submission.files.map((file) => ({
      id: file.id,
      mime_type: file.mime_type,
      byte_size: Number(file.byte_size),
      sort_order: file.sort_order,
    })),
  };
}

export const notebookCheckService = {
  async listNotebookChecks(actorId: string, classroomSubjectId: string) {
    await requireAssignedSubject(actorId, classroomSubjectId);
    return notebookCheckRepository.listNotebookChecks(classroomSubjectId);
  },

  async getNotebookCheckDetail(actorId: string, activityId: string) {
    const activity = await notebookCheckRepository.findNotebookCheckById(activityId);
    if (!activity) {
      throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
    }

    await requireAssignedSubject(actorId, activity.classroom_subject_id);
    return toPublicNotebookCheck(activity);
  },

  async createNotebookCheck(
    actorId: string,
    classroomSubjectId: string,
    input: CreateNotebookCheckInput
  ) {
    const activity = await notebookCheckRepository.createNotebookCheckAtomically(
      actorId,
      classroomSubjectId,
      input
    );
    return activity ? toPublicNotebookCheck(activity) : activity;
  },

  async updateNotebookCheck(
    actorId: string,
    activityId: string,
    input: UpdateNotebookCheckInput
  ) {
    const activity = await notebookCheckRepository.updateNotebookCheckAtomically(
      actorId,
      activityId,
      input
    );
    return activity ? toPublicNotebookCheck(activity) : activity;
  },

  async deleteNotebookCheck(
    actorId: string,
    activityId: string,
    storage?: StorageProvider
  ) {
    const result = await notebookCheckRepository.deleteNotebookCheckAtomically(
      actorId,
      activityId
    );

    let failedCleanupCount = 0;
    if (storage && result.orphanedStorageKeys && result.orphanedStorageKeys.length > 0) {
      for (const key of result.orphanedStorageKeys) {
        try {
          await storage.delete(key);
        } catch {
          failedCleanupCount += 1;
        }
      }
    }

    if (failedCleanupCount > 0) {
      throw new AppError(
        `Đã xóa dữ liệu hoạt động nhưng không thể dọn ${failedCleanupCount} file riêng tư`,
        500,
        'STORAGE_CLEANUP_FAILED'
      );
    }

    return { success: true };
  },

  async putCriteria(
    actorId: string,
    activityId: string,
    input: PutCriteriaInput
  ) {
    const activity = await notebookCheckRepository.findNotebookCheckById(activityId);
    if (!activity) {
      throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
    }

    await requireAssignedSubject(actorId, activity.classroom_subject_id, { allowArchived: false });

    if (activity.notebookCheck?.criteria_locked_at) {
      throw new ConflictError(
        'Không thể chỉnh sửa tiêu chí vì hoạt động đã bị khóa tiêu chí (đã có bài nộp)'
      );
    }

    const updatedActivity = await notebookCheckRepository.putCriteriaAtomically(
      actorId,
      activityId,
      input.criteria
    );
    return updatedActivity ? toPublicNotebookCheck(updatedActivity) : updatedActivity;
  },

  async uploadReferenceFile(params: {
    actorId: string;
    activityId: string;
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer?: Buffer;
    };
    storage: StorageProvider;
  }) {
    const { actorId, activityId, file, storage } = params;

    const activity = await notebookCheckRepository.findNotebookCheckById(activityId);
    if (!activity) {
      throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
    }

    await requireAssignedSubject(actorId, activity.classroom_subject_id, { allowArchived: false });

    if (activity.notebookCheck?.criteria_locked_at) {
      throw new ConflictError(
        'Không thể thêm ảnh mẫu vì hoạt động đã bị khóa tiêu chí (đã có bài nộp)'
      );
    }

    // 1. Validate MIME type (strictly image/jpeg or image/png)
    if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png') {
      throw new BadRequestError('Ảnh mẫu chỉ chấp nhận định dạng ảnh JPEG hoặc PNG');
    }

    // 2. Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
      throw new BadRequestError('Kích thước ảnh mẫu vượt quá giới hạn tối đa 10MB');
    }

    // 3. Validate signature / magic bytes
    if (file.buffer && !checkFileSignature(file.buffer, file.mimetype)) {
      throw new BadRequestError(
        'Định dạng nội dung file không khớp với MIME type (phát hiện giả mạo)'
      );
    }

    if (!file.buffer) {
      throw new BadRequestError('Dữ liệu file không hợp lệ');
    }

    // 4. Generate safe unique storage key
    const storageKey = generateStorageKey(file.originalname);

    // 5. Store file on storage provider
    await storage.put(storageKey, file.buffer, file.mimetype);

    // 6. Record metadata in database atomically with cleanup on failure
    try {
      return await notebookCheckRepository.addReferenceFileAtomically(actorId, activityId, {
        storageKey,
        mimeType: file.mimetype,
        byteSize: file.size,
      });
    } catch (err) {
      // If DB insert fails, clean up the written file to prevent orphaned files
      await storage.delete(storageKey).catch(() => {});
      throw err;
    }
  },

  async deleteReferenceFile(
    actorId: string,
    activityId: string,
    fileId: string,
    storage: StorageProvider
  ) {
    const result = await notebookCheckRepository.deleteReferenceFileAtomically(
      actorId,
      activityId,
      fileId
    );

    await storage.delete(result.storageKey);

    return { success: true };
  },

  async downloadReferenceFile(
    actorId: string,
    activityId: string,
    fileId: string,
    storage: StorageProvider
  ) {
    const file = await notebookCheckRepository.findReferenceFileForDownload(activityId, fileId);
    if (!file) {
      throw new NotFoundError('Không tìm thấy ảnh mẫu');
    }

    await requireAssignedSubject(actorId, file.activity.activity.classroom_subject_id);

    return {
      buffer: await storage.open(file.storage_key),
      mimeType: file.mime_type,
    };
  },

  async publishNotebookCheck(actorId: string, activityId: string) {
    const activity = await notebookCheckRepository.findNotebookCheckById(activityId);
    if (!activity) {
      throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
    }

    await requireAssignedSubject(actorId, activity.classroom_subject_id, { allowArchived: false });

    const refFilesCount = activity.notebookCheck?.referenceFiles?.length ?? 0;
    if (refFilesCount === 0) {
      throw new BadRequestError(
        'Hoạt động kiểm tra vở phải có ít nhất 1 ảnh mẫu trước khi xuất bản'
      );
    }

    const criteriaCount = activity.notebookCheck?.criteria?.length ?? 0;
    if (criteriaCount === 0) {
      throw new BadRequestError(
        'Hoạt động kiểm tra vở phải có ít nhất 1 tiêu chí trước khi xuất bản'
      );
    }

    const publishedActivity = await notebookCheckRepository.publishNotebookCheckAtomically(
      actorId,
      activityId
    );
    return publishedActivity ? toPublicNotebookCheck(publishedActivity) : publishedActivity;
  },

  async createPeriod(actorId: string, activityId: string, input: CreatePeriodInput) {
    const activity = await notebookCheckRepository.findNotebookCheckById(activityId);
    if (!activity) {
      throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
    }

    await requireAssignedSubject(actorId, activity.classroom_subject_id, { allowArchived: false });

    const dueAt = new Date(input.dueAt);
    if (dueAt.getTime() <= Date.now()) {
      throw new BadRequestError('Thời hạn nộp bài (dueAt) phải ở tương lai');
    }

    const openPeriod = await notebookCheckRepository.findOpenPeriod(activityId);
    if (openPeriod) {
      throw new ConflictError(
        `Hoạt động hiện đang có một kỳ nộp chưa đóng (kỳ số ${openPeriod.period_no})`
      );
    }

    return notebookCheckRepository.createPeriodAtomically(actorId, activityId, dueAt);
  },

  async closePeriod(actorId: string, periodId: string) {
    return notebookCheckRepository.closePeriodAtomically(actorId, periodId);
  },

  async listPeriods(actorId: string, activityId: string) {
    const activity = await notebookCheckRepository.findNotebookCheckById(activityId);
    if (!activity) {
      throw new NotFoundError('Không tìm thấy hoạt động kiểm tra vở');
    }

    await requireAssignedSubject(actorId, activity.classroom_subject_id);
    return notebookCheckRepository.listPeriods(activityId);
  },

  async listSubmissionsByPeriod(actorId: string, periodId: string) {
    const period = await notebookCheckRepository.findPeriodById(periodId);
    if (!period) {
      throw new NotFoundError('Không tìm thấy kỳ nộp bài');
    }

    await requireAssignedSubject(
      actorId,
      period.activity.activity.classroom_subject_id
    );

    const submissions = await notebookCheckRepository.listSubmissionsByPeriod(periodId);
    return submissions.map((submission) => ({
      ...submission,
      files: submission.files.map((file) => ({
        ...file,
        byte_size: Number(file.byte_size),
      })),
    }));
  },

  async getSubmissionReview(actorId: string, submissionId: string) {
    const submission = await notebookCheckRepository.findSubmissionForReview(submissionId);
    if (!submission) {
      throw new NotFoundError('Không tìm thấy bài nộp');
    }

    await requireAssignedSubject(
      actorId,
      submission.period.activity.activity.classroom_subject_id
    );

    return toPublicSubmission(submission);
  },

  async downloadSubmissionFile(
    actorId: string,
    submissionId: string,
    fileId: string,
    storage: StorageProvider
  ) {
    const file = await notebookCheckRepository.findSubmissionFileForDownload(
      submissionId,
      fileId
    );
    if (!file) {
      throw new NotFoundError('Không tìm thấy ảnh bài nộp');
    }

    await requireAssignedSubject(
      actorId,
      file.submission.period.activity.activity.classroom_subject_id
    );

    return {
      buffer: await storage.open(file.storage_key),
      mimeType: file.mime_type,
    };
  },

  async analyzeSubmission(
    actorId: string,
    submissionId: string,
    storage: StorageProvider
  ): Promise<AiAnalysisResult> {
    const submission = await notebookCheckRepository.findSubmissionForReview(submissionId);
    if (!submission) {
      throw new NotFoundError('Không tìm thấy bài nộp');
    }

    await requireAssignedSubject(
      actorId,
      submission.period.activity.activity.classroom_subject_id,
      { allowArchived: false }
    );

    if (submission.status !== 'LOCKED') {
      throw new ConflictError(
        'Chỉ có thể phân tích bài nộp của kỳ đã đóng hoặc bài nộp đã bị khóa (LOCKED)'
      );
    }

    const criteria = submission.period.activity.criteria.map((c) => ({
      id: c.id,
      content: c.content,
      orderIndex: c.order_index,
    }));
    const referenceFiles = submission.period.activity.referenceFiles ?? [];

    const attemptId = randomUUID();
    await notebookCheckRepository.startSubmissionAnalysis(actorId, submissionId, attemptId);

    try {
      const referenceImages = [];
      for (const file of referenceFiles) {
        referenceImages.push({
          buffer: await storage.open(file.storage_key),
          mimeType: file.mime_type,
        });
      }

      const submissionImages = [];
      for (const file of submission.files) {
        submissionImages.push({
          buffer: await storage.open(file.storage_key),
          mimeType: file.mime_type,
        });
      }

      const result = await notebookAiProvider.analyzeSubmission({
        submissionId,
        referenceFiles: referenceImages,
        submissionFiles: submissionImages,
        criteria,
      });

      if (result.status === 'READY') {
        const savedDraft = await notebookCheckRepository.saveAiDraftAtomically(
          actorId,
          submissionId,
          attemptId,
          {
            ocrText: result.ocrText,
            suggestions: (result.suggestions ?? []) as unknown as Prisma.InputJsonValue,
          }
        );

        if (!savedDraft) {
          return {
            status: 'FAILED',
            message: 'Kết quả phân tích đã được thay thế bởi một lần thử mới',
          };
        }
      } else {
        await notebookCheckRepository.markSubmissionAnalysisFailed(
          actorId,
          submissionId,
          attemptId
        );
      }

      return result;
    } catch {
      await notebookCheckRepository.markSubmissionAnalysisFailed(actorId, submissionId, attemptId);
      return {
        status: 'FAILED',
        message: 'Không thể hoàn tất phân tích bài nộp; giáo viên có thể chấm thủ công',
      };
    }
  },

  async finalizeSubmission(
    actorId: string,
    submissionId: string,
    input: FinalizeSubmissionInput
  ) {
    const submission = await notebookCheckRepository.findSubmissionForReview(submissionId);
    if (!submission) {
      throw new NotFoundError('Không tìm thấy bài nộp');
    }

    await requireAssignedSubject(
      actorId,
      submission.period.activity.activity.classroom_subject_id,
      { allowArchived: false }
    );

    // If already finalized, check idempotency
    if (submission.status === 'FINALIZED' && submission.assessment) {
      const existingResults = submission.assessment.results;
      const matchesComment =
        (submission.assessment.teacher_comment ?? null) ===
        (input.teacherComment ?? null);

      let matchesResults = existingResults.length === input.results.length;
      if (matchesResults) {
        for (const item of input.results) {
          const matched = existingResults.find((r) => r.criterion_id === item.criterionId);
          if (
            !matched ||
            matched.status !== item.status ||
            (matched.note ?? null) !== (item.note ?? null)
          ) {
            matchesResults = false;
            break;
          }
        }
      }

      if (matchesComment && matchesResults) {
        return submission.assessment;
      }

      throw new ConflictError(
        'Bài nộp đã được chốt đánh giá trước đó với kết quả khác; không thể ghi đè'
      );
    }

    if (submission.status !== 'LOCKED') {
      throw new ConflictError(
        'Chỉ có thể chốt đánh giá cho bài nộp đã bị khóa (LOCKED)'
      );
    }

    // Validate criteria exact match
    const validCriterionIds = new Set(
      submission.period.activity.criteria.map((c) => c.id)
    );

    const submittedCriterionIds = new Set(input.results.map((item) => item.criterionId));
    if (
      input.results.length !== validCriterionIds.size ||
      submittedCriterionIds.size !== input.results.length
    ) {
      throw new BadRequestError(
        'Số lượng kết quả tiêu chí không khớp với số tiêu chí của hoạt động này'
      );
    }

    for (const item of input.results) {
      if (!validCriterionIds.has(item.criterionId)) {
        throw new BadRequestError(
          `Tiêu chí "${item.criterionId}" không thuộc hoạt động kiểm tra vở này`
        );
      }
    }

    return notebookCheckRepository.finalizeSubmissionAtomically(
      actorId,
      submissionId,
      input
    );
  },
};
