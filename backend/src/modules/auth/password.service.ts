import argon2 from 'argon2';
import { BadRequestError } from '../../shared/errors/app-error.js';

export class PasswordService {
  /**
   * Hashes a plaintext password using Argon2id.
   */
  async hashPassword(plain: string): Promise<string> {
    if (!plain || plain.length < 6) {
      throw new BadRequestError('Mật khẩu phải có ít nhất 6 ký tự', 'INVALID_PASSWORD_LENGTH');
    }
    if (plain.length > 128) {
      throw new BadRequestError('Mật khẩu không được vượt quá 128 ký tự', 'INVALID_PASSWORD_LENGTH');
    }

    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
    });
  }

  /**
   * Verifies a plaintext password against an Argon2 hash.
   */
  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    if (!hash || !plain) {
      return false;
    }
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}

export const passwordService = new PasswordService();
