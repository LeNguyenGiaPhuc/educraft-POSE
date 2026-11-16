import { describe, expect, it } from 'vitest'
import { validatePasswordReset } from '../../../../../../frontend/src/features/admin/accounts/accountRules'

describe('validatePasswordReset', () => {
  it('requires a password', () => {
    expect(validatePasswordReset('', '')).toEqual([
      'Mật khẩu không được để trống.',
    ])
  })

  it('enforces the backend password length range', () => {
    expect(validatePasswordReset('12345', '12345')).toContain('Mật khẩu phải có ít nhất 6 ký tự.')
    expect(validatePasswordReset('a'.repeat(129), 'a'.repeat(129))).toContain('Mật khẩu không được vượt quá 128 ký tự.')
  })

  it('requires matching confirmation', () => {
    expect(validatePasswordReset('secret1', 'secret2')).toContain('Mật khẩu xác nhận không khớp.')
  })

  it('accepts a valid matching password', () => {
    expect(validatePasswordReset('secret1', 'secret1')).toEqual([])
  })
})
