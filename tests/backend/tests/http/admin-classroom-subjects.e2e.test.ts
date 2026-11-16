import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../backend/src/app.js';
import { sessionService } from '../../../../backend/src/modules/auth/session.service.js';
import { classroomSubjectService } from '../../../../backend/src/modules/admin/classroom-subjects/classroom-subject.service.js';

describe('Admin Classroom Subjects Assignment API (E2E)', () => {
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

  const validClassroomId = 'a1111111-1111-4111-8111-111111111111';
  const validSubjectId = 'b2222222-2222-4222-8222-222222222222';
  const validTeacherId = 'c3333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get(
      `/api/v1/admin/classrooms/${validClassroomId}/subjects/${validSubjectId}/eligible-teachers`
    );
    expect(res.status).toBe(401);
  });

  it('rejects student requests with 403', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockStudentUser);

    const res = await request(app)
      .get(`/api/v1/admin/classrooms/${validClassroomId}/subjects/${validSubjectId}/eligible-teachers`)
      .set('Cookie', ['educraft_session=mock_cookie']);

    expect(res.status).toBe(403);
  });

  describe('Authenticated as ADMIN', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockAdminUser);
    });

    it('GET /eligible-teachers returns eligible teachers list', async () => {
      vi.spyOn(classroomSubjectService, 'listEligibleTeachers').mockResolvedValue([
        {
          id: 'tea-1',
          username: 'teacher.history',
          fullName: 'Cô Lịch Sử',
          contact: '0901234567',
          qualification: 'Cử nhân Sư phạm Lịch sử',
        },
      ]);

      const res = await request(app)
        .get(`/api/v1/admin/classrooms/${validClassroomId}/subjects/${validSubjectId}/eligible-teachers`)
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].username).toBe('teacher.history');
    });

    it('PATCH /assign assigns teacher with 200', async () => {
      vi.spyOn(classroomSubjectService, 'assignTeacher').mockResolvedValue({
        id: 'cs-1',
        classroomId: validClassroomId,
        subjectId: validSubjectId,
        teacherId: validTeacherId,
        teacher: {
          id: validTeacherId,
          fullName: 'Cô Lịch Sử',
          username: 'teacher.history',
        },
      });

      const res = await request(app)
        .patch(`/api/v1/admin/classrooms/${validClassroomId}/subjects/${validSubjectId}/assign`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ teacherId: validTeacherId });

      expect(res.status).toBe(200);
      expect(res.body.data.teacherId).toBe(validTeacherId);
      expect(res.body.data.teacher?.fullName).toBe('Cô Lịch Sử');
    });

    it('PATCH /assign removes teacher when teacherId is null', async () => {
      vi.spyOn(classroomSubjectService, 'assignTeacher').mockResolvedValue({
        id: 'cs-1',
        classroomId: validClassroomId,
        subjectId: validSubjectId,
        teacherId: null,
        teacher: null,
      });

      const res = await request(app)
        .patch(`/api/v1/admin/classrooms/${validClassroomId}/subjects/${validSubjectId}/assign`)
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ teacherId: null });

      expect(res.status).toBe(200);
      expect(res.body.data.teacherId).toBeNull();
      expect(res.body.data.teacher).toBeNull();
    });
  });
});
