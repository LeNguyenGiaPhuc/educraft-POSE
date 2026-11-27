import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  me: vi.fn(),
  login: vi.fn(),
  readDemoSession: vi.fn(),
  saveDemoSession: vi.fn(),
}))

vi.mock('../../../../../frontend/src/lib/api/auth', () => ({
  authApi: {
    me: mocks.me,
    login: mocks.login,
  },
}))

vi.mock('../../../../../frontend/src/data/demo', () => ({
  readDemoSession: mocks.readDemoSession,
  saveDemoSession: mocks.saveDemoSession,
}))

import { loginWithBackend, resolveInitialSession } from '../../../../../frontend/src/lib/auth/app-session'

const demoStudent = {
  role: 'student' as const,
  email: 'student@demo.educraft',
  name: 'Student demo',
  initials: 'SD',
  context: 'Học sinh',
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('app session', () => {
  it('prefers an authenticated backend teacher over a stale Student demo session', async () => {
    mocks.readDemoSession.mockReturnValue(demoStudent)
    mocks.me.mockResolvedValue({
      id: 'teacher-id',
      username: 'teacher@example.com',
      fullName: 'Teacher Example',
      role: 'TEACHER',
      contact: null,
      mustChangePassword: false,
    })

    await expect(resolveInitialSession()).resolves.toEqual(expect.objectContaining({
      role: 'teacher',
      email: 'teacher@example.com',
    }))
    expect(mocks.readDemoSession).not.toHaveBeenCalled()
  })

  it('clears the Student demo session when backend auth is unavailable', async () => {
    mocks.readDemoSession.mockReturnValue(demoStudent)
    mocks.me.mockRejectedValue(new Error('backend unavailable'))

    await expect(resolveInitialSession()).resolves.toBeNull()
    expect(mocks.saveDemoSession).toHaveBeenCalledWith(null)
  })

  it('returns no session when neither backend nor demo auth is available', async () => {
    mocks.readDemoSession.mockReturnValue(null)
    mocks.me.mockRejectedValue(new Error('not authenticated'))

    await expect(resolveInitialSession()).resolves.toBeNull()
  })

  it('clears the demo session after a successful backend login', async () => {
    mocks.login.mockResolvedValue({
      id: 'admin-id',
      username: 'admin@example.com',
      fullName: 'Admin Example',
      role: 'ADMIN',
      contact: null,
      mustChangePassword: false,
    })

    await expect(loginWithBackend('admin@example.com', 'secret')).resolves.toEqual(expect.objectContaining({
      role: 'admin',
      email: 'admin@example.com',
    }))
    expect(mocks.saveDemoSession).toHaveBeenCalledWith(null)
  })
})
