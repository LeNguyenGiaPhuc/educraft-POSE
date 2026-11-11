import { useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { assignedClasses, assignedSubjects, getTeacherSubjectContext, teacherSubjectPath } from '../fixtures'
import { readActivityPreviews, sampleActivities } from '../activities/activities.mock'
import { readPublishedTeacherLessons } from '../lessons/lesson-preview-store'
import { TeacherBackButton } from '../components/TeacherBackButton'
import { EmptyState, PreviewNotice, TeacherHeading } from '../insights/TeacherUI'
import { calendarEvents, monthCells, type CalendarEvent } from './schedule.mock'
import { isCalendarDateTime, minCalendarDateTime, maxCalendarDateTime } from './calendarDate'
import './schedule.css'

// UI-only records survive linked-content navigation; a reload returns to fixtures.
let sessionCalendarPreviews: CalendarEvent[] = []

const monthLabel = (month: string) => new Date(`${month}-01T12:00`).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
const subjectLabel = (id: string) => { const context = getTeacherSubjectContext(id); return context ? `${context.classroom.name} · ${context.subject.name}` : '' }
const detailPath = (subjectId: string, kind: 'lesson' | 'activity', id: string) => teacherSubjectPath(subjectId).split('?')[0] + `/${kind === 'lesson' ? 'lessons' : 'activities'}/${encodeURIComponent(id)}`

export function SchedulePage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const [previews, setPreviews] = useState<CalendarEvent[]>(() => sessionCalendarPreviews)
  const [notice, setNotice] = useState('')
  const rawMonth = params.get('month') ?? ''
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) && Number(rawMonth.slice(0, 4)) >= 1900 && Number(rawMonth.slice(0, 4)) <= 2100 ? rawMonth : '2026-11'
  const requestedClass = params.get('classroomId') ?? ''
  const classroomId = assignedClasses.some(item => item.id === requestedClass) ? requestedClass : ''
  const requestedSubject = params.get('classroomSubjectId') ?? ''
  const classroomSubjectId = getTeacherSubjectContext(requestedSubject, classroomId || undefined)?.subject.id ?? ''
  const filtered = [...calendarEvents, ...previews].filter(item => { const context = getTeacherSubjectContext(item.classroomSubjectId); return context && (!classroomId || context.classroom.id === classroomId) && (!classroomSubjectId || item.classroomSubjectId === classroomSubjectId) && item.startsAt.startsWith(month) })
  const selected = filtered.find(item => item.id === params.get('eventId'))
  const day = params.get('day')?.startsWith(month + '-') ? params.get('day')! : ''
  const dayEvents = filtered.filter(item => item.startsAt.slice(0, 10) === day)
  function update(values: Record<string, string>) { setParams(previous => { const next = new URLSearchParams(previous); Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); return next }, { state: location.state }) }
  function moveMonth(amount: number) { const date = new Date(`${month}-01T12:00`); date.setMonth(date.getMonth() + amount); const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; if (date.getFullYear() >= 1900 && date.getFullYear() <= 2100) update({ month: next, eventId: '', day: '' }) }
  const back = classroomSubjectId ? teacherSubjectPath(classroomSubjectId, params.has('activityId') ? 'activities' : 'lessons') : '/teacher/classes'
  return <div className="page-content tc-page">
    <TeacherBackButton fallbackTo={back} />
    <TeacherHeading title="Lịch" description="Lịch tháng tổng hợp các lớp và môn được phân công." />
    <PreviewNotice>Dữ liệu mẫu · chưa kết nối API. Không lưu sự kiện hoặc gửi thông báo thật.</PreviewNotice>
    <div className="tc-toolbar"><label>Lớp<select value={classroomId} onChange={event => update({ classroomId: event.target.value, classroomSubjectId: '', eventId: '', day: '' })}><option value="">Tất cả lớp</option>{assignedClasses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Môn trong lớp<select value={classroomSubjectId} onChange={event => update({ classroomSubjectId: event.target.value, eventId: '', day: '' })}><option value="">Tất cả môn được phân công</option>{assignedSubjects.filter(item => !classroomId || item.classroomId === classroomId).map(item => <option key={item.id} value={item.id}>{subjectLabel(item.id)}</option>)}</select></label><button className="ti-button primary" type="button" onClick={() => update({ create: '1', lessonId: '', activityId: '', publication: '', title: '' })}><Plus size={16} /> Thêm sự kiện</button></div>
    {params.get('create') === '1' && <EventForm key={`${requestedClass}:${requestedSubject}:${params.get('lessonId')}:${params.get('activityId')}`} params={params} onCancel={() => { update({ create: '', lessonId: '', activityId: '', publication: '', title: '' }); setNotice('Đã hủy biểu mẫu lịch. Bài học hoặc hoạt động đã công bố trong bản xem trước vẫn được giữ nguyên.') }} onPreview={item => { sessionCalendarPreviews = [...previews, item]; setPreviews(sessionCalendarPreviews); update({ create: '', lessonId: '', activityId: '', publication: '', title: '', classroomId: getTeacherSubjectContext(item.classroomSubjectId)?.classroom.id ?? '', classroomSubjectId: item.classroomSubjectId, month: item.startsAt.slice(0,7), day: item.startsAt.slice(0,10), eventId: item.id }); setNotice('Đã thêm vào lịch xem trước trong màn hình này. Chưa lưu hoặc gửi thông báo thật.') }} />}
    {notice && <p className="ti-success" role="status">{notice}</p>}
    <section className="ti-card ti-margin-top"><div className="tc-month-heading"><button type="button" className="ti-button" aria-label="Tháng trước" onClick={() => moveMonth(-1)}><ChevronLeft size={18} /></button><h2>{monthLabel(month)}</h2><button type="button" className="ti-button" aria-label="Tháng sau" onClick={() => moveMonth(1)}><ChevronRight size={18} /></button></div><p className="ti-muted">{filtered.length} sự kiện · Chọn ngày để xem danh sách bên dưới.</p><div className="tc-month" aria-label={`Lịch ${monthLabel(month)}`}>
      {['T2','T3','T4','T5','T6','T7','CN'].map(label => <div className="tc-weekday" key={label}>{label}</div>)}
      {monthCells(month).map((date, index) => { const items = filtered.filter(item => item.startsAt.slice(0,10) === date); return date ? <button key={date} type="button" aria-pressed={day === date} aria-label={`${date}, ${items.length} sự kiện`} className={`tc-day ${day === date ? 'selected' : ''}`} onClick={() => update({ day: date, eventId: items[0]?.id ?? '' })}><span>{Number(date.slice(-2))}</span>{items.length > 0 && <><span className="tc-count">{items.length}<span className="tc-count-text"> sự kiện</span></span><span className="tc-day-summary">{items.map(item => subjectLabel(item.classroomSubjectId)).join(' / ')}</span></>}</button> : <div className="tc-day blank" key={`blank-${index}`} /> })}
    </div>{!filtered.length && <EmptyState title="Tháng này chưa có sự kiện" detail="Đổi tháng, điều chỉnh bộ lọc hoặc thêm sự kiện xem trước." />}</section>
    <div className="ti-grid ti-margin-top"><section className="ti-card"><h2>{day ? `Ngày ${day.split('-').reverse().join('/')}` : 'Sự kiện trong tháng'}</h2>{(day ? dayEvents : filtered).map(item => <button type="button" key={item.id} className={`ti-list-button ${selected?.id === item.id ? 'active' : ''}`} onClick={() => update({ eventId: item.id, day: item.startsAt.slice(0,10) })}><strong>{item.title}</strong><small>{subjectLabel(item.classroomSubjectId)} · {new Date(item.startsAt).toLocaleString('vi-VN')}</small></button>)}{day && !dayEvents.length && <p>Ngày này chưa có sự kiện.</p>}</section><section className="ti-card"><h2>Chi tiết sự kiện</h2>{selected ? <><span className="ti-chip">{selected.type}</span><h3>{selected.title}</h3><p><strong>{subjectLabel(selected.classroomSubjectId)}</strong></p><p>{new Date(selected.startsAt).toLocaleString('vi-VN')}</p><p className="tc-details">{selected.details}</p>{selected.target && <Link className="ti-button" to={detailPath(selected.classroomSubjectId, selected.target.kind, selected.target.id)} state={{ returnTo: location.pathname + location.search }}>Mở {selected.target.kind === 'lesson' ? 'bài học & học liệu' : 'hoạt động'}</Link>}<p className="ti-muted">{selected.combinedNotification ? 'Quy tắc tương lai: một thông báo gộp cho hoạt động và sự kiện trong cùng luồng công bố; không gửi hai thông báo.' : 'Quy tắc tương lai: một thông báo khi công bố riêng sự kiện.'} Thông báo được giữ trong hộp thông báo; không nhắc lại tự động.</p></> : <EmptyState title="Chọn một sự kiện" detail="Chọn ngày có đánh dấu hoặc sự kiện trong danh sách." />}</section></div>
  </div>
}

