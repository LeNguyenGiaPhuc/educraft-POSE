import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { passwordService } from '../../../../backend/src/modules/auth/password.service.js'
import { seedDemoUsers } from '../../../../backend/src/dev/demo-seed.js'

describe('demo seed', () => {
  it('creates active admin, teacher and student accounts with the documented demo password', async () => {
    const calls = {
      subjects: [] as unknown[],
      users: [] as unknown[],
      teacherProfiles: [] as unknown[],
      classrooms: [] as unknown[],
      classroomSubjects: [] as unknown[],
      enrollments: [] as unknown[],
    }

    const client = {
      subject: {
        upsert: async (input: unknown) => {
          calls.subjects.push(input)
          return { id: 'subject-history' }
        },
      },
      user: {
        upsert: async (input: { where: { username: string } }) => {
          calls.users.push(input)
          return {
            id: input.where.username.startsWith('teacher')
              ? 'teacher-id'
              : input.where.username.startsWith('student')
                ? 'student-id'
                : 'admin-id',
          }
        },
        findUnique: async () => ({ id: 'teacher-id', role: 'TEACHER' as const, status: 'ACTIVE' as const }),
      },
      teacherProfile: {
        upsert: async (input: unknown) => {
          calls.teacherProfiles.push(input)
          return { teacher_id: 'teacher-id' }
        },
      },
      classroom: {
        upsert: async (input: unknown) => {
          calls.classrooms.push(input)
          return { id: 'classroom-demo-id' }
        },
      },
      classroomSubject: {
        upsert: async (input: unknown) => {
          calls.classroomSubjects.push(input)
          return { id: 'classroom-subject-demo-id' }
        },
      },
      classroomEnrollment: {
        findFirst: async () => null,
        create: async (input: unknown) => {
          calls.enrollments.push(input)
          return { id: 'enrollment-demo-id' }
        },
      },
    }

    const result = await seedDemoUsers(client)

    assert.deepEqual(result, {
      adminUsername: 'admin@demo.educraft',
      teacherUsername: 'teacher@demo.educraft',
      studentUsername: 'student@demo.educraft',
      classroomName: '11A2 Demo',
      subjectName: 'Lịch sử',
    })
    assert.equal(calls.subjects.length, 1)
    assert.equal(calls.users.length, 3)
    assert.equal(calls.teacherProfiles.length, 1)
    assert.equal(calls.classrooms.length, 1)
    assert.equal(calls.classroomSubjects.length, 1)
    assert.equal(calls.enrollments.length, 1)

    const userInputs = calls.users as Array<{ create: { password_hash: string; status: string; role: string; must_change_password: boolean } }>
    for (const input of userInputs) {
      assert.equal(input.create.status, 'ACTIVE')
      assert.equal(input.create.must_change_password, false)
      assert.ok(['ADMIN', 'TEACHER', 'STUDENT'].includes(input.create.role))
      assert.equal(await passwordService.verifyPassword(input.create.password_hash, 'demo123'), true)
    }

    assert.deepEqual(calls.enrollments[0], {
      data: { student_id: 'student-id', classroom_id: 'classroom-demo-id' },
    })
    assert.deepEqual(calls.classroomSubjects[0], {
      where: { classroom_id_subject_id: { classroom_id: 'classroom-demo-id', subject_id: 'subject-history' } },
      update: { teacher_id: 'teacher-id' },
      create: { classroom_id: 'classroom-demo-id', subject_id: 'subject-history', teacher_id: 'teacher-id' },
    })
  })
})
