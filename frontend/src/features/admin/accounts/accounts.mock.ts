import { accounts, type AccountRole } from '../fixtures'

export type AccountDraft = {
  role: AccountRole
  fullName: string
  username: string
  contact: string
  qualification: string
  specializedSubjectId: string
}

export const emptyAccountDraft: AccountDraft = {
  role: 'STUDENT', fullName: '', username: '', contact: '', qualification: '', specializedSubjectId: '',
}

export function accountDraftFrom(account: {
  role: AccountRole | 'ADMIN'
  fullName: string
  username: string
  contact: string | null | undefined
  qualification?: string | null
  specializedSubjectId?: string | null
}): AccountDraft {
  return {
    role: account.role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
    fullName: account.fullName,
    username: account.username,
    contact: account.contact ?? '',
    qualification: account.qualification ?? '',
    specializedSubjectId: account.specializedSubjectId ?? '',
  }
}

export function validateAccountDraft(
  draft: AccountDraft,
  existingAccounts: Array<{ id: string; username: string }> = accounts,
  editingId?: string,
): string[] {
  const errors: string[] = []
  if (!draft.fullName.trim()) errors.push('Họ tên không được để trống.')
  if (!draft.username.trim()) errors.push('Tên đăng nhập không được để trống.')
  if (draft.username.trim() && existingAccounts.some((account) => account.id !== editingId && account.username.toLocaleLowerCase() === draft.username.trim().toLocaleLowerCase())) errors.push('Tên đăng nhập đã tồn tại.')
  if (!draft.contact.trim()) errors.push('Thông tin liên hệ không được để trống.')
  if (draft.role === 'TEACHER' && !draft.qualification.trim()) errors.push('Giáo viên cần có bằng cấp.')
  if (draft.role === 'TEACHER' && !draft.specializedSubjectId) errors.push('Hãy chọn môn học chuyên môn của giáo viên.')
  return errors
}
