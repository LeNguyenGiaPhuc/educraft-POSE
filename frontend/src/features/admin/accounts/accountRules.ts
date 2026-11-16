export function validatePasswordReset(password: string, confirmation: string): string[] {
  const errors: string[] = []

  if (!password) {
    errors.push('Mật khẩu không được để trống.')
  } else if (password.length < 6) {
    errors.push('Mật khẩu phải có ít nhất 6 ký tự.')
  } else if (password.length > 128) {
    errors.push('Mật khẩu không được vượt quá 128 ký tự.')
  }

  if (password !== confirmation) {
    errors.push('Mật khẩu xác nhận không khớp.')
  }

  return errors
}
