import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BookOpen, CalendarDays, LayoutDashboard, Menu, X } from 'lucide-react'
import { ConnectedAction } from './ConnectedAction'
import { Field } from './Field'
import { NotebookTabs } from './NotebookTabs'
import { CraftTable } from './CraftTable'
import { Feedback } from './Feedback'
import { ModalShell } from './ModalShell'
import logomark from '../assets/educraft/brand/logomark.svg'
import './shared-shell.css'
import './core-components.css'
import './core-preview.css'

export function Preview() {
  const [modalOpen, setModalOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [value, setValue] = useState('')
  return <div className="ec-preview-components">
    <section className="preview-section" aria-labelledby="shell-preview-title">
      <h2 id="shell-preview-title">Connected Sidebar</h2>
      <p>Trạng thái active nối với Paper. Thử thu gọn hoặc mở drawer ở màn hình hẹp.</p>
      <div className={`ec-shell-specimen managed-shell role-admin${collapsed ? ' sidebar-collapsed' : ''}`}>
        <button type="button" className="ec-preview-drawer-button" onClick={() => setDrawerOpen(true)}><Menu size={20} /> Mở menu</button>
        {drawerOpen && <button type="button" className="ec-preview-backdrop" aria-label="Đóng menu" onClick={() => setDrawerOpen(false)} />}
        <aside className={`sidebar${drawerOpen ? ' sidebar-open' : ''}`} aria-label="Điều hướng mẫu">
          <div className="brand-row"><span className="brand"><img className="managed-logomark" src={logomark} alt="" /><span>educraft<small>LEARNING SPACE</small></span></span><button type="button" className="icon-button sidebar-collapse" aria-label={collapsed ? 'Mở rộng' : 'Thu gọn'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? '→' : '←'}</button><button type="button" className="icon-button mobile-close" aria-label="Đóng menu" onClick={() => setDrawerOpen(false)}><X size={20} /></button></div>
          <nav className="main-nav" aria-label="Mục mẫu"><a className="nav-link active" aria-current="page" href="#shell-preview-title"><LayoutDashboard size={20} /><span>Tổng quan</span></a><a className="nav-link" href="#components-preview-title"><BookOpen size={20} /><span>Môn học của lớp</span></a><a className="nav-link" href="#feedback-preview-title"><CalendarDays size={20} /><span>Lịch và thông báo dài</span></a></nav>
        </aside><div className="app-main"><div className="topbar">Không gian học tập / Tổng quan</div><div className="content"><div className="ec-geometry ec-nest"><h3>Học tập kết nối cùng lớp và môn học</h3><p>Nội dung dài vẫn nằm trong khối và không chạm phần khuyết. Đây là mẫu kiểm tra shape tại desktop và mobile.</p></div></div></div>
      </div>
    </section>
    <section className="preview-section" aria-labelledby="components-preview-title"><h2 id="components-preview-title">Core Components</h2>
      <div className="ec-preview-stack"><div className="ec-preview-actions"><ConnectedAction onClick={() => setModalOpen(true)}>Mở modal</ConnectedAction><ConnectedAction variant="secondary">Secondary</ConnectedAction><ConnectedAction variant="outline">Outline</ConnectedAction><ConnectedAction variant="text">Text</ConnectedAction><ConnectedAction variant="destructive">Destructive</ConnectedAction><ConnectedAction disabled>Disabled</ConnectedAction><ConnectedAction loading>Đang lưu</ConnectedAction></div>
      <div className="ec-preview-form"><Field id="demo-name" label="Tên môn học" value={value} onChange={(event) => setValue(event.target.value)} hint="Nhập tên hiển thị đầy đủ" required /><Field id="demo-search" kind="search" label="Tìm kiếm" placeholder="Tìm theo tên" /><Field id="demo-select" kind="select" label="Lớp học" options={[{ value: '', label: 'Chọn lớp' }, { value: '11a2', label: 'Lớp 11A2' }]} /><Field id="demo-error" label="Tên đăng nhập" error="Tên đăng nhập là bắt buộc" /><Field id="demo-note" kind="textarea" label="Ghi chú" /><Field id="demo-check" kind="checkbox" label="Xác nhận thông tin" /><Field id="demo-radio" kind="radio" label="Chọn một lựa chọn" name="demo-radio" /></div>
      <NotebookTabs tabs={[{ id: 'lesson', label: 'Bài học và học liệu', content: 'Nội dung tab bài học.' }, { id: 'activity', label: 'Hoạt động được giao với nhãn tiếng Việt dài', content: 'Nội dung tab hoạt động.' }]} />
      <CraftTable caption="Danh sách minh họa" columns={[{ key: 'name', label: 'Tên' }, { key: 'status', label: 'Trạng thái' }]} rows={[{ name: 'Lịch sử', status: 'Đang hoạt động' }]} />
      <CraftTable columns={[{ key: 'name', label: 'Tên' }]} rows={[]} empty="Chưa có bản ghi trong danh sách này." />
      <div id="feedback-preview-title" className="ec-preview-feedback"><Feedback kind="success">Đã lưu thành công.</Feedback><Feedback kind="warning">Vui lòng kiểm tra dữ liệu.</Feedback><Feedback kind="error">Không tải được dữ liệu. Thử lại sau.</Feedback><Feedback kind="info">Thông tin bổ sung.</Feedback><Feedback kind="loading">Đang tải dữ liệu…</Feedback><Feedback kind="empty">Chưa có dữ liệu.</Feedback></div></div>
    </section>
    <section className="preview-section" aria-labelledby="match-preview-title"><h2 id="match-preview-title">Craft Match</h2><div className="ec-match"><div className="ec-match-piece"><strong>Giáo viên</strong><p>Người phụ trách môn học và hoạt động.</p></div><div className="ec-match-piece"><strong>Lớp học</strong><p>Thông tin lớp phù hợp được kết nối rõ ràng.</p></div></div></section>
    <ModalShell open={modalOpen} title="Xác nhận thao tác" onClose={() => setModalOpen(false)} footer={<ConnectedAction onClick={() => setModalOpen(false)}>Đóng modal</ConnectedAction>}><p>Thử Tab, Shift+Tab và Escape. Khi đóng, focus quay về nút đã mở.</p><Field id="modal-note" label="Ghi chú" /></ModalShell>
  </div>
}

createRoot(document.getElementById('core-preview')!).render(<Preview />)
