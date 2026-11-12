import {
  accounts,
  classrooms,
  classroomSubjects,
  getEligibleTeachers,
  subjects,
  type AdminAccount,
  type Classroom,
  type ClassroomSubject,
  type Subject,
} from '../fixtures'

export const eligibleTeachers = getEligibleTeachers

/**
 * Validates assignment (kept for backward compatibility with previous specs)
 */
export function validateAssignment(
  classroomId: string,
  subjectId: string,
  teacherId: string,
  existing?: ClassroomSubject
): string[] {
  const errors: string[] = []
  if (!subjectId) errors.push('Hãy chọn môn học từ danh mục.')
  if (subjectId && !subjects.some((subject) => subject.id === subjectId))
    errors.push('Môn học không nằm trong danh mục.')
  if (
    !existing &&
    classroomSubjects.some(
      (item) => item.classroomId === classroomId && item.subjectId === subjectId
    )
  )
    errors.push('Môn này đã được mở trong lớp. Hãy chọn môn khác hoặc thay giáo viên cho môn hiện có.')
  if (!teacherId) errors.push('Mỗi môn của lớp cần đúng một giáo viên phụ trách.')
  if (
    teacherId &&
    !eligibleTeachers(subjectId).some((teacher) => teacher.id === teacherId)
  )
    errors.push('Giáo viên phải đang hoạt động và có chuyên môn đúng môn đã chọn.')
  return errors
}

/**
 * Validates a new subject name before creating:
 * - Báo lỗi nếu tên trống
 * - Báo lỗi nếu tên trùng lặp với môn đã có trong subjects (không phân biệt hoa/thường)
 */
export function validateNewSubject(name: string): string[] {
  const errors: string[] = []
  const trimmed = name.trim()

  if (!trimmed) {
    errors.push('Vui lòng nhập tên môn học.')
    return errors
  }

  const isDuplicate = subjects.some(
    (s) => s.name.trim().toLocaleLowerCase() === trimmed.toLocaleLowerCase()
  )

  if (isDuplicate) {
    errors.push(`Môn học "${trimmed}" đã tồn tại trong danh mục chung.`)
  }

  return errors
}

/**
 * Helper to slugify Vietnamese subject name into a standard identifier
 */
export function slugifySubjectName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'subject'
}

/**
 * Get all classrooms currently active in the school
 */
export function getActiveClassrooms(): Classroom[] {
  return classrooms.filter((c) => c.status === 'ACTIVE')
}

/**
 * Get all active teachers who have assigned subject specialization
 */
export function getActiveSpecializedTeachers(): AdminAccount[] {
  return accounts.filter(
    (a) => a.role === 'TEACHER' && a.status === 'ACTIVE' && Boolean(a.specializedSubjectId)
  )
}

/**
 * Adds a new subject to the global catalog:
 * 1. Tạo môn mới { id, name } và đưa vào subjects
 * 2. Tự động quét các lớp có status === 'ACTIVE' trong classrooms, tạo ClassroomSubject tương ứng với teacherId: null và đưa vào classroomSubjects
 * 3. Trả về số lượng lớp đang hoạt động đã được tự động áp dụng môn này.
 */
export function addNewSubject(name: string): number {
  const trimmed = name.trim()
  const baseId = slugifySubjectName(trimmed)
  let id = baseId
  let counter = 1

  while (subjects.some((s) => s.id === id)) {
    id = `${baseId}-${counter++}`
  }

  const newSubject: Subject = { id, name: trimmed }
  subjects.push(newSubject)

  const activeClasses = getActiveClassrooms()
  activeClasses.forEach((classroom) => {
    const exists = classroomSubjects.some(
      (cs) => cs.classroomId === classroom.id && cs.subjectId === id
    )
    if (!exists) {
      classroomSubjects.push({
        id: `${id}-${classroom.id}`,
        classroomId: classroom.id,
        subjectId: id,
        teacherId: null,
      })
    }
  })

  return activeClasses.length
}
