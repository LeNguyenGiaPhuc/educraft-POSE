import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../../config/env.js';
import { BadRequestError } from '../../../shared/errors/app-error.js';
import type { ValidationTokenPayload } from './roster.types.js';

function getSigningKey(): Buffer {
  return Buffer.from(env.ROSTER_TOKEN_SECRET, 'utf8');
}

export const rosterTokenService = {
  generateToken(
    params: {
      adminId: string;
      classroomId?: string;
      operation?: ValidationTokenPayload['operation'];
      rowCount: number;
      rowsHash: string;
    },
    expiresInMs = 15 * 60 * 1000
  ): string {
    const payload: ValidationTokenPayload = {
      adminId: params.adminId,
      operation: params.operation ?? 'EXISTING_CLASSROOM',
      classroomId: params.classroomId,
      rowCount: params.rowCount,
      rowsHash: params.rowsHash,
      expiresAt: Date.now() + expiresInMs,
    };

    const payloadJson = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadJson, 'utf8').toString('base64url');

    const signature = createHmac('sha256', getSigningKey())
      .update(payloadBase64)
      .digest('base64url');

    return `${payloadBase64}.${signature}`;
  },

  verifyToken(token: string): ValidationTokenPayload {
    if (!token || typeof token !== 'string') {
      throw new BadRequestError('Mã xác thực import không hợp lệ');
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new BadRequestError('Mã xác thực import có định dạng không hợp lệ');
    }

    const [payloadBase64, signature] = parts;
    const expectedSignature = createHmac('sha256', getSigningKey())
      .update(payloadBase64)
      .digest('base64url');

    const signatureBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (
      signatureBuf.length !== expectedBuf.length ||
      !timingSafeEqual(signatureBuf, expectedBuf)
    ) {
      throw new BadRequestError('Chữ ký mã xác thực import không hợp lệ hoặc đã bị thay đổi');
    }

    let payload: ValidationTokenPayload;
    try {
      const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
      payload = JSON.parse(payloadJson);
    } catch {
      throw new BadRequestError('Nội dung mã xác thực import không thể phân tích');
    }

    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      throw new BadRequestError('Mã xác thực import đã hết hạn. Vui lòng tải lại file để xác nhận.');
    }

    return payload;
  },
};
