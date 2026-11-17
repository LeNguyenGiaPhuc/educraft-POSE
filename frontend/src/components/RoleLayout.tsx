import { useEffect, useState } from 'react'
import { ArrowRight, LogOut, Menu, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import type { DemoUser } from '../data/demo'
import { teacherWorkspaceApi } from '../lib/api/teacher/workspace'
import type { TeacherClassroomSubjectContext } from '../lib/api/teacher/types'
import { navigation, roleNames } from '../data/navigation'

type Props = { user: DemoUser; onSignOut: () => void }

export function RoleLayout({ user, onSignOut }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname, search } = useLocation()
  const items = navigation[user.role]
  const current = items.find((item) => {
    const basePath = `/${user.role}${item.path ? `/${item.path}` : ''}`
    const isExactPath = pathname === basePath
    const isNestedPath = item.path !== '' && pathname.startsWith(`${basePath}/`)
    const isStudentLesson = user.role === 'student' && item.path === 'subjects' && pathname.startsWith('/student/lessons/')
    const isTeacherClassDetail = user.role === 'teacher' && item.path === 'classes' && pathname.startsWith('/teacher/classes/')
    return isExactPath || isNestedPath || isStudentLesson || isTeacherClassDetail
  }) ?? items[0]
  const [teacherContext, setTeacherContext] = useState<TeacherClassroomSubjectContext | null>(null)
  const teacherSubjectId = user.role === 'teacher' ? pathname.split('/')[5] : ''

  useEffect(() => {
    if (user.role !== 'teacher' || !teacherSubjectId) return

    let cancelled = false
    teacherWorkspaceApi.getClassroomSubject(teacherSubjectId)
      .then((context) => {
        if (!cancelled) setTeacherContext(context)
      })
      .catch(() => {
        if (!cancelled) setTeacherContext(null)
      })

    return () => {
      cancelled = true
    }
  }, [teacherSubjectId, user.role])
  const visibleTeacherContext = teacherContext?.classroomSubjectId === teacherSubjectId ? teacherContext : null
  const studentParams = user.role === 'student' ? new URLSearchParams(search) : null
  const scenario = studentParams?.get('scenario') ?? null
  const isViewingHistory = scenario === 'history-only' || studentParams?.get('class') === 'history'
  const scenarioQuery = scenario === 'unassigned' || scenario === 'history-only' ? `?scenario=${scenario}` : isViewingHistory ? '?class=history' : ''

  const isManagedWorkspace = user.role === 'admin' || user.role === 'teacher'

  useEffect(() => {
    if (isManagedWorkspace) window.scrollTo(0, 0)
  }, [isManagedWorkspace, pathname])

  return (
    <div className={`app-shell role-${user.role}`}>
      {menuOpen && <button className="mobile-overlay" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <NavLink to={`/${user.role}${scenarioQuery}`} className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark">e<span>.</span></span><span>educraft<small>LEARNING SPACE</small></span>
          </NavLink>
          <button className="icon-button mobile-close" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <div className="workspace-label"><span className="workspace-dot" /> {user.role === 'student' ? scenario === 'unassigned' ? 'Chưa được xếp lớp' : isViewingHistory ? 'Lớp 10A1 · chỉ đọc' : 'Lớp 11A2' : roleNames[user.role]} <span className="workspace-arrow">⌄</span></div>
        <p className="nav-caption">KHÔNG GIAN LÀM VIỆC</p>
        <nav className="main-nav" aria-label={`Điều hướng ${roleNames[user.role]}`}>
          {items.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/${user.role}${path ? `/${path}` : ''}${scenarioQuery}`}
              end={path === ''}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => {
                const isStudentLesson = user.role === 'student' && path === 'subjects' && pathname.startsWith('/student/lessons/')
                return `nav-link ${isActive || isStudentLesson ? 'active' : ''}`
              }}
            ><Icon size={18} strokeWidth={1.9} /><span>{label}</span>{path === '' && <ArrowRight className="nav-end" size={15} />}</NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {user.role === 'student' && <div className="preview-note"><span className="preview-spark">✳</span><div><strong>Bản mô phỏng Student</strong><p>Các thao tác dùng dữ liệu mẫu và được lưu trong phiên này.</p></div></div>}
          <div className="sidebar-user"><span className="avatar">{user.initials}</span><span className="user-copy"><strong>{user.name}</strong><small>{user.context}</small></span><button className="icon-button logout" onClick={onSignOut} title="Đăng xuất" aria-label="Đăng xuất"><LogOut size={18} /></button></div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Mở menu" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
          <div className="breadcrumb"><span>Không gian học tập</span><span className="slash">/</span><strong>{current.label}{visibleTeacherContext && ` / ${visibleTeacherContext.classroomName} · ${visibleTeacherContext.subjectName}`}</strong></div>
          <span className="topbar-right">{!isManagedWorkspace && <><span className="live-dot" /> Giao diện mẫu</>}<span className="topbar-avatar">{user.initials}</span></span>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  )
}
