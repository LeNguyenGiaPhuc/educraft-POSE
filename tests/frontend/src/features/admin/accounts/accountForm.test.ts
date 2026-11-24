import { describe, expect, it } from 'vitest'
import { accountDraftFrom, emptyAccountDraft, normalizeAccountDraft, validateAccountDraft } from '../../../../../../frontend/src/features/admin/accounts/accountForm'

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
    const draft = { ...emptyAccountDraft, fullName: 'Học sinh', username: 'Student.Demo', contact: '0912345678' }
    const accounts = [{ id: 'one', username: 'student.demo' }]
    expect(validateAccountDraft(draft, accounts, 'two')).toContain('Tên đăng nhập đã tồn tại.')
    expect(validateAccountDraft(draft, accounts, 'one')).not.toContain('Tên đăng nhập đã tồn tại.')
  })

  it('normalizes identity fields before showing the confirmation preview', () => {
    const normalized = normalizeAccountDraft({
      ...emptyAccountDraft,
      fullName: '  Nguyễn   Văn An  ',
      username: ' Student.One ',
      contact: '+84 (912) 345-678',
    })

    expect(normalized.fullName).toBe('Nguyễn Văn An')
    expect(normalized.username).toBe('student.one')
    expect(normalized.contact).toBe('0912345678')
  })

  it('rejects invalid identity fields before sending a create request', () => {
    const errors = validateAccountDraft({
      ...emptyAccountDraft,
      fullName: 'Học sinh 2',
      username: 'student..one',
      contact: 'not-a-contact',
    })

    expect(errors).toContain('Họ và tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy đơn hoặc dấu gạch nối.')
    expect(errors).toContain('Tên đăng nhập không được có hai dấu phân cách liên tiếp.')
    expect(errors).toContain('Thông tin liên hệ không hợp lệ.')
  })

  it('allows an existing account with no contact to be edited without requiring a new contact', () => {
    const errors = validateAccountDraft(
      { ...emptyAccountDraft, fullName: 'Học sinh', username: 'student.one', contact: '' },
      [],
      'student-id',
      { requireContact: false },
    )

    expect(errors).not.toContain('Thông tin liên hệ không được để trống.')
  })
})
