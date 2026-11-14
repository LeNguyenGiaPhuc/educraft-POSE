import rateLimit from 'express-rate-limit';
import { sendError } from '../../shared/http/response.js';

interface LoginLimiterOptions {
  max?: number;
  windowMs?: number;
}

export function createLoginLimiter(options: LoginLimiterOptions = {}) {
  return rateLimit({
    windowMs: options.windowMs ?? 60 * 1000,
    max: options.max ?? 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      sendError(
        res,
        429,
        'TOO_MANY_REQUESTS',
        'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 1 phút.',
        req.id ?? 'unknown'
      );
    },
  });
}

export const loginLimiter = createLoginLimiter();
