import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { authenticate } from '../../src/middleware/authenticate.js';
import { requireRole } from '../../src/middleware/require-role.js';
import { sessionService } from '../../src/modules/auth/session.service.js';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { requestIdMiddleware } from '../../src/middleware/request-id.js';

describe('Role Guard Middleware (E2E)', () => {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(cookieParser('test_secret'));

  // Protected test routes
  app.get('/admin-only', authenticate, requireRole('ADMIN'), (req, res) => {
    res.json({ success: true, role: req.user?.role });
  });

  app.get('/teacher-or-admin', authenticate, requireRole('ADMIN', 'TEACHER'), (req, res) => {
    res.json({ success: true, role: req.user?.role });
  });

  app.use(errorHandler);

  it('rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/admin-only');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects student accessing admin-only route with 403 Forbidden', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValueOnce({
      id: 'student-id',
      username: 'student_1',
      fullName: 'Học sinh A',
      role: 'STUDENT',
      status: 'ACTIVE',
      contact: null,
      mustChangePassword: false,
      sessionId: 'session-student',
    });

    const res = await request(app)
      .get('/admin-only')
      .set('Cookie', ['educraft_session=mock_token_for_student']);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('Bạn không có quyền thực hiện thao tác này');
  });

  it('rejects teacher accessing admin-only route with 403 Forbidden', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValueOnce({
      id: 'teacher-id',
      username: 'teacher_1',
      fullName: 'Giáo viên B',
      role: 'TEACHER',
      status: 'ACTIVE',
      contact: null,
      mustChangePassword: false,
      sessionId: 'session-teacher',
    });

    const res = await request(app)
      .get('/admin-only')
      .set('Cookie', ['educraft_session=mock_token_for_teacher']);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows teacher accessing teacher-or-admin route with 200', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValueOnce({
      id: 'teacher-id',
      username: 'teacher_1',
      fullName: 'Giáo viên B',
      role: 'TEACHER',
      status: 'ACTIVE',
      contact: null,
      mustChangePassword: false,
      sessionId: 'session-teacher',
    });

    const res = await request(app)
      .get('/teacher-or-admin')
      .set('Cookie', ['educraft_session=mock_token_for_teacher']);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('TEACHER');
  });

  it('allows admin accessing admin-only route with 200', async () => {
    vi.spyOn(sessionService, 'resolveSession').mockResolvedValueOnce({
      id: 'admin-id',
      username: 'admin',
      fullName: 'Quản trị viên',
      role: 'ADMIN',
      status: 'ACTIVE',
      contact: null,
      mustChangePassword: false,
      sessionId: 'session-admin',
    });

    const res = await request(app)
      .get('/admin-only')
      .set('Cookie', ['educraft_session=mock_token_for_admin']);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('ADMIN');
  });
});
