import { describe, expect, it } from 'vitest'
import { getPasswordChangeErrors } from '../../../../../frontend/src/lib/auth/passwordRules'

describe('getPasswordChangeErrors', () => {
  it('requires all password fields', () => {
    expect(getPasswordChangeErrors({ currentPassword: '', newPassword: '', confirmation: '' })).toEqual({
      currentPassword: 'Nhập mật khẩu hiện tại.',
      newPassword: 'Nhập mật khẩu mới.',
      confirmation: 'Nhập lại mật khẩu mới.',
    })
  })

  it('rejects a new password outside the existing length policy', () => {
    expect(getPasswordChangeErrors({ currentPassword: 'old-secret', newPassword: '12345', confirmation: '12345' })).toEqual({
      newPassword: 'Mật khẩu mới phải có từ 8 đến 128 ký tự.',
    })
  })

  it('rejects a confirmation that does not match the new password', () => {
    expect(getPasswordChangeErrors({ currentPassword: 'old-secret', newPassword: 'new-secret', confirmation: 'different' })).toEqual({
      confirmation: 'Mật khẩu xác nhận không khớp.',
    })
  })
})
