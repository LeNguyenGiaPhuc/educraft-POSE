import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../backend/src/app.js';
import { sessionService } from '../../../../backend/src/modules/auth/session.service.js';
import { activityService } from '../../../../backend/src/modules/teacher/activities/activity.service.js';

describe('Teacher Activities API (E2E)', () => {
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

  const sampleClassroomSubjectId = 'a1111111-1111-4111-8111-111111111111';
  const sampleActivityId = 'b2222222-2222-4222-8222-222222222222';
  const sampleLessonId = 'c3333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get(
      `/api/v1/teacher/classroom-subjects/${sampleClassroomSubjectId}/activities`
    );
    expect(res.status).toBe(401);
  });

  it('rejects student requests with 403 Forbidden', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockStudentUser);

    const res = await request(app)
      .get(`/api/v1/teacher/classroom-subjects/${sampleClassroomSubjectId}/activities`)
      .set('Cookie', ['educraft_session=mock_cookie']);

    expect(res.status).toBe(403);
  });

  describe('Authenticated as TEACHER', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockTeacherUser);
    });

    it('GET /classroom-subjects/:id/activities returns list with 200', async () => {
      vi.spyOn(activityService, 'listActivities').mockResolvedValue([
        {
          id: sampleActivityId,
          title: 'Kiểm tra 15 phút',
          status: 'DRAFT',
          kind: 'EXERCISE',
          exercise: {
            exercise_type: 'QUIZ',
            difficulty: 'BASIC',
            question_count: 5,
            _count: { submissions: 0, questions: 5 },
          },
        } as any,
      ]);

      const res = await request(app)
        .get(`/api/v1/teacher/classroom-subjects/${sampleClassroomSubjectId}/activities`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Kiểm tra 15 phút');
    });

    it('POST /classroom-subjects/:id/activities is removed to prevent empty drafts', async () => {
      const res = await request(app)
        .post(`/api/v1/teacher/classroom-subjects/${sampleClassroomSubjectId}/activities`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          title: 'Bài tập mới',
          description: 'Làm trước ngày mai',
          exerciseType: 'QUIZ',
          difficulty: 'BASIC',
          lessonIds: [sampleLessonId],
        });

      expect(res.status).toBe(404);
    });

    it('POST /classroom-subjects/:id/activities remains unavailable for invalid input', async () => {
      const res = await request(app)
        .post(`/api/v1/teacher/classroom-subjects/${sampleClassroomSubjectId}/activities`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          title: '', // invalid empty
          exerciseType: 'INVALID_TYPE',
        });

      expect(res.status).toBe(404);
    });

    it('GET /activities/:id returns detail with 200', async () => {
      vi.spyOn(activityService, 'getActivityDetail').mockResolvedValue({
        id: sampleActivityId,
        title: 'Chi tiết bài tập',
        status: 'DRAFT',
        exercise: {
          questions: [],
        },
      } as any);

      const res = await request(app)
        .get(`/api/v1/teacher/activities/${sampleActivityId}`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Chi tiết bài tập');
    });

    it('PATCH /activities/:id updates activity with 200', async () => {
      vi.spyOn(activityService, 'updateActivity').mockResolvedValue({
        id: sampleActivityId,
        title: 'Tiêu đề đã đổi',
      } as any);

      const res = await request(app)
        .patch(`/api/v1/teacher/activities/${sampleActivityId}`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          title: 'Tiêu đề đã đổi',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Tiêu đề đã đổi');
    });

    it('PUT /activities/:id/exercise-content updates metadata and questions atomically', async () => {
      vi.spyOn(activityService, 'updateExerciseContent').mockResolvedValue({
        id: sampleActivityId,
        title: 'Hoạt động đã cập nhật',
      } as any);

      const res = await request(app)
        .put(`/api/v1/teacher/activities/${sampleActivityId}/exercise-content`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          title: 'Hoạt động đã cập nhật',
          description: 'Mô tả mới',
          difficulty: 'ADVANCED',
          lessonIds: [sampleLessonId],
          closesAt: null,
          questions: [{
            prompt: 'Câu hỏi?',
            options: ['A', 'B', 'C', 'D'],
            answerKey: 'A',
            explanation: 'Giải thích',
            maxPoints: 1,
            lessonId: sampleLessonId,
            citations: [],
          }],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Hoạt động đã cập nhật');
      expect(activityService.updateExerciseContent).toHaveBeenCalledWith(
        mockTeacherUser.id,
        sampleActivityId,
        expect.objectContaining({ difficulty: 'ADVANCED' })
      );
    });

    it('DELETE /activities/:id deletes activity with 200', async () => {
      vi.spyOn(activityService, 'deleteActivity').mockResolvedValue({
        success: true,
      } as any);

      const res = await request(app)
        .delete(`/api/v1/teacher/activities/${sampleActivityId}`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('POST /activities/:id/ai-draft calls AI draft service with 200', async () => {
      vi.spyOn(activityService, 'generateAiDraft').mockResolvedValue({
        status: 'READY',
        questions: [
          {
            prompt: 'Câu hỏi sinh bởi AI',
            options: ['A', 'B'],
            answerKey: 'A',
            explanation: 'Giải thích',
            maxPoints: 1.0,
            lessonId: sampleLessonId,
            citations: [],
          },
        ],
      });

      const res = await request(app)
        .post(`/api/v1/teacher/activities/${sampleActivityId}/ai-draft`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          lessonIds: [sampleLessonId],
          questionCount: 1,
          difficulty: 'BASIC',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('READY');
      expect(res.body.data.questions).toHaveLength(1);
    });

    it('POST /classroom-subjects/:id/exercise-drafts generates without an activity id', async () => {
      vi.spyOn(activityService, 'generateExerciseDraft').mockResolvedValue({ status: 'READY', questions: [] });

      const res = await request(app)
        .post(`/api/v1/teacher/classroom-subjects/${sampleClassroomSubjectId}/exercise-drafts`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          exerciseType: 'QUIZ',
          lessonIds: [sampleLessonId],
          questionCount: 1,
          difficulty: 'BASIC',
          instructions: 'Tập trung mốc thời gian',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('READY');
      expect(activityService.generateExerciseDraft).toHaveBeenCalledWith(
        mockTeacherUser.id,
        sampleClassroomSubjectId,
        expect.objectContaining({ instructions: 'Tập trung mốc thời gian' })
      );
    });

    it('POST /classroom-subjects/:id/exercise-activities/publish calls atomic publish service', async () => {
      vi.spyOn(activityService, 'publishExerciseActivity').mockResolvedValue({ id: sampleActivityId, status: 'PUBLISHED' } as any);

      const res = await request(app)
        .post(`/api/v1/teacher/classroom-subjects/${sampleClassroomSubjectId}/exercise-activities/publish`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          title: 'Quiz mới', description: 'Ôn tập', exerciseType: 'QUIZ', difficulty: 'BASIC',
          lessonIds: [sampleLessonId], closesAt: null,
          questions: [{
            prompt: 'Câu hỏi?', options: ['A', 'B', 'C', 'D'], answerKey: 'A', explanation: 'Giải thích', maxPoints: 1,
            lessonId: sampleLessonId, citations: [{ segmentId: sampleLessonId, excerpt: 'Nguồn' }],
          }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PUBLISHED');
    });

    it('POST /activities/:id/ai-draft rejects more than 20 questions', async () => {
      const res = await request(app)
        .post(`/api/v1/teacher/activities/${sampleActivityId}/ai-draft`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          lessonIds: [sampleLessonId],
          questionCount: 21,
          difficulty: 'BASIC',
        });

      expect(res.status).toBe(400);
    });

    it('PUT /activities/:id/questions updates questions with 200', async () => {
      vi.spyOn(activityService, 'putQuestions').mockResolvedValue({
        id: sampleActivityId,
        title: 'Hoạt động đã có câu hỏi',
      } as any);

      const res = await request(app)
        .put(`/api/v1/teacher/activities/${sampleActivityId}/questions`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          questions: [
            {
              prompt: 'Câu 1?',
              options: ['A', 'B'],
              answerKey: 'A',
              explanation: 'Giải thích',
              maxPoints: 2,
              lessonId: sampleLessonId,
              citations: [],
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(sampleActivityId);
    });

    it('POST /activities/:id/publish publishes activity with 200', async () => {
      vi.spyOn(activityService, 'publishActivity').mockResolvedValue({
        id: sampleActivityId,
        status: 'PUBLISHED',
      } as any);

      const res = await request(app)
        .post(`/api/v1/teacher/activities/${sampleActivityId}/publish`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
    });

    it('POST /activities/:id/close closes activity with 200', async () => {
      vi.spyOn(activityService, 'closeActivity').mockResolvedValue({
        id: sampleActivityId,
        status: 'CLOSED',
      } as any);

      const res = await request(app)
        .post(`/api/v1/teacher/activities/${sampleActivityId}/close`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CLOSED');
    });

    it('POST /activities/:id/reopen reopens activity with 200', async () => {
      vi.spyOn(activityService, 'reopenActivity').mockResolvedValue({
        id: sampleActivityId,
        status: 'PUBLISHED',
      } as any);

      const res = await request(app)
        .post(`/api/v1/teacher/activities/${sampleActivityId}/reopen`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          closesAt: '2026-12-31T23:59:59.000Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
    });

    it('GET /activities/:id/submissions returns submissions list with 200', async () => {
      vi.spyOn(activityService, 'getSubmissions').mockResolvedValue([
        {
          id: 'sub-1',
          student: { full_name: 'Nguyễn Văn A', username: 'student_a' },
          total_score: 10,
        } as any,
      ]);

      const res = await request(app)
        .get(`/api/v1/teacher/activities/${sampleActivityId}/submissions`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].student.full_name).toBe('Nguyễn Văn A');
    });
  });
});
