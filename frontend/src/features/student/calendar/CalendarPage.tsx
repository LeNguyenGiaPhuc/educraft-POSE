import { useState } from 'react'
import { Bell, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { calendarEvents, calendarNotifications } from './calendar.mock'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import './calendar.css'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' })
const dateLabel = (value: string) => dateFormatter.format(new Date(value))
const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function CalendarPage() {
  const { scenario } = useStudentScenario()
  const [month, setMonth] = useState({ year: 2026, month: 10 })
  const [selectedId, setSelectedId] = useState('event-1')
  const [scope, setScope] = useState('current')
  const [filter, setFilter] = useState('all')
  const [readIds, setReadIds] = useState(() => calendarNotifications.filter((item) => item.initiallyRead).map((item) => item.id))
  const effectiveScope = scenario === 'unassigned' ? 'unassigned' : scenario === 'history-only' ? 'history' : scope
  const allowedEvents = calendarEvents.filter((event) => effectiveScope === 'history' ? event.historical : effectiveScope === 'unassigned' ? false : !event.historical)
  const monthKey = `${month.year}-${String(month.month + 1).padStart(2, '0')}`
  const monthEvents = allowedEvents.filter((event) => event.startsAt.startsWith(monthKey))
  const selected = allowedEvents.find((event) => event.id === selectedId)
  const notifications = calendarNotifications.filter((item) => allowedEvents.some((event) => event.id === item.eventId))
  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length
  const shownNotifications = notifications.filter((item) => filter === 'all' || (filter === 'unread' ? !readIds.includes(item.id) : readIds.includes(item.id)))
  const offset = (new Date(month.year, month.month, 1).getDay() + 6) % 7
  const days = new Date(month.year, month.month + 1, 0).getDate()

  function moveMonth(delta: number) {
    const next = new Date(month.year, month.month + delta, 1)
    setMonth({ year: next.getFullYear(), month: next.getMonth() })
    setSelectedId('')
  }

  function openEvent(id: string) {
    const event = allowedEvents.find((item) => item.id === id)
    if (!event) return
    setSelectedId(id)
    setMonth({ year: Number(event.startsAt.slice(0, 4)), month: Number(event.startsAt.slice(5, 7)) - 1 })
  }

  return <div className="page-content student-calendar">
    <header className="page-heading"><span className="eyebrow">LỊCH HỌC TẬP</span><h1>Lịch & thông báo</h1><p>Theo dõi sự kiện đã công bố của lớp và xem lại thông báo từ giáo viên.</p></header>
    <p className="sc-notice">Dữ liệu mẫu · Đọc/chưa đọc chỉ thay đổi trong màn hình này, không lưu khi tải lại. Mỗi lần công bố có một thông báo được giữ lại; không có nhắc nhở tự động lặp lại.</p>
    <StudentScenarioControl />
    {scenario === 'current' && <label className="sc-scope">Phạm vi lịch<select value={scope} onChange={(event) => { const value = event.target.value; setScope(value); setSelectedId(''); setMonth(value === 'history' ? { year: 2026, month: 4 } : { year: 2026, month: 10 }) }}><option value="current">Lớp hiện tại · 11A2</option><option value="history">Lớp đã học · 10A1 (chỉ xem)</option></select></label>}
    {effectiveScope === 'history' && <p className="sc-help">Lịch lớp đã học chỉ dùng để xem lại. <button type="button" onClick={() => setMonth({ year: 2026, month: 4 })}>Xem tháng 5/2026 có sự kiện</button></p>}
    <div className="sc-columns"><section className="panel sc-month" aria-label="Lịch tháng">
      <div className="sc-toolbar"><button type="button" onClick={() => moveMonth(-1)} aria-label="Tháng trước"><ChevronLeft size={18} /></button><h2 aria-live="polite">Tháng {month.month + 1} · {month.year}</h2><button type="button" onClick={() => moveMonth(1)} aria-label="Tháng sau"><ChevronRight size={18} /></button></div>
      <div className="sc-week" aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="sc-days">{Array.from({ length: offset }, (_, index) => <span className="sc-blank" key={`blank-${index}`} />)}{Array.from({ length: days }, (_, index) => {
        const day = index + 1
        const events = monthEvents.filter((event) => Number(event.startsAt.slice(8, 10)) === day)
        return <div className={`sc-day ${events.length ? 'has-events' : ''}`} key={day}><span className="sc-date">{day}</span>{events.map((event) => <button key={event.id} type="button" aria-label={`${day}/${month.month + 1}: ${event.title}`} aria-pressed={selectedId === event.id} onClick={() => openEvent(event.id)}><span className="sc-event-dot" /><span className="sc-event-title">{event.title}</span></button>)}</div>
      })}</div>
      {!monthEvents.length && <p className="sc-empty" role="status"><CalendarDays size={20} />{effectiveScope === 'unassigned' ? 'Chưa có lớp hiện tại nên chưa có sự kiện.' : 'Tháng này chưa có sự kiện đã công bố.'}</p>}
      <p className="sc-help">Ngày có chấm xanh có sự kiện. Chọn sự kiện để xem chi tiết.</p>
    </section><section className="panel sc-detail" aria-label="Chi tiết sự kiện"><h2>Chi tiết sự kiện</h2>{selected ? <><span className="sc-badge">{selected.type}</span>{selected.historical && <span className="sc-badge">Lớp đã học · chỉ xem</span>}<h3>{selected.title}</h3><dl><dt>Lớp · môn</dt><dd>{selected.subject}</dd><dt>Thời gian (giờ Việt Nam)</dt><dd>{dateLabel(selected.startsAt)}</dd><dt>Nội dung</dt><dd>{selected.details}</dd><dt>Đã công bố</dt><dd>{dateLabel(selected.publishedAt)}</dd></dl></> : <p className="sc-empty">Chọn sự kiện trên lịch hoặc trong thông báo để đọc nội dung.</p>}</section></div>
    <section className="panel sc-inbox"><div className="sc-inbox-heading"><h2><Bell size={18} /> Hộp thông báo <span className="sc-badge">{unreadCount} chưa đọc</span></h2><label>Lọc thông báo<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Tất cả</option><option value="unread">Chưa đọc</option><option value="read">Đã đọc</option></select></label></div>
      {shownNotifications.length ? <ul>{shownNotifications.map((item) => {
        const event = allowedEvents.find((entry) => entry.id === item.eventId)!
        const isRead = readIds.includes(item.id)
        return <li key={item.id}><div><span className="sc-badge">{isRead ? 'Đã đọc' : 'Chưa đọc'}</span>{event.historical && <span className="sc-badge">Lớp đã học · chỉ xem</span>}<button className="sc-notification-link" type="button" onClick={() => { openEvent(event.id); setReadIds((ids) => ids.includes(item.id) ? ids : [...ids, item.id]) }}>{event.title}</button><p>{event.subject} · Công bố {dateLabel(event.publishedAt)}</p></div><button type="button" onClick={() => setReadIds((ids) => isRead ? ids.filter((id) => id !== item.id) : [...ids, item.id])}>{isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}</button></li>
      })}</ul> : <p className="sc-empty" role="status">Không có thông báo trong phạm vi đang chọn.</p>}
    </section>
  </div>
}
