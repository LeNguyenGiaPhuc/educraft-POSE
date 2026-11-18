import { validatePassword } from '../../../lib/accountIdentity'

export function validatePasswordReset(password: string, confirmation: string): string[] {
  const errors: string[] = []

  if (!password) {
    errors.push('Mật khẩu không được để trống.')
  } else {
    const passwordError = validatePassword(password)
    if (passwordError) errors.push(passwordError)
  }

  if (password !== confirmation) {
    errors.push('Mật khẩu xác nhận không khớp.')
  }

  return errors
}
