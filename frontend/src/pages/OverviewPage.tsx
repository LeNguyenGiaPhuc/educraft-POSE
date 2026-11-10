import { ArrowRight, Clock3, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import type { Role } from '../data/demo'
import { navigation } from '../data/navigation'
import { overview } from '../data/overview'

export function OverviewPage({ role }: { role: Role }) {
  const data = overview[role]
  return <div className="page-content"><div className="page-heading"><span className="eyebrow"><span className="eyebrow-line" /> {data.eyebrow}</span><h1>{data.title}</h1><p>{data.subtitle}</p></div><div className="sample-strip"><Sparkles size={16} /> Các số liệu và nội dung bên dưới là ví dụ để xem trước bố cục.</div><div className="metrics">{data.metrics.map((metric, index) => <div className="metric-card" key={metric.label}><span className="metric-number">0{index + 1}</span><p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.note}</small></div>)}</div><div className="overview-grid"><section className="panel focus-panel"><div className="panel-head"><div><span className="section-kicker">TIẾP THEO</span><h2>{data.focusTitle}</h2></div><Clock3 size={19} /></div><div className="focus-list">{data.focus.map((item) => <div className="focus-item" key={item.title}><span className="focus-icon">↗</span><div><strong>{item.title}</strong><p>{item.detail}</p></div><span className="focus-tag">{item.tag}</span></div>)}</div></section><section className="panel explore-panel"><span className="section-kicker">KHÁM PHÁ KHÔNG GIAN</span><h2>Đi tới công việc của bạn</h2><div className="quick-links">{navigation[role].slice(1, 5).map(({ path, label, icon: Icon }) => <Link key={path} to={`/${role}/${path}`}><Icon size={18} /><span>{label}</span><ArrowRight size={16} /></Link>)}</div></section></div></div>
}
