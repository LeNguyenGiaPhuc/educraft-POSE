import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { RoleLayout } from '../../../../frontend/src/components/RoleLayout'
import { demoUsers } from '../../../../frontend/src/data/demo'

function renderRole(role: 'admin' | 'teacher' | 'student') {
  const user = demoUsers.find((entry) => entry.role === role)!
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[`/${role}`]}>
      <Routes>
        <Route path={`/${role}`} element={<RoleLayout user={user} onSignOut={() => {}} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('managed workspace shell', () => {
  it('provides a labelled collapse control and current navigation for Admin', () => {
    const html = renderRole('admin')
    expect(html).toContain('aria-label="Thu gọn thanh điều hướng"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('class="app-shell role-admin managed-shell')
  })

  it('preserves the Student shell without managed controls', () => {
    const html = renderRole('student')
    expect(html).toContain('class="app-shell role-student"')
    expect(html).not.toContain('Thu gọn thanh điều hướng')
    expect(html).toContain('Không gian học sinh')
    expect(html).not.toContain('Bản mô phỏng Student')
    expect(html).not.toContain('Giao diện mẫu')
  })

  it('keeps the Teacher shell focused by omitting redundant role and topbar badges', () => {
    const html = renderRole('teacher')
    expect(html).not.toContain('workspace-label')
    expect(html).not.toContain('topbar-avatar')
    expect(html).toContain('class="sidebar-user"')
  })
})
