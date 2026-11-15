import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { passwordService } from '../modules/auth/password.service.js'
import { seedDemoUsers } from './demo-seed.js'

describe('demo seed', () => {
  it('creates active admin and teacher accounts with the documented demo password', async () => {
    const calls = {
      subjects: [] as unknown[],
      users: [] as unknown[],
      teacherProfiles: [] as unknown[],
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
          return { id: input.where.username.startsWith('teacher') ? 'teacher-id' : 'admin-id' }
        },
      },
      teacherProfile: {
        upsert: async (input: unknown) => {
          calls.teacherProfiles.push(input)
          return { teacher_id: 'teacher-id' }
        },
      },
    }

    const result = await seedDemoUsers(client)

    assert.deepEqual(result, {
      adminUsername: 'admin@demo.educraft',
      teacherUsername: 'teacher@demo.educraft',
      subjectName: 'Lịch sử',
    })
    assert.equal(calls.subjects.length, 1)
    assert.equal(calls.users.length, 2)
    assert.equal(calls.teacherProfiles.length, 1)

    const userInputs = calls.users as Array<{ create: { password_hash: string; status: string; role: string; must_change_password: boolean } }>
    for (const input of userInputs) {
      assert.equal(input.create.status, 'ACTIVE')
      assert.equal(input.create.must_change_password, false)
      assert.ok(input.create.role === 'ADMIN' || input.create.role === 'TEACHER')
      assert.equal(await passwordService.verifyPassword(input.create.password_hash, 'demo123'), true)
    }
  })
})
