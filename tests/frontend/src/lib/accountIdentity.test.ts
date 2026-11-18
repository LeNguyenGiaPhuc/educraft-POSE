import { describe, expect, it } from 'vitest'
import {
  normalizeContact,
  normalizeFullName,
  normalizeUsername,
  validateContact,
  validateFullName,
  validatePassword,
  validateUsername,
} from '../../../../frontend/src/lib/accountIdentity'

describe('frontend account identity rules', () => {
  it('normalizes names and usernames', () => {
    expect(normalizeFullName('  Nguyễn   Văn An  ')).toBe('Nguyễn Văn An')
    expect(normalizeUsername(' Student.One ')).toBe('student.one')
    expect(validateFullName('Nguyễn Văn An')).toBeNull()
    expect(validateUsername('student.one')).toBeNull()
  })

  it('normalizes and validates contacts', () => {
    expect(normalizeContact('+84 (912) 345-678')).toBe('0912345678')
    expect(normalizeContact('Student@Example.COM')).toBe('Student@example.com')
    expect(validateContact('0912345678')).toBeNull()
    expect(validateContact('not-a-contact')).toBe('Thông tin liên hệ không hợp lệ.')
  })

  it('uses the shared eight-character password rule', () => {
    expect(validatePassword('1234567')).toBe('Mật khẩu phải có từ 8 đến 128 ký tự.')
    expect(validatePassword('12345678')).toBeNull()
  })
})
