import { describe, expect, it } from 'vitest';
import {
  normalizeContact,
  normalizeFullName,
  normalizeUsername,
  validateContact,
  validateFullName,
  validatePassword,
  validateUsername,
} from '../../../../backend/src/shared/account-identity.js';

describe('account identity rules', () => {
  it('normalizes Unicode names and internal whitespace', () => {
    expect(normalizeFullName('  Nguyễn   Văn  An  ')).toBe('Nguyễn Văn An');
    expect(normalizeFullName('A\u0301nh')).toBe('Ánh');
  });

  it('accepts Vietnamese names but rejects digits and markup characters', () => {
    expect(validateFullName('Nguyễn Văn An')).toBeNull();
    expect(validateFullName("O'Connor-Smith")).toBeNull();
    expect(validateFullName('Nguyễn Văn 2')).toBe('FULL_NAME_CHARACTERS');
    expect(validateFullName('<script>')).toBe('FULL_NAME_CHARACTERS');
  });

  it('normalizes usernames to lowercase and rejects repeated separators', () => {
    expect(normalizeUsername('  Student.One  ')).toBe('student.one');
    expect(validateUsername('student.one')).toBeNull();
    expect(validateUsername('student..one')).toBe('USERNAME_SEPARATORS');
    expect(validateUsername('-student')).toBe('USERNAME_BOUNDARY');
    expect(validateUsername('học.sinh')).toBe('USERNAME_CHARACTERS');
  });

  it('normalizes email and Vietnamese mobile contacts', () => {
    expect(normalizeContact('  Student@Example.COM ')).toBe('Student@example.com');
    expect(normalizeContact('+84 (912) 345-678')).toBe('0912345678');
    expect(normalizeContact('091.234.5678')).toBe('0912345678');
    expect(validateContact('student@example.com')).toBeNull();
    expect(validateContact('0912345678')).toBeNull();
    expect(validateContact('0123456789')).toBe('CONTACT_PHONE');
    expect(validateContact('not-an-email')).toBe('CONTACT_FORMAT');
  });

  it('requires passwords to contain 8 to 128 characters', () => {
    expect(validatePassword('1234567')).toBe('PASSWORD_LENGTH');
    expect(validatePassword('12345678')).toBeNull();
    expect(validatePassword('x'.repeat(129))).toBe('PASSWORD_LENGTH');
  });
});
