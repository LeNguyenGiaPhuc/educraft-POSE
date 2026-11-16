import type { ActivityChanges, ActivityContent, ActivityPreview } from './activityTypes'

export const activityPreviewStorageKey = 'educraft-teacher-activity-preview'
export const activityChangesStorageKey = 'educraft-teacher-activity-changes'

export function readActivityChanges(): ActivityChanges {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(activityChangesStorageKey) ?? '{}')
    if (value && typeof value === 'object') {
      const data = value as Partial<ActivityChanges>
      return {
        updated: data.updated && typeof data.updated === 'object' ? data.updated : {},
        deleted: Array.isArray(data.deleted) ? data.deleted.filter((id): id is string => typeof id === 'string') : [],
      }
    }
  } catch { /* Ignore an obsolete preview shape. */ }
  return { updated: {}, deleted: [] }
}

export function writeActivityChanges(value: ActivityChanges): void {
  sessionStorage.setItem(activityChangesStorageKey, JSON.stringify(value))
}

export function readActivityPreviews(): ActivityPreview[] {
  try {
    const values: unknown = JSON.parse(sessionStorage.getItem(activityPreviewStorageKey) ?? '[]')
    return Array.isArray(values) ? values.filter((item): item is ActivityPreview => item && typeof item.id === 'string' && item.id.startsWith('preview-') && typeof item.title === 'string' && typeof item.closesAt === 'string' && Number.isFinite(Date.parse(item.closesAt)) && ['QUIZ', 'WRITTEN', 'NOTEBOOK'].includes(item.type) && ['PUBLISHED', 'CLOSED'].includes(item.status) && typeof item.classroomSubjectId === 'string' && (item.content === undefined || isActivityContent(item.content))) : []
  } catch { return [] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isActivityContent(value: unknown): value is ActivityContent {
  if (!isRecord(value)) return false
  if (value.kind === 'NOTEBOOK') return typeof value.description === 'string'
    && Array.isArray(value.criteria) && value.criteria.every(item => isRecord(item) && typeof item.id === 'string' && typeof item.content === 'string' && item.confirmed === true)
    && Array.isArray(value.images) && value.images.every(item => isRecord(item) && typeof item.name === 'string' && typeof item.size === 'number')
  return value.kind === 'EXERCISE' && ['BASIC', 'INTERMEDIATE', 'ADVANCED'].includes(String(value.difficulty)) && typeof value.requestedCount === 'number'
    && Array.isArray(value.questions) && value.questions.every(item => isRecord(item) && ['id', 'prompt', 'answer', 'lessonTag', 'explanation', 'citation'].every(key => typeof item[key] === 'string') && typeof item.maxPoints === 'number' && (item.options === undefined || Array.isArray(item.options) && item.options.every(option => typeof option === 'string')) && (item.markingCriteria === undefined || typeof item.markingCriteria === 'string'))
    && Array.isArray(value.sourceLessons) && value.sourceLessons.every(item => isRecord(item) && typeof item.id === 'string' && typeof item.title === 'string' && Array.isArray(item.materials) && item.materials.every(file => isRecord(file) && typeof file.name === 'string' && typeof file.version === 'number' && typeof file.sourcePosition === 'string'))
}
