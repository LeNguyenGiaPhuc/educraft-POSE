import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestError, NotFoundError } from '../../../../../../backend/src/shared/errors/app-error.js';
import * as teacherSubjectPolicy from '../../../../../../backend/src/modules/teacher/access/teacher-subject.policy.js';
import { resultsRepository } from '../../../../../../backend/src/modules/teacher/results/results.repository.js';
import { resultsService } from '../../../../../../backend/src/modules/teacher/results/results.service.js';

describe('ResultsService', () => {
  const context = {
    classroomSubjectId: 'cs-1',
    classroomId: 'class-1',
    classroomName: '11A1',
    classroomStatus: 'ACTIVE' as const,
    academicYear: '2026-2027',
    gradeLevel: 11,
    subjectId: 'subject-1',
    subjectName: 'Lịch sử',
    teacherId: 'teacher-1',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns statistics in the assigned subject scope', async () => {
    vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(context);
    vi.spyOn(resultsRepository, 'findStatistics').mockResolvedValue({
      studentCount: 2,
      exercise: {
        activityCount: 1,
        expectedSubmissions: 2,
        submittedSubmissions: 1,
        gradedSubmissions: 1,
        pendingSubmissions: 0,
        failedSubmissions: 0,
        averageScore: 8,
        submissionRate: 0.5,
      },
      notebook: {
        activityCount: 0,
        periodCount: 0,
        expectedSubmissions: 0,
        submittedSubmissions: 0,
        finalizedSubmissions: 0,
        pendingSubmissions: 0,
        submissionRate: null,
        finalizationRate: null,
        criteria: [],
      },
    });

    const result = await resultsService.getStatistics('teacher-1', 'cs-1', {});

    expect(result.classroomSubject.id).toBe('cs-1');
    expect(result.studentCount).toBe(2);
    expect(resultsRepository.findStatistics).toHaveBeenCalledWith('class-1', 'cs-1', {});
  });

  it('groups assigned progress by lesson and keeps difficulty state', async () => {
    vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(context);
    vi.spyOn(resultsRepository, 'findStudentInClassroom').mockResolvedValue({
      student: {
        id: 'student-1',
        username: 'student',
        full_name: 'Nguyễn Văn A',
        status: 'ACTIVE',
      },
    } as any);
    vi.spyOn(resultsRepository, 'findProgress').mockResolvedValue({
      scoreResults: [
        {
          id: 'score-1',
          lesson_id: 'lesson-1',
          exercise_submission_id: 'submission-1',
          earned_points: 4,
          max_points: 10,
          occurred_at: new Date('2026-11-15T08:00:00Z'),
          graded_at: new Date('2026-11-15T08:10:00Z'),
          lesson: { id: 'lesson-1', title: 'Bài 1' },
        },
      ],
      lessonProgress: [
        {
          lesson_id: 'lesson-1',
          has_difficulty: true,
          last_result_id: 'score-1',
          updated_at: new Date('2026-11-15T08:10:00Z'),
        },
      ],
    } as any);

    const result = await resultsService.getStudentProgress('teacher-1', 'cs-1', 'student-1');

    expect(result.lessons).toHaveLength(1);
    expect(result.lessons[0].hasDifficulty).toBe(true);
    expect(result.lessons[0].results[0].percentage).toBe(40);
  });

  it('does not expose prompt topics for an archived class', async () => {
    vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue({
      ...context,
      classroomStatus: 'ARCHIVED',
    });
    vi.spyOn(resultsRepository, 'findPromptTopics');

    await expect(resultsService.getPromptTopics('teacher-1', 'cs-1', {})).rejects.toThrow(
      BadRequestError
    );
    expect(resultsRepository.findPromptTopics).not.toHaveBeenCalled();
  });

  it('rejects a student outside the assigned classroom', async () => {
    vi.spyOn(teacherSubjectPolicy, 'requireAssignedSubject').mockResolvedValue(context);
    vi.spyOn(resultsRepository, 'findStudentInClassroom').mockResolvedValue(null);
    vi.spyOn(resultsRepository, 'findProgress');

    await expect(
      resultsService.getStudentProgress('teacher-1', 'cs-1', 'student-outside')
    ).rejects.toThrow(NotFoundError);
    expect(resultsRepository.findProgress).not.toHaveBeenCalled();
  });
});
