export type LoginValidationErrors = {
  username?: string
  password?: string
}

export function validateLoginCredentials(username: string, password: string): LoginValidationErrors {
  const errors: LoginValidationErrors = {}

  if (!username.trim()) {
    errors.username = 'Vui lòng nhập tên đăng nhập.'
  }

  if (!password) {
    errors.password = 'Vui lòng nhập mật khẩu.'
  }

  return errors
}
