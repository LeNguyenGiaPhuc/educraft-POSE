export type ExerciseType = 'QUIZ' | 'WRITTEN'
export type Difficulty = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'

export type ActivityPreview = {
  id: string
  classroomSubjectId: string
  title: string
  type: 'QUIZ' | 'WRITTEN' | 'NOTEBOOK'
  status: 'PUBLISHED' | 'CLOSED'
  closesAt: string
}

export const sampleActivities: ActivityPreview[] = [
  { id: 'activity-quiz-11a2', classroomSubjectId: 'history-11a2', title: 'Ôn tập Cách mạng tháng Tám', type: 'QUIZ', status: 'PUBLISHED', closesAt: '15/11/2026' },
  { id: 'activity-written-11a2', classroomSubjectId: 'history-11a2', title: 'Trình bày ý nghĩa lịch sử', type: 'WRITTEN', status: 'CLOSED', closesAt: '08/11/2026' },
  { id: 'activity-notebook-11a2', classroomSubjectId: 'history-11a2', title: 'Kiểm tra vở bài Cách mạng tháng Tám', type: 'NOTEBOOK', status: 'CLOSED', closesAt: '10/11/2026' },
  { id: 'activity-quiz-11a1', classroomSubjectId: 'history-11a1', title: 'Ôn tập bài 1', type: 'QUIZ', status: 'PUBLISHED', closesAt: '17/11/2026' },
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
