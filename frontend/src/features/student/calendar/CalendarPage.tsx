import { useState } from 'react'
import { Bell, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { StudentCalendar, StudentWorkspace } from '../../../api/client'
import { studentApi } from '../../../api/client'
import { useApiData } from '../../../api/useApiData'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import './calendar.css'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' })
const dateLabel = (value: string) => dateFormatter.format(new Date(value))
const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function CalendarPage() {
  const { scenario } = useStudentScenario()
  const { data: workspace, loading: workspaceLoading, error: workspaceError } = useApiData<StudentWorkspace>('/student/workspace')
  const { data, loading, error } = useApiData<StudentCalendar>('/student/calendar')
  const [today] = useState(() => new Date())
  const [month, setMonth] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedId, setSelectedId] = useState('')
  const [classId, setClassId] = useState('')
  const [filter, setFilter] = useState('all')
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState('')

  if (workspaceLoading || loading) return <div className="page-content student-page"><p role="status">Đang tải lịch và thông báo…</p></div>
  if (workspaceError || error) return <div className="page-content student-page"><section className="panel student-empty" role="alert"><h2>Không tải được lịch</h2><p>{workspaceError || error}</p></section></div>
  if (!workspace || !data) return null

  const memberships = [...(workspace.current ? [workspace.current] : []), ...workspace.history]
  const defaultClass = scenario === 'history-only' ? workspace.history[0]?.classroom.id : workspace.current?.classroom.id ?? workspace.history[0]?.classroom.id
  const activeClassId = classId || defaultClass || ''
  const selectedMembership = memberships.find((item) => item.classroom.id === activeClassId)
  const historical = Boolean(selectedMembership && selectedMembership.classroom.id !== workspace.current?.classroom.id)
  const allowedEvents = data.events.filter((event) => event.classroomSubject.classroom.id === activeClassId)
  const monthKey = `${month.year}-${String(month.month + 1).padStart(2, '0')}`
  const monthEvents = allowedEvents.filter((event) => event.starts_at.startsWith(monthKey))
  const selected = allowedEvents.find((event) => event.id === selectedId)
  const notifications = data.notifications.filter((item) => {
    const relatedClassId = item.scheduleEvent?.classroomSubject.classroom.id ?? item.activity?.classroomSubject.classroom.id
    return relatedClassId === activeClassId
  })
  const isRead = (id: string, initial: string | null) => readOverrides[id] ?? Boolean(initial)
  const shownNotifications = notifications.filter((item) => filter === 'all' || (filter === 'unread' ? !isRead(item.id, item.read_at) : isRead(item.id, item.read_at)))
  const unreadCount = notifications.filter((item) => !isRead(item.id, item.read_at)).length
  const offset = (new Date(month.year, month.month, 1).getDay() + 6) % 7
  const days = new Date(month.year, month.month + 1, 0).getDate()

  function moveMonth(delta: number) {
    const next = new Date(month.year, month.month + delta, 1)
    setMonth({ year: next.getFullYear(), month: next.getMonth() })
    setSelectedId('')
  }

  function eventPath(event: NonNullable<typeof selected>) {
    const suffix = historical ? '?class=history' : ''
    if (event.lesson_id) return `/student/lessons/${event.lesson_id}${suffix}`
    if (event.activity_id) return `/student/activities?subject=${event.classroom_subject_id}${suffix ? `&class=history` : ''}`
    return null
  }

  async function updateRead(id: string, read: boolean) {
    setMessage('')
    try {
      await studentApi.markNotificationRead(id, read)
      setReadOverrides((current) => ({ ...current, [id]: read }))
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không cập nhật được thông báo.')
    }
  }

  return <div className="page-content student-calendar">
    <header className="page-heading"><span className="eyebrow">LỊCH HỌC TẬP</span><h1>Lịch & thông báo</h1><p>Sự kiện và thông báo đã công bố cho các lớp em đã tham gia.</p></header>
    <p className="sc-notice">Trạng thái đọc/chưa đọc được lưu trong tài khoản của em.</p>
    <StudentScenarioControl />
    <label className="sc-scope">Lớp<select value={activeClassId} onChange={(event) => { setClassId(event.target.value); setSelectedId('') }}>{memberships.map((membership) => <option value={membership.classroom.id} key={membership.classroom.id}>{membership.classroom.name}{membership.classroom.id === workspace.current?.classroom.id ? ' · hiện tại' : ' · đã học, chỉ xem'}</option>)}</select></label>
    <div className="sc-columns"><section className="panel sc-month" aria-label="Lịch tháng">
      <div className="sc-toolbar"><button type="button" onClick={() => moveMonth(-1)} aria-label="Tháng trước"><ChevronLeft size={18} /></button><h2 aria-live="polite">Tháng {month.month + 1} · {month.year}</h2><button type="button" onClick={() => moveMonth(1)} aria-label="Tháng sau"><ChevronRight size={18} /></button></div>
      <div className="sc-week" aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="sc-days">{Array.from({ length: offset }, (_, index) => <span className="sc-blank" key={`blank-${index}`} />)}{Array.from({ length: days }, (_, index) => {
        const day = index + 1
        const events = monthEvents.filter((event) => Number(event.starts_at.slice(8, 10)) === day)
        return <div className={`sc-day ${events.length ? 'has-events' : ''}`} key={day}><span className="sc-date">{day}</span>{events.map((event) => <button key={event.id} type="button" aria-label={`${day}/${month.month + 1}: ${event.title}`} aria-pressed={selectedId === event.id} onClick={() => setSelectedId(event.id)}><span className="sc-event-dot" /><span className="sc-event-title">{event.title}</span></button>)}</div>
      })}</div>
      {!monthEvents.length && <p className="sc-empty" role="status"><CalendarDays size={20} />Tháng này chưa có sự kiện đã công bố.</p>}
      <p className="sc-help">Ngày có chấm xanh có sự kiện. Chọn sự kiện để xem chi tiết.</p>
    </section><section className="panel sc-detail" aria-label="Chi tiết sự kiện"><h2>Chi tiết sự kiện</h2>{selected ? <><span className="sc-badge">{selected.event_type}</span>{historical && <span className="sc-badge">Lớp đã học · chỉ xem</span>}<h3>{selected.title}</h3><dl><dt>Lớp · môn</dt><dd>{selected.classroomSubject.classroom.name} · {selected.classroomSubject.subject.name}</dd><dt>Thời gian</dt><dd>{dateLabel(selected.starts_at)}</dd><dt>Nội dung</dt><dd>{selected.details}</dd><dt>Đã công bố</dt><dd>{selected.published_at ? dateLabel(selected.published_at) : '—'}</dd></dl>{eventPath(selected) && <Link className="student-action secondary" to={eventPath(selected)!}>Mở nội dung liên quan</Link>}</> : <p className="sc-empty">Chọn một sự kiện trên lịch để xem nội dung.</p>}</section></div>
    <section className="panel sc-inbox"><div className="sc-inbox-heading"><h2><Bell size={18} /> Hộp thông báo <span className="sc-badge">{unreadCount} chưa đọc</span></h2><label>Lọc thông báo<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Tất cả</option><option value="unread">Chưa đọc</option><option value="read">Đã đọc</option></select></label></div>
      {message && <p className="student-notice" role="alert">{message}</p>}
      {shownNotifications.length ? <ul>{shownNotifications.map((item) => {
        const relatedEvent = item.scheduleEvent
        const title = relatedEvent?.title ?? item.activity?.title ?? item.title
        const subject = relatedEvent?.classroomSubject.subject.name ?? item.activity?.classroomSubject.subject.name ?? ''
        const publishedAt = relatedEvent?.published_at ?? item.created_at
        const read = isRead(item.id, item.read_at)
        const linkedEventId = relatedEvent?.id
        return <li key={item.id}><div><span className="sc-badge">{read ? 'Đã đọc' : 'Chưa đọc'}</span><button className="sc-notification-link" type="button" onClick={() => { if (linkedEventId) { setSelectedId(linkedEventId); const event = allowedEvents.find((entry) => entry.id === linkedEventId); if (event) setMonth({ year: Number(event.starts_at.slice(0, 4)), month: Number(event.starts_at.slice(5, 7)) - 1 }) } if (!read) void updateRead(item.id, true) }}>{title}</button><p>{subject} · Công bố {dateLabel(publishedAt)}</p><p>{item.body}</p></div><button type="button" onClick={() => void updateRead(item.id, !read)}>{read ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}</button></li>
      })}</ul> : <p className="sc-empty" role="status">Không có thông báo trong phạm vi lớp này.</p>}
    </section>
  </div>
}
