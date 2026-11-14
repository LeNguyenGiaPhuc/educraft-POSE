import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { activityRepository } from '../../src/modules/teacher/activities/activity.repository.js';
import { activityService } from '../../src/modules/teacher/activities/activity.service.js';
import { calendarRepository } from '../../src/modules/teacher/calendar/calendar.repository.js';
import { ConflictError } from '../../src/shared/errors/app-error.js';

describe('BE-05 teacher calendar & activities database constraints (real PostgreSQL)', () => {
  const marker = randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const classroomIds: string[] = [];
  const subjectIds: string[] = [];
  const lessonIds: string[] = [];
  const activityIds: string[] = [];
  const eventIds: string[] = [];
  const notificationIds: string[] = [];
  const submissionIds: string[] = [];
  const materialIds: string[] = [];
  const materialVersionIds: string[] = [];

  afterAll(async () => {
    if (submissionIds.length > 0) {
      await prisma.exerciseSubmission.deleteMany({ where: { id: { in: submissionIds } } });
    }
    if (notificationIds.length > 0) {
      await prisma.notification.deleteMany({ where: { id: { in: notificationIds } } });
    }
    if (eventIds.length > 0) {
      await prisma.scheduleEvent.deleteMany({ where: { id: { in: eventIds } } });
    }
    if (activityIds.length > 0) {
      await prisma.questionCitation.deleteMany({ where: { question: { exercise_activity_id: { in: activityIds } } } });
      await prisma.question.deleteMany({ where: { exercise_activity_id: { in: activityIds } } });
      await prisma.exerciseActivityLesson.deleteMany({ where: { activity_id: { in: activityIds } } });
      await prisma.exerciseActivity.deleteMany({ where: { activity_id: { in: activityIds } } });
      await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
    }
    if (materialVersionIds.length > 0) {
      await prisma.materialSegment.deleteMany({
        where: { material_version_id: { in: materialVersionIds } },
      });
      await prisma.materialVersion.deleteMany({
        where: { id: { in: materialVersionIds } },
      });
    }
    if (materialIds.length > 0) {
      await prisma.learningMaterial.deleteMany({ where: { id: { in: materialIds } } });
    }
    if (lessonIds.length > 0) {
      await prisma.exerciseActivityLesson.deleteMany({ where: { lesson_id: { in: lessonIds } } });
      await prisma.lesson.deleteMany({ where: { id: { in: lessonIds } } });
    }
    if (classroomIds.length > 0) {
      await prisma.classroomEnrollment.deleteMany({ where: { classroom_id: { in: classroomIds } } });
      await prisma.classroomSubject.deleteMany({ where: { classroom_id: { in: classroomIds } } });
      await prisma.classroom.deleteMany({ where: { id: { in: classroomIds } } });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (subjectIds.length > 0) {
      await prisma.subject.deleteMany({ where: { id: { in: subjectIds } } });
    }
    await prisma.$disconnect();
  });

  it('enforces exclusive link on schedule_events (cannot link both lesson and activity)', async () => {
    const teacher = await prisma.user.create({
      data: {
        username: `tea_${marker}_cal`,
        password_hash: 'hash',
        full_name: 'Teacher Calendar',
        role: 'TEACHER',
        status: 'ACTIVE',
      },
    });
    userIds.push(teacher.id);

    const subject = await prisma.subject.create({
      data: { name: `Sub_${marker}_cal` },
    });
    subjectIds.push(subject.id);

    const classroom = await prisma.classroom.create({
      data: {
        name: `Class_${marker}_cal`,
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

    const lesson = await prisma.lesson.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        title: `Lesson_${marker}`,
        status: 'PUBLISHED',
      },
    });
    lessonIds.push(lesson.id);

    const activity = await prisma.activity.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        kind: 'EXERCISE',
        title: `Activity_${marker}`,
        description: 'Test activity',
        status: 'PUBLISHED',
      },
    });
    activityIds.push(activity.id);

    // 1. Linking only a lesson succeeds
    const eventWithLesson = await prisma.scheduleEvent.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        title: 'Event with Lesson',
        details: 'Details',
        event_type: 'LESSON',
        starts_at: new Date('2026-11-20T08:00:00Z'),
        lesson_id: lesson.id,
        activity_id: null,
      },
    });
    eventIds.push(eventWithLesson.id);
    expect(eventWithLesson.lesson_id).toBe(lesson.id);
    expect(eventWithLesson.activity_id).toBeNull();

    // 2. Linking only an activity succeeds
    const eventWithActivity = await prisma.scheduleEvent.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        title: 'Event with Activity',
        details: 'Details',
        event_type: 'EXAM',
        starts_at: new Date('2026-11-21T08:00:00Z'),
        lesson_id: null,
        activity_id: activity.id,
      },
    });
    eventIds.push(eventWithActivity.id);
    expect(eventWithActivity.activity_id).toBe(activity.id);
    expect(eventWithActivity.lesson_id).toBeNull();

    // 3. Linking BOTH lesson and activity MUST fail with check constraint violation
    await expect(
      prisma.scheduleEvent.create({
        data: {
          classroom_subject_id: classroomSubject.id,
          created_by_id: teacher.id,
          title: 'Event with Both (Invalid)',
          details: 'Should fail',
          event_type: 'INVALID',
          starts_at: new Date('2026-11-22T08:00:00Z'),
          lesson_id: lesson.id,
          activity_id: activity.id,
        },
      })
    ).rejects.toThrow();
  });

  it('enforces notification idempotency per recipient via dedupe_key', async () => {
    const student = await prisma.user.create({
      data: {
        username: `stu_${marker}_notif`,
        password_hash: 'hash',
        full_name: 'Student Notif',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    userIds.push(student.id);

    const teacher = await prisma.user.create({
      data: {
        username: `tea_${marker}_notif`,
        password_hash: 'hash',
        full_name: 'Teacher Notif',
        role: 'TEACHER',
        status: 'ACTIVE',
      },
    });
    userIds.push(teacher.id);

    const subject = await prisma.subject.create({
      data: { name: `Sub_${marker}_notif` },
    });
    subjectIds.push(subject.id);

    const classroom = await prisma.classroom.create({
      data: {
        name: `Class_${marker}_notif`,
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

    const activity1 = await prisma.activity.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        kind: 'EXERCISE',
        title: `Activity1_${marker}`,
        description: 'Test activity',
        status: 'PUBLISHED',
      },
    });
    const activity2 = await prisma.activity.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        kind: 'EXERCISE',
        title: `Activity2_${marker}`,
        description: 'Test activity',
        status: 'PUBLISHED',
      },
    });
    activityIds.push(activity1.id, activity2.id);

    const dedupeKey = `activity:${activity1.id}`;

    // 1. First notification creation succeeds
    const firstNotif = await prisma.notification.create({
      data: {
        recipient_id: student.id,
        activity_id: activity1.id,
        dedupe_key: dedupeKey,
        title: 'New Activity Published',
        body: 'Please do the quiz before due date',
      },
    });
    notificationIds.push(firstNotif.id);
    expect(firstNotif.dedupe_key).toBe(dedupeKey);

    // 2. Second notification with identical recipient and dedupe_key MUST fail (unique constraint)
    await expect(
      prisma.notification.create({
        data: {
          recipient_id: student.id,
          activity_id: activity1.id,
          dedupe_key: dedupeKey,
          title: 'Duplicate Activity Notification',
          body: 'This duplicate should be rejected',
        },
      })
    ).rejects.toThrow();

    // 3. Different dedupe_key for the same recipient succeeds
    const secondNotif = await prisma.notification.create({
      data: {
        recipient_id: student.id,
        activity_id: activity2.id,
        dedupe_key: `activity:${activity2.id}`,
        title: 'Second Activity Published',
        body: 'Another assignment',
      },
    });
    notificationIds.push(secondNotif.id);
    expect(secondNotif.id).toBeDefined();
  });

  it('performs atomic activity lifecycle and idempotent publish notifications to enrolled students', async () => {
    const student = await prisma.user.create({
      data: {
        username: `stu_${marker}_life`,
        password_hash: 'hash',
        full_name: 'Student Lifecycle',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    userIds.push(student.id);

    const teacher = await prisma.user.create({
      data: {
        username: `tea_${marker}_life`,
        password_hash: 'hash',
        full_name: 'Teacher Lifecycle',
        role: 'TEACHER',
        status: 'ACTIVE',
      },
    });
    userIds.push(teacher.id);

    const subject = await prisma.subject.create({
      data: { name: `Sub_${marker}_life` },
    });
    subjectIds.push(subject.id);

    const classroom = await prisma.classroom.create({
      data: {
        name: `Class_${marker}_life`,
        grade_level: 10,
        academic_year: '2026-2027',
        status: 'ACTIVE',
      },
    });
    classroomIds.push(classroom.id);

    // Enroll student in classroom
    await prisma.classroomEnrollment.create({
      data: {
        classroom_id: classroom.id,
        student_id: student.id,
        joined_at: new Date(),
        left_at: null,
      },
    });

    const classroomSubject = await prisma.classroomSubject.create({
      data: {
        classroom_id: classroom.id,
        subject_id: subject.id,
        teacher_id: teacher.id,
      },
    });

    const lesson = await prisma.lesson.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        title: `Lesson_${marker}_life`,
        status: 'PUBLISHED',
      },
    });
    lessonIds.push(lesson.id);

    // 1. Create activity atomically
    const createdActivity = await activityRepository.createActivityAtomically(
      teacher.id,
      classroomSubject.id,
      {
        title: 'Bài tập trắc nghiệm tuần 1',
        description: 'Ôn tập kiến thức',
        exerciseType: 'QUIZ',
        difficulty: 'BASIC',
        lessonIds: [lesson.id],
      }
    );
    expect(createdActivity).not.toBeNull();
    if (!createdActivity) throw new Error('Expected createdActivity to be non-null');
    activityIds.push(createdActivity.id);
    expect(createdActivity.status).toBe('DRAFT');

    // 2. Put questions atomically
    const updatedWithQuestions = await activityRepository.putQuestionsAtomically(
      teacher.id,
      createdActivity.id,
      [
        {
          prompt: '1 + 1 = ?',
          options: ['1', '2', '3'],
          answerKey: '2',
          explanation: 'Toán cơ bản',
          maxPoints: 1.0,
          lessonId: lesson.id,
          citations: [],
        },
      ]
    );
    expect(updatedWithQuestions?.exercise?.questions).toHaveLength(1);

    const linkedEvent = await calendarRepository.createEventAtomically(
      teacher.id,
      classroomSubject.id,
      {
        title: 'Lịch bài tập tuần 1',
        details: 'Nhắc học sinh làm bài',
        eventType: 'EXAM',
        startsAt: '2026-11-24T08:00:00Z',
        activityId: createdActivity.id,
      }
    );
    eventIds.push(linkedEvent.id);

    // 3. Concurrent activity + linked-event publication must create one notification
    const [published] = await Promise.all([
      activityRepository.publishActivityAtomically(teacher.id, createdActivity.id),
      calendarRepository.publishEventAtomically(teacher.id, linkedEvent.id),
    ]);
    expect(published?.status).toBe('PUBLISHED');

    // 4. Verify notification was created for enrolled student
    const notifs = await prisma.notification.findMany({
      where: {
        recipient_id: student.id,
        dedupe_key: `activity:${createdActivity.id}`,
      },
    });
    expect(notifs).toHaveLength(1);
    expect(notifs[0].dedupe_key).toBe(`activity:${createdActivity.id}`);
    notificationIds.push(notifs[0].id);

    // 5. Concurrent retry is completely idempotent (no duplicate notification)
    await Promise.all([
      activityRepository.publishActivityAtomically(teacher.id, createdActivity.id),
      calendarRepository.publishEventAtomically(teacher.id, linkedEvent.id),
    ]);
    const notifsAfterRetry = await prisma.notification.findMany({
      where: {
        recipient_id: student.id,
        dedupe_key: `activity:${createdActivity.id}`,
      },
    });
    expect(notifsAfterRetry).toHaveLength(1);
  });

  it('enforces submission lock: cannot modify questions or delete activity once submission exists', async () => {
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

    const teacher = await prisma.user.create({
      data: {
        username: `tea_${marker}_lock`,
        password_hash: 'hash',
        full_name: 'Teacher Lock',
        role: 'TEACHER',
        status: 'ACTIVE',
      },
    });
    userIds.push(teacher.id);

    const subject = await prisma.subject.create({
      data: { name: `Sub_${marker}_lock` },
    });
    subjectIds.push(subject.id);

    const classroom = await prisma.classroom.create({
      data: {
        name: `Class_${marker}_lock`,
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

    const lesson = await prisma.lesson.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        title: `Lesson_${marker}_lock`,
        status: 'PUBLISHED',
      },
    });
    lessonIds.push(lesson.id);

    // 1. Create activity & add question
    const activity = await activityRepository.createActivityAtomically(
      teacher.id,
      classroomSubject.id,
      {
        title: 'Hoạt động có bài nộp',
        description: 'Khóa sửa câu hỏi khi có submission',
        exerciseType: 'QUIZ',
        difficulty: 'BASIC',
        lessonIds: [lesson.id],
      }
    );
    if (!activity) throw new Error('Expected activity to be non-null');
    activityIds.push(activity.id);

    await activityRepository.putQuestionsAtomically(teacher.id, activity.id, [
      {
        prompt: 'Thủ đô Việt Nam là gì?',
        options: ['Hà Nội', 'Huế', 'Đà Nẵng'],
        answerKey: 'Hà Nội',
        explanation: '',
        maxPoints: 1.0,
        lessonId: lesson.id,
        citations: [],
      },
    ]);

    await activityRepository.publishActivityAtomically(teacher.id, activity.id);

    // 2. Student submits
    const submission = await prisma.exerciseSubmission.create({
      data: {
        activity_id: activity.id,
        student_id: student.id,
        total_score: 1.0,
      },
    });
    submissionIds.push(submission.id);

    // 3. Attempting to update questions MUST throw ConflictError
    await expect(
      activityRepository.putQuestionsAtomically(teacher.id, activity.id, [
        {
          prompt: 'Sửa câu hỏi mới?',
          options: ['A', 'B'],
          answerKey: 'A',
          explanation: '',
          maxPoints: 1.0,
          lessonId: lesson.id,
          citations: [],
        },
      ])
    ).rejects.toThrow(ConflictError);

    // 4. Attempting to delete activity MUST throw ConflictError
    await expect(
      activityRepository.deleteActivityAtomically(teacher.id, activity.id)
    ).rejects.toThrow(ConflictError);

    const question = await prisma.question.findFirstOrThrow({
      where: { exercise_activity_id: activity.id },
    });

    // Database protection must also reject writes that bypass the service layer.
    await expect(
      prisma.question.update({
        where: { id: question.id },
        data: { prompt: 'Nội dung đã bị sửa trực tiếp' },
      })
    ).rejects.toThrow();

    await expect(
      prisma.exerciseActivityLesson.delete({
        where: {
          activity_id_lesson_id: {
            activity_id: activity.id,
            lesson_id: lesson.id,
          },
        },
      })
    ).rejects.toThrow();
  });

  it('deleting a calendar event leaves linked lesson and activity intact', async () => {
    const student = await prisma.user.create({
      data: {
        username: `stu_${marker}_del`,
        password_hash: 'hash',
        full_name: 'Student Delete Test',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    userIds.push(student.id);

    const teacher = await prisma.user.create({
      data: {
        username: `tea_${marker}_del`,
        password_hash: 'hash',
        full_name: 'Teacher Delete Test',
        role: 'TEACHER',
        status: 'ACTIVE',
      },
    });
    userIds.push(teacher.id);

    const subject = await prisma.subject.create({
      data: { name: `Sub_${marker}_del` },
    });
    subjectIds.push(subject.id);

    const classroom = await prisma.classroom.create({
      data: {
        name: `Class_${marker}_del`,
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

    await prisma.classroomEnrollment.create({
      data: {
        classroom_id: classroom.id,
        student_id: student.id,
        joined_at: new Date(),
        left_at: null,
      },
    });

    const lesson = await prisma.lesson.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        title: `Lesson_${marker}_del`,
        status: 'PUBLISHED',
      },
    });
    lessonIds.push(lesson.id);

    const activity = await prisma.activity.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        kind: 'EXERCISE',
        title: `Activity_${marker}_del`,
        description: 'Activity will stay after event delete',
        status: 'PUBLISHED',
      },
    });
    activityIds.push(activity.id);

    // Create event linked to activity
    const event = await calendarRepository.createEventAtomically(
      teacher.id,
      classroomSubject.id,
      {
        title: 'Buổi kiểm tra',
        details: 'Kiểm tra 15p',
        eventType: 'EXAM',
        startsAt: '2026-11-25T08:00:00Z',
        activityId: activity.id,
      }
    );
    expect(event.activity_id).toBe(activity.id);

    await calendarRepository.publishEventAtomically(teacher.id, event.id);
    const eventNotification = await prisma.notification.findFirstOrThrow({
      where: {
        recipient_id: student.id,
        dedupe_key: `activity:${activity.id}`,
      },
    });
    notificationIds.push(eventNotification.id);

    // Delete calendar event
    await calendarRepository.deleteEventAtomically(teacher.id, event.id);

    // Verify calendar event is deleted
    const deletedEvent = await prisma.scheduleEvent.findUnique({
      where: { id: event.id },
    });
    expect(deletedEvent).toBeNull();

    // Verify linked activity STILL exists
    const preservedActivity = await prisma.activity.findUnique({
      where: { id: activity.id },
    });
    expect(preservedActivity).not.toBeNull();
    expect(preservedActivity?.id).toBe(activity.id);

    const deletedNotification = await prisma.notification.findUnique({
      where: { id: eventNotification.id },
    });
    expect(deletedNotification).toBeNull();

    // Verify lesson STILL exists
    const preservedLesson = await prisma.lesson.findUnique({
      where: { id: lesson.id },
    });
    expect(preservedLesson).not.toBeNull();
  });

  it('uses only published lessons and materials with processed versions as source segments', async () => {
    const teacher = await prisma.user.create({
      data: {
        username: `tea_${marker}_source`,
        password_hash: 'hash',
        full_name: 'Teacher Source Test',
        role: 'TEACHER',
        status: 'ACTIVE',
      },
    });
    userIds.push(teacher.id);

    const subject = await prisma.subject.create({ data: { name: `Sub_${marker}_source` } });
    subjectIds.push(subject.id);

    const classroom = await prisma.classroom.create({
      data: {
        name: `Class_${marker}_source`,
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

    const publishedLesson = await prisma.lesson.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        title: `Published lesson ${marker}`,
        status: 'PUBLISHED',
        published_at: new Date(),
      },
    });
    const draftLesson = await prisma.lesson.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        title: `Draft lesson ${marker}`,
        status: 'DRAFT',
      },
    });
    lessonIds.push(publishedLesson.id, draftLesson.id);

    const publishedMaterial = await prisma.learningMaterial.create({
      data: {
        lesson_id: publishedLesson.id,
        file_name: 'published.pdf',
        status: 'PUBLISHED',
        created_by_id: teacher.id,
      },
    });
    const draftMaterial = await prisma.learningMaterial.create({
      data: {
        lesson_id: draftLesson.id,
        file_name: 'draft.pdf',
        status: 'DRAFT',
        created_by_id: teacher.id,
      },
    });
    materialIds.push(publishedMaterial.id, draftMaterial.id);

    const publishedVersion = await prisma.materialVersion.create({
      data: {
        material_id: publishedMaterial.id,
        version_no: 1,
        storage_key: `be05/${marker}/published.pdf`,
        mime_type: 'application/pdf',
        byte_size: 100,
        processing_status: 'PROCESSED',
      },
    });
    const draftVersion = await prisma.materialVersion.create({
      data: {
        material_id: draftMaterial.id,
        version_no: 1,
        storage_key: `be05/${marker}/draft.pdf`,
        mime_type: 'application/pdf',
        byte_size: 100,
        processing_status: 'PROCESSED',
      },
    });
    materialVersionIds.push(publishedVersion.id, draftVersion.id);

    const publishedSegment = await prisma.materialSegment.create({
      data: {
        material_version_id: publishedVersion.id,
        position_type: 'PAGE',
        position_index: 1,
        position_label: 'Trang 1',
        ordinal: 1,
        content: 'Nguồn đã xuất bản',
        processing_status: 'PROCESSED',
      },
    });
    const draftSegment = await prisma.materialSegment.create({
      data: {
        material_version_id: draftVersion.id,
        position_type: 'PAGE',
        position_index: 1,
        position_label: 'Trang 1',
        ordinal: 1,
        content: 'Nguồn còn nháp',
        processing_status: 'PROCESSED',
      },
    });

    const eligibleSegments = await activityRepository.findEligibleSegments(
      classroomSubject.id,
      [publishedLesson.id, draftLesson.id]
    );

    expect(eligibleSegments.map((segment) => segment.id)).toEqual([publishedSegment.id]);

    const activity = await activityRepository.createActivityAtomically(
      teacher.id,
      classroomSubject.id,
      {
        title: 'Bài tập kiểm tra nguồn',
        description: '',
        exerciseType: 'QUIZ',
        difficulty: 'BASIC',
        lessonIds: [publishedLesson.id, draftLesson.id],
      }
    );
    if (!activity) throw new Error('Expected source test activity to be created');
    activityIds.push(activity.id);

    await expect(
      activityService.putQuestions(teacher.id, activity.id, {
        questions: [
          {
            prompt: 'Câu hỏi dùng nguồn còn nháp?',
            options: ['A', 'B'],
            answerKey: 'A',
            explanation: '',
            maxPoints: 1,
            lessonId: draftLesson.id,
            citations: [{ segmentId: draftSegment.id }],
          },
        ],
      })
    ).rejects.toThrow(/trích dẫn \(citation\) không hợp lệ/);

    await activityRepository.updateActivityAtomically(teacher.id, activity.id, {
      lessonIds: [publishedLesson.id],
    });
    await activityService.putQuestions(teacher.id, activity.id, {
      questions: [
        {
          prompt: 'Câu hỏi dùng nguồn đã xuất bản?',
          options: ['A', 'B'],
          answerKey: 'A',
          explanation: '',
          maxPoints: 1,
          lessonId: publishedLesson.id,
          citations: [{ segmentId: publishedSegment.id }],
        },
      ],
    });
    await prisma.learningMaterial.update({
      where: { id: publishedMaterial.id },
      data: { status: 'ARCHIVED' },
    });

    await expect(
      activityRepository.publishActivityAtomically(teacher.id, activity.id)
    ).rejects.toThrow(/nguồn trích dẫn không còn đủ điều kiện xuất bản/i);
  });
});
