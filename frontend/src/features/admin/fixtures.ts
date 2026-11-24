// Shared demo catalog kept for the Student preview. Admin production pages use API types/data.
export type DemoSubject = { id: string; name: string }
export type DemoClassroom = {
  id: string
  name: string
  gradeLevel: number
  academicYear: string
  status: 'ACTIVE' | 'ARCHIVED'
}
export type DemoAccount = {
  id: string
  username: string
  fullName: string
  role: 'TEACHER' | 'STUDENT'
  status: 'ACTIVE' | 'INACTIVE'
  classroomId: string | null
  specializedSubjectId?: string
}
export type DemoClassroomSubject = {
  id: string
  classroomId: string
  subjectId: string
  teacherId: string | null
}

export const subjects: DemoSubject[] = [
  { id: 'history', name: 'Lịch sử' },
  { id: 'math', name: 'Toán' },
  { id: 'literature', name: 'Ngữ văn' },
  { id: 'physics', name: 'Vật lí' },
]

export const classrooms: DemoClassroom[] = [
  { id: 'class-11a1-2026', name: '11A1', gradeLevel: 11, academicYear: '2026–2027', status: 'ACTIVE' },
  { id: 'class-11a2-2026', name: '11A2', gradeLevel: 11, academicYear: '2026–2027', status: 'ACTIVE' },
  { id: 'class-10a1-2025', name: '10A1', gradeLevel: 10, academicYear: '2025–2026', status: 'ARCHIVED' },
]

export const accounts: DemoAccount[] = [
  { id: 'teacher-minh-anh', username: 'nguyen.minh.anh', fullName: 'Nguyễn Minh Anh', role: 'TEACHER', status: 'ACTIVE', classroomId: null, specializedSubjectId: 'history' },
  { id: 'teacher-hoai-nam', username: 'tran.hoai.nam', fullName: 'Trần Hoài Nam', role: 'TEACHER', status: 'ACTIVE', classroomId: null, specializedSubjectId: 'history' },
  { id: 'teacher-thu-ha', username: 'le.thu.ha', fullName: 'Lê Thu Hà', role: 'TEACHER', status: 'ACTIVE', classroomId: null, specializedSubjectId: 'math' },
  { id: 'phuc', username: 'le.gia.phuc', fullName: 'Lê Gia Phúc', role: 'STUDENT', status: 'ACTIVE', classroomId: 'class-11a2-2026' },
  { id: 'mai', username: 'nguyen.hoang.mai', fullName: 'Nguyễn Hoàng Mai', role: 'STUDENT', status: 'ACTIVE', classroomId: 'class-11a2-2026' },
  { id: 'khanh', username: 'tran.minh.khanh', fullName: 'Trần Minh Khánh', role: 'STUDENT', status: 'ACTIVE', classroomId: 'class-11a2-2026' },
  { id: 'an', username: 'tran.hoang.an', fullName: 'Trần Hoàng An', role: 'STUDENT', status: 'ACTIVE', classroomId: 'class-11a1-2026' },
  { id: 'linh', username: 'nguyen.thao.linh', fullName: 'Nguyễn Thảo Linh', role: 'STUDENT', status: 'ACTIVE', classroomId: 'class-11a1-2026' },
  { id: 'bao', username: 'pham.gia.bao', fullName: 'Phạm Gia Bảo', role: 'STUDENT', status: 'ACTIVE', classroomId: 'class-11a1-2026' },
]

export const classroomSubjects: DemoClassroomSubject[] = [
  { id: 'history-11a1', classroomId: 'class-11a1-2026', subjectId: 'history', teacherId: 'teacher-minh-anh' },
  { id: 'math-11a1', classroomId: 'class-11a1-2026', subjectId: 'math', teacherId: null },
  { id: 'literature-11a1', classroomId: 'class-11a1-2026', subjectId: 'literature', teacherId: null },
  { id: 'physics-11a1', classroomId: 'class-11a1-2026', subjectId: 'physics', teacherId: null },
  { id: 'history-11a2', classroomId: 'class-11a2-2026', subjectId: 'history', teacherId: 'teacher-minh-anh' },
  { id: '11a2-math', classroomId: 'class-11a2-2026', subjectId: 'math', teacherId: 'teacher-thu-ha' },
  { id: 'literature-11a2', classroomId: 'class-11a2-2026', subjectId: 'literature', teacherId: null },
  { id: 'physics-11a2', classroomId: 'class-11a2-2026', subjectId: 'physics', teacherId: null },
  { id: '10a1-history', classroomId: 'class-10a1-2025', subjectId: 'history', teacherId: 'teacher-minh-anh' },
]
