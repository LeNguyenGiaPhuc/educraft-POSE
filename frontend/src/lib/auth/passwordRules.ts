import { validatePassword } from '../accountIdentity'

type PasswordChangeInput = {
  currentPassword: string
  newPassword: string
  confirmation: string
}

export type PasswordChangeErrors = {
  currentPassword?: string
  newPassword?: string
  confirmation?: string
}

export function getPasswordChangeErrors(input: PasswordChangeInput): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {}

  if (!input.currentPassword.trim()) {
    errors.currentPassword = 'Nhập mật khẩu hiện tại.'
  }

  if (!input.newPassword) {
    errors.newPassword = 'Nhập mật khẩu mới.'
  } else {
    const passwordError = validatePassword(input.newPassword)
    if (passwordError) errors.newPassword = `Mật khẩu mới phải có từ 8 đến 128 ký tự.`
  }

  if (!input.confirmation) {
    errors.confirmation = 'Nhập lại mật khẩu mới.'
  } else if (input.confirmation !== input.newPassword) {
    errors.confirmation = 'Mật khẩu xác nhận không khớp.'
  }

  return errors
}
