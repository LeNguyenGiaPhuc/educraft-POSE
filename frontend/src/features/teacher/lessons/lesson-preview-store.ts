import { sampleLessons, type LessonPreview } from '../demo/teacherDemoData'
import { canPublishMaterials } from './lessonRules'

// Shared preview state for Teacher screens. A reload clears it; no backend write occurs.
export const publishedLessonPreviews = new Map<string, LessonPreview>()

export function readTeacherLessons(): LessonPreview[] {
  return [...new Map([...sampleLessons, ...publishedLessonPreviews.values()].map((lesson) => [lesson.id, lesson])).values()]
}

export function readPublishedTeacherLessons(): LessonPreview[] {
  return readTeacherLessons().filter((lesson) => lesson.status === 'PUBLISHED' && canPublishMaterials(lesson.materials))
}
