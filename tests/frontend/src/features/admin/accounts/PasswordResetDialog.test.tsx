import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AdminAccount } from '../../../../../../frontend/src/lib/api/admin'
import { PasswordResetDialog } from '../../../../../../frontend/src/features/admin/accounts/PasswordResetDialog'

const account: AdminAccount = {
  id: 'student-id',
  username: 'student.demo',
  fullName: 'Học sinh Demo',
  role: 'STUDENT',
  status: 'ACTIVE',
  contact: null,
  classroomId: null,
  classroomName: null,
  mustChangePassword: false,
  passwordChangedAt: null,
  createdAt: '2026-11-16T00:00:00.000Z',
}

describe('PasswordResetDialog', () => {
  it('renders the account identity without rendering a password value', () => {
    const markup = renderToStaticMarkup(
      <PasswordResetDialog account={account} isSaving={false} onClose={() => undefined} onSave={async () => undefined} />
    )

    expect(markup).toContain('student.demo')
    expect(markup).toContain('Mật khẩu mới')
    expect(markup).not.toContain('demo123')
  })
})
