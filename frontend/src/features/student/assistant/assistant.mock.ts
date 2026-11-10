import { summaryLessons, type AiScenario } from '../summary/summary.mock'

export const demoStudentId = 'phuc'
export type ChatMessage = { id: string; role: 'student' | 'assistant'; text: string; sourceLessonId?: string }
export type ConversationPreview = { id: string; studentId: string; classroomId: string; title: string; updatedAt: string; subjects: string[]; messages: ChatMessage[] }
export function getChatSources(scenario: AiScenario) {
  return scenario === 'current' ? summaryLessons.filter((lesson) => lesson.published && lesson.processed && ['history-11a2', '11a2-math'].includes(lesson.subjectId)) : []
}
export const conversations: ConversationPreview[] = [
  { id: 'chat-phuc-current', studentId: 'phuc', classroomId: 'class-11a2-2026', title: 'Từ thời cơ lịch sử đến hàm số lượng giác', updatedAt: '10/11/2026 · 09:20', subjects: ['Lịch sử', 'Toán'], messages: [
    { id: 'c1', role: 'student', text: 'Thời cơ có vai trò gì trong Cách mạng tháng Tám?' },
    { id: 'c2', role: 'assistant', text: 'Thời cơ khi Nhật đầu hàng Đồng minh kết hợp với sự chuẩn bị lực lượng giúp nhân dân giành chính quyền.', sourceLessonId: 'lesson-cmt8-11a2' },
    { id: 'c3', role: 'student', text: 'Chuyển sang Toán nhé: hàm số sin có chu kỳ bao nhiêu?' },
    { id: 'c4', role: 'assistant', text: 'Hàm số y = sin x có chu kỳ 2π; tập giá trị của hàm số là [-1; 1].', sourceLessonId: 'lesson-math-functions' },
    { id: 'c5', role: 'student', text: 'Bạn dự đoán đề thi học kỳ giúp mình được không?' },
    { id: 'c6', role: 'assistant', text: 'Chưa đủ bằng chứng trong học liệu đã công bố để dự đoán đề thi. Bạn có thể hỏi về nội dung của bài Cách mạng tháng Tám hoặc Hàm số lượng giác.' },
  ] },
  { id: 'chat-phuc-archived', studentId: 'phuc', classroomId: 'class-10a1-2025', title: 'Ôn tập Lịch sử lớp 10A1', updatedAt: '20/05/2026 · 15:10', subjects: ['Lịch sử · lớp cũ'], messages: [{ id: 'old1', role: 'student', text: 'Mình muốn xem lại phần ôn tập hôm trước.' }, { id: 'old2', role: 'assistant', text: 'Bản lưu mẫu chưa có trích dẫn nguồn được giữ lại; chưa đủ bằng chứng để trình bày lời giải.' }] },
  { id: 'chat-other-student', studentId: 'other-student', classroomId: 'class-11a2-2026', title: 'Cuộc trò chuyện riêng', updatedAt: '10/11/2026', subjects: [], messages: [] },
]
export function getOwnConversations() {
  return conversations.filter((conversation) => conversation.studentId === demoStudentId)
}
