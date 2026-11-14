import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { RoleLayout } from './components/RoleLayout'
import { readDemoSession, saveDemoSession, type DemoUser, type Role } from './data/demo'
import { navigation } from './data/navigation'
import { LoginPage } from './pages/LoginPage'
import { OverviewPage } from './pages/OverviewPage'
import { SectionPage } from './pages/SectionPage'
import { StudentPage } from './pages/StudentPage'
import { StudentDemoProvider } from './context/StudentDemoContext'

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
            element={user?.role === role ? (role === 'student' ? <StudentDemoProvider><RoleLayout user={user} onSignOut={signOut} /></StudentDemoProvider> : <RoleLayout user={user} onSignOut={signOut} />) : <Navigate to={user ? `/${user.role}` : '/login'} replace />}
          >
            <Route index element={role === 'student' ? <StudentPage screen="home" /> : <OverviewPage role={role} />} />
            {role === 'student' ? <>
              <Route path="subjects" element={<StudentPage screen="subjects" />} />
              <Route path="subjects/:subjectId" element={<StudentPage screen="subject" />} />
              <Route path="lessons/:lessonId" element={<StudentPage screen="lesson" />} />
              <Route path="summary" element={<StudentPage screen="summary" />} />
              <Route path="activities" element={<StudentPage screen="activities" />} />
              <Route path="activities/:activityId" element={<StudentPage screen="activity" />} />
              <Route path="practice" element={<StudentPage screen="practice" />} />
              <Route path="practice/session" element={<StudentPage screen="practice-session" />} />
              <Route path="results" element={<StudentPage screen="results" />} />
              <Route path="profile" element={<StudentPage screen="profile" />} />
              <Route path="calendar" element={<StudentPage screen="calendar" />} />
              <Route path="assistant" element={<StudentPage screen="assistant" />} />
              <Route path="chat-history" element={<StudentPage screen="assistant" />} />
            </> : navigation[role].filter((item) => item.path !== '').map((item) => (
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
