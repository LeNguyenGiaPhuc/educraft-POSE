export type ExerciseKind = 'QUIZ' | 'WRITTEN'
export type ExerciseQuestion = {
  id: string
  prompt: string
  options?: string[]
  lesson: string
}
export type AssignedExercise = {
  id: string
  classroomSubjectId: string
  title: string
  kind: ExerciseKind
  state: 'OPEN' | 'CLOSED'
  submitted: boolean
  questions: ExerciseQuestion[]
  submittedAnswers?: Record<string, string>
  grading?: 'GRADED' | 'PENDING' | 'FAILED'
}

export const assignedExercises: AssignedExercise[] = [
  {
    id: 'quiz-preview-11a2', classroomSubjectId: 'history-11a2', title: 'Tự kiểm tra mốc Cách mạng tháng Tám', kind: 'QUIZ', state: 'OPEN', submitted: false,
    questions: [
      { id: 'q-1', prompt: 'Tổng khởi nghĩa tại Hà Nội diễn ra vào ngày nào?', options: ['16/8/1945', '19/8/1945', '25/8/1945', '2/9/1945'], lesson: 'Cách mạng tháng Tám năm 1945' },
      { id: 'q-2', prompt: 'Tuyên ngôn Độc lập được công bố tại đâu?', options: ['Quảng trường Ba Đình', 'Hồ Gươm', 'Huế', 'Sài Gòn'], lesson: 'Cách mạng tháng Tám năm 1945' },
    ],
  },
  {
    id: 'quiz-11a2', classroomSubjectId: 'history-11a2', title: 'Ôn tập Cách mạng tháng Tám', kind: 'QUIZ', state: 'CLOSED', submitted: true, grading: 'GRADED',
    submittedAnswers: { 'graded-q-1': 'Nhật Bản đầu hàng Đồng minh.', 'graded-q-2': 'Hoàn thành thống nhất đất nước.' },
    questions: [
      { id: 'graded-q-1', prompt: 'Sự kiện nào tạo thời cơ thuận lợi cho Tổng khởi nghĩa tháng Tám?', options: ['Nhật Bản đầu hàng Đồng minh.', 'Chiến dịch Điện Biên Phủ kết thúc.', 'Hiệp định Genève được ký.'], lesson: 'Cách mạng tháng Tám năm 1945' },
      { id: 'graded-q-2', prompt: 'Ý nghĩa của Cách mạng tháng Tám năm 1945 là gì?', options: ['Mở ra kỷ nguyên độc lập dân tộc.', 'Hoàn thành thống nhất đất nước.', 'Kết thúc kháng chiến chống Pháp.'], lesson: 'Cách mạng tháng Tám năm 1945' },
    ],
  },
  {
    id: 'written-11a2', classroomSubjectId: 'history-11a2', title: 'Phân tích thời cơ cách mạng', kind: 'WRITTEN', state: 'CLOSED', submitted: true, grading: 'GRADED',
    submittedAnswers: { 'written-q-1': 'Nhật đầu hàng, bộ máy tay sai hoang mang nên nhân dân cần nhanh chóng giành chính quyền.' },
    questions: [{ id: 'written-q-1', prompt: 'Vì sao cần chớp thời cơ trong tháng Tám năm 1945?', lesson: 'Cách mạng tháng Tám năm 1945' }],
  },
  {
    id: 'quiz-10a1', classroomSubjectId: '10a1-history', title: 'Ôn tập lịch sử lớp 10', kind: 'QUIZ', state: 'CLOSED', submitted: true, grading: 'GRADED',
    submittedAnswers: { 'old-q-1': 'Sông Nile.' },
    questions: [{ id: 'old-q-1', prompt: 'Văn minh Ai Cập cổ đại hình thành bên dòng sông nào?', lesson: 'Các nền văn minh thế giới thời cổ đại' }],
  },
]

export const notebookActivity = {
  id: 'notebook-11a2', classroomSubjectId: 'history-11a2', title: 'Kiểm tra vở: Bài 2',
  existingImages: ['trang-1.jpg', 'trang-2.jpg'],
  previousFinalized: { date: '09/11/2026', teacher: 'Cô Nguyễn Minh Anh', summary: '1 nội dung đã ghi, 1 nội dung cần bổ sung, 1 nội dung chưa xác định' },
}
