import { authApi, type ApiUser } from '../api/auth'
import { readDemoSession, saveDemoSession, type DemoUser, type Role } from '../../data/demo'

function toDemoUser(apiUser: ApiUser): DemoUser {
  const initials = apiUser.fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return {
    role: apiUser.role.toLowerCase() as Role,
    email: apiUser.username,
    name: apiUser.fullName,
    initials: initials || 'EC',
    context: apiUser.role === 'ADMIN' ? 'Quản lý hệ thống' : apiUser.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh',
  }
}

export async function resolveInitialSession(): Promise<DemoUser | null> {
  try {
    const apiUser = await authApi.me()
    return toDemoUser(apiUser)
  } catch {
    return readDemoSession()
  }
}

export async function loginWithBackend(username: string, password: string): Promise<DemoUser> {
  const apiUser = await authApi.login(username, password)
  saveDemoSession(null)
  return toDemoUser(apiUser)
}
