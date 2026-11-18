import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { RoleLayout } from '../../../../frontend/src/components/RoleLayout'

const adminUser = {
  role: 'admin' as const,
  email: 'admin@example.com',
  name: 'Admin Example',
  initials: 'AE',
  context: 'Quản lý hệ thống',
}

const studentUser = {
  role: 'student' as const,
  email: 'student@example.com',
  name: 'Student Example',
  initials: 'SE',
  context: 'Học sinh',
}

describe('RoleLayout account actions', () => {
  it('shows the password action for an Admin', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/admin']}>
        <RoleLayout user={adminUser} onSignOut={vi.fn()} />
      </MemoryRouter>
    )

    expect(html).toContain('Đổi mật khẩu')
  })

  it('does not show the password action for the Student preview', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/student']}>
        <RoleLayout user={studentUser} onSignOut={vi.fn()} />
      </MemoryRouter>
    )

    expect(html).not.toContain('Đổi mật khẩu')
  })
})
