import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { sessionService, type AuthenticatedUser } from '../modules/auth/session.service.js';
import { UnauthorizedError } from '../shared/errors/app-error.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[env.SESSION_COOKIE_NAME];

  if (!token || typeof token !== 'string') {
    next(new UnauthorizedError('Chưa xác thực hoặc phiên đăng nhập đã hết hạn'));
    return;
  }

  try {
    const user = await sessionService.resolveSession(token);
    if (!user) {
      next(new UnauthorizedError('Chưa xác thực hoặc phiên đăng nhập đã hết hạn'));
      return;
    }

    req.user = user;
    req.sessionToken = token;
    next();
  } catch (err) {
    next(err);
  }
}
