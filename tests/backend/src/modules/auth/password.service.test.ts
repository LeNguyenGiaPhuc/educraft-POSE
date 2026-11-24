import { describe, it, expect } from 'vitest';
import { passwordService } from '../../../../../backend/src/modules/auth/password.service.js';

describe('PasswordService', () => {
  it('hashes a valid password with Argon2id and verifies successfully', async () => {
    const raw = 'SecureP@ssw0rd123';
    const hash = await passwordService.hashPassword(raw);

    expect(hash).toBeDefined();
    expect(hash).toMatch(/^\$argon2id\$/);

    const isValid = await passwordService.verifyPassword(hash, raw);
    expect(isValid).toBe(true);
  });

  it('fails verification on wrong password', async () => {
    const hash = await passwordService.hashPassword('CorrectPassword123');
    const isValid = await passwordService.verifyPassword(hash, 'WrongPassword123');
    expect(isValid).toBe(false);
  });

  it('rejects passwords shorter than 6 characters', async () => {
    await expect(passwordService.hashPassword('12345')).rejects.toThrow(
      'Mật khẩu phải có ít nhất 6 ký tự'
    );
  });

  it('rejects passwords longer than 128 characters', async () => {
    const longPassword = 'a'.repeat(129);
    await expect(passwordService.hashPassword(longPassword)).rejects.toThrow(
      'Mật khẩu không được vượt quá 128 ký tự'
    );
  });
});
