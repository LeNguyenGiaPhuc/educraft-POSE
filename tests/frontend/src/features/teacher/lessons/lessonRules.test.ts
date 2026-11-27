import { describe, expect, it } from 'vitest'
import { getLessonPublishAction } from '../../../../../../frontend/src/features/teacher/lessons/lessonRules'

describe('getLessonPublishAction', () => {
  it('offers to publish newly processed material on an already published lesson', () => {
    expect(getLessonPublishAction('PUBLISHED', [
      { status: 'DRAFT', processingStatus: 'PROCESSED' },
    ])).toEqual({ label: 'Cập nhật nội dung công bố' })
  })

  it('does not show a redundant publish action when all material is already published', () => {
    expect(getLessonPublishAction('PUBLISHED', [
      { status: 'PUBLISHED', processingStatus: 'PROCESSED' },
    ])).toBeNull()
  })

  it('keeps the original action for a draft lesson', () => {
    expect(getLessonPublishAction('DRAFT', [
      { status: 'DRAFT', processingStatus: 'PROCESSED' },
    ])).toEqual({ label: 'Công bố bài học' })
  })
})
