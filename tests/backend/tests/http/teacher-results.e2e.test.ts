import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../backend/src/app.js';
import { sessionService } from '../../../../backend/src/modules/auth/session.service.js';
import { resultsService } from '../../../../backend/src/modules/teacher/results/results.service.js';

describe('Teacher Results API (E2E)', () => {
  const app = createApp();

  const mockTeacherUser = {
    id: 't1111111-1111-4111-8111-111111111111',
    username: 'teacher',
    fullName: 'Cô Lịch Sử',
    role: 'TEACHER' as const,
    status: 'ACTIVE' as const,
    contact: null,
    mustChangePassword: false,
    sessionId: 'session-teacher',
  };

  const mockStudentUser = {
    id: 's1111111-1111-4111-8111-111111111111',
    username: 'student',
    fullName: 'Học sinh',
    role: 'STUDENT' as const,
    status: 'ACTIVE' as const,
    contact: null,
    mustChangePassword: false,
    sessionId: 'session-student',
  };

  const classroomSubjectId = 'a1111111-1111-4111-8111-111111111111';
  const studentId = 'a2222222-2222-4222-8222-222222222222';
  const exerciseSubmissionId = 'b3333333-3333-4333-8333-333333333333';
  const notebookSubmissionId = 'c4444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const response = await request(app).get(
      `/api/v1/teacher/classroom-subjects/${classroomSubjectId}/submissions`
    );

    expect(response.status).toBe(401);
  });

  it('rejects student requests with 403', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockStudentUser);

    const response = await request(app)
      .get(`/api/v1/teacher/classroom-subjects/${classroomSubjectId}/statistics`)
      .set('Cookie', ['educraft_session=mock_cookie']);

    expect(response.status).toBe(403);
  });

  describe('authenticated as TEACHER', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockTeacherUser);
    });

    it('lists submissions with filters and pagination metadata', async () => {
      vi.spyOn(resultsService, 'listSubmissions').mockResolvedValue({
        items: [
          {
            id: exerciseSubmissionId,
            kind: 'EXERCISE',
            activityId: 'd5555555-5555-4555-8555-555555555555',
            activityTitle: 'Ôn tập chương 1',
            student: {
              id: studentId,
              username: 'student_a',
              fullName: 'Nguyễn Văn A',
            },
            submittedAt: '2026-11-15T08:00:00.000Z',
            status: 'GRADED',
            score: 8,
            gradedAt: '2026-11-15T08:10:00.000Z',
          },
        ],
        total: 3,
      });

      const response = await request(app)
        .get(`/api/v1/teacher/classroom-subjects/${classroomSubjectId}/submissions`)
        .query({ page: 2, pageSize: 1, kind: 'EXERCISE', studentId })
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta).toEqual({
        page: 2,
        pageSize: 1,
        totalItems: 3,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      });
      expect(resultsService.listSubmissions).toHaveBeenCalledWith(
        mockTeacherUser.id,
        classroomSubjectId,
        expect.objectContaining({ page: 2, pageSize: 1, kind: 'EXERCISE' })
      );
    });

    it('returns an exercise result', async () => {
      vi.spyOn(resultsService, 'getExerciseResult').mockResolvedValue({
        id: exerciseSubmissionId,
        kind: 'EXERCISE',
        totalScore: 8,
        answers: [],
      } as any);

      const response = await request(app)
        .get(`/api/v1/teacher/exercise-submissions/${exerciseSubmissionId}/result`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(exerciseSubmissionId);
      expect(response.body.data.totalScore).toBe(8);
    });

    it('returns a notebook result without exposing private analysis fields', async () => {
      vi.spyOn(resultsService, 'getNotebookResult').mockResolvedValue({
        id: notebookSubmissionId,
        kind: 'NOTEBOOK_CHECK',
        status: 'LOCKED',
        processingStatus: 'PROCESSED',
        assessment: null,
      } as any);

      const response = await request(app)
        .get(`/api/v1/teacher/notebook-submissions/${notebookSubmissionId}/result`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(response.status).toBe(200);
      expect(response.body.data.assessment).toBeNull();
      expect(response.body.data.storage_key).toBeUndefined();
      expect(response.body.data.aiDraft).toBeUndefined();
    });

    it('returns class statistics', async () => {
      vi.spyOn(resultsService, 'getStatistics').mockResolvedValue({
        studentCount: 30,
        exercise: { activityCount: 2, submittedSubmissions: 20 },
        notebook: { activityCount: 1, submittedSubmissions: 15 },
      } as any);

      const response = await request(app)
        .get(`/api/v1/teacher/classroom-subjects/${classroomSubjectId}/statistics`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(response.status).toBe(200);
      expect(response.body.data.studentCount).toBe(30);
      expect(response.body.data.exercise.activityCount).toBe(2);
    });

    it('returns one student assigned-work progress', async () => {
      vi.spyOn(resultsService, 'getStudentProgress').mockResolvedValue({
        student: { id: studentId, fullName: 'Nguyễn Văn A' },
        lessons: [],
      } as any);

      const response = await request(app)
        .get(
          `/api/v1/teacher/classroom-subjects/${classroomSubjectId}/students/${studentId}/progress`
        )
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(response.status).toBe(200);
      expect(response.body.data.student.id).toBe(studentId);
    });

    it('returns aggregate prompt topics and validates date filters', async () => {
      vi.spyOn(resultsService, 'getPromptTopics').mockResolvedValue({
        items: [
          {
            id: 'e6666666-6666-4666-8666-666666666666',
            topics: [{ label: 'Đổi mới', count: 4 }],
          },
        ],
      } as any);

      const response = await request(app)
        .get(`/api/v1/teacher/classroom-subjects/${classroomSubjectId}/prompt-topics`)
        .query({ periodStart: '2026-11-01', periodEnd: '2026-11-30' })
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(response.status).toBe(200);
      expect(response.body.data.items[0].topics[0].label).toBe('Đổi mới');

      const invalidResponse = await request(app)
        .get(`/api/v1/teacher/classroom-subjects/${classroomSubjectId}/prompt-topics`)
        .query({ periodStart: '2026-12-01', periodEnd: '2026-11-01' })
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(invalidResponse.status).toBe(400);
      expect(resultsService.getPromptTopics).toHaveBeenCalledTimes(1);
    });
  });
});