function EventForm({ params, onCancel, onPreview }: { params: URLSearchParams; onCancel: () => void; onPreview: (item: CalendarEvent) => void }) {
  const context = getTeacherSubjectContext(params.get('classroomSubjectId') ?? '', params.get('classroomId') || undefined)
  const [subjectId, setSubjectId] = useState(context?.subject.id ?? assignedSubjects.find(item => item.classroomId === params.get('classroomId'))?.id ?? assignedSubjects[0].id)
  const activities = [...sampleActivities, ...readActivityPreviews()].filter(item => getTeacherSubjectContext(item.classroomSubjectId))
  const lessons = readPublishedTeacherLessons()
  const lessonId = params.get('lessonId')
  const activityId = params.get('activityId')
  const validLesson = context && !activityId ? lessons.find(item => item.id === lessonId && item.classroomSubjectId === context.subject.id) : undefined
  const validActivity = context && !lessonId ? activities.find(item => item.id === activityId && item.classroomSubjectId === context.subject.id) : undefined
  const [target, setTarget] = useState(validLesson ? `lesson:${validLesson.id}` : validActivity ? `activity:${validActivity.id}` : '')
  const [title, setTitle] = useState(validLesson?.title || validActivity?.title || '')
  const [type, setType] = useState('Chuẩn bị bài')
  const [dateTime, setDateTime] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const immediate = Boolean(validActivity && params.get('publication') === 'preview' && target === `activity:${validActivity.id}` && subjectId === validActivity.classroomSubjectId)
  const options = [...lessons.filter(item => item.classroomSubjectId === subjectId).map(item => ({ value: `lesson:${item.id}`, label: `Bài học: ${item.title}` })), ...activities.filter(item => item.classroomSubjectId === subjectId).map(item => ({ value: `activity:${item.id}`, label: `Hoạt động: ${item.title}` }))]
  function submit(event: FormEvent) { event.preventDefault(); if (!title.trim() || !details.trim() || !isCalendarDateTime(dateTime) || !getTeacherSubjectContext(subjectId) || (target && !options.some(item => item.value === target))) { setError('Nhập tiêu đề, ngày giờ từ năm 1900 đến 2100, nội dung và chọn liên kết đúng lớp/môn.'); return }; const split = target.indexOf(':'); onPreview({ id: `calendar-preview-${Date.now()}`, classroomSubjectId: subjectId, title: title.trim(), type, startsAt: dateTime, details: details.trim(), combinedNotification: immediate, ...(target ? { target: { kind: target.slice(0, split) as 'lesson' | 'activity', id: target.slice(split + 1) } } : {}) }) }
  return <section className="ti-card ti-margin-top tc-form"><h2>Tạo sự kiện · xem trước</h2>{(lessonId || activityId) && !validLesson && !validActivity && <p role="status" className="ti-error">Không xác định được nội dung đã công bố trong lớp/môn này. Biểu mẫu chuyển về sự kiện độc lập an toàn.</p>}<form className="ti-form" onSubmit={submit}><label className="ti-field">Lớp · môn<select value={subjectId} onChange={event => { setSubjectId(event.target.value); setTarget('') }}>{assignedSubjects.map(item => <option key={item.id} value={item.id}>{subjectLabel(item.id)}</option>)}</select></label><label className="ti-field">Nội dung liên kết (không bắt buộc)<select value={target} onChange={event => setTarget(event.target.value)}><option value="">Sự kiện độc lập</option>{options.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><div className="ti-form-grid"><label className="ti-field">Tiêu đề<input required maxLength={180} value={title} onChange={event => setTitle(event.target.value)} /></label><label className="ti-field">Loại sự kiện<select value={type} onChange={event => setType(event.target.value)}>{['Chuẩn bị bài','Kiểm tra','Ôn tập','Khác'].map(item => <option key={item}>{item}</option>)}</select></label></div><label className="ti-field">Ngày và giờ<input required type="datetime-local" min={minCalendarDateTime} max={maxCalendarDateTime} value={dateTime} onChange={event => setDateTime(event.target.value)} /></label><label className="ti-field">Nội dung / yêu cầu chuẩn bị<textarea required value={details} onChange={event => setDetails(event.target.value)} /></label><p>{immediate ? 'Trong luồng công bố hoạt động này, hệ thống tương lai dùng một thông báo gộp dẫn tới sự kiện và hoạt động, không gửi thêm thông báo thứ hai.' : 'Khi công bố riêng sự kiện, hệ thống tương lai tạo một thông báo được giữ trong hộp thông báo học sinh.'} Không nhắc lại tự động. Chưa gửi thông báo thật.</p><div className="ti-actions"><button type="submit" className="ti-button primary">Thêm vào lịch xem trước</button><button type="button" className="ti-button" onClick={onCancel}>Hủy tạo lịch</button></div><p className="ti-muted">Bản xem trước sự kiện được giữ khi chuyển màn trong phiên này; tải lại sẽ về dữ liệu mẫu. Hủy lịch không ảnh hưởng bài học/hoạt động đã công bố mẫu.</p>{error && <p role="alert" className="ti-error">{error}</p>}</form></section>
}
