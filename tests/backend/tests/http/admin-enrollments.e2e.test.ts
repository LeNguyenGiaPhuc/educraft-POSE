import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../backend/src/app.js';
import { sessionService } from '../../../../backend/src/modules/auth/session.service.js';
import { enrollmentService } from '../../../../backend/src/modules/admin/enrollments/enrollment.service.js';

describe('Admin Enrollments API (E2E)', () => {
  const app = createApp();

  const mockAdminUser = {
    id: 'admin-uuid',
    username: 'admin',
    fullName: 'Quản trị viên',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
    contact: null,
    mustChangePassword: false,
    sessionId: 'session-admin',
  };

  const mockTeacherUser = {
    id: 'teacher-uuid',
    username: 'teacher',
    fullName: 'Giáo viên',
    role: 'TEACHER' as const,
    status: 'ACTIVE' as const,
    contact: null,
    mustChangePassword: false,
    sessionId: 'session-teacher',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/admin/enrollments/unassigned-students');
    expect(res.status).toBe(401);
  });

  it('rejects teacher requests with 403', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockTeacherUser);

    const res = await request(app)
      .get('/api/v1/admin/enrollments/unassigned-students')
      .set('Cookie', ['educraft_session=mock_cookie']);

    expect(res.status).toBe(403);
  });

  describe('Authenticated as ADMIN', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockAdminUser);
    });

    it('GET /api/v1/admin/enrollments/unassigned-students returns unassigned students', async () => {
      vi.spyOn(enrollmentService, 'listUnassignedStudents').mockResolvedValue({
        items: [
          {
            id: 'stu-free-1',
            username: 'free.student',
            fullName: 'Học sinh Tự Do',
            contact: '0123456789',
            createdAt: new Date('2026-09-01'),
          },
        ],
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/enrollments/unassigned-students')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].username).toBe('free.student');
      expect(res.body.meta.totalItems).toBe(1);
    });

    it('POST /api/v1/admin/classrooms/:id/students enrolls student with 201', async () => {
      vi.spyOn(enrollmentService, 'enrollStudent').mockResolvedValue({
        id: 'enr-1',
        studentId: 'c1111111-1111-4111-8111-111111111111',
        classroomId: 'c2222222-2222-4222-8222-222222222222',
        joinedAt: '2026-09-01T00:00:00.000Z',
        leftAt: null,
        student: {
          id: 'c1111111-1111-4111-8111-111111111111',
          fullName: 'Học sinh A',
          username: 'hocsinh.a',
        },
      });

      const res = await request(app)
        .post('/api/v1/admin/classrooms/c2222222-2222-4222-8222-222222222222/students')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ studentId: 'c1111111-1111-4111-8111-111111111111' });

      expect(res.status).toBe(201);
      expect(res.body.data.studentId).toBe('c1111111-1111-4111-8111-111111111111');
    });

    it('POST /api/v1/admin/enrollments/students/:id/transfer transfers student with 200', async () => {
      vi.spyOn(enrollmentService, 'transferStudent').mockResolvedValue({
        studentId: 'c1111111-1111-4111-8111-111111111111',
        previousClassroomId: 'c2222222-2222-4222-8222-222222222222',
        newClassroomId: 'c3333333-3333-4333-8333-333333333333',
        transferredAt: '2026-09-10T00:00:00.000Z',
      });

      const res = await request(app)
        .post('/api/v1/admin/enrollments/students/c1111111-1111-4111-8111-111111111111/transfer')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ targetClassroomId: 'c3333333-3333-4333-8333-333333333333' });

      expect(res.status).toBe(200);
      expect(res.body.data.newClassroomId).toBe('c3333333-3333-4333-8333-333333333333');
    });

    it('DELETE /api/v1/admin/enrollments/classrooms/:id/students/:studentId removes current enrollment', async () => {
      vi.spyOn(enrollmentService, 'removeStudent').mockResolvedValue({
        studentId: 'c3333333-3333-4333-8333-333333333333',
        classroomId: 'c1111111-1111-4111-8111-111111111111',
        removedAt: '2026-09-12T00:00:00.000Z',
      });

      const res = await request(app)
        .delete(
          '/api/v1/admin/enrollments/classrooms/c1111111-1111-4111-8111-111111111111/students/c3333333-3333-4333-8333-333333333333'
        )
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.classroomId).toBe('c1111111-1111-4111-8111-111111111111');
      expect(enrollmentService.removeStudent).toHaveBeenCalledWith(
        'c1111111-1111-4111-8111-111111111111',
        'c3333333-3333-4333-8333-333333333333'
      );
    });
  });
});
