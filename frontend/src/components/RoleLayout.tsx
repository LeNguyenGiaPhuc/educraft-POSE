import { useState } from 'react'
import { ArrowRight, LogOut, Menu, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import type { DemoUser } from '../data/demo'
import { navigation, roleNames } from '../data/navigation'
import { useStudentDemo } from '../context/StudentDemoContext'

type Props = { user: DemoUser; onSignOut: () => void }

function StudentWorkspaceLabel() {
  const { classMode } = useStudentDemo()
  const label = classMode === 'current' ? 'Lớp 11A2' : classMode === 'former' ? 'Lớp 10A3 · chỉ đọc' : 'Chưa được xếp lớp'
  return <div className="workspace-label student-workspace-label"><span className="workspace-dot" /> {label}</div>
}

export function RoleLayout({ user, onSignOut }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const items = navigation[user.role]
  const studentParentPath = user.role === 'student' && (pathname.startsWith('/student/lessons/') || pathname === '/student/summary') ? 'subjects' : null
  const current = items.find((item) => {
    const basePath = `/${user.role}${item.path ? `/${item.path}` : ''}`
    return pathname === basePath || (item.path !== '' && pathname.startsWith(`${basePath}/`)) || (item.path === 'assistant' && pathname === `/${user.role}/chat-history`)
  }) ?? items.find((item) => item.path === studentParentPath) ?? items[0]

  return (
    <div className={`app-shell ${user.role === 'student' ? 'student-experience' : ''}`}>
      {menuOpen && <button className="mobile-overlay" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <NavLink to={`/${user.role}`} className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark">e<span>.</span></span><span>educraft<small>LEARNING SPACE</small></span>
          </NavLink>
          <button className="icon-button mobile-close" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        {user.role === 'student' ? <StudentWorkspaceLabel /> : <div className="workspace-label"><span className="workspace-dot" /> {roleNames[user.role]} <span className="workspace-arrow">⌄</span></div>}
        <p className="nav-caption">KHÔNG GIAN LÀM VIỆC</p>
        <nav className="main-nav" aria-label={`Điều hướng ${roleNames[user.role]}`}>
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={`/${user.role}${item.path ? `/${item.path}` : ''}`}
              end={item.path === ''}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => {
                const relatedStudentPage = user.role === 'student' && ((item.path === 'subjects' && (pathname.startsWith('/student/lessons/') || pathname === '/student/summary')) || (item.path === 'assistant' && pathname === '/student/chat-history'))
                return `nav-link ${isActive || relatedStudentPage ? 'active' : ''}`
              }}
            ><item.icon size={18} strokeWidth={1.9} /><span>{item.label}</span>{item.path === '' && <ArrowRight className="nav-end" size={15} />}</NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="preview-note"><span className="preview-spark">✳</span><div><strong>{user.role === 'student' ? 'Bản mô phỏng Student' : 'Bản xem trước'}</strong><p>{user.role === 'student' ? 'Các thao tác dùng dữ liệu mẫu và được lưu trong phiên này.' : 'Giao diện dùng dữ liệu mẫu. Các chức năng sẽ được kết nối sau.'}</p></div></div>
          <div className="sidebar-user"><span className="avatar">{user.initials}</span><span className="user-copy"><strong>{user.name}</strong><small>{user.context}</small></span><button className="icon-button logout" onClick={onSignOut} title="Đăng xuất" aria-label="Đăng xuất"><LogOut size={18} /></button></div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Mở menu" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
          <div className="breadcrumb"><span>Không gian học tập</span><span className="slash">/</span><strong>{current.label}</strong></div>
          <span className="topbar-right"><span className="live-dot" /> Giao diện mẫu <span className="topbar-avatar">{user.initials}</span></span>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  )
}
