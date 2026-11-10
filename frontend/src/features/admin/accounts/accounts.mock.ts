import { accounts, type AccountRole, type AdminAccount } from '../fixtures'

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

export function accountDraftFrom(account: AdminAccount): AccountDraft {
  return {
    role: account.role,
    fullName: account.fullName,
    username: account.username,
    contact: account.contact,
    qualification: account.qualification ?? '',
    specializedSubjectId: account.specializedSubjectId ?? '',
  }
}

export function validateAccountDraft(draft: AccountDraft, editingId?: string): string[] {
  const errors: string[] = []
  if (!draft.fullName.trim()) errors.push('Họ tên không được để trống.')
  if (!draft.username.trim()) errors.push('Tên đăng nhập không được để trống.')
  if (draft.username.trim() && accounts.some((account) => account.id !== editingId && account.username.toLocaleLowerCase() === draft.username.trim().toLocaleLowerCase())) errors.push('Tên đăng nhập đã tồn tại.')
  if (!draft.contact.trim()) errors.push('Thông tin liên hệ không được để trống.')
  if (draft.role === 'TEACHER' && !draft.qualification.trim()) errors.push('Giáo viên cần có bằng cấp.')
  if (draft.role === 'TEACHER' && !draft.specializedSubjectId) errors.push('Hãy chọn môn học chuyên môn của giáo viên.')
  return errors
}
