import type { AdminSubject } from '../../../lib/api/admin'

export function validateSubjectName(
  name: string,
  subjects: AdminSubject[],
  excludeId?: string,
): string[] {
  const trimmedName = name.trim()
  const errors: string[] = []

  if (!trimmedName) {
    errors.push('Tên môn học không được để trống.')
  }

  if (trimmedName.length > 150) {
    errors.push('Tên môn học không được vượt quá 150 ký tự.')
  }

  const normalizedName = trimmedName.toLocaleLowerCase('vi')
  const duplicate = subjects.some((subject) => {
    return subject.id !== excludeId && subject.name.trim().toLocaleLowerCase('vi') === normalizedName
  })

  if (duplicate) {
    errors.push('Tên môn học đã tồn tại trong danh mục.')
  }

  return errors
}
