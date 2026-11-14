import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { passwordService } from '../../src/modules/auth/password.service.js';
import { sessionService } from '../../src/modules/auth/session.service.js';
import type { UserRole, AccountStatus } from '@prisma/client';

describe('Auth API (E2E)', () => {
  const app = createApp();

  const mockUser = {
    id: 'user-uuid-1',
    username: 'teacher_test',
    password_hash: '$argon2id$v=19$m=19456,t=2,p=1$mockhash123$mockhash123',
    full_name: 'Giáo viên Test',
    contact: 'gv@test.local',
    role: 'TEACHER' as UserRole,
    status: 'ACTIVE' as AccountStatus,
    must_change_password: true,
    password_changed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in successfully, sets HttpOnly cookie, and returns sanitized user data', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(true);
      vi.spyOn(sessionService, 'createSession').mockResolvedValue({
        rawToken: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'teacher_test', password: 'ValidPassword123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        fullName: mockUser.full_name,
        role: mockUser.role,
        contact: mockUser.contact,
        mustChangePassword: true,
      });

      // Crucial security checks: token or hash is NEVER returned in response JSON
      expect(JSON.stringify(res.body)).not.toContain('password_hash');
      expect(JSON.stringify(res.body)).not.toContain('abcdef1234567890');

      // Check cookie headers
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies;
      expect(cookieStr).toContain('educraft_session=');
      expect(cookieStr.toLowerCase()).toContain('httponly');
      expect(cookieStr.toLowerCase()).toContain('samesite=lax');
    });

    it('returns 401 INVALID_CREDENTIALS for wrong password without revealing existence', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(false);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'teacher_test', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Tên đăng nhập hoặc mật khẩu không chính xác');
    });

    it('returns the same 401 INVALID_CREDENTIALS when user does not exist', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(false);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'nonexistent_user', password: 'AnyPassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Tên đăng nhập hoặc mật khẩu không chính xác');
    });

    it('returns the same 401 INVALID_CREDENTIALS when user is INACTIVE', async () => {
      const inactiveUser = { ...mockUser, status: 'INACTIVE' as AccountStatus };
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(inactiveUser);
      vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(false);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'inactive_user', password: 'AnyPassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 VALIDATION_ERROR on empty credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: '', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 when no session cookie is provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns authenticated user info when valid session cookie is provided', async () => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        fullName: mockUser.full_name,
        role: mockUser.role,
        status: 'ACTIVE',
        contact: mockUser.contact,
        mustChangePassword: false,
        sessionId: 'session-valid-1',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', ['educraft_session=mock_valid_raw_token']);

      expect(res.status).toBe(200);
      expect(res.body.data.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        fullName: mockUser.full_name,
        role: mockUser.role,
        contact: mockUser.contact,
        mustChangePassword: false,
      });
    });

    it('returns 401 when session is invalid or revoked', async () => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', ['educraft_session=revoked_token']);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('revokes session and clears cookie', async () => {
      const revokeSpy = vi.spyOn(sessionService, 'revokeSession').mockResolvedValue();

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', ['educraft_session=active_token_to_revoke']);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(revokeSpy).toHaveBeenCalledWith('active_token_to_revoke');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies;
      // Cleared cookie should expire in the past
      expect(cookieStr).toContain('educraft_session=;');
    });
  });

  describe('PATCH /api/v1/auth/password', () => {
    it('changes password and revokes other sessions when current password is valid', async () => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        fullName: mockUser.full_name,
        role: mockUser.role,
        status: 'ACTIVE',
        contact: mockUser.contact,
        mustChangePassword: true,
        sessionId: 'current-session-123',
      });

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(true);
      vi.spyOn(passwordService, 'hashPassword').mockResolvedValue('$argon2id$newhash');
      const updateSpy = vi.fn().mockResolvedValue({
        ...mockUser,
        must_change_password: false,
      });
      const revokeOtherSpy = vi.fn().mockResolvedValue({ count: 1 });
      const transactionSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) =>
        callback({
          user: { update: updateSpy },
          authSession: { updateMany: revokeOtherSpy },
        })
      );

      const res = await request(app)
        .patch('/api/v1/auth/password')
        .set('Cookie', ['educraft_session=valid_token'])
        .send({
          currentPassword: 'ValidOldPassword',
          newPassword: 'NewSecurePassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(transactionSpy).toHaveBeenCalledOnce();
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            password_hash: '$argon2id$newhash',
            must_change_password: false,
          }),
        })
      );
      expect(revokeOtherSpy).toHaveBeenCalledWith({
        where: {
          user_id: mockUser.id,
          revoked_at: null,
          id: { not: 'current-session-123' },
        },
        data: { revoked_at: expect.any(Date) },
      });
    });

    it('rejects password change when current password is wrong', async () => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        fullName: mockUser.full_name,
        role: mockUser.role,
        status: 'ACTIVE',
        contact: mockUser.contact,
        mustChangePassword: true,
        sessionId: 'current-session-123',
      });

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(false);

      const res = await request(app)
        .patch('/api/v1/auth/password')
        .set('Cookie', ['educraft_session=valid_token'])
        .send({
          currentPassword: 'WrongOldPassword',
          newPassword: 'NewSecurePassword123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INCORRECT_CURRENT_PASSWORD');
    });

    it('rejects password change if new password is too short', async () => {
      vi.spyOn(sessionService, 'resolveSession').mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        fullName: mockUser.full_name,
        role: mockUser.role,
        status: 'ACTIVE',
        contact: mockUser.contact,
        mustChangePassword: true,
        sessionId: 'current-session-123',
      });

      const res = await request(app)
        .patch('/api/v1/auth/password')
        .set('Cookie', ['educraft_session=valid_token'])
        .send({
          currentPassword: 'ValidOldPassword',
          newPassword: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
