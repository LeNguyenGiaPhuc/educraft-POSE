import { prisma } from '../../lib/prisma.js';
import { passwordService } from './password.service.js';
import { sessionService, type AuthenticatedUser } from './session.service.js';
import { UnauthorizedError, BadRequestError } from '../../shared/errors/app-error.js';
import type { LoginInput, ChangePasswordInput } from './auth.schemas.js';

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$9b1oP9Lhw/FRCs8+DgjXRg$WgAh//lwKNmbClsw6Q+d9TT49jV/82qt5Hml5oqxenE';

export class AuthService {
  async login(input: LoginInput): Promise<{ user: AuthenticatedUser; rawToken: string; expiresAt: Date }> {
    const user = await prisma.user.findUnique({
      where: { username: input.username },
    });

    // Timing attack & enumeration prevention:
    // If user does not exist or user is not ACTIVE, perform a dummy verify and return generic failure.
    if (user?.status !== 'ACTIVE') {
      await passwordService.verifyPassword(
        DUMMY_PASSWORD_HASH,
        input.password
      );
      throw new UnauthorizedError('Tên đăng nhập hoặc mật khẩu không chính xác', 'INVALID_CREDENTIALS');
    }

    const isValid = await passwordService.verifyPassword(user.password_hash, input.password);
    if (!isValid) {
      throw new UnauthorizedError('Tên đăng nhập hoặc mật khẩu không chính xác', 'INVALID_CREDENTIALS');
    }

    const { rawToken, expiresAt } = await sessionService.createSession(user.id);

    const authUser: AuthenticatedUser = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
      contact: user.contact,
      mustChangePassword: user.must_change_password,
      sessionId: '',
    };

    return { user: authUser, rawToken, expiresAt };
  }

  async changePassword(userId: string, currentSessionId: string, input: ChangePasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.status !== 'ACTIVE') {
      throw new UnauthorizedError('Người dùng không tồn tại hoặc đã bị vô hiệu hóa');
    }

    const isValid = await passwordService.verifyPassword(user.password_hash, input.currentPassword);
    if (!isValid) {
      throw new BadRequestError('Mật khẩu hiện tại không chính xác', 'INCORRECT_CURRENT_PASSWORD');
    }

    const newHash = await passwordService.hashPassword(input.newPassword);

    const changedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          password_hash: newHash,
          must_change_password: false,
          password_changed_at: changedAt,
        },
      });

      await tx.authSession.updateMany({
        where: {
          user_id: userId,
          revoked_at: null,
          id: { not: currentSessionId },
        },
        data: { revoked_at: changedAt },
      });
    });
  }
}

export const authService = new AuthService();
