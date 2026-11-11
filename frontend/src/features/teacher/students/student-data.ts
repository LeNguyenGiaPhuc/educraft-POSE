import { sampleActivities, readActivityPreviews } from '../activities/activities.mock'
import { getTeacherSubjectContext } from '../fixtures'
import { scorePoints } from '../insights/fixtures'
import { exerciseResults, notebookRecords } from '../submissions/submissions.mock'

export const resultLabels = { GRADED: 'Đã chấm', PROCESSING: 'Đang chấm', FAILED: 'Chấm thất bại · chưa có điểm', MISSING: 'Chưa nộp' }

export function studentWork(subjectId: string, studentId: string) {
  const context = getTeacherSubjectContext(subjectId)
  if (!context?.classroom.students.some(student => student.id === studentId)) return []
  return [...sampleActivities, ...readActivityPreviews()].filter(activity => activity.classroomSubjectId === subjectId).map(activity => {
    const result = exerciseResults[activity.id]?.find(item => item.studentId === studentId)
    const notebook = activity.id === 'notebook-11a2' && subjectId === 'history-11a2' ? notebookRecords.find(item => item.studentId === studentId) : undefined
    const point = (scorePoints[studentId] ?? []).find(item => item.subjectId === subjectId && item.activityId === activity.id)
    return { activity, result, notebook, point }
  })
}

export function studentScores(subjectId: string, studentId: string) {
  return studentWork(subjectId, studentId).flatMap(({ result, point, activity }) => result?.status === 'GRADED' && typeof result.score === 'number' ? [{ id: activity.id, activity: activity.title, lesson: point?.lesson ?? activity.title, submittedAt: point?.submittedAt ?? activity.closesAt.slice(0, 10), percent: result.score * 10 }] : []).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
}
