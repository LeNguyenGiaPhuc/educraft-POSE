import { describe, expect, it } from 'vitest'
import { accountDraftFrom, emptyAccountDraft, validateAccountDraft } from '../../../../../../frontend/src/features/admin/accounts/accountForm'

describe('account form model', () => {
  it('creates an empty student draft', () => {
    expect(emptyAccountDraft).toEqual({
      role: 'STUDENT',
      fullName: '',
      username: '',
      contact: '',
      qualification: '',
      specializedSubjectId: '',
    })
  })

  it('maps nullable API fields to editable strings', () => {
    expect(accountDraftFrom({
      role: 'TEACHER',
      fullName: 'Cô Minh Anh',
      username: 'minhanh',
      contact: null,
      qualification: null,
      specializedSubjectId: null,
    })).toEqual({
      role: 'TEACHER',
      fullName: 'Cô Minh Anh',
      username: 'minhanh',
      contact: '',
      qualification: '',
      specializedSubjectId: '',
    })
  })

  it('rejects duplicate usernames but allows the edited account', () => {
    const draft = { ...emptyAccountDraft, fullName: 'Học sinh', username: 'Student@Demo', contact: '0900' }
    const accounts = [{ id: 'one', username: 'student@demo' }]
    expect(validateAccountDraft(draft, accounts, 'two')).toContain('Tên đăng nhập đã tồn tại.')
    expect(validateAccountDraft(draft, accounts, 'one')).not.toContain('Tên đăng nhập đã tồn tại.')
  })
})
