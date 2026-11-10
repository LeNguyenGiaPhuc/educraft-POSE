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
  students: { id: string; name: string }[]
  subjects: AssignedSubject[]
}

export const currentTeacherId = 'teacher-minh-anh'

export const assignedClasses: TeacherClassroom[] = [
  {
    id: 'class-11a1-2026', name: '11A1', academicYear: '2026–2027', gradeLevel: 11,
    students: [
      { id: 'an', name: 'Trần Hoàng An' },
      { id: 'linh', name: 'Nguyễn Thảo Linh' },
      { id: 'bao', name: 'Phạm Gia Bảo' },
    ],
    subjects: [{ id: 'history-11a1', classroomId: 'class-11a1-2026', name: 'Lịch sử', teacherId: currentTeacherId }],
  },
  {
    id: 'class-11a2-2026', name: '11A2', academicYear: '2026–2027', gradeLevel: 11,
    students: [
      { id: 'phuc', name: 'Lê Gia Phúc' },
      { id: 'mai', name: 'Nguyễn Hoàng Mai' },
      { id: 'khanh', name: 'Trần Minh Khánh' },
    ],
    subjects: [{ id: 'history-11a2', classroomId: 'class-11a2-2026', name: 'Lịch sử', teacherId: currentTeacherId }],
  },
]

export const assignedSubjects = assignedClasses.flatMap((classroom) => classroom.subjects)

export type LessonPreview = {
  id: string
  classroomSubjectId: string
  title: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
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
    id: 'lesson-cmt8-11a2', classroomSubjectId: 'history-11a2', title: 'Cách mạng tháng Tám năm 1945', status: 'PUBLISHED',
    materials: [{ id: 'material-cmt8-slide', name: 'Bai-1-Cach-mang-thang-Tam.pdf', version: 2, processing: 'PROCESSED', sourcePosition: 'Trang 1–12' }],
  },
  {
    id: 'lesson-viet-nam-11a2', classroomSubjectId: 'history-11a2', title: 'Việt Nam từ 1945 đến 1954', status: 'PUBLISHED',
    materials: [{ id: 'material-1945', name: 'Bai-2-Viet-Nam-1945.pptx', version: 1, processing: 'PROCESSED', sourcePosition: 'Slide 1–18' }],
  },
  {
    id: 'lesson-chuan-bi-11a2', classroomSubjectId: 'history-11a2', title: 'Chuẩn bị bài học tiếp theo', status: 'DRAFT',
    materials: [{ id: 'material-chuan-bi', name: 'Tai-lieu-chuan-bi.docx', version: 1, processing: 'FAILED', sourcePosition: 'Chưa trích xuất được' }],
  },
  {
    id: 'lesson-cmt8-11a1', classroomSubjectId: 'history-11a1', title: 'Cách mạng tháng Tám năm 1945', status: 'PUBLISHED',
    materials: [{ id: 'material-cmt8-11a1', name: 'Lich-su-11A1.pdf', version: 1, processing: 'PROCESSED', sourcePosition: 'Trang 2–9' }],
  },
]
