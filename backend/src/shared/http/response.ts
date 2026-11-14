import type { Response } from 'express';
import type { PaginationMeta } from '../pagination/pagination.dto.js';

export function sendSuccess<T>(
  res: Response,
  data: T,
  meta?: Record<string, unknown> | PaginationMeta | object,
  statusCode = 200
): Response {
  const body: { data: T; meta?: Record<string, unknown> | PaginationMeta | object } = { data };
  if (meta !== undefined) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  fieldErrors?: Record<string, string[]>
): Response {
  const errorObj: {
    code: string;
    message: string;
    requestId: string;
    fieldErrors?: Record<string, string[]>;
  } = {
    code,
    message,
    requestId,
  };
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    errorObj.fieldErrors = fieldErrors;
  }
  return res.status(statusCode).json({ error: errorObj });
}
