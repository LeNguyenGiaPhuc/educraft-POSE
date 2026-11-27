import { describe, expect, it } from 'vitest'
import { validateLoginCredentials } from '../../../../../frontend/src/lib/auth/loginValidation'

describe('login validation', () => {
  it('requires both username and password before an authentication request', () => {
    expect(validateLoginCredentials('', '')).toEqual({
      username: 'Vui lòng nhập tên đăng nhập.',
      password: 'Vui lòng nhập mật khẩu.',
    })
  })

  it('accepts non-empty credentials without changing their values', () => {
    expect(validateLoginCredentials(' teacher@demo.educraft ', 'demo123')).toEqual({})
  })
})
