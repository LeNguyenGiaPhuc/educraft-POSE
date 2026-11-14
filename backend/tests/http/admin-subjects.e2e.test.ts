import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { sessionService } from '../../src/modules/auth/session.service.js';
import { subjectService } from '../../src/modules/admin/subjects/subject.service.js';

describe('Admin Subjects API (E2E)', () => {
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
    const res = await request(app).get('/api/v1/admin/subjects');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects teacher requests with 403 Forbidden', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockTeacherUser);

    const res = await request(app)
      .get('/api/v1/admin/subjects')
      .set('Cookie', ['educraft_session=mock_teacher_cookie']);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  describe('Authenticated as ADMIN', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockAdminUser);
    });

    it('rejects a malformed subject id', async () => {
      const res = await request(app)
        .get('/api/v1/admin/subjects/not-a-uuid')
        .set('Cookie', ['educraft_session=admin_cookie']);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /api/v1/admin/subjects returns catalog list', async () => {
      vi.spyOn(subjectService, 'listSubjects').mockResolvedValue([
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Lịch sử',
          isActive: true,
          teacherCount: 2,
          classroomCount: 3,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/admin/subjects')
        .set('Cookie', ['educraft_session=admin_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Lịch sử');
    });

    it('POST /api/v1/admin/subjects creates subject with 201', async () => {
      vi.spyOn(subjectService, 'createSubject').mockResolvedValue({
        id: 'sub-new',
        name: 'Tin học',
        isActive: true,
        teacherCount: 0,
        classroomCount: 2,
      });

      const res = await request(app)
        .post('/api/v1/admin/subjects')
        .set('Cookie', ['educraft_session=admin_cookie'])
        .send({ name: 'Tin học' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Tin học');
      expect(res.body.data.classroomCount).toBe(2);
    });

    it('GET /api/v1/admin/subjects/:id returns detail', async () => {
      vi.spyOn(subjectService, 'getSubjectById').mockResolvedValue({
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Lịch sử',
        isActive: true,
        teacherCount: 2,
        classroomCount: 3,
      });

      const res = await request(app)
        .get('/api/v1/admin/subjects/22222222-2222-4222-8222-222222222222')
        .set('Cookie', ['educraft_session=admin_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('22222222-2222-4222-8222-222222222222');
    });

    it('PATCH /api/v1/admin/subjects/:id updates name', async () => {
      vi.spyOn(subjectService, 'updateSubject').mockResolvedValue({
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Lịch sử Việt Nam',
        isActive: true,
        teacherCount: 2,
        classroomCount: 3,
      });

      const res = await request(app)
        .patch('/api/v1/admin/subjects/22222222-2222-4222-8222-222222222222')
        .set('Cookie', ['educraft_session=admin_cookie'])
        .send({ name: 'Lịch sử Việt Nam' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Lịch sử Việt Nam');
    });

    it('PATCH /api/v1/admin/subjects/:id/status updates status', async () => {
      vi.spyOn(subjectService, 'updateStatus').mockResolvedValue({
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Lịch sử',
        isActive: false,
        teacherCount: 2,
        classroomCount: 3,
      });

      const res = await request(app)
        .patch('/api/v1/admin/subjects/22222222-2222-4222-8222-222222222222/status')
        .set('Cookie', ['educraft_session=admin_cookie'])
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });
});
