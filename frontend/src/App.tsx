import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { RoleLayout } from './components/RoleLayout'
import { readDemoSession, saveDemoSession, type DemoUser, type Role } from './data/demo'
import { navigation } from './data/navigation'
import { authApi, type ApiUser } from './lib/api/auth'
import { LoginPage } from './pages/LoginPage'
import { OverviewPage } from './pages/OverviewPage'
import { teacherRouteElements } from './features/teacher/routes'
import { studentRouteElements } from './features/student/routes'
import { StudentOverviewPage } from './features/student/OverviewPage'
import { SectionPage } from './pages/SectionPage'

function App() {
  const [user, setUser] = useState<DemoUser | null>(() => {
    const previewUser = readDemoSession()
    return previewUser?.role === 'student' ? previewUser : null
  })
  const [sessionReady, setSessionReady] = useState(() => readDemoSession()?.role === 'student')

  useEffect(() => {
    if (sessionReady) return

    let cancelled = false
    authApi.me()
      .then((apiUser) => {
        if (!cancelled) setUser(toDemoUser(apiUser))
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [sessionReady])

  function signIn(nextUser: DemoUser) {
    saveDemoSession(nextUser)
    setUser(nextUser)
  }

  async function signInWithApi(username: string, password: string) {
    const apiUser = await authApi.login(username, password)
    setUser(toDemoUser(apiUser))
  }

  async function signOut() {
    if (user?.role !== 'student') {
      await authApi.logout().catch(() => undefined)
    }
    saveDemoSession(null)
    setUser(null)
  }

  if (!sessionReady) {
    return <div style={{ padding: 32, color: '#245d49' }}>Đang kiểm tra phiên đăng nhập...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={`/${user.role}`} replace /> : <LoginPage onSignIn={signIn} onApiSignIn={signInWithApi} />} />
        {(['admin', 'teacher', 'student'] as Role[]).map((role) => (
          <Route
            key={role}
            path={`/${role}`}
            element={user?.role === role ? <RoleLayout user={user} onSignOut={signOut} /> : <Navigate to={user ? `/${user.role}` : '/login'} replace />}
          >
            <Route index element={role === 'student' ? <StudentOverviewPage /> : <OverviewPage role={role} />} />
            {role === 'teacher' ? teacherRouteElements : role === 'student' ? studentRouteElements : navigation[role].filter((item) => item.path !== '').map((item) => (
              <Route key={item.path} path={item.path} element={<SectionPage role={role} section={item} />} />
            ))}
          </Route>
        ))}
        <Route path="*" element={<Navigate to={user ? `/${user.role}` : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

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

export default App
