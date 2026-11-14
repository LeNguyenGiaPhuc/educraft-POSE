import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { sessionService } from '../../src/modules/auth/session.service.js';
import { calendarService } from '../../src/modules/teacher/calendar/calendar.service.js';

describe('Teacher Calendar API (E2E)', () => {
  const app = createApp();

  const mockTeacherUser = {
    id: 'teacher-uuid',
    username: 'teacher',
    fullName: 'Cô Lịch Sử',
    role: 'TEACHER' as const,
    status: 'ACTIVE' as const,
    contact: null,
    mustChangePassword: false,
    sessionId: 'session-teacher',
  };

  const mockStudentUser = {
    id: 'student-uuid',
    username: 'student',
    fullName: 'Học sinh',
    role: 'STUDENT' as const,
    status: 'ACTIVE' as const,
    contact: null,
    mustChangePassword: false,
    sessionId: 'session-student',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/teacher/calendar-events?from=2026-11-01T00:00:00Z&to=2026-11-30T00:00:00Z');
    expect(res.status).toBe(401);
  });

  it('rejects student requests with 403 Forbidden', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockStudentUser);

    const res = await request(app)
      .get('/api/v1/teacher/calendar-events?from=2026-11-01T00:00:00Z&to=2026-11-30T00:00:00Z')
      .set('Cookie', ['educraft_session=mock_cookie']);

    expect(res.status).toBe(403);
  });

  describe('Authenticated as TEACHER', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockTeacherUser);
    });

    it('rejects calendar query with missing dates with 400', async () => {
      const res = await request(app)
        .get('/api/v1/teacher/calendar-events')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /calendar-events returns list of events with 200', async () => {
      vi.spyOn(calendarService, 'listCalendarEvents').mockResolvedValue([
        {
          id: 'evt-1',
          classroomSubjectId: 'c1111111-1111-4111-8111-111111111111',
          classroomId: 'c2222222-2222-4222-8222-222222222222',
          classroomName: '10A1',
          academicYear: '2026-2027',
          gradeLevel: 10,
          subjectId: 's1111111-1111-4111-8111-111111111111',
          subjectName: 'Lịch sử',
          title: 'Tiết 1: Khởi nghĩa Lam Sơn',
          details: 'Đọc trước tài liệu',
          eventType: 'LESSON',
          startsAt: '2026-11-20T08:00:00.000Z',
          publishedAt: null,
          createdAt: '2026-11-13T00:00:00.000Z',
          lessonId: null,
          lessonTitle: null,
          activityId: null,
          activityTitle: null,
          activityKind: null,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/teacher/calendar-events?from=2026-11-01T00:00:00.000Z&to=2026-11-30T00:00:00.000Z')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Tiết 1: Khởi nghĩa Lam Sơn');
    });

    it('POST /classroom-subjects/:id/calendar-events creates event with 201', async () => {
      vi.spyOn(calendarService, 'createCalendarEvent').mockResolvedValue({
        id: 'evt-new',
        classroomSubjectId: 'c1111111-1111-4111-8111-111111111111',
        classroomId: 'c2222222-2222-4222-8222-222222222222',
        classroomName: '10A1',
        academicYear: '2026-2027',
        gradeLevel: 10,
        subjectId: 's1111111-1111-4111-8111-111111111111',
        subjectName: 'Lịch sử',
        title: 'Kiểm tra 15 phút',
        details: 'Chương 1',
        eventType: 'EXAM',
        startsAt: '2026-11-25T08:00:00.000Z',
        publishedAt: null,
        createdAt: '2026-11-13T00:00:00.000Z',
        lessonId: null,
        lessonTitle: null,
        activityId: null,
        activityTitle: null,
        activityKind: null,
      });

      const res = await request(app)
        .post('/api/v1/teacher/classroom-subjects/c1111111-1111-4111-8111-111111111111/calendar-events')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          title: 'Kiểm tra 15 phút',
          details: 'Chương 1',
          eventType: 'EXAM',
          startsAt: '2026-11-25T08:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('evt-new');
    });

    it('rejects creating event with both lessonId and activityId with 400', async () => {
      const res = await request(app)
        .post('/api/v1/teacher/classroom-subjects/c1111111-1111-4111-8111-111111111111/calendar-events')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          title: 'Conflicting event',
          startsAt: '2026-11-25T08:00:00.000Z',
          lessonId: 'l1111111-1111-4111-8111-111111111111',
          activityId: 'a1111111-1111-4111-8111-111111111111',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /calendar-events/:id returns event detail', async () => {
      vi.spyOn(calendarService, 'getCalendarEventDetail').mockResolvedValue({
        id: 'e1111111-1111-4111-8111-111111111111',
        classroomSubjectId: 'cs-1',
        classroomId: 'cls-1',
        classroomName: '10A1',
        academicYear: '2026-2027',
        gradeLevel: 10,
        subjectId: 'sub-1',
        subjectName: 'Lịch sử',
        title: 'Chi tiết sự kiện',
        details: 'Ghi chú',
        eventType: 'LESSON',
        startsAt: '2026-11-20T08:00:00.000Z',
        publishedAt: null,
        createdAt: '2026-11-13T00:00:00.000Z',
        lessonId: null,
        lessonTitle: null,
        activityId: null,
        activityTitle: null,
        activityKind: null,
      });

      const res = await request(app)
        .get('/api/v1/teacher/calendar-events/e1111111-1111-4111-8111-111111111111')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Chi tiết sự kiện');
    });

    it('PATCH /calendar-events/:id updates event', async () => {
      vi.spyOn(calendarService, 'updateCalendarEvent').mockResolvedValue({
        id: 'e1111111-1111-4111-8111-111111111111',
        classroomSubjectId: 'cs-1',
        classroomId: 'cls-1',
        classroomName: '10A1',
        academicYear: '2026-2027',
        gradeLevel: 10,
        subjectId: 'sub-1',
        subjectName: 'Lịch sử',
        title: 'Tiêu đề mới',
        details: 'Chi tiết mới',
        eventType: 'LESSON',
        startsAt: '2026-11-20T09:00:00.000Z',
        publishedAt: null,
        createdAt: '2026-11-13T00:00:00.000Z',
        lessonId: null,
        lessonTitle: null,
        activityId: null,
        activityTitle: null,
        activityKind: null,
      });

      const res = await request(app)
        .patch('/api/v1/teacher/calendar-events/e1111111-1111-4111-8111-111111111111')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ title: 'Tiêu đề mới' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Tiêu đề mới');
    });

    it('POST /calendar-events/:id/publish publishes event', async () => {
      vi.spyOn(calendarService, 'publishCalendarEvent').mockResolvedValue({
        id: 'e1111111-1111-4111-8111-111111111111',
        classroomSubjectId: 'cs-1',
        classroomId: 'cls-1',
        classroomName: '10A1',
        academicYear: '2026-2027',
        gradeLevel: 10,
        subjectId: 'sub-1',
        subjectName: 'Lịch sử',
        title: 'Sự kiện công bố',
        details: '',
        eventType: 'LESSON',
        startsAt: '2026-11-20T08:00:00.000Z',
        publishedAt: '2026-11-13T10:00:00.000Z',
        createdAt: '2026-11-13T00:00:00.000Z',
        lessonId: null,
        lessonTitle: null,
        activityId: null,
        activityTitle: null,
        activityKind: null,
      });

      const res = await request(app)
        .post('/api/v1/teacher/calendar-events/e1111111-1111-4111-8111-111111111111/publish')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.publishedAt).toBe('2026-11-13T10:00:00.000Z');
    });

    it('DELETE /calendar-events/:id deletes event', async () => {
      vi.spyOn(calendarService, 'deleteCalendarEvent').mockResolvedValue({
        success: true,
        message: 'Đã xóa sự kiện lịch thành công',
      });

      const res = await request(app)
        .delete('/api/v1/teacher/calendar-events/e1111111-1111-4111-8111-111111111111')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });
  });
});
