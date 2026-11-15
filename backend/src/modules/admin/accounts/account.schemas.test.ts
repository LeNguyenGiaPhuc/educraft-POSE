import { describe, expect, it } from 'vitest';
import { createAccountSchema } from './account.schemas.js';

describe('createAccountSchema', () => {
  it('allows only Student and Teacher accounts for Admin-created accounts', () => {
    expect(() =>
      createAccountSchema.parse({
        role: 'STUDENT',
        username: 'student.one',
        fullName: 'Học sinh Một',
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
});
