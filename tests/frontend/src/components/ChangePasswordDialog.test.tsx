import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ChangePasswordDialog } from '../../../../frontend/src/components/ChangePasswordDialog'

describe('ChangePasswordDialog', () => {
  it('renders accessible fields for changing the current password', () => {
    const html = renderToStaticMarkup(<ChangePasswordDialog isOpen onClose={vi.fn()} />)

    expect(html).toContain('role="dialog"')
    expect(html).toContain('Đổi mật khẩu')
    expect(html).toContain('Mật khẩu hiện tại')
    expect(html).toContain('Mật khẩu mới')
    expect(html).toContain('Nhập lại mật khẩu mới')
    expect(html).toContain('Lưu mật khẩu mới')
  })

  it('renders nothing when it is closed', () => {
    expect(renderToStaticMarkup(<ChangePasswordDialog isOpen={false} onClose={vi.fn()} />)).toBe('')
  })
})
