import { describe, expect, it } from 'vitest'
import { createClassroomSchema } from '../../../../../../backend/src/modules/admin/classrooms/classroom.schemas.js'

describe('createClassroomSchema roster input', () => {
  const base = { name: '11A3', gradeLevel: 11, academicYear: '2026–2027' }

  it('requires a shared password when a roster is included', () => {
    const result = createClassroomSchema.safeParse({
      ...base,
      students: [{ line: 2, fullName: 'Nguyễn Văn An', username: 'nguyen.an', contact: '0901' }],
    })

    expect(result.success).toBe(false)
  })

  it('rejects duplicate usernames before the transaction starts', () => {
    const result = createClassroomSchema.safeParse({
      ...base,
      initialStudentPassword: 'TempPassword123!',
      students: [
        { line: 2, fullName: 'Nguyễn Văn An', username: 'nguyen.an', contact: '0901' },
        { line: 3, fullName: 'Nguyễn Văn Bình', username: 'NGUYEN.AN', contact: '0902' },
      ],
    })

    expect(result.success).toBe(false)
  })
})
