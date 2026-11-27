import { describe, expect, it } from 'vitest'
import {
  activityBuilderSteps,
  getQuestionStepError,
  getSetupStepError,
} from '../../../../../../frontend/src/features/teacher/activities/activityBuilderState'

describe('activity builder steps', () => {
  it('keeps the approved three-step presentation order', () => {
    expect(activityBuilderSteps.map((step) => step.label)).toEqual([
      'Thiết lập hoạt động',
      'Xây dựng câu hỏi',
      'Kiểm tra và công bố',
    ])
  })

  it('requires a title and a published lesson before leaving setup', () => {
    expect(getSetupStepError('', [])).toBe('Tên hoạt động không được để trống.')
    expect(getSetupStepError('Ôn tập', [])).toBe('Cần chọn ít nhất một bài học đã công bố.')
    expect(getSetupStepError('Ôn tập', ['lesson-1'])).toBe('')
  })

  it('requires at least one question before review without validating final content early', () => {
    expect(getQuestionStepError(0)).toBe('Cần có ít nhất một câu hỏi trước khi kiểm tra.')
    expect(getQuestionStepError(1)).toBe('')
  })
})
