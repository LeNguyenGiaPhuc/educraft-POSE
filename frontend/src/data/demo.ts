export type Role = 'admin' | 'teacher' | 'student'

export type DemoUser = {
  role: Role
  email: string
  name: string
  initials: string
  context: string
}

export const demoUsers: DemoUser[] = [
  { role: 'admin', email: 'admin@demo.educraft', name: 'Quản trị viên', initials: 'QT', context: 'Quản lý hệ thống' },
  { role: 'teacher', email: 'teacher@demo.educraft', name: 'Cô Nguyễn Minh Anh', initials: 'MA', context: 'Giáo viên Lịch sử' },
  { role: 'student', email: 'student@demo.educraft', name: 'Lê Gia Phúc', initials: 'GP', context: 'Học sinh lớp 11A2' },
]

const sessionKey = 'educraft-demo-user'

export function authenticateDemo(email: string, password: string): DemoUser | null {
  if (password !== 'demo123') return null
  return demoUsers.find((user) => user.email === email.trim().toLowerCase()) ?? null
}

export function readDemoSession(): DemoUser | null {
  try {
    const email = sessionStorage.getItem(sessionKey)
    return demoUsers.find((user) => user.email === email) ?? null
  } catch {
    return null
  }
}

export function saveDemoSession(user: DemoUser | null) {
  try {
    if (user) sessionStorage.setItem(sessionKey, user.email)
    else sessionStorage.removeItem(sessionKey)
  } catch {
    // The preview still works when browser storage is unavailable.
  }
}
