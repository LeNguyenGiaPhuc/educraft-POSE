export type AccountRole = 'TEACHER' | 'STUDENT'
export type AccountStatus = 'ACTIVE' | 'INACTIVE'
export type ClassroomStatus = 'ACTIVE' | 'ARCHIVED'

export type Subject = { id: string; name: string }
export type AdminAccount = {
  id: string
  username: string
  fullName: string
  role: AccountRole
  status: AccountStatus
  contact: string
  classroomId: string | null
  qualification?: string
  specializedSubjectId?: string
}
export type Classroom = {
  id: string
  name: string
  gradeLevel: number
  academicYear: string
  status: ClassroomStatus
}
export type Membership = {
  studentId: string
  classroomId: string
  joinedAt: string
  leftAt: string | null
}
export type ClassroomSubject = {
  id: string
  classroomId: string
  subjectId: string
  teacherId: string
}

export const subjects: Subject[] = [
  { id: 'history', name: 'Lịch sử' },
  { id: 'math', name: 'Toán' },
  { id: 'literature', name: 'Ngữ văn' },
  { id: 'physics', name: 'Vật lí' },
]

export const classrooms: Classroom[] = [
  { id: 'class-11a1-2026', name: '11A1', gradeLevel: 11, academicYear: '2026–2027', status: 'ACTIVE' },
  { id: 'class-11a2-2026', name: '11A2', gradeLevel: 11, academicYear: '2026–2027', status: 'ACTIVE' },
  { id: 'class-10a1-2025', name: '10A1', gradeLevel: 10, academicYear: '2025–2026', status: 'ARCHIVED' },
]

export const accounts: AdminAccount[] = [
  { id: 'teacher-minh-anh', username: 'nguyen.minh.anh', fullName: 'Nguyễn Minh Anh', role: 'TEACHER', status: 'ACTIVE', contact: 'minhanh@example.edu.vn', classroomId: null, qualification: 'Cử nhân Sư phạm Lịch sử', specializedSubjectId: 'history' },
  { id: 'teacher-hoai-nam', username: 'tran.hoai.nam', fullName: 'Trần Hoài Nam', role: 'TEACHER', status: 'ACTIVE', contact: 'hoainam@example.edu.vn', classroomId: null, qualification: 'Thạc sĩ Lịch sử', specializedSubjectId: 'history' },
  { id: 'teacher-thu-ha', username: 'le.thu.ha', fullName: 'Lê Thu Hà', role: 'TEACHER', status: 'ACTIVE', contact: 'thuha@example.edu.vn', classroomId: null, qualification: 'Cử nhân Sư phạm Toán', specializedSubjectId: 'math' },
  { id: 'teacher-kim-oanh', username: 'pham.kim.oanh', fullName: 'Phạm Kim Oanh', role: 'TEACHER', status: 'INACTIVE', contact: 'kimoanh@example.edu.vn', classroomId: null, qualification: 'Cử nhân Ngữ văn', specializedSubjectId: 'literature' },
  { id: 'phuc', username: 'le.gia.phuc', fullName: 'Lê Gia Phúc', role: 'STUDENT', status: 'ACTIVE', contact: 'giaphuc@example.edu.vn', classroomId: 'class-11a2-2026' },
  { id: 'mai', username: 'nguyen.hoang.mai', fullName: 'Nguyễn Hoàng Mai', role: 'STUDENT', status: 'ACTIVE', contact: 'hoangmai@example.edu.vn', classroomId: 'class-11a2-2026' },
  { id: 'khanh', username: 'tran.minh.khanh', fullName: 'Trần Minh Khánh', role: 'STUDENT', status: 'ACTIVE', contact: 'minhkhanh@example.edu.vn', classroomId: 'class-11a2-2026' },
  { id: 'an', username: 'tran.hoang.an', fullName: 'Trần Hoàng An', role: 'STUDENT', status: 'ACTIVE', contact: 'hoangan@example.edu.vn', classroomId: 'class-11a1-2026' },
  { id: 'linh', username: 'nguyen.thao.linh', fullName: 'Nguyễn Thảo Linh', role: 'STUDENT', status: 'ACTIVE', contact: 'thaolinh@example.edu.vn', classroomId: 'class-11a1-2026' },
  { id: 'bao', username: 'pham.gia.bao', fullName: 'Phạm Gia Bảo', role: 'STUDENT', status: 'ACTIVE', contact: 'giabao@example.edu.vn', classroomId: 'class-11a1-2026' },
  { id: 'student-thu-lan', username: 'vo.thu.lan', fullName: 'Võ Thu Lan', role: 'STUDENT', status: 'ACTIVE', contact: 'thulan@example.edu.vn', classroomId: null },
]

export const memberships: Membership[] = [
  { studentId: 'phuc', classroomId: 'class-10a1-2025', joinedAt: '2025-09-05', leftAt: '2026-05-31' },
  { studentId: 'phuc', classroomId: 'class-11a2-2026', joinedAt: '2026-09-05', leftAt: null },
  { studentId: 'mai', classroomId: 'class-11a2-2026', joinedAt: '2026-09-05', leftAt: null },
  { studentId: 'khanh', classroomId: 'class-11a2-2026', joinedAt: '2026-09-05', leftAt: null },
  { studentId: 'an', classroomId: 'class-11a1-2026', joinedAt: '2026-09-05', leftAt: null },
  { studentId: 'linh', classroomId: 'class-11a1-2026', joinedAt: '2026-09-05', leftAt: null },
  { studentId: 'bao', classroomId: 'class-11a1-2026', joinedAt: '2026-09-05', leftAt: null },
]

export const classroomSubjects: ClassroomSubject[] = [
  { id: 'history-11a1', classroomId: 'class-11a1-2026', subjectId: 'history', teacherId: 'teacher-minh-anh' },
  { id: 'history-11a2', classroomId: 'class-11a2-2026', subjectId: 'history', teacherId: 'teacher-minh-anh' },
  { id: '11a2-math', classroomId: 'class-11a2-2026', subjectId: 'math', teacherId: 'teacher-thu-ha' },
  { id: '10a1-history', classroomId: 'class-10a1-2025', subjectId: 'history', teacherId: 'teacher-minh-anh' },
]

export const getClassroom = (id: string | null) => classrooms.find((item) => item.id === id)
export const getSubject = (id: string) => subjects.find((item) => item.id === id)
export const getTeacher = (id: string) => accounts.find((item) => item.id === id && item.role === 'TEACHER')
export const getStudent = (id: string) => accounts.find((item) => item.id === id && item.role === 'STUDENT')
