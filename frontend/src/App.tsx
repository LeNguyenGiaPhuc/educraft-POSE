import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { RoleLayout } from './components/RoleLayout'
import { readDemoSession, saveDemoSession, type DemoUser, type Role } from './data/demo'
import { navigation } from './data/navigation'
import { LoginPage } from './pages/LoginPage'
import { OverviewPage } from './pages/OverviewPage'
import { SectionPage } from './pages/SectionPage'

function App() {
  const [user, setUser] = useState<DemoUser | null>(readDemoSession)

  function signIn(nextUser: DemoUser) {
    saveDemoSession(nextUser)
    setUser(nextUser)
  }

  function signOut() {
    saveDemoSession(null)
    setUser(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={`/${user.role}`} replace /> : <LoginPage onSignIn={signIn} />} />
        {(['admin', 'teacher', 'student'] as Role[]).map((role) => (
          <Route
            key={role}
            path={`/${role}`}
            element={user?.role === role ? <RoleLayout user={user} onSignOut={signOut} /> : <Navigate to={user ? `/${user.role}` : '/login'} replace />}
          >
            <Route index element={<OverviewPage role={role} />} />
            {navigation[role].filter((item) => item.path !== '').map((item) => (
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
