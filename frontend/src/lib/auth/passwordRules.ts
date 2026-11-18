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
  } else if (input.newPassword.length < 6 || input.newPassword.length > 128) {
    errors.newPassword = 'Mật khẩu mới phải có từ 6 đến 128 ký tự.'
  }

  if (!input.confirmation) {
    errors.confirmation = 'Nhập lại mật khẩu mới.'
  } else if (input.confirmation !== input.newPassword) {
    errors.confirmation = 'Mật khẩu xác nhận không khớp.'
  }

  return errors
}
