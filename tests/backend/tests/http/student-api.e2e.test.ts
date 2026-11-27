import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../backend/src/app.js';
import { sessionService } from '../../../../backend/src/modules/auth/session.service.js';
import { studentService } from '../../../../backend/src/modules/student/student.service.js';

describe('Student API (E2E)', () => {
  const app = createApp();
  const student = {
    id: 'student-uuid',
    username: 'student@demo.educraft',
    fullName: 'Học sinh mẫu',
    role: 'STUDENT' as const,
    status: 'ACTIVE' as const,
    contact: null,
    mustChangePassword: false,
    sessionId: 'student-session',
  };
  const teacher = {
    ...student,
    id: 'teacher-uuid',
    role: 'TEACHER' as const,
  };
  const activityId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const questionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const subjectId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const classroomId = '12121212-1212-4121-8121-121212121212';
  const lessonId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const conversationId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const notificationId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  const submissionId = '99999999-9999-4999-8999-999999999999';

  beforeEach(() => vi.restoreAllMocks());

  it('rejects unauthenticated requests', async () => {
    const response = await request(app).get('/api/v1/student/workspace');
    expect(response.status).toBe(401);
  });

  it('rejects authenticated non-student roles', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(teacher);
    const response = await request(app)
      .get('/api/v1/student/workspace')
      .set('Cookie', ['educraft_session=mock_cookie']);
    expect(response.status).toBe(403);
  });

  describe('authenticated as STUDENT', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(student);
    });

    it('returns the authenticated student workspace from the backend service', async () => {
      const workspace = {
        student: { id: student.id, username: student.username, name: student.fullName },
        current: null,
        history: [],
      };
      const service = vi.spyOn(studentService, 'getWorkspace').mockResolvedValue(workspace);

      const response = await request(app)
        .get('/api/v1/student/workspace')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(workspace);
      expect(service).toHaveBeenCalledWith(student.id);
    });

    it('serves each Student read page through its backend API', async () => {
      const routes = [
        { path: '/activities', service: vi.spyOn(studentService, 'listActivities').mockResolvedValue([]) },
        { path: '/results', service: vi.spyOn(studentService, 'listResults').mockResolvedValue({} as never) },
        { path: '/profile', service: vi.spyOn(studentService, 'getProfile').mockResolvedValue({} as never) },
        { path: '/calendar', service: vi.spyOn(studentService, 'getCalendar').mockResolvedValue({} as never) },
        { path: '/conversations', service: vi.spyOn(studentService, 'listConversations').mockResolvedValue([]) },
      ];

      for (const route of routes) {
        const response = await request(app)
          .get(`/api/v1/student${route.path}`)
          .set('Cookie', ['educraft_session=mock_cookie']);
        expect(response.status).toBe(200);
        expect(route.service).toHaveBeenCalledWith(student.id);
      }
    });

    it('rejects malformed lesson IDs before accessing student data', async () => {
      const service = vi.spyOn(studentService, 'getLesson');

      const response = await request(app)
        .get('/api/v1/student/lessons/not-a-uuid')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(response.status).toBe(400);
      expect(service).not.toHaveBeenCalled();
    });

    it('rejects practice sessions without lessons', async () => {
      const service = vi.spyOn(studentService, 'createPracticeSession');

      const response = await request(app)
        .post('/api/v1/student/practice-sessions')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          classroomSubjectId: subjectId,
          lessonIds: [],
          exerciseType: 'QUIZ',
          difficulty: 'BASIC',
          questionCount: 5,
        });

      expect(response.status).toBe(400);
      expect(service).not.toHaveBeenCalled();
    });

    it('sends exercise submissions to the backend with the authenticated student ID', async () => {
      const submission = { id: 'submission-id', submittedAt: new Date().toISOString(), gradingStatus: 'PENDING' };
      const service = vi.spyOn(studentService, 'submitExercise').mockResolvedValue(submission as never);

      const response = await request(app)
        .post(`/api/v1/student/activities/${activityId}/submissions`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ answers: [{ questionId, answer: 'Câu trả lời' }] });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(submission);
      expect(service).toHaveBeenCalledWith(student.id, activityId, {
        answers: [{ questionId, answer: 'Câu trả lời' }],
      });
    });

    it('creates a conversation only for the requested classroom and student session', async () => {
      const conversation = { id: conversationId, classroom_id: classroomId, updated_at: new Date() };
      const service = vi.spyOn(studentService, 'createConversation').mockResolvedValue(conversation as never);

      const response = await request(app)
        .post('/api/v1/student/conversations')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ classroomId });

      expect(response.status).toBe(200);
      expect(service).toHaveBeenCalledWith(student.id, classroomId);
    });

    it('passes chat prompts and optional subject context to the Student backend', async () => {
      const service = vi.spyOn(studentService, 'sendChatTurn').mockResolvedValue({ id: 'turn-id' } as never);

      const response = await request(app)
        .post(`/api/v1/student/conversations/${conversationId}/turns`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ question: 'Giải thích bài học', classroomSubjectId: subjectId });

      expect(response.status).toBe(200);
      expect(service).toHaveBeenCalledWith(student.id, conversationId, {
        question: 'Giải thích bài học',
        classroomSubjectId: subjectId,
      });
    });

    it('creates a practice session with validated Student input', async () => {
      const service = vi.spyOn(studentService, 'createPracticeSession').mockResolvedValue({ id: 'practice-id' } as never);
      const input = {
        classroomSubjectId: subjectId,
        lessonIds: [lessonId],
        exerciseType: 'QUIZ',
        difficulty: 'BASIC',
        questionCount: 5,
      };

      const response = await request(app)
        .post('/api/v1/student/practice-sessions')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send(input);

      expect(response.status).toBe(200);
      expect(service).toHaveBeenCalledWith(student.id, input);
    });

    it('stores notebook files only after rejecting unsupported upload formats', async () => {
      const service = vi.spyOn(studentService, 'saveNotebookImages');

      const response = await request(app)
        .post(`/api/v1/student/activities/${activityId}/notebook-submissions`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .field('mode', 'replace')
        .attach('images', Buffer.from('not an image'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
      expect(service).not.toHaveBeenCalled();
    });

    it('returns private notebook image bytes through the authenticated file route', async () => {
      const bytes = Buffer.from('private-image');
      vi.spyOn(studentService, 'getNotebookFile').mockResolvedValue({ buffer: bytes, mimeType: 'image/png' });

      const response = await request(app)
        .get(`/api/v1/student/notebook-submissions/${submissionId}/files/${questionId}`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.body).toEqual(bytes);
    });

    it('updates a notification read state for the authenticated student', async () => {
      const service = vi.spyOn(studentService, 'markNotificationRead').mockResolvedValue({ id: notificationId, read: true } as never);

      const response = await request(app)
        .patch(`/api/v1/student/notifications/${notificationId}/read`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ read: true });

      expect(response.status).toBe(200);
      expect(service).toHaveBeenCalledWith(student.id, notificationId, true);
    });

    it('rejects oversized chat input at the API boundary', async () => {
      const service = vi.spyOn(studentService, 'sendChatTurn');

      const response = await request(app)
        .post(`/api/v1/student/conversations/${activityId}/turns`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ question: 'a'.repeat(2001), classroomSubjectId: subjectId });

      expect(response.status).toBe(400);
      expect(service).not.toHaveBeenCalled();
    });

    it('rejects answers for a practice submission when a required question ID is invalid', async () => {
      const service = vi.spyOn(studentService, 'submitPracticeSession');

      const response = await request(app)
        .post(`/api/v1/student/practice-sessions/${lessonId}/submissions`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ answers: [{ questionId: 'invalid-id', answer: 'A' }] });

      expect(response.status).toBe(400);
      expect(service).not.toHaveBeenCalled();
    });
  });
});
