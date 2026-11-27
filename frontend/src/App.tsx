import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { RoleLayout } from './components/RoleLayout'
import { saveDemoSession, type DemoUser, type Role } from './data/demo'
import { navigation } from './data/navigation'
import { authApi } from './lib/api/auth'
import { loginWithBackend, resolveInitialSession } from './lib/auth/app-session'
import { AdminOverviewPage } from './features/admin/overview/AdminOverviewPage'
import { TeacherOverviewPage } from './features/teacher/overview/TeacherOverviewPage'
import { teacherRouteElements } from './features/teacher/routes'
import { studentRouteElements } from './features/student/routes'
import { StudentOverviewPage } from './features/student/OverviewPage'
import { LoginPage } from './pages/LoginPage'
import { SectionPage } from './pages/SectionPage'

function App() {
  const [user, setUser] = useState<DemoUser | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    resolveInitialSession()
      .then((nextUser) => {
        if (!cancelled) setUser(nextUser)
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function signInWithApi(username: string, password: string) {
    const nextUser = await loginWithBackend(username, password)
    setUser(nextUser)
  }

  async function signOut() {
    await authApi.logout().catch(() => undefined)
    saveDemoSession(null)
    setUser(null)
  }

  if (!sessionReady) {
    return <div style={{ padding: 32, color: '#245d49' }}>Đang kiểm tra phiên đăng nhập...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={`/${user.role}`} replace /> : <LoginPage onApiSignIn={signInWithApi} />} />
        {(['admin', 'teacher', 'student'] as Role[]).map((role) => (
          <Route
            key={role}
            path={`/${role}`}
            element={user?.role === role ? <RoleLayout user={user} onSignOut={signOut} /> : <Navigate to={user ? `/${user.role}` : '/login'} replace />}
          >
            <Route index element={role === 'student' ? <StudentOverviewPage /> : role === 'admin' ? <AdminOverviewPage /> : <TeacherOverviewPage />} />
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

export default App
