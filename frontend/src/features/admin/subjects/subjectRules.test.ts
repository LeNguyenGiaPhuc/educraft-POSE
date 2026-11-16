import { describe, expect, it } from 'vitest'
import type { AdminSubject } from '../../../lib/api/admin'
import { validateSubjectName } from './subjectRules'

const subjects: AdminSubject[] = [
  { id: 'history-id', name: 'Lịch sử', isActive: true, teacherCount: 1, classroomCount: 2 },
  { id: 'math-id', name: 'Toán', isActive: true, teacherCount: 1, classroomCount: 2 },
]

describe('validateSubjectName', () => {
  it('rejects an empty name', () => {
    expect(validateSubjectName('   ', subjects, 'history-id')).toContain('Tên môn học không được để trống.')
  })

  it('rejects a name longer than 150 characters', () => {
    expect(validateSubjectName('a'.repeat(151), subjects, 'history-id')).toContain('Tên môn học không được vượt quá 150 ký tự.')
  })

  it('rejects a duplicate name without case sensitivity', () => {
    expect(validateSubjectName(' toán ', subjects, 'history-id')).toContain('Tên môn học đã tồn tại trong danh mục.')
  })

  it('allows the current subject to keep its own name', () => {
    expect(validateSubjectName(' LỊCH SỬ ', subjects, 'history-id')).toEqual([])
  })
})
