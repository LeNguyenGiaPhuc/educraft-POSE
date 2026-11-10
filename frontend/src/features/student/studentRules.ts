import { studentLessons, studentSubjects, type LessonPreview, type StudentScenario } from './fixtures'

export function getAccessibleSubjects(scenario: StudentScenario) {
  return {
    current: scenario === 'current' ? studentSubjects.filter((subject) => !subject.historic) : [],
    historic: scenario === 'unassigned' ? [] : studentSubjects.filter((subject) => subject.historic),
  }
}

export function getVisibleLessons(classroomSubjectId: string): LessonPreview[] {
  if (!studentSubjects.some((subject) => subject.id === classroomSubjectId)) return []
  return studentLessons.filter((lesson) => lesson.classroomSubjectId === classroomSubjectId && lesson.status === 'PUBLISHED')
}

export function canUseLessonSource(lesson: LessonPreview, scenario: StudentScenario): boolean {
  return getAccessibleSubjects(scenario).current.some((subject) => subject.id === lesson.classroomSubjectId)
    && lesson.status === 'PUBLISHED' && lesson.materials.some((material) => material.processing === 'PROCESSED')
}
