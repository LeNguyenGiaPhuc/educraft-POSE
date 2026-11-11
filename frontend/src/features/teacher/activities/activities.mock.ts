export type ExerciseType = 'QUIZ' | 'WRITTEN'
export type Difficulty = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'

export type ActivityPreview = {
  id: string
  classroomSubjectId: string
  title: string
  type: 'QUIZ' | 'WRITTEN' | 'NOTEBOOK'
  status: 'PUBLISHED' | 'CLOSED'
  closesAt: string
  content?: ActivityContent
}

export const sampleActivities: ActivityPreview[] = [
  { id: 'quiz-11a2', classroomSubjectId: 'history-11a2', title: 'Quiz: Cách mạng tháng Tám', type: 'QUIZ', status: 'CLOSED', closesAt: '2026-11-03T20:00' },
  { id: 'written-11a2', classroomSubjectId: 'history-11a2', title: 'Tự luận: Ý nghĩa lịch sử', type: 'WRITTEN', status: 'CLOSED', closesAt: '2026-11-08T20:00' },
  { id: 'quiz-postwar-11a2', classroomSubjectId: 'history-11a2', title: 'Quiz: Việt Nam sau 1945', type: 'QUIZ', status: 'CLOSED', closesAt: '2026-11-09T20:00' },
  { id: 'notebook-11a2', classroomSubjectId: 'history-11a2', title: 'Kiểm tra vở: Bài 2', type: 'NOTEBOOK', status: 'CLOSED', closesAt: '2026-11-10T20:00' },
  { id: 'quiz-11a1', classroomSubjectId: 'history-11a1', title: 'Quiz: Bài 3', type: 'QUIZ', status: 'CLOSED', closesAt: '2026-11-05T20:00' },
]

export type ExerciseQuestion = {
  id: string
  prompt: string
  options?: string[]
  answer: string
  markingCriteria?: string
  maxPoints: number
  lessonTag: string
  explanation: string
  citation: string
}

export const exampleQuestions: Record<ExerciseType, ExerciseQuestion[]> = {
  QUIZ: [
    { id: 'quiz-1', prompt: 'Sự kiện nào đánh dấu thắng lợi của Cách mạng tháng Tám tại Hà Nội?', options: ['Khởi nghĩa giành chính quyền ngày 19/8', 'Toàn quốc kháng chiến', 'Chiến dịch Điện Biên Phủ', 'Hiệp định Giơ-ne-vơ'], answer: 'Khởi nghĩa giành chính quyền ngày 19/8', maxPoints: 1, lessonTag: 'Cách mạng tháng Tám năm 1945', explanation: 'Cuộc khởi nghĩa ở Hà Nội thắng lợi ngày 19/8/1945.', citation: 'Bài 1 · Trang 5, phiên bản 2' },
    { id: 'quiz-2', prompt: 'Bản Tuyên ngôn Độc lập được đọc vào ngày nào?', options: ['02/9/1945', '19/8/1945', '07/5/1954', '06/1/1946'], answer: '02/9/1945', maxPoints: 1, lessonTag: 'Cách mạng tháng Tám năm 1945', explanation: 'Ngày 02/9/1945, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập.', citation: 'Bài 1 · Trang 9, phiên bản 2' },
  ],
  WRITTEN: [
    { id: 'written-1', prompt: 'Nêu hai ý nghĩa lịch sử của Cách mạng tháng Tám.', answer: 'Mở ra kỷ nguyên độc lập, tự do; góp phần cổ vũ phong trào giải phóng dân tộc.', markingCriteria: 'Nêu đúng hai ý, diễn đạt tương đương được chấp nhận.', maxPoints: 2, lessonTag: 'Cách mạng tháng Tám năm 1945', explanation: 'Đối chiếu từng ý với nội dung đã học và giải thích phần thiếu.', citation: 'Bài 1 · Trang 10, phiên bản 2' },
    { id: 'written-2', prompt: 'Vì sao thời cơ Tổng khởi nghĩa được xem là thuận lợi?', answer: 'Nhật đầu hàng Đồng minh, bộ máy cai trị suy yếu và lực lượng cách mạng đã sẵn sàng.', markingCriteria: 'Có bối cảnh Nhật đầu hàng và điều kiện trong nước.', maxPoints: 2, lessonTag: 'Cách mạng tháng Tám năm 1945', explanation: 'Nêu mối liên hệ giữa tình hình quốc tế và sự chuẩn bị trong nước.', citation: 'Bài 1 · Trang 4, phiên bản 2' },
  ],
}

export const difficultyLabels: Record<Difficulty, string> = { BASIC: 'Cơ bản', INTERMEDIATE: 'Trung bình', ADVANCED: 'Nâng cao' }

export const activityPreviewStorageKey = 'educraft-teacher-activity-preview'
export function readActivityPreviews(): ActivityPreview[] {
  try {
    const values: unknown = JSON.parse(sessionStorage.getItem(activityPreviewStorageKey) ?? '[]')
    return Array.isArray(values) ? values.filter((item): item is ActivityPreview => item && typeof item.id === 'string' && item.id.startsWith('preview-') && typeof item.title === 'string' && typeof item.closesAt === 'string' && Number.isFinite(Date.parse(item.closesAt)) && ['QUIZ', 'WRITTEN', 'NOTEBOOK'].includes(item.type) && ['PUBLISHED', 'CLOSED'].includes(item.status) && typeof item.classroomSubjectId === 'string' && (item.content === undefined || isActivityContent(item.content))) : []
  } catch { return [] }
}

export type ActivityContent = {
  kind: 'EXERCISE'
  questions: ExerciseQuestion[]
  sourceLessons: { id: string; title: string; materials: { name: string; version: number; sourcePosition: string }[] }[]
  difficulty: Difficulty
  requestedCount: number
} | {
  kind: 'NOTEBOOK'
  description: string
  criteria: { id: string; content: string; confirmed: boolean }[]
  images: { name: string; size: number }[]
}
export type ActivityPublicationDraft = Pick<ActivityPreview, 'title' | 'closesAt' | 'type'> & { content: ActivityContent }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
function isActivityContent(value: unknown): value is ActivityContent {
  if (!isRecord(value)) return false
  if (value.kind === 'NOTEBOOK') return typeof value.description === 'string'
    && Array.isArray(value.criteria) && value.criteria.every(item => isRecord(item) && typeof item.id === 'string' && typeof item.content === 'string' && item.confirmed === true)
    && Array.isArray(value.images) && value.images.every(item => isRecord(item) && typeof item.name === 'string' && typeof item.size === 'number')
  return value.kind === 'EXERCISE' && ['BASIC', 'INTERMEDIATE', 'ADVANCED'].includes(String(value.difficulty)) && typeof value.requestedCount === 'number'
    && Array.isArray(value.questions) && value.questions.every(item => isRecord(item) && ['id', 'prompt', 'answer', 'lessonTag', 'explanation', 'citation'].every(key => typeof item[key] === 'string') && typeof item.maxPoints === 'number' && (item.options === undefined || Array.isArray(item.options) && item.options.every(option => typeof option === 'string')) && (item.markingCriteria === undefined || typeof item.markingCriteria === 'string'))
    && Array.isArray(value.sourceLessons) && value.sourceLessons.every(item => isRecord(item) && typeof item.id === 'string' && typeof item.title === 'string' && Array.isArray(item.materials) && item.materials.every(file => isRecord(file) && typeof file.name === 'string' && typeof file.version === 'number' && typeof file.sourcePosition === 'string'))
}
