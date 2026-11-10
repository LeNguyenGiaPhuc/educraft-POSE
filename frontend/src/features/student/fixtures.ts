import { accounts, classrooms, classroomSubjects, subjects } from '../admin/fixtures'
import { sampleLessons } from '../teacher/fixtures'

export type StudentScenario = 'current' | 'unassigned' | 'history-only'
export type ClassroomSubjectPreview = {
  id: string
  classroomId: string
  classroomName: string
  academicYear: string
  name: string
  teacherId: string
  teacherName: string
  historic: boolean
}
export type MaterialPreview = {
  id: string
  name: string
  version: number
  processing: 'PROCESSED' | 'PROCESSING' | 'FAILED'
  sourcePosition: string
}
export type LessonPreview = {
  id: string
  classroomSubjectId: string
  title: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  materials: MaterialPreview[]
}
export const studentIdentity = { id: 'phuc', name: 'Lê Gia Phúc', currentClassroomId: 'class-11a2-2026', historicClassroomId: 'class-10a1-2025' }
export const studentSubjects: ClassroomSubjectPreview[] = classroomSubjects
  .filter((subject) => [studentIdentity.currentClassroomId, studentIdentity.historicClassroomId].includes(subject.classroomId))
  .flatMap((subject) => {
    const classroom = classrooms.find((item) => item.id === subject.classroomId)
    const subjectName = subjects.find((item) => item.id === subject.subjectId)?.name
    const teacherName = accounts.find((item) => item.id === subject.teacherId)?.fullName
    if (!classroom || !subjectName || !teacherName) return []
    return [{
      id: subject.id, classroomId: classroom.id, classroomName: classroom.name,
      academicYear: classroom.academicYear, name: subjectName,
      teacherId: subject.teacherId, teacherName,
      historic: classroom.id === studentIdentity.historicClassroomId,
    }]
  })
export const studentLessons: LessonPreview[] = [
  ...sampleLessons.filter((lesson) => lesson.classroomSubjectId === 'history-11a2'),
  { id: 'lesson-history-scan', classroomSubjectId: 'history-11a2', title: 'Tư liệu bổ sung: Cách mạng tháng Tám', status: 'PUBLISHED', materials: [{ id: 'material-history-scan', name: 'Tu-lieu-bo-sung.pdf', version: 1, processing: 'FAILED', sourcePosition: 'Chưa trích xuất được' }] },
  { id: 'lesson-math-functions', classroomSubjectId: '11a2-math', title: 'Hàm số lượng giác', status: 'PUBLISHED', materials: [{ id: 'material-math-functions', name: 'Ham-so-luong-giac.pdf', version: 1, processing: 'PROCESSED', sourcePosition: 'Trang 1–8' }] },
  { id: 'lesson-history-10a1', classroomSubjectId: '10a1-history', title: 'Các nền văn minh thế giới thời cổ đại', status: 'PUBLISHED', materials: [{ id: 'material-history-10a1', name: 'Van-minh-co-dai.pdf', version: 1, processing: 'PROCESSED', sourcePosition: 'Trang 2–10' }] },
]
