import { ArrowRight, Clock3, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import type { Role } from '../data/demo'
import { navigation } from '../data/navigation'
import { overview } from '../data/overview'
import { assignedClasses } from '../features/teacher/fixtures'
import { readActivityPreviews, sampleActivities } from '../features/teacher/activities/activities.mock'
import { notebookRecords } from '../features/teacher/submissions/submissions.mock'

export function OverviewPage({ role }: { role: Role }) {
  const { search } = useLocation()
  const scenario = role === 'student' ? new URLSearchParams(search).get('scenario') : null
  const scenarioQuery = scenario === 'unassigned' || scenario === 'history-only' ? `?scenario=${scenario}` : ''
  const data = role === 'teacher' ? {
    ...overview.teacher,
    metrics: [
      { label: 'Lớp phụ trách', value: String(assignedClasses.length).padStart(2, '0'), note: 'Môn được phân công' },
      { label: 'Hoạt động đang mở', value: String([...sampleActivities, ...readActivityPreviews()].filter(item => item.status === 'PUBLISHED').length).padStart(2, '0'), note: 'Trong dữ liệu mẫu và phiên xem' },
      { label: 'Bài kiểm tra vở cần xem', value: String(notebookRecords.filter(item => item.status === 'LOCKED').length).padStart(2, '0'), note: 'Bài nộp hiện tại chưa chốt' },
    ],
  } : overview[role]
  const isManagedWorkspace = role === 'admin' || role === 'teacher'
  return <div className="page-content"><div className="page-heading">{!isManagedWorkspace && <span className="eyebrow"><span className="eyebrow-line" /> {data.eyebrow}</span>}<h1>{data.title}</h1><p>{data.subtitle}</p></div>{!isManagedWorkspace && <div className="sample-strip"><Sparkles size={16} /> Các số liệu và nội dung bên dưới là ví dụ để xem trước bố cục.</div>}<div className="metrics">{data.metrics.map((metric, index) => <div className="metric-card" key={metric.label}>{!isManagedWorkspace && <span className="metric-number">0{index + 1}</span>}<p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.note}</small></div>)}</div><div className="overview-grid"><section className="panel focus-panel"><div className="panel-head"><div>{!isManagedWorkspace && <span className="section-kicker">TIẾP THEO</span>}<h2>{data.focusTitle}</h2></div><Clock3 size={19} /></div><div className="focus-list">{data.focus.map((item) => <div className="focus-item" key={item.title}><span className="focus-icon">↗</span><div><strong>{item.title}</strong><p>{item.detail}</p></div><span className="focus-tag">{item.tag}</span></div>)}</div></section><section className="panel explore-panel">{!isManagedWorkspace && <span className="section-kicker">KHÁM PHÁ KHÔNG GIAN</span>}<h2>Đi tới công việc của bạn</h2><div className="quick-links">{navigation[role].slice(1, 5).map(({ path, label, icon: Icon }) => <Link key={path} to={`/${role}/${path}${scenarioQuery}`}><Icon size={18} /><span>{label}</span><ArrowRight size={16} /></Link>)}</div></section></div></div>
}
