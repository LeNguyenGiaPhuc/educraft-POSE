import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { sessionService } from '../../src/modules/auth/session.service.js';
import { accountService } from '../../src/modules/admin/accounts/account.service.js';

describe('Admin Accounts API (E2E)', () => {
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
    const res = await request(app).get('/api/v1/admin/accounts');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects teacher requests with 403 Forbidden', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockTeacherUser);

    const res = await request(app)
      .get('/api/v1/admin/accounts')
      .set('Cookie', ['educraft_session=mock_teacher_cookie']);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  describe('Authenticated as ADMIN', () => {
    beforeEach(() => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(mockAdminUser);
    });

    it('rejects invalid account filters before querying Prisma', async () => {
      const res = await request(app)
        .get('/api/v1/admin/accounts?role=INVALID&status=WRONG')
        .set('Cookie', ['educraft_session=admin_cookie']);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a malformed account id', async () => {
      const res = await request(app)
        .get('/api/v1/admin/accounts/not-a-uuid')
        .set('Cookie', ['educraft_session=admin_cookie']);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /api/v1/admin/accounts returns paginated accounts', async () => {
      vi.spyOn(accountService, 'listAccounts').mockResolvedValue({
        data: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            username: 'student.1',
            fullName: 'Học sinh 1',
            role: 'STUDENT',
            status: 'ACTIVE',
            contact: null,
            classroomId: 'c-1',
            classroomName: '11A1',
            mustChangePassword: false,
            passwordChangedAt: null,
            createdAt: new Date(),
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });

      const res = await request(app)
        .get('/api/v1/admin/accounts?page=1&limit=20')
        .set('Cookie', ['educraft_session=admin_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.totalItems).toBe(1);
      expect(JSON.stringify(res.body)).not.toContain('password_hash');
    });

    it('POST /api/v1/admin/accounts creates student with 201', async () => {
      vi.spyOn(accountService, 'createAccount').mockResolvedValue({
        id: 'new-student-id',
        username: 'nguyen.van.a',
        fullName: 'Nguyễn Văn A',
        role: 'STUDENT',
        status: 'ACTIVE',
        contact: 'a@example.com',
        classroomId: null,
        classroomName: null,
        mustChangePassword: true,
        passwordChangedAt: null,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/admin/accounts')
        .set('Cookie', ['educraft_session=admin_cookie'])
        .send({
          role: 'STUDENT',
          username: 'nguyen.van.a',
          fullName: 'Nguyễn Văn A',
          contact: 'a@example.com',
          password: 'Password123',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('new-student-id');
      expect(res.body.data.role).toBe('STUDENT');
      expect(JSON.stringify(res.body)).not.toContain('Password123');
    });

    it('POST /api/v1/admin/accounts creates teacher with 201', async () => {
      vi.spyOn(accountService, 'createAccount').mockResolvedValue({
        id: 'new-teacher-id',
        username: 'teacher.history',
        fullName: 'Trần Lịch Sử',
        role: 'TEACHER',
        status: 'ACTIVE',
        contact: 'history@example.com',
        classroomId: null,
        classroomName: null,
        qualification: 'Cử nhân Sư phạm Lịch sử',
        specializedSubjectId: 'd6b7b282-3714-4113-9118-a6f6713915bc',
        specializedSubjectName: 'Lịch sử',
        mustChangePassword: true,
        passwordChangedAt: null,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/admin/accounts')
        .set('Cookie', ['educraft_session=admin_cookie'])
        .send({
          role: 'TEACHER',
          username: 'teacher.history',
          fullName: 'Trần Lịch Sử',
          contact: 'history@example.com',
          password: 'Password123',
          qualification: 'Cử nhân Sư phạm Lịch sử',
          specializedSubjectId: 'd6b7b282-3714-4113-9118-a6f6713915bc',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe('TEACHER');
      expect(res.body.data.qualification).toBe('Cử nhân Sư phạm Lịch sử');
    });

    it('GET /api/v1/admin/accounts/:id returns detail', async () => {
      vi.spyOn(accountService, 'getAccountById').mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        username: 'student.1',
        fullName: 'Học sinh 1',
        role: 'STUDENT',
        status: 'ACTIVE',
        contact: null,
        classroomId: null,
        classroomName: null,
        mustChangePassword: false,
        passwordChangedAt: null,
        createdAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/admin/accounts/11111111-1111-4111-8111-111111111111')
        .set('Cookie', ['educraft_session=admin_cookie']);

      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe('student.1');
    });

    it('PATCH /api/v1/admin/accounts/:id updates account', async () => {
      vi.spyOn(accountService, 'updateAccount').mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        username: 'student.1',
        fullName: 'Học sinh Cập nhật',
        role: 'STUDENT',
        status: 'ACTIVE',
        contact: 'new@contact.local',
        classroomId: null,
        classroomName: null,
        mustChangePassword: false,
        passwordChangedAt: null,
        createdAt: new Date(),
      });

      const res = await request(app)
        .patch('/api/v1/admin/accounts/11111111-1111-4111-8111-111111111111')
        .set('Cookie', ['educraft_session=admin_cookie'])
        .send({
          fullName: 'Học sinh Cập nhật',
          contact: 'new@contact.local',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fullName).toBe('Học sinh Cập nhật');
    });

    it('PATCH /api/v1/admin/accounts/:id/status updates status', async () => {
      vi.spyOn(accountService, 'updateStatus').mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        username: 'student.1',
        fullName: 'Học sinh 1',
        role: 'STUDENT',
        status: 'INACTIVE',
        contact: null,
        classroomId: null,
        classroomName: null,
        mustChangePassword: false,
        passwordChangedAt: null,
        createdAt: new Date(),
      });

      const res = await request(app)
        .patch('/api/v1/admin/accounts/11111111-1111-4111-8111-111111111111/status')
        .set('Cookie', ['educraft_session=admin_cookie'])
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('INACTIVE');
    });

    it('PATCH /api/v1/admin/accounts/:id/password resets password', async () => {
      vi.spyOn(accountService, 'resetPassword').mockResolvedValue({
        success: true,
        message: 'Đặt lại mật khẩu cho tài khoản thành công',
      });

      const res = await request(app)
        .patch('/api/v1/admin/accounts/11111111-1111-4111-8111-111111111111/password')
        .set('Cookie', ['educraft_session=admin_cookie'])
        .send({ password: 'NewPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });
  });
});
