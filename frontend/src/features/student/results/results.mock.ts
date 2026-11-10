import { studentIdentity, studentSubjects, type StudentScenario } from '../fixtures'
import { getVisibleLessons } from '../studentRules'

export type GradeState = 'GRADED' | 'PENDING' | 'FAILED'
type Answer = { question: string; answer: string }
export type GradedAnswer = Answer & { earned: number; maximum: number; explanation: string; lessonId: string; materialId: string; position: string }
type ResultBase = { id: string; activityId: string; studentId: string; classroomSubjectId: string; title: string; submittedAt: string; kind: 'QUIZ' | 'WRITTEN' }
export type ExerciseResult = ResultBase & ({ status: 'GRADED'; answers: GradedAnswer[] } | { status: 'PENDING' | 'FAILED'; answers: Answer[] })
export type NotebookResult = { id: string; activityId: string; studentId: string; classroomSubjectId: string; finalizedAt: string; evaluator: string; comment: string; criteria: { title: string; status: 'RECORDED' | 'NEEDS_SUPPLEMENTATION' | 'UNDETERMINED'; note: string }[] }

const quiz: ExerciseResult = {
  id: 'result-quiz-phuc', activityId: 'quiz-11a2', studentId: 'phuc', classroomSubjectId: 'history-11a2', title: 'Ôn tập Cách mạng tháng Tám', submittedAt: '2026-11-08', kind: 'QUIZ', status: 'GRADED',
  answers: [
    { question: 'Sự kiện nào tạo thời cơ thuận lợi cho Tổng khởi nghĩa tháng Tám?', answer: 'Nhật Bản đầu hàng Đồng minh.', earned: 5, maximum: 5, explanation: 'Đúng. Nhật đầu hàng làm chính quyền tay sai hoang mang, tạo thời cơ để phát động Tổng khởi nghĩa.', lessonId: 'lesson-cmt8-11a2', materialId: 'material-cmt8-slide', position: 'Trang 4 · mục Thời cơ cách mạng' },
    { question: 'Ý nghĩa của Cách mạng tháng Tám năm 1945 là gì?', answer: 'Hoàn thành thống nhất đất nước.', earned: 0, maximum: 5, explanation: 'Chưa đúng. Cách mạng tháng Tám đưa nhân dân giành chính quyền, mở ra kỷ nguyên độc lập dân tộc; thống nhất đất nước là một mốc lịch sử khác.', lessonId: 'lesson-cmt8-11a2', materialId: 'material-cmt8-slide', position: 'Trang 10 · mục Ý nghĩa lịch sử' },
  ],
}
const written: ExerciseResult = { id: 'result-written-phuc', activityId: 'written-11a2', studentId: 'phuc', classroomSubjectId: 'history-11a2', title: 'Phân tích thời cơ cách mạng', submittedAt: '2026-11-09', kind: 'WRITTEN', status: 'GRADED', answers: [{ question: 'Vì sao cần chớp thời cơ trong tháng Tám năm 1945?', answer: 'Nhật đầu hàng, bộ máy tay sai hoang mang nên nhân dân cần nhanh chóng giành chính quyền.', earned: 7, maximum: 10, explanation: 'Bạn đã nêu thời cơ khách quan và yêu cầu hành động kịp thời. Cần bổ sung sự chuẩn bị lực lượng và vai trò lãnh đạo để giải thích đầy đủ việc chớp thời cơ.', lessonId: 'lesson-cmt8-11a2', materialId: 'material-cmt8-slide', position: 'Trang 4–6 · mục Thời cơ và Tổng khởi nghĩa' }] }
export const exerciseResults: ExerciseResult[] = [quiz, written, { id: 'result-history-phuc', activityId: 'quiz-10a1', studentId: 'phuc', classroomSubjectId: '10a1-history', title: 'Ôn tập văn minh cổ đại', submittedAt: '2025-11-02', kind: 'QUIZ', status: 'GRADED', answers: [{ question: 'Văn minh Ai Cập cổ đại hình thành bên dòng sông nào?', answer: 'Sông Nile.', earned: 10, maximum: 10, explanation: 'Đúng. Phù sa và nguồn nước sông Nile tạo điều kiện cho cư dân Ai Cập phát triển nông nghiệp và hình thành nền văn minh.', lessonId: 'lesson-history-10a1', materialId: 'material-history-10a1', position: 'Trang 3 · mục Ai Cập cổ đại' }] }, { ...quiz, id: 'result-private-other-student', studentId: 'mai' }]

export const notebookResults: NotebookResult[] = [
  { id: 'notebook-final-2', activityId: 'notebook-11a2', studentId: 'phuc', classroomSubjectId: 'history-11a2', finalizedAt: '2026-11-09', evaluator: 'Nguyễn Minh Anh', comment: 'Bổ sung phần ý nghĩa lịch sử; chụp lại trang cuối để cô đối chiếu.', criteria: [{ title: 'Diễn biến chính của Tổng khởi nghĩa', status: 'RECORDED', note: 'Đã ghi các mốc chính theo trình tự.' }, { title: 'Ý nghĩa lịch sử', status: 'NEEDS_SUPPLEMENTATION', note: 'Cần bổ sung ý nghĩa đối với độc lập dân tộc.' }, { title: 'Bài học kinh nghiệm', status: 'UNDETERMINED', note: 'Trang cuối chưa đủ rõ để đối chiếu nội dung.' }] },
  { id: 'notebook-final-1', activityId: 'notebook-11a2', studentId: 'phuc', classroomSubjectId: 'history-11a2', finalizedAt: '2026-11-06', evaluator: 'Nguyễn Minh Anh', comment: 'Lần chốt trước khi mở lại đợt nộp. Giữ lại để bạn theo dõi phần đã bổ sung.', criteria: [{ title: 'Diễn biến chính của Tổng khởi nghĩa', status: 'NEEDS_SUPPLEMENTATION', note: 'Cần bổ sung mốc giành chính quyền ở Hà Nội.' }, { title: 'Ý nghĩa lịch sử', status: 'NEEDS_SUPPLEMENTATION', note: 'Chưa ghi đủ các ý chính.' }] },
]

export function visibleResultForStudent(result: { studentId: string }, studentId: string): boolean { return result.studentId === studentId }
export function getResultGroup(result: { studentId: string; classroomSubjectId: string }, scenario: StudentScenario) {
  if (!visibleResultForStudent(result, studentIdentity.id)) return null
  const subject = studentSubjects.find((item) => item.id === result.classroomSubjectId)
  if (!subject) return null
  // Losing current membership does not remove the student's own historic work.
  return subject.historic || scenario !== 'current' ? 'historic' : 'current'
}
export function asGradePreview(result: ExerciseResult, status: GradeState): ExerciseResult {
  if (status === 'GRADED') return result
  return { ...result, status, answers: result.answers.map(({ question, answer }) => ({ question, answer })) }
}
export function getResultSource(answer: GradedAnswer, classroomSubjectId: string) {
  const lesson = getVisibleLessons(classroomSubjectId).find((item) => item.id === answer.lessonId)
  const material = lesson?.materials.find((item) => item.id === answer.materialId && item.processing === 'PROCESSED')
  return lesson && material ? { lesson, material } : null
}
