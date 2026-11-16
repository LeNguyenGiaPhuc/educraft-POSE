import type { AdminAccount } from '../../../lib/api/admin'

export type AccountDraft = {
  role: Exclude<AdminAccount['role'], 'ADMIN'>
  fullName: string
  username: string
  contact: string
  qualification: string
  specializedSubjectId: string
}

export const emptyAccountDraft: AccountDraft = {
  role: 'STUDENT',
  fullName: '',
  username: '',
  contact: '',
  qualification: '',
  specializedSubjectId: '',
}

export function accountDraftFrom(account: Pick<AdminAccount, 'role' | 'fullName' | 'username' | 'contact' | 'qualification' | 'specializedSubjectId'>): AccountDraft {
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
  existingAccounts: Array<Pick<AdminAccount, 'id' | 'username'>> = [],
  editingId?: string,
): string[] {
  const errors: string[] = []
  const username = draft.username.trim().toLocaleLowerCase()

  if (!draft.fullName.trim()) errors.push('Họ tên không được để trống.')
  if (!username) errors.push('Tên đăng nhập không được để trống.')
  if (username && existingAccounts.some((account) => account.id !== editingId && account.username.toLocaleLowerCase() === username)) {
    errors.push('Tên đăng nhập đã tồn tại.')
  }
  if (!draft.contact.trim()) errors.push('Thông tin liên hệ không được để trống.')
  if (draft.role === 'TEACHER' && !draft.qualification.trim()) errors.push('Giáo viên cần có bằng cấp.')
  if (draft.role === 'TEACHER' && !draft.specializedSubjectId) errors.push('Hãy chọn môn học chuyên môn của giáo viên.')
  return errors
}
