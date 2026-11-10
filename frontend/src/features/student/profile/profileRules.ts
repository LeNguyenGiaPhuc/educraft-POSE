export type ScoreStream = 'ASSIGNED' | 'SELF_PRACTICE'
export type ProfilePoint = {
  id: string; classroomSubjectId: string; lessonId: string; stream: ScoreStream
  title: string; completedAt: string; score: number | null
  status: 'GRADED' | 'PENDING' | 'FAILED'; kind: 'QUIZ' | 'WRITTEN' | 'NOTEBOOK'
  resultId?: string
}
export type LessonIndicator = { lessonId: string; difficulty: boolean; evidence: ProfilePoint[] }

export function getValidPoints(points: ProfilePoint[], stream: ScoreStream) {
  return points.filter((point) => point.stream === stream && point.kind !== 'NOTEBOOK'
    && point.status === 'GRADED' && point.score !== null && Number.isFinite(point.score)
    && point.score >= 0 && point.score <= 100 && Number.isFinite(Date.parse(point.completedAt)))
    .sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.id.localeCompare(b.id))
}

export function getLessonIndicators(points: ProfilePoint[], stream: ScoreStream): LessonIndicator[] {
  const lessons = new Map<string, LessonIndicator>()
  for (const point of getValidPoints(points, stream)) {
    const indicator = lessons.get(point.lessonId) ?? { lessonId: point.lessonId, difficulty: false, evidence: [] }
    if (point.score! < 50) indicator.difficulty = true
    else if (point.score! >= 70) indicator.difficulty = false
    indicator.evidence.push(point)
    lessons.set(point.lessonId, indicator)
  }
  return [...lessons.values()]
}
