import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { AppError } from '../shared/errors/app-error.js';
import { sendError } from '../shared/http/response.js';

export function notFoundHandler(req: Request, res: Response): void {
  const reqId = req.id || 'unknown';
  sendError(res, 404, 'NOT_FOUND', 'Không tìm thấy tài nguyên yêu cầu', reqId);
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const reqId = req.id || 'unknown';

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, reqId, err.fieldErrors);
    return;
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || 'general';
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }
    sendError(res, 400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', reqId, fieldErrors);
    return;
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      sendError(
        res,
        413,
        'FILE_TOO_LARGE',
        'Kích thước file tải lên vượt quá giới hạn cho phép',
        reqId
      );
      return;
    }
    sendError(res, 400, 'INVALID_FILE_UPLOAD', 'Tệp tải lên không hợp lệ hoặc bị lỗi', reqId);
    return;
  }

  // Fallback for unhandled unexpected errors
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] [Request ${reqId}]`, err);
  }
  sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Đã xảy ra lỗi máy chủ nội bộ', reqId);
}
