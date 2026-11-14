import type { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';
import { authService } from './auth.service.js';
import { sessionService } from './session.service.js';
import { sendSuccess } from '../../shared/http/response.js';
import { loginSchema, changePasswordSchema } from './auth.schemas.js';
import { UnauthorizedError } from '../../shared/errors/app-error.js';

function getAuthenticatedUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError('Chưa xác thực hoặc phiên đăng nhập đã hết hạn');
  }
  return req.user;
}

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const { user, rawToken, expiresAt } = await authService.login(validated);

      // Set secure HttpOnly cookie with rawToken (Postgres stores only SHA-256 hash)
      res.cookie(env.SESSION_COOKIE_NAME, rawToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
      });

      sendSuccess(res, {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          contact: user.contact,
          mustChangePassword: user.mustChangePassword,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.[env.SESSION_COOKIE_NAME];
      if (token) {
        await sessionService.revokeSession(token);
      }

      res.clearCookie(env.SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'lax',
        path: '/',
      });

      sendSuccess(res, { success: true });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    sendSuccess(res, {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        contact: user.contact,
        mustChangePassword: user.mustChangePassword,
      },
    });
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = changePasswordSchema.parse(req.body);
      const user = getAuthenticatedUser(req);
      await authService.changePassword(user.id, user.sessionId, validated);
      sendSuccess(res, { success: true, message: 'Đổi mật khẩu thành công' });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
