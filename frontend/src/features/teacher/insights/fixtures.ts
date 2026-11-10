export type AssignedSubject = { id: string; classroom: string; subject: string }
export type Student = { id: string; name: string }

export const assignedSubjects: AssignedSubject[] = [
  { id: 'history-11a1', classroom: '11A1', subject: 'Lịch sử' },
  { id: 'history-11a2', classroom: '11A2', subject: 'Lịch sử' },
]

export const studentsByClass: Record<string, Student[]> = {
  '11A1': [{ id: 'an', name: 'Trần Hoàng An' }, { id: 'linh', name: 'Nguyễn Thảo Linh' }, { id: 'bao', name: 'Phạm Gia Bảo' }],
  '11A2': [{ id: 'phuc', name: 'Lê Gia Phúc' }, { id: 'mai', name: 'Nguyễn Hoàng Mai' }, { id: 'khanh', name: 'Trần Minh Khánh' }],
}

export type ScheduleItem = { id: string; subjectId: string; title: string; details: string; type: string; startsAt: string; published: boolean }
export const scheduleItems: ScheduleItem[] = [
  { id: 'event-1', subjectId: 'history-11a2', title: 'Ôn tập Cách mạng tháng Tám', details: 'Đọc lại bài và chuẩn bị câu hỏi thảo luận.', type: 'Ôn tập', startsAt: '2026-11-18T08:00', published: true },
  { id: 'event-2', subjectId: 'history-11a2', title: 'Kiểm tra ngắn chương 2', details: 'Nội dung từ các bài học đã công bố trong chương 2.', type: 'Kiểm tra', startsAt: '2026-11-25T08:00', published: true },
  { id: 'event-3', subjectId: 'history-11a1', title: 'Đọc trước bài 4', details: 'Xem tài liệu và ghi lại nội dung cần hỏi trên lớp.', type: 'Chuẩn bị bài', startsAt: '2026-11-20T09:00', published: true },
]

export type AssignedActivity = { id: string; subjectId: string; title: string; kind: 'QUIZ' | 'WRITTEN' | 'NOTEBOOK'; state: string; submitted: number; eligible: number; average?: number }
export const assignedActivities: AssignedActivity[] = [
  { id: 'quiz-11a2', subjectId: 'history-11a2', title: 'Quiz: Cách mạng tháng Tám', kind: 'QUIZ', state: 'Đã chấm', submitted: 3, eligible: 3, average: 6.4 },
  { id: 'written-11a2', subjectId: 'history-11a2', title: 'Tự luận: Ý nghĩa lịch sử', kind: 'WRITTEN', state: 'Đang chấm', submitted: 2, eligible: 3 },
  { id: 'quiz-postwar-11a2', subjectId: 'history-11a2', title: 'Quiz: Việt Nam sau 1945', kind: 'QUIZ', state: 'Đã chấm', submitted: 1, eligible: 3, average: 4.8 },
  { id: 'notebook-11a2', subjectId: 'history-11a2', title: 'Kiểm tra vở: Bài 2', kind: 'NOTEBOOK', state: 'Đã đóng', submitted: 2, eligible: 3 },
  { id: 'quiz-11a1', subjectId: 'history-11a1', title: 'Quiz: Bài 3', kind: 'QUIZ', state: 'Đã chấm', submitted: 2, eligible: 3, average: 6.4 },
]

export type Criterion = { id: string; content: string; suggested: 'RECORDED' | 'NEEDS_SUPPLEMENTATION' | 'UNDETERMINED'; note: string }
export const notebookCriteria: Criterion[] = [
  { id: 'criterion-1', content: 'Bối cảnh lịch sử của Cách mạng tháng Tám', suggested: 'RECORDED', note: 'Có nội dung về thời cơ tổng khởi nghĩa.' },
  { id: 'criterion-2', content: 'Diễn biến chính và các mốc thời gian', suggested: 'NEEDS_SUPPLEMENTATION', note: 'Thiếu diễn biến tại Hà Nội ngày 19/8.' },
  { id: 'criterion-3', content: 'Ý nghĩa lịch sử', suggested: 'UNDETERMINED', note: 'Phần chữ ở cuối trang chưa đọc rõ.' },
]

export type ScorePoint = { id: string; subjectId: string; activityId: string; lesson: string; activity: string; submittedAt: string; percent: number }
export const scorePoints: Record<string, ScorePoint[]> = {
  phuc: [
    { id: 'score-1', subjectId: 'history-11a2', activityId: 'quiz-11a2', lesson: 'Cách mạng tháng Tám', activity: 'Quiz: Cách mạng tháng Tám', submittedAt: '2026-11-03', percent: 42 },
    { id: 'score-2', subjectId: 'history-11a2', activityId: 'written-11a2', lesson: 'Cách mạng tháng Tám', activity: 'Tự luận: Ý nghĩa lịch sử', submittedAt: '2026-11-08', percent: 76 },
    { id: 'score-3', subjectId: 'history-11a2', activityId: 'quiz-postwar-11a2', lesson: 'Việt Nam sau 1945', activity: 'Quiz: Việt Nam sau 1945', submittedAt: '2026-11-09', percent: 48 },
  ],
  mai: [{ id: 'score-4', subjectId: 'history-11a2', activityId: 'quiz-11a2', lesson: 'Cách mạng tháng Tám', activity: 'Quiz: Cách mạng tháng Tám', submittedAt: '2026-11-03', percent: 86 }],
  khanh: [],
  an: [{ id: 'score-5', subjectId: 'history-11a1', activityId: 'quiz-11a1', lesson: 'Phong trào dân tộc', activity: 'Quiz: Bài 3', submittedAt: '2026-11-05', percent: 67 }],
  linh: [],
  bao: [],
}

export type PromptTopic = { id: string; subjectId: string; studentId: string; topic: string; askedAt: string }
export const promptTopics: PromptTopic[] = [
  { id: 'topic-1', subjectId: 'history-11a2', studentId: 'phuc', topic: 'Bối cảnh Cách mạng tháng Tám', askedAt: '2026-11-05' },
  { id: 'topic-2', subjectId: 'history-11a2', studentId: 'phuc', topic: 'Ý nghĩa của Tổng khởi nghĩa', askedAt: '2026-11-07' },
  { id: 'topic-3', subjectId: 'history-11a2', studentId: 'mai', topic: 'Các mốc thời gian trong bài 2', askedAt: '2026-11-06' },
]

export const criterionLabels = {
  RECORDED: 'Đã ghi',
  NEEDS_SUPPLEMENTATION: 'Cần bổ sung',
  UNDETERMINED: 'Chưa xác định',
} as const
