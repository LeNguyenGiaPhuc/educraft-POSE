import { useState } from 'react'
import { ArrowRight, LogOut, Menu, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import type { DemoUser } from '../data/demo'
import { navigation, roleNames } from '../data/navigation'

type Props = { user: DemoUser; onSignOut: () => void }

export function RoleLayout({ user, onSignOut }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const items = navigation[user.role]
  const current = items.find((item) => pathname === `/${user.role}${item.path ? `/${item.path}` : ''}`) ?? items[0]

  return (
    <div className="app-shell">
      {menuOpen && <button className="mobile-overlay" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <NavLink to={`/${user.role}`} className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark">e<span>.</span></span><span>educraft<small>LEARNING SPACE</small></span>
          </NavLink>
          <button className="icon-button mobile-close" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <div className="workspace-label"><span className="workspace-dot" /> {roleNames[user.role]} <span className="workspace-arrow">⌄</span></div>
        <p className="nav-caption">KHÔNG GIAN LÀM VIỆC</p>
        <nav className="main-nav" aria-label={`Điều hướng ${roleNames[user.role]}`}>
          {items.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/${user.role}${path ? `/${path}` : ''}`}
              end={path === ''}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            ><Icon size={18} strokeWidth={1.9} /><span>{label}</span>{path === '' && <ArrowRight className="nav-end" size={15} />}</NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="preview-note"><span className="preview-spark">✳</span><div><strong>Bản xem trước</strong><p>Giao diện dùng dữ liệu mẫu. Các chức năng sẽ được kết nối sau.</p></div></div>
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
