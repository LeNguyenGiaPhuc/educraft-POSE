import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AccountPreviewDialog } from '../../../../../../frontend/src/features/admin/accounts/AccountPreviewDialog'

describe('AccountPreviewDialog', () => {
  it('shows the account details and never renders the password value', () => {
    const markup = renderToStaticMarkup(
      <AccountPreviewDialog
        draft={{
          role: 'TEACHER',
          fullName: 'Cô Minh Anh',
          username: 'minhanh',
          contact: 'minhanh@example.com',
          qualification: 'Cử nhân Sư phạm',
          specializedSubjectId: 'history-id',
        }}
        password="super-secret"
        subjectName="Lịch sử"
        isSaving={false}
        onBack={() => undefined}
        onConfirm={async () => undefined}
      />
    )

    expect(markup).toContain('Xác nhận tạo tài khoản')
    expect(markup).toContain('Cô Minh Anh')
    expect(markup).toContain('minhanh')
    expect(markup).toContain('Lịch sử')
    expect(markup).toContain('Đã nhập')
    expect(markup).not.toContain('super-secret')
  })
})
