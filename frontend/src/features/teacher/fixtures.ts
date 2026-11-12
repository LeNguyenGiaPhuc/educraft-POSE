export type AssignedSubject = {
  id: string
  classroomId: string
  name: string
  teacherId: string
}

export type TeacherClassroom = {
  id: string
  name: string
  academicYear: string
  gradeLevel: number
  status?: 'ACTIVE' | 'ARCHIVED'
  students: { id: string; name: string }[]
  subjects: AssignedSubject[]
}

export const currentTeacherId = 'teacher-minh-anh'

export const assignedClasses: TeacherClassroom[] = [
  {
    id: 'class-11a1-2026', name: '11A1', academicYear: '2026–2027', gradeLevel: 11, status: 'ACTIVE',
    students: [
      { id: 'an', name: 'Trần Hoàng An' },
      { id: 'linh', name: 'Nguyễn Thảo Linh' },
      { id: 'bao', name: 'Phạm Gia Bảo' },
    ],
    subjects: [{ id: 'history-11a1', classroomId: 'class-11a1-2026', name: 'Lịch sử', teacherId: currentTeacherId }],
  },
  {
    id: 'class-11a2-2026', name: '11A2', academicYear: '2026–2027', gradeLevel: 11, status: 'ACTIVE',
    students: [
      { id: 'phuc', name: 'Lê Gia Phúc' },
      { id: 'mai', name: 'Nguyễn Hoàng Mai' },
      { id: 'khanh', name: 'Trần Minh Khánh' },
    ],
    subjects: [{ id: 'history-11a2', classroomId: 'class-11a2-2026', name: 'Lịch sử', teacherId: currentTeacherId }],
  },
  {
    id: 'class-10a1-2025', name: '10A1 (Lưu trữ)', academicYear: '2025–2026', gradeLevel: 10, status: 'ARCHIVED',
    students: [
      { id: 'tuan', name: 'Đỗ Anh Tuấn' },
    ],
    subjects: [{ id: 'history-10a1-archived', classroomId: 'class-10a1-2025', name: 'Lịch sử', teacherId: currentTeacherId }],
  },
]

export const assignedSubjects = assignedClasses.flatMap((classroom) => classroom.subjects)

export type LessonPreview = {
  id: string
  classroomSubjectId: string
  title: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt?: string | null
  materials: {
    id: string
    name: string
    version: number
    processing: 'PROCESSED' | 'PROCESSING' | 'FAILED'
    sourcePosition: string
  }[]
}

export const sampleLessons: LessonPreview[] = [
  {
    id: 'lesson-cmt8-11a2', classroomSubjectId: 'history-11a2', title: 'Cách mạng tháng Tám năm 1945', status: 'PUBLISHED', publishedAt: '2026-11-01',
    materials: [{ id: 'material-cmt8-slide', name: 'Bai-1-Cach-mang-thang-Tam.pdf', version: 2, processing: 'PROCESSED', sourcePosition: 'Trang 1–12' }],
  },
  {
    id: 'lesson-viet-nam-11a2', classroomSubjectId: 'history-11a2', title: 'Việt Nam từ 1945 đến 1954', status: 'PUBLISHED', publishedAt: '2026-11-08',
    materials: [{ id: 'material-1945', name: 'Bai-2-Viet-Nam-1945.pptx', version: 1, processing: 'PROCESSED', sourcePosition: 'Slide 1–18' }],
  },
  {
    id: 'lesson-chuan-bi-11a2', classroomSubjectId: 'history-11a2', title: 'Chuẩn bị bài học tiếp theo', status: 'DRAFT', publishedAt: null,
    materials: [{ id: 'material-chuan-bi', name: 'Tai-lieu-chuan-bi.docx', version: 1, processing: 'FAILED', sourcePosition: 'Chưa trích xuất được' }],
  },
  {
    id: 'lesson-archived-11a2', classroomSubjectId: 'history-11a2', title: 'Đề cương bài học mở đầu (Lưu trữ)', status: 'ARCHIVED', publishedAt: '2026-09-15',
    materials: [{ id: 'material-archived', name: 'De-cuong-mo-dau.pdf', version: 1, processing: 'PROCESSED', sourcePosition: 'Trang 1–5' }],
  },
  {
    id: 'lesson-cmt8-11a1', classroomSubjectId: 'history-11a1', title: 'Cách mạng tháng Tám năm 1945', status: 'PUBLISHED', publishedAt: '2026-11-02',
    materials: [{ id: 'material-cmt8-11a1', name: 'Lich-su-11A1.pdf', version: 1, processing: 'PROCESSED', sourcePosition: 'Trang 2–9' }],
  },
]

export type TeacherWorkspaceTab = 'lessons' | 'activities' | 'students' | 'statistics'

export function getTeacherSubjectContext(classroomSubjectId?: string, classroomId?: string) {
  const subject = assignedSubjects.find((item) => item.id === classroomSubjectId && item.teacherId === currentTeacherId)
  const classroom = assignedClasses.find((item) => item.id === subject?.classroomId)
  if (!subject || !classroom || (classroomId && classroom.id !== classroomId)) return undefined
  return { subject, classroom }
}

export function teacherSubjectPath(classroomSubjectId: string, tab: TeacherWorkspaceTab = 'lessons') {
  const context = getTeacherSubjectContext(classroomSubjectId)
  return context ? `/teacher/classes/${context.classroom.id}/subjects/${context.subject.id}?tab=${tab}` : '/teacher/classes'
}

// Shared with results/progress; keep these IDs stable when extending activity mocks.
export const teacherActivityIds = ['quiz-11a2', 'written-11a2', 'quiz-postwar-11a2', 'notebook-11a2', 'quiz-11a1'] as const

// Preview records live only for this browser session; callers register after local creation.
const previewItemScopes = new Set<string>()
export function registerTeacherPreviewItem(kind: 'lesson' | 'activity', id: string, classroomSubjectId: string) {
  if (id && getTeacherSubjectContext(classroomSubjectId)) previewItemScopes.add(`${kind}:${classroomSubjectId}:${id}`)
}
export function isTeacherPreviewItem(kind: 'lesson' | 'activity', id: string, classroomSubjectId: string) {
  return previewItemScopes.has(`${kind}:${classroomSubjectId}:${id}`)
}
