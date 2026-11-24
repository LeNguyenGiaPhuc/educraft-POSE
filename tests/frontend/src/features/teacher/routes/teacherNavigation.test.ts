import { describe, expect, it } from 'vitest'
import { getWorkspaceTabFromSection, teacherSubjectPath } from '../../../../../../frontend/src/features/teacher/navigation'

describe('teacher navigation helpers', () => {
  it('builds a stable subject workspace URL', () => {
    expect(teacherSubjectPath('class-11a2-2026', 'history-11a2', 'activities')).toBe('/teacher/classes/class-11a2-2026/subjects/history-11a2?tab=activities')
    expect(teacherSubjectPath('class-11a2-2026', 'history-11a2', 'lessons')).toBe('/teacher/classes/class-11a2-2026/subjects/history-11a2?tab=lessons')
  })

  it('maps legacy sections to the current workspace tab', () => {
    expect(getWorkspaceTabFromSection('lessons')).toBe('lessons')
    expect(getWorkspaceTabFromSection('progress')).toBe('students')
    expect(getWorkspaceTabFromSection('statistics')).toBe('statistics')
    expect(getWorkspaceTabFromSection('submissions')).toBe('submissions')
  })
})
