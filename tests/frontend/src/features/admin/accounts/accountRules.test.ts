import { describe, expect, it } from 'vitest'
import { validatePasswordReset } from '../../../../../../frontend/src/features/admin/accounts/accountRules'

describe('validatePasswordReset', () => {
  it('requires a password', () => {
    expect(validatePasswordReset('', '')).toEqual([
      'Mật khẩu không được để trống.',
    ])
  })

  it('enforces the backend password length range', () => {
    expect(validatePasswordReset('1234567', '1234567')).toContain('Mật khẩu phải có từ 8 đến 128 ký tự.')
    expect(validatePasswordReset('a'.repeat(129), 'a'.repeat(129))).toContain('Mật khẩu phải có từ 8 đến 128 ký tự.')
  })

  it('requires matching confirmation', () => {
    expect(validatePasswordReset('secret1', 'secret2')).toContain('Mật khẩu xác nhận không khớp.')
  })

  it('accepts a valid matching password', () => {
    expect(validatePasswordReset('secret12', 'secret12')).toEqual([])
  })
})
