import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { passwordService } from './password.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService password change transaction', () => {
  const service = new AuthService();
  const user = {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'teacher_test',
    password_hash: 'old-hash',
    full_name: 'Teacher Test',
    contact: null,
    role: 'TEACHER' as const,
    status: 'ACTIVE' as const,
    must_change_password: true,
    password_changed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => vi.restoreAllMocks());

  it('updates the password and revokes other sessions in one transaction', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(user);
    vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(true);
    vi.spyOn(passwordService, 'hashPassword').mockResolvedValue('new-hash');

    const updateUser = vi.fn().mockResolvedValue(user);
    const revokeSessions = vi.fn().mockResolvedValue({ count: 2 });
    const transaction = vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) =>
      callback({
        user: { update: updateUser },
        authSession: { updateMany: revokeSessions },
      })
    );

    await service.changePassword(user.id, 'current-session-id', {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    });

    expect(transaction).toHaveBeenCalledOnce();
    expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ where: { id: user.id } }));
    expect(revokeSessions).toHaveBeenCalledWith({
      where: {
        user_id: user.id,
        revoked_at: null,
        id: { not: 'current-session-id' },
      },
      data: { revoked_at: expect.any(Date) },
    });
  });
});
