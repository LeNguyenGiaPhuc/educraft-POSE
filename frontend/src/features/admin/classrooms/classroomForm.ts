import type { AdminClassroomSummary } from '../../../lib/api/admin'

export type ClassroomDraft = Pick<AdminClassroomSummary, 'name' | 'gradeLevel' | 'academicYear'>

export const emptyClassroomDraft: ClassroomDraft = {
  name: '',
  gradeLevel: 10,
  academicYear: '2026–2027',
}

export function validateClassroomDraft(draft: ClassroomDraft): string[] {
  const errors: string[] = []
  if (!draft.name.trim()) errors.push('Cần nhập tên lớp.')
  if (!Number.isInteger(draft.gradeLevel) || draft.gradeLevel < 1 || draft.gradeLevel > 12) errors.push('Khối lớp phải từ 1 đến 12.')
  if (!draft.academicYear.trim()) errors.push('Cần nhập năm học.')
  return errors
}
