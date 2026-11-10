import { studentIdentity } from '../fixtures'
import { exerciseResults } from '../results/results.mock'
import type { ProfilePoint } from './profileRules'

// Assigned evidence comes from the same own-result fixtures as the Results page.
const assigned: ProfilePoint[] = exerciseResults.filter((result) => result.studentId === studentIdentity.id && result.status === 'GRADED').flatMap((result) => {
  if (result.status !== 'GRADED') return []
  return [...new Set(result.answers.map((answer) => answer.lessonId))].map((lessonId) => {
    const answers = result.answers.filter((answer) => answer.lessonId === lessonId)
    const maximum = answers.reduce((sum, answer) => sum + answer.maximum, 0)
    return { id: `${result.id}-${lessonId}`, resultId: result.id, classroomSubjectId: result.classroomSubjectId, lessonId,
      stream: 'ASSIGNED' as const, title: result.title, completedAt: result.submittedAt,
      score: maximum > 0 ? Math.round(answers.reduce((sum, answer) => sum + answer.earned, 0) / maximum * 100) : null,
      status: 'GRADED' as const, kind: result.kind }
  })
})

// Fixed examples of independent sessions, never teacher-assigned submissions.
const practice: ProfilePoint[] = [
  { id: 'profile-practice-1', classroomSubjectId: 'history-11a2', lessonId: 'lesson-cmt8-11a2', stream: 'SELF_PRACTICE', title: 'Tự luyện mốc thời gian · lần 1', completedAt: '2026-11-05', score: 40, status: 'GRADED', kind: 'QUIZ' },
  { id: 'profile-practice-2', classroomSubjectId: 'history-11a2', lessonId: 'lesson-cmt8-11a2', stream: 'SELF_PRACTICE', title: 'Tự luyện mốc thời gian · lần 2', completedAt: '2026-11-06', score: 60, status: 'GRADED', kind: 'QUIZ' },
  { id: 'profile-practice-3', classroomSubjectId: 'history-11a2', lessonId: 'lesson-cmt8-11a2', stream: 'SELF_PRACTICE', title: 'Tự luyện mốc thời gian · lần 3', completedAt: '2026-11-07', score: 80, status: 'GRADED', kind: 'QUIZ' },
  { id: 'profile-practice-math-1', classroomSubjectId: '11a2-math', lessonId: 'lesson-math-functions', stream: 'SELF_PRACTICE', title: 'Tự luyện lượng giác · lần 1', completedAt: '2026-11-08', score: 40, status: 'GRADED', kind: 'QUIZ' },
  { id: 'profile-practice-math-2', classroomSubjectId: '11a2-math', lessonId: 'lesson-math-functions', stream: 'SELF_PRACTICE', title: 'Tự luyện lượng giác · lần 2', completedAt: '2026-11-09', score: 60, status: 'GRADED', kind: 'QUIZ' },
]
export const profilePoints = [...assigned, ...practice]
export const profileStreams = [
  { value: 'ASSIGNED' as const, title: 'Bài tập được giao', description: 'Chỉ bài trắc nghiệm và tự luận do giáo viên giao. Khi tích hợp, giáo viên chỉ xem xu hướng này.' },
  { value: 'SELF_PRACTICE' as const, title: 'Tự luyện riêng', description: 'Các phiên tự luyện độc lập của bạn; không thay đổi chỉ báo bài tập được giao.' },
]
