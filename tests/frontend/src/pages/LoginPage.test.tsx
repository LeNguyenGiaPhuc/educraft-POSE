import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LoginPage } from '../../../../frontend/src/pages/LoginPage'

describe('LoginPage', () => {
  it('renders the approved Auth surface with semantic reusable controls', () => {
    const html = renderToStaticMarkup(<LoginPage onApiSignIn={async () => {}} />)

    expect(html).toContain('class="login-layout auth-login"')
    expect(html).toContain('Dạy sáng tạo.')
    expect(html).toContain('Học chủ động.')
    expect(html).toContain('class="auth-wordmark"')
    expect(html).toContain('alt="EduCraft"')
    expect(html).not.toContain('auth-wordmark-clip')
    expect(html).toContain('class="auth-story-art"')
    expect(html).toContain('<form')
    expect(html).toContain('class="ec-field')
    expect(html).toContain('class="ec-action ec-action-primary auth-submit"')
    expect(html).toContain('class="ec-action-mark ec-action-mark-custom"')
    expect(html).toContain('aria-label="Hiện mật khẩu"')
    expect(html).not.toContain('auth-mobile-brand')
    expect(html).not.toContain('Admin và Teacher dùng phiên backend')
  })

  it('keeps all three existing demo account shortcuts', () => {
    const html = renderToStaticMarkup(<LoginPage onApiSignIn={async () => {}} />)

    expect(html).toContain('Quản trị viên')
    expect(html).toContain('Giáo viên')
    expect(html).toContain('Học sinh')
    expect(html).toContain('admin@demo.educraft')
    expect(html).toContain('teacher@demo.educraft')
    expect(html).toContain('student@demo.educraft')
    expect(html).toContain('Đăng nhập Student cũng dùng API backend.')
    expect(html).not.toContain('Bản mô phỏng Student')
  })
})
