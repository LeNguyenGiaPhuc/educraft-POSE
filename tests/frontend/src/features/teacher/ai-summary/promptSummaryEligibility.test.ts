import { describe, expect, it } from 'vitest'
import type { TeacherClassroomSummary } from '../../../../../../frontend/src/lib/api/teacher/types'
import { getPromptEligibleClassrooms } from '../../../../../../frontend/src/features/teacher/ai-summary/promptSummaryEligibility'

function classroom(overrides: Partial<TeacherClassroomSummary>): TeacherClassroomSummary {
  return {
    id: 'class-1',
    name: '11A1',
    academicYear: '2026-2027',
    gradeLevel: 11,
    status: 'ACTIVE',
    readOnly: false,
    studentCount: 0,
    subjects: [],
    promptTopicsEligible: true,
    ...overrides,
  }
}

describe('Prompt Summary class eligibility', () => {
  it('keeps only classrooms explicitly eligible by the backend', () => {
    expect(getPromptEligibleClassrooms([
      classroom({ id: 'current', promptTopicsEligible: true }),
      classroom({ id: 'old', promptTopicsEligible: false }),
      classroom({ id: 'archived', status: 'ARCHIVED', promptTopicsEligible: false }),
    ]).map((item) => item.id)).toEqual(['current'])
  })
})
