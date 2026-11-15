import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { sessionService } from '../../src/modules/auth/session.service.js';
import { classroomService } from '../../src/modules/admin/classrooms/classroom.service.js';
import { ConflictError } from '../../src/shared/errors/app-error.js';

describe('Admin Classrooms API (E2E)', () => {
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

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/admin/classrooms');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects student requests with 403 Forbidden', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockStudentUser);

    const res = await request(app)
      .get('/api/v1/admin/classrooms')
      .set('Cookie', ['educraft_session=mock_cookie']);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  describe('Authenticated as ADMIN', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockAdminUser);
    });

    it('rejects malformed classroom id with 400', async () => {
      const res = await request(app)
        .get('/api/v1/admin/classrooms/not-a-valid-uuid')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /api/v1/admin/classrooms returns paginated list', async () => {
      vi.spyOn(classroomService, 'listClassrooms').mockResolvedValue({
        items: [
          {
            id: 'c1111111-1111-4111-8111-111111111111',
            name: '10A1',
            gradeLevel: 10,
            academicYear: '2026-2027',
            status: 'ACTIVE',
            studentCount: 35,
            subjectCount: 8,
            assignedTeacherCount: 6,
            createdAt: new Date('2026-09-01'),
            updatedAt: new Date('2026-09-01'),
          },
        ],
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/classrooms')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('10A1');
      expect(res.body.meta.totalItems).toBe(1);
    });

    it('POST /api/v1/admin/classrooms creates classroom with 201', async () => {
      vi.spyOn(classroomService, 'createClassroom').mockResolvedValue({
        id: 'c2222222-2222-4222-8222-222222222222',
        name: '11B2',
        gradeLevel: 11,
        academicYear: '2026-2027',
        status: 'ACTIVE',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      });

      const res = await request(app)
        .post('/api/v1/admin/classrooms')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          name: '11B2',
          gradeLevel: 11,
          academicYear: '2026-2027',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('11B2');
    });

    it('POST /api/v1/admin/classrooms returns 409 when conflict occurs', async () => {
      vi.spyOn(classroomService, 'createClassroom').mockRejectedValue(
        new ConflictError('Lớp học "11B2" trong năm học 2026-2027 đã tồn tại')
      );

      const res = await request(app)
        .post('/api/v1/admin/classrooms')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({
          name: '11B2',
          gradeLevel: 11,
          academicYear: '2026-2027',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('đã tồn tại');
    });

    it('GET /api/v1/admin/classrooms/:id returns detail with students and subjects', async () => {
      vi.spyOn(classroomService, 'getClassroomDetail').mockResolvedValue({
        id: 'c1111111-1111-4111-8111-111111111111',
        name: '10A1',
        gradeLevel: 10,
        academicYear: '2026-2027',
        status: 'ACTIVE',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        students: [
          {
            id: 'stu-1',
            enrollmentId: 'enr-1',
            fullName: 'Lê Văn C',
            username: 'levanc',
            contact: '0988776655',
            joinedAt: '2026-09-01T00:00:00.000Z',
            leftAt: null,
            mustChangePassword: false,
            passwordChangedAt: null,
          },
        ],
        studentHistory: [],
        subjects: [
          {
            id: 'cs-1',
            subjectId: 'sub-math',
            subjectName: 'Toán',
            isSubjectActive: true,
            teacher: {
              id: 'tea-1',
              fullName: 'Thầy Toán',
              username: 'thaytoan',
              contact: 'thaytoan@example.edu.vn',
              qualification: 'Cử nhân Sư phạm Toán',
            },
            lessonCount: 3,
          },
        ],
      });

      const res = await request(app)
        .get('/api/v1/admin/classrooms/c1111111-1111-4111-8111-111111111111')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.students).toHaveLength(1);
      expect(res.body.data.subjects).toHaveLength(1);
    });

    it('PATCH /api/v1/admin/classrooms/:id updates classroom info', async () => {
      vi.spyOn(classroomService, 'updateClassroom').mockResolvedValue({
        id: 'c1111111-1111-4111-8111-111111111111',
        name: '10A1-NangCao',
        gradeLevel: 10,
        academicYear: '2026-2027',
        status: 'ACTIVE',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-02T00:00:00.000Z',
      });

      const res = await request(app)
        .patch('/api/v1/admin/classrooms/c1111111-1111-4111-8111-111111111111')
        .set('Cookie', ['educraft_session=mock_cookie'])
        .send({ name: '10A1-NangCao' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('10A1-NangCao');
    });

    it('PATCH /api/v1/admin/classrooms/:id/archive archives classroom', async () => {
      vi.spyOn(classroomService, 'archiveClassroom').mockResolvedValue({
        id: 'c1111111-1111-4111-8111-111111111111',
        name: '10A1',
        gradeLevel: 10,
        academicYear: '2026-2027',
        status: 'ARCHIVED',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-02T00:00:00.000Z',
      });

      const res = await request(app)
        .patch('/api/v1/admin/classrooms/c1111111-1111-4111-8111-111111111111/archive')
        .set('Cookie', ['educraft_session=mock_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ARCHIVED');
    });
  });
});
