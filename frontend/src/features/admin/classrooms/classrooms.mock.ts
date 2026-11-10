import { accounts, classrooms, getClassroom, memberships, type Classroom } from '../fixtures'

export type ClassroomDraft = Pick<Classroom, 'name' | 'gradeLevel' | 'academicYear'>
export const emptyClassroomDraft: ClassroomDraft = { name: '', gradeLevel: 10, academicYear: '2026–2027' }

export function validateClassroomDraft(draft: ClassroomDraft, editingId?: string): string[] {
  const errors: string[] = []
  if (!draft.name.trim()) errors.push('Cần nhập tên lớp.')
  if (!Number.isInteger(draft.gradeLevel) || draft.gradeLevel < 1 || draft.gradeLevel > 12) errors.push('Khối lớp phải từ 1 đến 12.')
  if (!draft.academicYear.trim()) errors.push('Cần nhập năm học.')
  if (classrooms.some((item) => item.id !== editingId && item.name.toLocaleLowerCase() === draft.name.trim().toLocaleLowerCase() && item.academicYear === draft.academicYear.trim())) errors.push('Lớp này đã tồn tại trong cùng năm học.')
  return errors
}

export type RosterRow = { line: number; username: string; studentName: string; message: string; eligible: boolean }

export function previewRoster(csv: string, targetClassroomId: string): RosterRow[] {
  const seen = new Set<string>()
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const values = lines[0]?.toLocaleLowerCase() === 'username' ? lines.slice(1) : lines
  return values.map((line, index) => {
    const username = line.split(',')[0]?.trim() ?? ''
    const key = username.toLocaleLowerCase()
    const student = accounts.find((account) => account.role === 'STUDENT' && account.username.toLocaleLowerCase() === key)
    let message = 'Có thể thêm vào lớp'
    let eligible = true
    if (!username) { message = 'Thiếu tên đăng nhập'; eligible = false }
    else if (seen.has(key)) { message = 'Trùng trong danh sách import'; eligible = false }
    else if (!student) { message = 'Không tìm thấy tài khoản học sinh'; eligible = false }
    else if (student.classroomId === targetClassroomId) { message = 'Đã thuộc lớp này'; eligible = false }
    else if (student.classroomId) { message = `Đang ở ${getClassroom(student.classroomId)?.name ?? 'lớp khác'}; cần chuyển lớp`; eligible = false }
    seen.add(key)
    return { line: index + (lines[0]?.toLocaleLowerCase() === 'username' ? 2 : 1), username, studentName: student?.fullName ?? '—', message, eligible }
  })
}

export function activeStudents(classroomId: string) {
  return memberships.filter((item) => item.classroomId === classroomId && item.leftAt === null)
    .map((item) => ({ membership: item, student: accounts.find((account) => account.id === item.studentId) }))
    .filter((item) => item.student)
}
