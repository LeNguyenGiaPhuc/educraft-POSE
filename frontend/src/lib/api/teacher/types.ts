export type TeacherClassroomStatus = 'ACTIVE' | 'ARCHIVED'

export type TeacherAssignedSubject = {
  id: string
  classroomId: string
  name: string
  subjectId: string
  teacherId: string
}

export type TeacherClassroomSummary = {
  id: string
  name: string
  academicYear: string
  gradeLevel: number
  status: TeacherClassroomStatus
  readOnly: boolean
  studentCount: number
  subjects: TeacherAssignedSubject[]
}

export type TeacherClassroomStudent = {
  id: string
  name: string
  username: string
  contact: string | null
  joinedAt: string | null
  leftAt: string | null
}

export type TeacherClassroomDetail = {
  id: string
  name: string
  academicYear: string
  gradeLevel: number
  status: TeacherClassroomStatus
  readOnly: boolean
  students: TeacherClassroomStudent[]
  subjects: TeacherAssignedSubject[]
}

export type TeacherClassroomSubjectContext = {
  classroomSubjectId: string
  classroomId: string
  classroomName: string
  classroomStatus: TeacherClassroomStatus
  readOnly: boolean
  academicYear: string
  gradeLevel: number
  subjectId: string
  subjectName: string
  teacherId: string
  lessonCount: number
  activityCount: number
  studentCount: number
}

export type TeacherSubjectStudent = TeacherClassroomStudent
