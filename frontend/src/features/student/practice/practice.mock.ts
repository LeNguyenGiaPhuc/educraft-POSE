export type PracticeKind = 'QUIZ' | 'WRITTEN'
export type PracticeExampleState = 'questions' | 'failed' | 'pending'

export const practiceExamples = [
  { lessonId: 'lesson-cmt8-11a2', materialId: 'material-cmt8-slide', position: 'Trang 4', question: 'Cuộc Tổng khởi nghĩa tháng Tám diễn ra vào năm nào?', choices: ['1930', '1945', '1954'], answer: '1945', explanation: 'Ví dụ minh họa mốc thời gian của Cách mạng tháng Tám năm 1945.' },
  { lessonId: 'lesson-viet-nam-11a2', materialId: 'material-1945', position: 'Slide 2', question: 'Nêu mốc thời gian mở đầu giai đoạn Việt Nam từ 1945 đến 1954.', choices: ['1945', '1954', '1975'], answer: '1945', explanation: 'Ví dụ minh họa cách xác định mốc mở đầu của giai đoạn trong tên bài học.' },
  { lessonId: 'lesson-math-functions', materialId: 'material-math-functions', position: 'Trang 2', question: 'Giá trị của sin(0) bằng bao nhiêu?', choices: ['0', '1', '−1'], answer: '0', explanation: 'Ví dụ minh họa giá trị lượng giác cơ bản: sin(0) = 0.' },
]

export const practiceStateOptions: { value: PracticeExampleState; label: string }[] = [
  { value: 'questions', label: 'Câu hỏi và đáp án minh họa' },
  { value: 'failed', label: 'Ví dụ lỗi tạo câu hỏi' },
  { value: 'pending', label: 'Ví dụ đang chờ chấm' },
]
