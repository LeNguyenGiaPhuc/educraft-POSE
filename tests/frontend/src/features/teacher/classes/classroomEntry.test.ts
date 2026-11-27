import { describe, expect, it } from 'vitest'
import { classroomEntryOptions } from '../../../../../../frontend/src/features/teacher/classes/classroomEntry'

describe('classroomEntryOptions', () => {
  it('opens the assigned subject workspace without a classroom detail step', () => {
    expect(classroomEntryOptions('class-1', [
      { id: 'history-1', name: 'Lịch sử' },
    ])).toEqual([
      {
        label: 'Lịch sử',
        path: '/teacher/classes/class-1/subjects/history-1',
      },
    ])
  })

  it('keeps every assigned subject available on the class card', () => {
    expect(classroomEntryOptions('class-1', [
      { id: 'history-1', name: 'Lịch sử' },
      { id: 'literature-1', name: 'Ngữ văn' },
    ])).toHaveLength(2)
  })

  it('does not create a fake destination when the class has no assigned subject', () => {
    expect(classroomEntryOptions('class-1', [])).toEqual([])
  })
})
