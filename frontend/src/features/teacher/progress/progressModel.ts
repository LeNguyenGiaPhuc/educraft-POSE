import type { TeacherStudentProgressResult } from '../../../lib/api/teacher/results'

export type ProgressPoint = TeacherStudentProgressResult['lessons'][number]['results'][number] & {
  lessonTitle: string
}

export function buildProgressPoints(progress: TeacherStudentProgressResult): ProgressPoint[] {
  const points = progress.lessons.flatMap((lesson) => {
    return lesson.results.map((result) => ({ ...result, lessonTitle: lesson.title }))
  })
  return points.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
}
