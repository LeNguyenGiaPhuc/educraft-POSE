import {
  accounts,
  classrooms,
  classroomSubjects,
  getClassroom,
  getClassroomSubjects,
  memberships,
  subjects,
  type AdminAccount,
  type Classroom,
  type ClassroomSubject,
  type Membership,
} from '../fixtures'
import { type StudentImportRow, validateStudentImport } from './studentImport'

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

export type ExcelImportStatus = 'VALID_NEW' | 'VALID_REUSE' | 'ERROR'

export type ExcelStudentRow = {
  rowNumber: number
  username: string
  fullName: string
  contact: string
  status: ExcelImportStatus
  message: string
  eligible: boolean
}

function parseDelimitedRow(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, '').trim())
  }
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, '').trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, '').trim())
  return result
}

function normalizeText(val: string): string {
  return val.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeContact(val: string): string {
  return val.trim().toLowerCase().replace(/\s+/g, '')
}

export function previewExcelStudentRoster(content: string, targetClassroomId: string): ExcelStudentRow[] {
  const clean = content.replace(/^\uFEFF/, '').trim()
  if (!clean) return []

  const rawLines = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (rawLines.length === 0) return []

  const firstCells = parseDelimitedRow(rawLines[0])
  const firstCellKey = firstCells[0]?.toLowerCase().trim() ?? ''
  const isHeader = firstCellKey === 'username' ||
    firstCellKey === 'tên đăng nhập' ||
    firstCellKey === 'tendangnhap' ||
    firstCells.some((c) => {
      const lower = c.toLowerCase()
      return lower.includes('full_name') || lower.includes('họ và tên') || lower.includes('họ tên')
    })

  const dataLines = isHeader ? rawLines.slice(1) : rawLines
  const startRowNumber = isHeader ? 2 : 1

  // Count occurrences of username in the batch to detect duplicate lines
  const usernameCounts = new Map<string, number>()
  for (const line of dataLines) {
    const cells = parseDelimitedRow(line)
    const u = cells[0]?.trim().toLowerCase()
    if (u) {
      usernameCounts.set(u, (usernameCounts.get(u) ?? 0) + 1)
    }
  }

  return dataLines.map((line, index) => {
    const rowNumber = startRowNumber + index
    const cells = parseDelimitedRow(line)
    const username = cells[0]?.trim() ?? ''
    const fullName = cells[1]?.trim() ?? ''
    const contact = cells[2]?.trim() ?? ''
    const userKey = username.toLowerCase()

    // 1. Missing required fields
    if (!username || !fullName || !contact) {
      return {
        rowNumber,
        username,
        fullName,
        contact,
        status: 'ERROR',
        message: 'Thiếu thông tin bắt buộc (yêu cầu username, họ tên, liên hệ)',
        eligible: false,
      }
    }

    // 2. Duplicate username in the same file
    if ((usernameCounts.get(userKey) ?? 0) > 1) {
      return {
        rowNumber,
        username,
        fullName,
        contact,
        status: 'ERROR',
        message: 'Trùng tên đăng nhập với dòng khác trong file',
        eligible: false,
      }
    }

    // 3. Existing account checks
    const existing = accounts.find((a) => a.username.toLowerCase() === userKey)
    if (existing) {
      // Non-student role
      if (existing.role !== 'STUDENT') {
        return {
          rowNumber,
          username,
          fullName,
          contact,
          status: 'ERROR',
          message: 'Tên đăng nhập trùng với tài khoản giáo viên hoặc quản trị viên',
          eligible: false,
        }
      }

      // Inactive account check (from QA Auditor requirement)
      if (existing.status === 'INACTIVE') {
        return {
          rowNumber,
          username,
          fullName,
          contact,
          status: 'ERROR',
          message: 'Tài khoản đang bị vô hiệu hóa; cần kích hoạt ở mục Quản lý tài khoản trước khi phân lớp',
          eligible: false,
        }
      }

      // Already in the target classroom
      if (existing.classroomId === targetClassroomId) {
        return {
          rowNumber,
          username,
          fullName,
          contact,
          status: 'ERROR',
          message: 'Đã thuộc lớp này',
          eligible: false,
        }
      }

      // Currently enrolled in another ACTIVE classroom
      const currentClass = existing.classroomId ? classrooms.find((c) => c.id === existing.classroomId) : null
      if (currentClass && currentClass.status === 'ACTIVE') {
        return {
          rowNumber,
          username,
          fullName,
          contact,
          status: 'ERROR',
          message: 'Đang học tại lớp khác; không thể tự ý import',
          eligible: false,
        }
      }

      // Existing student with no active classroom (unassigned or previously completed)
      const nameMatches = normalizeText(fullName) === normalizeText(existing.fullName)
      const contactMatches = normalizeContact(contact) === normalizeContact(existing.contact)

      if (nameMatches && contactMatches) {
        return {
          rowNumber,
          username,
          fullName,
          contact,
          status: 'VALID_REUSE',
          message: 'Tài khoản đã có, hợp lệ để thêm vào lớp',
          eligible: true,
        }
      }

      return {
        rowNumber,
        username,
        fullName,
        contact,
        status: 'ERROR',
        message: 'Trùng tên đăng nhập nhưng thông tin không khớp với hồ sơ cũ',
        eligible: false,
      }
    }

    // 4. Brand new student account
    return {
      rowNumber,
      username,
      fullName,
      contact,
      status: 'VALID_NEW',
      message: 'Tài khoản mới, sẽ được cấp mật khẩu ban đầu',
      eligible: true,
    }
  })
}

export function getExcelTemplateCsv(): string {
  return '\uFEFF' + [
    'username,full_name,contact',
    'nguyen.van.an,Nguyễn Văn An,an.nguyen@example.com',
    'tran.thi.bich,Trần Thị Bích,0912345678',
    'le.hoang.nam,Lê Hoàng Nam,nam.le@example.edu.vn',
  ].join('\r\n')
}

export function activeStudents(classroomId: string) {
  return memberships.filter((item) => item.classroomId === classroomId && item.leftAt === null)
    .map((item) => ({ membership: item, student: accounts.find((account) => account.id === item.studentId) }))
    .filter((item): item is { membership: Membership; student: AdminAccount } => Boolean(item.student))
}

export function historicalStudents(classroomId: string) {
  return memberships.filter((item) => item.classroomId === classroomId && item.leftAt !== null)
    .map((item) => ({ membership: item, student: accounts.find((account) => account.id === item.studentId) }))
    .filter((item): item is { membership: Membership; student: AdminAccount } => Boolean(item.student))
}

export function getSubjectAssignmentStats(classroomId: string) {
  const list = getClassroomSubjects(classroomId)
  const total = list.length
  const assigned = list.filter((item) => item.teacherId !== null).length
  return {
    assigned,
    total,
    ratioText: `${assigned}/${total} môn có GV`,
    isComplete: total > 0 && assigned === total,
    percentage: total > 0 ? Math.round((assigned / total) * 100) : 0,
  }
}

export function createNewClassroom(draft: ClassroomDraft, importRows?: StudentImportRow[]) {
  // If importRows provided, validate them first!
  if (importRows && importRows.length > 0) {
    const existingUsernames = new Set(accounts.map((a) => a.username.toLowerCase()))
    const issues = validateStudentImport(importRows, existingUsernames)
    if (issues.length > 0) {
      throw new Error(`File danh sách học sinh có ${issues.length} lỗi. Không thể tạo lớp.`)
    }
  }

  const cleanName = draft.name.trim()
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  const id = `class-${slug}-${Date.now().toString().slice(-4)}`
  const newClassroom: Classroom = {
    id,
    name: cleanName,
    gradeLevel: draft.gradeLevel,
    academicYear: draft.academicYear.trim(),
    status: 'ACTIVE',
  }

  // Prepend to classrooms list
  classrooms.unshift(newClassroom)

  // Auto-populate ClassroomSubject for all active catalog subjects with teacherId = null
  let subjectsCreated = 0
  for (const sub of subjects) {
    const cs: ClassroomSubject = {
      id: `${sub.id}-${id}`,
      classroomId: id,
      subjectId: sub.id,
      teacherId: null,
    }
    classroomSubjects.push(cs)
    subjectsCreated++
  }

  // Import valid students if provided
  let studentsAdded = 0
  if (importRows && importRows.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    for (const row of importRows) {
      const userKey = row.username.toLowerCase().trim()
      const newStudent: AdminAccount = {
        id: `student-${userKey.replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-3)}`,
        username: row.username.trim(),
        fullName: row.fullName.trim(),
        role: 'STUDENT',
        status: 'ACTIVE',
        contact: row.contact.trim(),
        classroomId: id,
        passwordChangedAt: null,
      }
      accounts.push(newStudent)
      memberships.push({
        studentId: newStudent.id,
        classroomId: id,
        joinedAt: today,
        leftAt: null,
      })
      studentsAdded++
    }
  }

  return {
    classroom: newClassroom,
    subjectsCreated,
    studentsAdded,
  }
}

export function importStudentsToClassroom(importRows: StudentImportRow[], classroomId: string): number {
  if (!importRows || importRows.length === 0) return 0
  const existingUsernames = new Set(accounts.map((a) => a.username.toLowerCase()))
  const issues = validateStudentImport(importRows, existingUsernames)
  if (issues.length > 0) {
    return 0
  }

  const today = new Date().toISOString().split('T')[0]
  let count = 0
  for (const row of importRows) {
    const userKey = row.username.toLowerCase().trim()
    const newStudent: AdminAccount = {
      id: `student-${userKey.replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-3)}-${Math.floor(Math.random() * 1000)}`,
      username: row.username.trim(),
      fullName: row.fullName.trim(),
      role: 'STUDENT',
      status: 'ACTIVE',
      contact: row.contact.trim(),
      classroomId,
      passwordChangedAt: null,
    }
    accounts.push(newStudent)
    memberships.push({
      studentId: newStudent.id,
      classroomId,
      joinedAt: today,
      leftAt: null,
    })
    count++
  }
  return count
}

export function addManualStudentToClassroom(
  studentId: string,
  classroomId: string
): { success: boolean; message: string; student?: AdminAccount } {
  if (!studentId) {
    return { success: false, message: 'Vui lòng chọn một tài khoản học sinh.' }
  }

  const student = accounts.find((a) => a.id === studentId)
  if (!student || student.role !== 'STUDENT') {
    return { success: false, message: 'Không tìm thấy tài khoản học sinh hợp lệ.' }
  }
  if (student.status === 'INACTIVE') {
    return { success: false, message: 'Tài khoản học sinh này đang bị vô hiệu hóa; cần kích hoạt ở Quản lý tài khoản trước.' }
  }
  if (student.classroomId === classroomId) {
    return { success: false, message: 'Học sinh này đã thuộc lớp học hiện tại.' }
  }
  if (student.classroomId) {
    const currentClass = classrooms.find((c) => c.id === student.classroomId)
    if (currentClass && currentClass.status === 'ACTIVE') {
      return { success: false, message: `Học sinh đang học tại lớp ${currentClass.name}; không thể thêm vào lớp này.` }
    }
  }

  const targetClass = classrooms.find((c) => c.id === classroomId)
  if (!targetClass || targetClass.status === 'ARCHIVED') {
    return { success: false, message: 'Không thể thêm học sinh vào lớp đã lưu trữ.' }
  }

  const today = new Date().toISOString().split('T')[0]
  student.classroomId = classroomId
  memberships.push({
    studentId: student.id,
    classroomId,
    joinedAt: today,
    leftAt: null,
  })

  return {
    success: true,
    message: `Đã thêm học sinh ${student.fullName} (@${student.username}) vào lớp thành công!`,
    student,
  }
}

export function assignTeacherToClassroomSubject(
  classroomId: string,
  subjectId: string,
  teacherId: string | null
): { success: boolean; message: string } {
  let cs = classroomSubjects.find((item) => item.classroomId === classroomId && item.subjectId === subjectId)
  if (!cs) {
    cs = {
      id: `${subjectId}-${classroomId}`,
      classroomId,
      subjectId,
      teacherId: null,
    }
    classroomSubjects.push(cs)
  }

  if (teacherId === null) {
    cs.teacherId = null
    return { success: true, message: 'Đã hủy phân công giáo viên cho môn học này.' }
  }

  const teacher = accounts.find((a) => a.id === teacherId && a.role === 'TEACHER')
  if (!teacher) {
    return { success: false, message: 'Không tìm thấy thông tin giáo viên.' }
  }

  if (teacher.status !== 'ACTIVE') {
    return { success: false, message: 'Tài khoản giáo viên đang ở trạng thái không hoạt động.' }
  }

  if (teacher.specializedSubjectId !== subjectId) {
    return { success: false, message: 'Giáo viên không có chuyên môn phù hợp với môn học này.' }
  }

  cs.teacherId = teacherId
  return { success: true, message: `Đã phân công giáo viên ${teacher.fullName} phụ trách môn học thành công.` }
}

export function updateClassroomInfo(
  classroomId: string,
  draft: ClassroomDraft
): { success: boolean; errors?: string[] } {
  const errors = validateClassroomDraft(draft, classroomId)
  if (errors.length > 0) {
    return { success: false, errors }
  }

  const classroom = classrooms.find((c) => c.id === classroomId)
  if (!classroom) {
    return { success: false, errors: ['Không tìm thấy lớp học.'] }
  }

  classroom.name = draft.name.trim()
  classroom.gradeLevel = draft.gradeLevel
  classroom.academicYear = draft.academicYear.trim()

  return { success: true }
}

export function archiveClassroomAction(classroomId: string): { success: boolean; message: string } {
  const classroom = classrooms.find((c) => c.id === classroomId)
  if (!classroom) {
    return { success: false, message: 'Không tìm thấy lớp học.' }
  }

  classroom.status = 'ARCHIVED'
  const today = new Date().toISOString().split('T')[0]

  // Close all open active enrollments for this classroom
  for (const m of memberships) {
    if (m.classroomId === classroomId && m.leftAt === null) {
      m.leftAt = today
    }
  }

  // Update students' active classroom pointer
  for (const acc of accounts) {
    if (acc.classroomId === classroomId) {
      acc.classroomId = null
    }
  }

  return { success: true, message: `Đã chuyển lớp ${classroom.name} sang trạng thái lưu trữ (Read-only).` }
}

export function removeStudentFromClassroom(
  studentId: string,
  classroomId: string
): { success: boolean; message: string } {
  const today = new Date().toISOString().split('T')[0]
  const membership = memberships.find((m) => m.studentId === studentId && m.classroomId === classroomId && m.leftAt === null)
  if (membership) {
    membership.leftAt = today
  }

  const student = accounts.find((a) => a.id === studentId)
  if (student && student.classroomId === classroomId) {
    student.classroomId = null
  }

  return { success: true, message: 'Đã chuyển học sinh ra khỏi lớp.' }
}
