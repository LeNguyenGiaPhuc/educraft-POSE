import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import type { Role } from '../data/demo'
import type { NavItem } from '../data/navigation'

export function SectionPage({ role, section }: { role: Role; section: NavItem }) {
  const Icon = section.icon
  return <div className="page-content"><div className="page-heading"><span className="eyebrow"><span className="eyebrow-line" /> KHÔNG GIAN LÀM VIỆC</span><h1>{section.label}</h1><p>{section.description}</p></div><div className="empty-panel"><div className="empty-icon"><Icon size={31} strokeWidth={1.6} /></div><span className="section-kicker">SẮP TRIỂN KHAI</span><h2>Không gian này đang được chuẩn bị</h2><p>Đây là khung điều hướng cho chức năng “{section.label}”. Dữ liệu và thao tác nghiệp vụ sẽ được xây dựng và kết nối API ở các bước tiếp theo.</p><Link to={`/${role}`} className="back-link"><ArrowLeft size={17} /> Về tổng quan</Link><span className="empty-corner"><ArrowUpRight size={19} /></span></div></div>
}
