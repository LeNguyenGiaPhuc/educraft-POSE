import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../../../backend/src/lib/prisma.js';
import { resultsService } from '../../../../backend/src/modules/teacher/results/results.service.js';
import { ForbiddenError } from '../../../../backend/src/shared/errors/app-error.js';

describe('Teacher results with synthetic student work (real PostgreSQL)', () => {
  const marker = randomUUID().slice(0, 8);
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    const teacher = await prisma.user.create({
      data: {
        username: `teacher_results_${marker}`,
        password_hash: 'test-only-hash',
        full_name: 'Teacher Results Test',
        role: 'TEACHER',
      },
    });
    ids.teacher = teacher.id;

    const student = await prisma.user.create({
      data: {
        username: `student_results_${marker}`,
        password_hash: 'test-only-hash',
        full_name: 'Student Results Test',
        role: 'STUDENT',
      },
    });
    ids.student = student.id;

    const subject = await prisma.subject.create({ data: { name: `History_${marker}` } });
    ids.subject = subject.id;
    await prisma.teacherProfile.create({
      data: {
        teacher_id: teacher.id,
        qualification: 'Test qualification',
        specialized_subject_id: subject.id,
      },
    });

    const classroom = await prisma.classroom.create({
      data: { name: `Results_${marker}`, grade_level: 11, academic_year: '2026-2027' },
    });
    ids.classroom = classroom.id;
    await prisma.classroomEnrollment.create({
      data: { student_id: student.id, classroom_id: classroom.id },
    });

    const classroomSubject = await prisma.classroomSubject.create({
      data: {
        classroom_id: classroom.id,
        subject_id: subject.id,
        teacher_id: teacher.id,
      },
    });
    ids.classroomSubject = classroomSubject.id;

    const lesson = await prisma.lesson.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        title: 'The first lesson',
        status: 'PUBLISHED',
        published_at: new Date('2026-11-01T00:00:00Z'),
      },
    });
    ids.lesson = lesson.id;

    const activity = await prisma.activity.create({
      data: {
        classroom_subject_id: classroomSubject.id,
        created_by_id: teacher.id,
        kind: 'EXERCISE',
        title: 'Lesson written exercise',
        description: 'Synthetic assigned work',
        status: 'PUBLISHED',
        published_at: new Date('2026-11-02T00:00:00Z'),
        closes_at: new Date('2026-11-30T00:00:00Z'),
      },
    });
    ids.activity = activity.id;
    await prisma.exerciseActivity.create({
      data: {
        activity_id: activity.id,
        exercise_type: 'WRITTEN',
        difficulty: 'BASIC',
        question_count: 1,
      },
    });
    await prisma.exerciseActivityLesson.create({
      data: { activity_id: activity.id, lesson_id: lesson.id },
    });
    const question = await prisma.question.create({
      data: {
        exercise_activity_id: activity.id,
        lesson_id: lesson.id,
        prompt: 'Explain the main idea of the lesson.',
        max_points: 10,
        marking_criteria: 'Mention the main idea and one supporting detail.',
        explanation: 'Synthetic explanation',
        sort_order: 1,
      },
    });
    ids.question = question.id;

    const submission = await prisma.exerciseSubmission.create({
      data: {
        student_id: student.id,
        activity_id: activity.id,
        submitted_at: new Date('2026-11-10T08:00:00Z'),
        grading_status: 'GRADED',
        total_score: 4,
        graded_at: new Date('2026-11-10T08:01:00Z'),
      },
    });
    ids.submission = submission.id;
    const answer = await prisma.studentAnswer.create({
      data: {
        question_id: question.id,
        exercise_submission_id: submission.id,
        answer: 'The main idea is a change in policy.',
        earned_points: 4,
        explanation: 'Partially correct',
        grading_status: 'GRADED',
      },
    });
    ids.answer = answer.id;
    const score = await prisma.lessonScoreResult.create({
      data: {
        student_id: student.id,
        classroom_subject_id: classroomSubject.id,
        lesson_id: lesson.id,
        stream: 'ASSIGNED',
        exercise_submission_id: submission.id,
        earned_points: 4,
        max_points: 10,
        occurred_at: submission.submitted_at,
        graded_at: submission.graded_at!,
      },
    });
    ids.score = score.id;
    await prisma.studentLessonProgress.create({
      data: {
        student_id: student.id,
        lesson_id: lesson.id,
        stream: 'ASSIGNED',
        has_difficulty: true,
        last_result_id: score.id,
      },
    });

    const topic = await prisma.subjectPromptTopic.create({
      data: {
        student_id: student.id,
        classroom_subject_id: classroomSubject.id,
        period_start: new Date('2026-11-01T00:00:00Z'),
        period_end: new Date('2026-11-30T00:00:00Z'),
        topics: [{ label: 'Đổi mới', count: 2 }],
        prompt_count: 2,
      },
    });
    ids.topic = topic.id;
  });

  afterAll(async () => {
    try {
      if (ids.topic) await prisma.subjectPromptTopic.delete({ where: { id: ids.topic } });
      if (ids.student && ids.lesson) {
        await prisma.studentLessonProgress.deleteMany({
          where: { student_id: ids.student, lesson_id: ids.lesson },
        });
      }
      if (ids.score) await prisma.lessonScoreResult.delete({ where: { id: ids.score } });
      if (ids.answer) await prisma.studentAnswer.delete({ where: { id: ids.answer } });
      if (ids.submission) await prisma.exerciseSubmission.delete({ where: { id: ids.submission } });
      if (ids.question) await prisma.question.delete({ where: { id: ids.question } });
      if (ids.activity && ids.lesson) {
        await prisma.exerciseActivityLesson.deleteMany({
          where: { activity_id: ids.activity, lesson_id: ids.lesson },
        });
      }
      if (ids.activity) {
        await prisma.exerciseActivity.delete({ where: { activity_id: ids.activity } });
        await prisma.activity.delete({ where: { id: ids.activity } });
      }
      if (ids.lesson) await prisma.lesson.delete({ where: { id: ids.lesson } });
      if (ids.classroomSubject) {
        await prisma.classroomSubject.delete({ where: { id: ids.classroomSubject } });
      }
      if (ids.classroom) {
        await prisma.classroomEnrollment.deleteMany({ where: { classroom_id: ids.classroom } });
        await prisma.classroom.delete({ where: { id: ids.classroom } });
      }
      if (ids.teacher) await prisma.teacherProfile.delete({ where: { teacher_id: ids.teacher } });
      if (ids.teacher) await prisma.user.delete({ where: { id: ids.teacher } });
      if (ids.student) await prisma.user.delete({ where: { id: ids.student } });
      if (ids.subject) await prisma.subject.delete({ where: { id: ids.subject } });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('shows a graded submission and its assigned-work difficulty to the assigned teacher', async () => {
    const submissions = await resultsService.listSubmissions(ids.teacher, ids.classroomSubject, {
      page: 1,
      pageSize: 20,
    });
    const progress = await resultsService.getStudentProgress(
      ids.teacher,
      ids.classroomSubject,
      ids.student
    );

    expect(submissions.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: ids.submission, status: 'GRADED' }),
    ]));
    expect(progress.lessons).toEqual([
      expect.objectContaining({
        lessonId: ids.lesson,
        hasDifficulty: true,
        results: [expect.objectContaining({ percentage: 40 })],
      }),
    ]);

    const result = await resultsService.getExerciseResult(ids.teacher, ids.submission);
    expect(result.answers).toEqual([
      expect.objectContaining({ questionId: ids.question, earnedPoints: 4 }),
    ]);
  });

  it('shows only aggregated asked topics to the assigned teacher', async () => {
    const result = await resultsService.getPromptTopics(ids.teacher, ids.classroomSubject, {
      studentId: ids.student,
      periodStart: '2026-11-01',
      periodEnd: '2026-11-30',
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        student: expect.objectContaining({ id: ids.student }),
        promptCount: 2,
        topics: [{ label: 'Đổi mới', count: 2 }],
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain('prompt_text');
  });

  it('rejects an unassigned teacher before reading student progress', async () => {
    await expect(resultsService.getStudentProgress(
      randomUUID(),
      ids.classroomSubject,
      ids.student
    )).rejects.toThrow(ForbiddenError);
  });
});
