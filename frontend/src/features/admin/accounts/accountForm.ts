import type { AdminAccount } from '../../../lib/api/admin'
import {
  normalizeContact,
  normalizeFullName,
  normalizeUsername,
  validateContact,
  validateFullName,
  validateUsername,
} from '../../../lib/accountIdentity'

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

export function normalizeAccountDraft(draft: AccountDraft): AccountDraft {
  return {
    ...draft,
    fullName: normalizeFullName(draft.fullName),
    username: normalizeUsername(draft.username),
    contact: normalizeContact(draft.contact),
  }
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
  options: { requireContact?: boolean } = {},
): string[] {
  const errors: string[] = []
  const normalized = normalizeAccountDraft(draft)
  const fullNameError = validateFullName(normalized.fullName)
  const usernameError = validateUsername(normalized.username)
  const contactError = validateContact(normalized.contact)

  if (fullNameError) errors.push(fullNameError)
  if (usernameError) errors.push(usernameError)
  if (!usernameError && existingAccounts.some((account) => account.id !== editingId && normalizeUsername(account.username) === normalized.username)) {
    errors.push('Tên đăng nhập đã tồn tại.')
  }
  if (contactError && ((options.requireContact ?? true) || normalized.contact)) errors.push(contactError)
  if (draft.role === 'TEACHER' && !draft.qualification.trim()) {
    errors.push('Giáo viên cần có bằng cấp.')
  }
  if (draft.role === 'TEACHER' && !draft.specializedSubjectId) {
    errors.push('Hãy chọn môn học chuyên môn của giáo viên.')
  }
  return errors
}
