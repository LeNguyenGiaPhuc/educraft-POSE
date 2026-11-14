import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { notebookCheckRepository } from '../../src/modules/teacher/notebook-checks/notebook-check.repository.js';
import { ConflictError } from '../../src/shared/errors/app-error.js';

describe('BE-06 teacher notebook check database constraints (real PostgreSQL)', () => {
  const marker = randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const classroomIds: string[] = [];
  const subjectIds: string[] = [];
  const activityIds: string[] = [];
  const periodIds: string[] = [];
  const submissionIds: string[] = [];
  const assessmentIds: string[] = [];

  function createDeferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  }

  afterAll(async () => {
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE criterion_results DISABLE TRIGGER criterion_results_guard_finalized');
      await prisma.$executeRawUnsafe('ALTER TABLE notebook_assessments DISABLE TRIGGER notebook_assessments_guard_finalized');
      await prisma.$executeRawUnsafe('ALTER TABLE notebook_criteria DISABLE TRIGGER notebook_criteria_guard_locked');
      await prisma.$executeRawUnsafe('ALTER TABLE notebook_reference_files DISABLE TRIGGER notebook_reference_files_guard_locked');
      await prisma.$executeRawUnsafe('ALTER TABLE notebook_check_activities DISABLE TRIGGER notebook_check_activities_guard_lock');

      if (assessmentIds.length > 0) {
        await prisma.criterionResult.deleteMany({
          where: { assessment_id: { in: assessmentIds } },
        });
        await prisma.notebookAssessment.deleteMany({
          where: { id: { in: assessmentIds } },
        });
      }
      if (submissionIds.length > 0) {
        await prisma.notebookAIDraft.deleteMany({
          where: { submission_id: { in: submissionIds } },
        });
        await prisma.notebookSubmissionFile.deleteMany({
          where: { submission_id: { in: submissionIds } },
        });
        await prisma.notebookSubmission.deleteMany({
          where: { id: { in: submissionIds } },
        });
      }
      if (periodIds.length > 0) {
        await prisma.notebookCheckPeriod.deleteMany({
          where: { id: { in: periodIds } },
        });
      }
      if (activityIds.length > 0) {
        await prisma.notebookReferenceFile.deleteMany({
          where: { activity_id: { in: activityIds } },
        });
        await prisma.notebookCriterion.deleteMany({
          where: { activity_id: { in: activityIds } },
        });
        await prisma.notebookCheckActivity.deleteMany({
          where: { activity_id: { in: activityIds } },
        });
        await prisma.notification.deleteMany({
          where: { activity_id: { in: activityIds } },
        });
        await prisma.scheduleEvent.deleteMany({
          where: { activity_id: { in: activityIds } },
        });
        await prisma.activity.deleteMany({
          where: { id: { in: activityIds } },
        });
      }
      if (classroomIds.length > 0) {
        await prisma.classroomEnrollment.deleteMany({
          where: { classroom_id: { in: classroomIds } },
        });
        await prisma.classroomSubject.deleteMany({
          where: { classroom_id: { in: classroomIds } },
        });
        await prisma.classroom.deleteMany({
          where: { id: { in: classroomIds } },
        });
      }
      if (userIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
      if (subjectIds.length > 0) {
        await prisma.subject.deleteMany({
          where: { id: { in: subjectIds } },
        });
      }
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE criterion_results ENABLE TRIGGER criterion_results_guard_finalized');
      await prisma.$executeRawUnsafe('ALTER TABLE notebook_assessments ENABLE TRIGGER notebook_assessments_guard_finalized');
      await prisma.$executeRawUnsafe('ALTER TABLE notebook_criteria ENABLE TRIGGER notebook_criteria_guard_locked');
      await prisma.$executeRawUnsafe('ALTER TABLE notebook_reference_files ENABLE TRIGGER notebook_reference_files_guard_locked');
      await prisma.$executeRawUnsafe('ALTER TABLE notebook_check_activities ENABLE TRIGGER notebook_check_activities_guard_lock');
      await prisma.$disconnect();
    }
  });

  async function createTeacherAndClassroomSubject(testName: string) {
    const teacher = await prisma.user.create({
      data: {
        username: `tea_${marker}_${testName}`,
        password_hash: 'hash',
        full_name: 'Teacher Test',
        role: 'TEACHER',
        status: 'ACTIVE',
      },
    });
    userIds.push(teacher.id);

    const subject = await prisma.subject.create({
      data: { name: `Sub_${marker}_${testName}` },
    });
    subjectIds.push(subject.id);

    const classroom = await prisma.classroom.create({
      data: {
        name: `Class_${marker}_${testName}`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
      },
    });
    classroomIds.push(classroom.id);

    const classroomSubject = await prisma.classroomSubject.create({
      data: {
        classroom_id: classroom.id,
        subject_id: subject.id,
        teacher_id: teacher.id,
      },
    });

    return { teacher, subject, classroom, classroomSubject };
  }

  it('first accepted notebook submission sets criteria_locked_at permanently', async () => {
    const { teacher, classroomSubject } = await createTeacherAndClassroomSubject('lock');

    const student = await prisma.user.create({
      data: {
        username: `stu_${marker}_lock`,
        password_hash: 'hash',
        full_name: 'Student Lock',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    userIds.push(student.id);

    // 1. Create notebook check activity
    const activity = await notebookCheckRepository.createNotebookCheckAtomically(
      teacher.id,
      classroomSubject.id,
      {
        title: 'Kiểm tra vở khóa tiêu chí',
        description: 'Mô tả',
      }
    );
    if (!activity) throw new Error('Activity creation failed');
    activityIds.push(activity.id);

    // Initial state: criteria_locked_at is null
    expect(activity.notebookCheck?.criteria_locked_at).toBeNull();

    // 2. Add criteria and reference files
    await notebookCheckRepository.putCriteriaAtomically(teacher.id, activity.id, [
      { content: 'Tiêu chí 1: Đủ bài' },
    ]);

    await notebookCheckRepository.addReferenceFileAtomically(teacher.id, activity.id, {
      storageKey: `ref_${marker}_1.jpg`,
      mimeType: 'image/jpeg',
      byteSize: 1024,
    });

    // 3. Open period
    const period = await notebookCheckRepository.createPeriodAtomically(
      teacher.id,
      activity.id,
      new Date('2026-12-01T00:00:00Z')
    );
    periodIds.push(period.id);

    // 4. Student submits
    const submission = await prisma.notebookSubmission.create({
      data: {
        student_id: student.id,
        period_id: period.id,
        status: 'CURRENT',
      },
    });
    submissionIds.push(submission.id);

    // 5. Database trigger MUST have automatically set criteria_locked_at on notebook_check_activities
    const reloaded = await prisma.notebookCheckActivity.findUnique({
      where: { activity_id: activity.id },
    });
    expect(reloaded?.criteria_locked_at).not.toBeNull();
    if (!reloaded?.criteria_locked_at) throw new Error('Expected criteria_locked_at to be set');
    const lockedTimestamp = reloaded.criteria_locked_at;

    // 6. Database protection: criteria_locked_at CANNOT be reset to NULL
    await expect(
      prisma.notebookCheckActivity.update({
        where: { activity_id: activity.id },
        data: { criteria_locked_at: null },
      })
    ).rejects.toThrow();

    // 7. Database protection: modifying criteria after lock MUST fail
    await expect(
      prisma.notebookCriterion.create({
        data: {
          activity_id: activity.id,
          content: 'Thêm tiêu chí sau khóa',
          order_index: 2,
        },
      })
    ).rejects.toThrow();

    // 8. Database protection: modifying reference files after lock MUST fail
    await expect(
      prisma.notebookReferenceFile.create({
        data: {
          activity_id: activity.id,
          storage_key: `ref_${marker}_2.jpg`,
          mime_type: 'image/jpeg',
          byte_size: BigInt(2048),
          sort_order: 2,
        },
      })
    ).rejects.toThrow();

    // 9. Deleting the submission does NOT unlock criteria_locked_at
    await prisma.notebookSubmission.delete({
      where: { id: submission.id },
    });
    const stillLocked = await prisma.notebookCheckActivity.findUnique({
      where: { activity_id: activity.id },
    });
    expect(stillLocked?.criteria_locked_at).toEqual(lockedTimestamp);
  });

  it('enforces one open period per notebook check activity constraint', async () => {
    const { teacher, classroomSubject } = await createTeacherAndClassroomSubject('period');

    const activity = await notebookCheckRepository.createNotebookCheckAtomically(
      teacher.id,
      classroomSubject.id,
      {
        title: 'Hoạt động kiểm tra kỳ nộp',
      }
    );
    if (!activity) throw new Error('Activity creation failed');
    activityIds.push(activity.id);

    // 1. Open first period
    const period1 = await notebookCheckRepository.createPeriodAtomically(
      teacher.id,
      activity.id,
      new Date('2026-12-01T00:00:00Z')
    );
    periodIds.push(period1.id);

    // 2. Attempting to open a second period while first is open MUST fail with ConflictError
    await expect(
      notebookCheckRepository.createPeriodAtomically(
        teacher.id,
        activity.id,
        new Date('2026-12-05T00:00:00Z')
      )
    ).rejects.toThrow(ConflictError);

    // 3. Direct DB insert also violates partial unique index one_open_period_per_notebook_check
    await expect(
      prisma.notebookCheckPeriod.create({
        data: {
          activity_id: activity.id,
          period_no: 2,
          due_at: new Date('2026-12-05T00:00:00Z'),
          closed_at: null,
        },
      })
    ).rejects.toThrow();

    // 4. Close first period
    await notebookCheckRepository.closePeriodAtomically(teacher.id, period1.id);

    await expect(
      prisma.notebookSubmission.create({
        data: {
          student_id: teacher.id,
          period_id: period1.id,
          status: 'CURRENT',
        },
      })
    ).rejects.toThrow();

    // 5. Now opening second period succeeds
    const period2 = await notebookCheckRepository.createPeriodAtomically(
      teacher.id,
      activity.id,
      new Date('2026-12-05T00:00:00Z')
    );
    periodIds.push(period2.id);
    expect(period2.period_no).toBe(2);
  });

  it('serializes the first submission against criteria changes', async () => {
    const { teacher, classroomSubject } = await createTeacherAndClassroomSubject('criteria-race');
    const student = await prisma.user.create({
      data: {
        username: `stu_${marker}_criteria_race`,
        password_hash: 'hash',
        full_name: 'Student Criteria Race',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    userIds.push(student.id);

    const activity = await notebookCheckRepository.createNotebookCheckAtomically(
      teacher.id,
      classroomSubject.id,
      { title: 'Hoạt động race tiêu chí' }
    );
    if (!activity) throw new Error('Activity creation failed');
    activityIds.push(activity.id);
    await notebookCheckRepository.putCriteriaAtomically(teacher.id, activity.id, [
      { content: 'Tiêu chí ban đầu' },
    ]);
    const period = await notebookCheckRepository.createPeriodAtomically(
      teacher.id,
      activity.id,
      new Date('2026-12-10T00:00:00Z')
    );
    periodIds.push(period.id);

    const submissionLocked = createDeferred();
    const releaseSubmission = createDeferred();
    const submissionPromise = prisma.$transaction(async (tx) => {
      const submission = await tx.notebookSubmission.create({
        data: {
          student_id: student.id,
          period_id: period.id,
          status: 'CURRENT',
        },
      });
      submissionIds.push(submission.id);
      submissionLocked.resolve();
      await releaseSubmission.promise;
      return submission;
    });

    await submissionLocked.promise;
    const criteriaChangePromise = notebookCheckRepository.putCriteriaAtomically(
      teacher.id,
      activity.id,
      [{ content: 'Tiêu chí thay đổi trong lúc nộp' }]
    );
    releaseSubmission.resolve();

    await submissionPromise;
    await expect(criteriaChangePromise).rejects.toThrow(ConflictError);
  });

  it('serializes period close against a concurrent submission', async () => {
    const { teacher, classroomSubject } = await createTeacherAndClassroomSubject('period-race');
    const student = await prisma.user.create({
      data: {
        username: `stu_${marker}_period_race`,
        password_hash: 'hash',
        full_name: 'Student Period Race',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    userIds.push(student.id);

    const activity = await notebookCheckRepository.createNotebookCheckAtomically(
      teacher.id,
      classroomSubject.id,
      { title: 'Hoạt động race kỳ nộp' }
    );
    if (!activity) throw new Error('Activity creation failed');
    activityIds.push(activity.id);
    const period = await notebookCheckRepository.createPeriodAtomically(
      teacher.id,
      activity.id,
      new Date('2026-12-10T00:00:00Z')
    );
    periodIds.push(period.id);

    const periodLocked = createDeferred();
    const releaseClose = createDeferred();
    const closePromise = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id"
        FROM "notebook_check_periods"
        WHERE "id" = ${period.id}::uuid
        FOR UPDATE
      `;
      periodLocked.resolve();
      await releaseClose.promise;
      const now = new Date();
      await tx.notebookCheckPeriod.update({
        where: { id: period.id },
        data: { closed_at: now },
      });
      await tx.notebookSubmission.updateMany({
        where: { period_id: period.id, status: 'CURRENT' },
        data: { status: 'LOCKED', locked_at: now },
      });
    });

    await periodLocked.promise;
    const submissionPromise = prisma.notebookSubmission.create({
      data: {
        student_id: student.id,
        period_id: period.id,
        status: 'CURRENT',
      },
    });
    releaseClose.resolve();

    await closePromise;
    await expect(submissionPromise).rejects.toThrow();
  });

  it('closing a period atomically locks all CURRENT submissions to LOCKED', async () => {
    const { teacher, classroomSubject } = await createTeacherAndClassroomSubject('close');

    const student = await prisma.user.create({
      data: {
        username: `stu_${marker}_close`,
        password_hash: 'hash',
        full_name: 'Student Close',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    userIds.push(student.id);

    const activity = await notebookCheckRepository.createNotebookCheckAtomically(
      teacher.id,
      classroomSubject.id,
      {
        title: 'Hoạt động đóng kỳ',
      }
    );
    if (!activity) throw new Error('Activity creation failed');
    activityIds.push(activity.id);

    const period = await notebookCheckRepository.createPeriodAtomically(
      teacher.id,
      activity.id,
      new Date('2026-12-01T00:00:00Z')
    );
    periodIds.push(period.id);

    const submission = await prisma.notebookSubmission.create({
      data: {
        student_id: student.id,
        period_id: period.id,
        status: 'CURRENT',
      },
    });
    submissionIds.push(submission.id);

    expect(submission.status).toBe('CURRENT');
    expect(submission.locked_at).toBeNull();

    // Close period
    await notebookCheckRepository.closePeriodAtomically(teacher.id, period.id);

    // Verify submission is now LOCKED with locked_at timestamp
    const lockedSub = await prisma.notebookSubmission.findUnique({
      where: { id: submission.id },
    });
    expect(lockedSub?.status).toBe('LOCKED');
    expect(lockedSub?.locked_at).not.toBeNull();
  });

  it('finalized notebook assessments and criterion results are strictly immutable', async () => {
    const { teacher, classroomSubject } = await createTeacherAndClassroomSubject('fin');

    const student = await prisma.user.create({
      data: {
        username: `stu_${marker}_fin`,
        password_hash: 'hash',
        full_name: 'Student Finalize',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    userIds.push(student.id);

    const activity = await notebookCheckRepository.createNotebookCheckAtomically(
      teacher.id,
      classroomSubject.id,
      {
        title: 'Hoạt động finalize',
      }
    );
    if (!activity) throw new Error('Activity creation failed');
    activityIds.push(activity.id);

    await notebookCheckRepository.putCriteriaAtomically(teacher.id, activity.id, [
      { content: 'Tiêu chí đánh giá 1' },
      { content: 'Tiêu chí đánh giá 2' },
    ]);

    const period = await notebookCheckRepository.createPeriodAtomically(
      teacher.id,
      activity.id,
      new Date('2026-12-01T00:00:00Z')
    );
    periodIds.push(period.id);

    const submission = await prisma.notebookSubmission.create({
      data: {
        student_id: student.id,
        period_id: period.id,
        status: 'CURRENT',
      },
    });
    submissionIds.push(submission.id);

    // Close period to lock submission
    await notebookCheckRepository.closePeriodAtomically(teacher.id, period.id);

    const reloadedActivity = await notebookCheckRepository.findNotebookCheckById(activity.id);
    const criteria = reloadedActivity?.notebookCheck?.criteria ?? [];

    // Two identical finalize requests must both return the same assessment.
    const finalizeInput = {
      results: [
        { criterionId: criteria[0].id, status: 'RECORDED' as const, note: 'Đạt' },
        {
          criterionId: criteria[1].id,
          status: 'NEEDS_SUPPLEMENTATION' as const,
          note: 'Bổ sung',
        },
      ],
      teacherComment: 'Cần bổ sung tiêu chí 2',
    };
    const concurrentAssessments = await Promise.all([
      notebookCheckRepository.finalizeSubmissionAtomically(
        teacher.id,
        submission.id,
        finalizeInput
      ),
      notebookCheckRepository.finalizeSubmissionAtomically(
        teacher.id,
        submission.id,
        finalizeInput
      ),
    ]);
    const assessment = concurrentAssessments[0];
    if (!assessment) throw new Error('Assessment failed');
    assessmentIds.push(assessment.id);
    expect(concurrentAssessments[1]?.id).toBe(assessment.id);

    // Verify submission status is FINALIZED
    const finSub = await prisma.notebookSubmission.findUnique({
      where: { id: submission.id },
    });
    expect(finSub?.status).toBe('FINALIZED');

    // Database protection: Updating assessment on finalized submission throws 23514
    await expect(
      prisma.notebookAssessment.update({
        where: { id: assessment.id },
        data: { teacher_comment: 'Sửa comment sau khi finalized' },
      })
    ).rejects.toThrow();

    // Database protection: Deleting assessment on finalized submission throws 23514
    await expect(
      prisma.notebookAssessment.delete({
        where: { id: assessment.id },
      })
    ).rejects.toThrow();

    // Database protection: Updating criterion results on finalized assessment throws 23514
    const criterionResult = assessment.results[0];
    await expect(
      prisma.criterionResult.update({
        where: { id: criterionResult.id },
        data: { status: 'UNDETERMINED' },
      })
    ).rejects.toThrow();

    // Database protection: Deleting criterion results on finalized assessment throws 23514
    await expect(
      prisma.criterionResult.delete({
        where: { id: criterionResult.id },
      })
    ).rejects.toThrow();

    // Retry with SAME payload: returns existing assessment idempotently
    const retrySame = await notebookCheckRepository.finalizeSubmissionAtomically(
      teacher.id,
      submission.id,
      {
        ...finalizeInput,
      }
    );
    expect(retrySame?.id).toBe(assessment.id);

    // Retry with DIFFERENT payload: throws ConflictError
    await expect(
      notebookCheckRepository.finalizeSubmissionAtomically(
        teacher.id,
        submission.id,
        {
          results: [
            { criterionId: criteria[0].id, status: 'RECORDED', note: 'Đạt' },
            { criterionId: criteria[1].id, status: 'RECORDED', note: 'Đổi thành đạt' },
          ],
          teacherComment: 'Đã đổi',
        }
      )
    ).rejects.toThrow(ConflictError);
  });
});
