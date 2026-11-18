import { describe, expect, it } from 'vitest';
import { createAccountSchema } from '../../../../../../backend/src/modules/admin/accounts/account.schemas.js';

describe('createAccountSchema', () => {
  it('allows only Student and Teacher accounts for Admin-created accounts', () => {
    expect(() =>
      createAccountSchema.parse({
        role: 'STUDENT',
        username: 'student.one',
        fullName: 'Học sinh Một',
        contact: 'student@example.com',
        password: 'Password123',
      })
    ).not.toThrow();

    expect(() =>
      createAccountSchema.parse({
        role: 'ADMIN',
        username: 'another.admin',
        fullName: 'Quản trị viên khác',
        password: 'Password123',
      })
    ).toThrow();
  });

  it('normalizes identity values before the service receives them', () => {
    const parsed = createAccountSchema.parse({
      role: 'STUDENT',
      username: '  Student.One ',
      fullName: '  Nguyễn   Văn An  ',
      contact: '  Student@Example.COM ',
      password: 'Password123',
    });

    expect(parsed.username).toBe('student.one');
    expect(parsed.fullName).toBe('Nguyễn Văn An');
    expect(parsed.contact).toBe('Student@example.com');
  });

  it('requires a valid contact and an eight-character password for new accounts', () => {
    expect(() =>
      createAccountSchema.parse({
        role: 'STUDENT',
        username: 'student.one',
        fullName: 'Học sinh Một',
        password: '1234567',
      })
    ).toThrow();

    expect(() =>
      createAccountSchema.parse({
        role: 'STUDENT',
        username: 'student.one',
        fullName: 'Học sinh Một',
        contact: 'not-a-contact',
        password: '12345678',
      })
    ).toThrow();
  });

  it('uses the same password length rule for admin password reset', async () => {
    const { resetAccountPasswordSchema } = await import(
      '../../../../../../backend/src/modules/admin/accounts/account.schemas.js'
    );

    expect(() => resetAccountPasswordSchema.parse({ password: '1234567' })).toThrow();
    expect(() => resetAccountPasswordSchema.parse({ password: '12345678' })).not.toThrow();
  });
});
