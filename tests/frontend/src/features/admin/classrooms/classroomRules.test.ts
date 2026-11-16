import { describe, expect, it } from 'vitest'
import { emptyClassroomDraft, validateClassroomDraft } from '../../../../../../frontend/src/features/admin/classrooms/classroomForm'

describe('classroom form model', () => {
  it('starts with a blank classroom name and default grade', () => {
    expect(emptyClassroomDraft).toEqual({ name: '', gradeLevel: 10, academicYear: '2026–2027' })
  })

  it('validates the classroom name, grade, and academic year', () => {
    expect(validateClassroomDraft({ name: '', gradeLevel: 13, academicYear: '' })).toEqual([
      'Cần nhập tên lớp.',
      'Khối lớp phải từ 1 đến 12.',
      'Cần nhập năm học.',
    ])
  })
})
