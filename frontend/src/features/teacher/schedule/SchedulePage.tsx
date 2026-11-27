import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Archive, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherActivitiesApi } from '../../../lib/api/teacher/activities'
import { teacherCalendarApi, type TeacherCalendarEvent, type TeacherCalendarEventInput } from '../../../lib/api/teacher/calendar'
import { teacherLessonsApi } from '../../../lib/api/teacher/lessons'
import type { TeacherClassroomStatus, TeacherClassroomSummary, TeacherAssignedSubject } from '../../../lib/api/teacher/types'
import { teacherWorkspaceApi, teacherWorkspacePath } from '../../../lib/api/teacher/workspace'
import { CalendarEventDialog, type CalendarLinkOption } from './CalendarEventDialog'
import { clearCalendarCreatePrefill, getCalendarCreatePrefill } from './calendarPrefill'
import { eventTypeLabel } from './calendarEventType'
import { calendarLocalDay, getCalendarMonth, monthCells, monthRange } from './calendarDate'
import './schedule.css'

type SubjectOption = TeacherAssignedSubject & { classroomName: string; classroomStatus: TeacherClassroomStatus }
type DialogState = {
  mode: 'create' | 'edit'
  event?: TeacherCalendarEvent
  classroomSubjectId: string
  initialTitle?: string
  initialDetails?: string
  initialEventType?: string
  initialStartsAt?: string
  initialLessonId?: string
  initialActivityId?: string
} | null

function monthLabel(month: string): string {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
}

const eventDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function eventDateLabel(value: string): string {
  return eventDateFormatter.format(new Date(value))
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Bạn không còn quyền truy cập lịch của môn này.'
    if (error.status === 404) return 'Không tìm thấy sự kiện lịch.'
    if (error.status === 409) return 'Dữ liệu lịch vừa thay đổi. Hãy tải lại rồi kiểm tra trước khi lưu lại.'
    return error.message
  }
  return 'Không thể tải lịch. Hãy thử lại.'
}

export function SchedulePage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const [classrooms, setClassrooms] = useState<TeacherClassroomSummary[]>([])
  const [events, setEvents] = useState<TeacherCalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [linkLessons, setLinkLessons] = useState<CalendarLinkOption[]>([])
  const [linkActivities, setLinkActivities] = useState<CalendarLinkOption[]>([])
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)
  const consumedCreatePrefillRef = useRef('')

  const rawMonth = params.get('month') ?? ''
  const month = getCalendarMonth(rawMonth)
  const requestedClassroomId = params.get('classroomId') ?? ''
  const requestedSubjectId = params.get('classroomSubjectId') ?? ''

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    teacherWorkspaceApi.listClassrooms()
      .then((items) => {
        if (!cancelled) setClassrooms(items)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoadingEvents(true)
    const range = monthRange(month)
    teacherCalendarApi.list({ ...range, classroomId: requestedClassroomId || undefined })
      .then((items) => {
        if (!cancelled) {
          setEvents(items)
          setLoadError('')
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setEvents([])
          setLoadError(errorMessage(error))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingEvents(false)
      })
    return () => { cancelled = true }
  }, [month, requestedClassroomId, reloadKey])

  const subjectOptions = useMemo<SubjectOption[]>(() => classrooms.flatMap((classroom) => classroom.subjects.map((subject) => ({ ...subject, classroomName: classroom.name, classroomStatus: classroom.status }))), [classrooms])
  const validClassroomId = classrooms.some((classroom) => classroom.id === requestedClassroomId) ? requestedClassroomId : ''
  const validSubjectId = subjectOptions.some((subject) => subject.id === requestedSubjectId && (!validClassroomId || subject.classroomId === validClassroomId)) ? requestedSubjectId : ''
  const selectedSubject = subjectOptions.find((subject) => subject.id === validSubjectId)
  const selectedClassroom = classrooms.find((classroom) => classroom.id === validClassroomId)
  const isReadOnlyFilter = selectedClassroom?.status === 'ARCHIVED' || selectedSubject?.classroomStatus === 'ARCHIVED'
  const filteredEvents = events.filter((event) => !validSubjectId || event.classroomSubjectId === validSubjectId)
  const selectedDay = params.get('day')?.startsWith(`${month}-`) ? params.get('day') ?? '' : ''
  const selectedEvent = filteredEvents.find((event) => event.id === params.get('eventId'))
  const selectedDayEvents = filteredEvents.filter((event) => calendarLocalDay(event.startsAt) === selectedDay)
  const selectedArchived = selectedEvent ? subjectOptions.find((subject) => subject.id === selectedEvent.classroomSubjectId)?.classroomStatus === 'ARCHIVED' : false

  const updateQuery = useCallback((values: Record<string, string>) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
      return next
    }, { state: location.state })
  }, [location.state, setParams])

  function moveMonth(amount: number) {
    const date = new Date(`${month}-01T12:00:00`)
    date.setMonth(date.getMonth() + amount)
    if (date.getFullYear() < 1900 || date.getFullYear() > 2100) return
    updateQuery({ month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, day: '', eventId: '' })
  }

  const loadLinks = useCallback(async (classroomSubjectId: string) => {
    setIsLoadingLinks(true)
    try {
      const [lessons, activities] = await Promise.all([
        teacherLessonsApi.list(classroomSubjectId),
        teacherActivitiesApi.list(classroomSubjectId).catch(() => []),
      ])
      setLinkLessons(lessons.filter((lesson) => lesson.status === 'PUBLISHED').map((lesson) => ({ id: lesson.id, title: lesson.title })))
      setLinkActivities(activities.filter((activity) => activity.kind === 'EXERCISE').map((activity) => ({ id: activity.id, title: activity.title })))
    } catch {
      setLinkLessons([])
      setLinkActivities([])
    } finally {
      setIsLoadingLinks(false)
    }
  }, [])

  function openCreate() {
    const initialSubject = selectedSubject?.classroomStatus === 'ACTIVE'
      ? selectedSubject.id
      : subjectOptions.find((subject) => subject.classroomStatus === 'ACTIVE')?.id || ''
    if (!initialSubject) return
    setNotice('')
    setDialog({
      mode: 'create',
      classroomSubjectId: initialSubject,
      initialStartsAt: selectedDay ? `${selectedDay}T08:00:00` : undefined,
    })
    void loadLinks(initialSubject)
  }

  function openEdit(event: TeacherCalendarEvent) {
    setNotice('')
    setDialog({ mode: 'edit', event, classroomSubjectId: event.classroomSubjectId })
    void loadLinks(event.classroomSubjectId)
  }

  useEffect(() => {
    const prefill = getCalendarCreatePrefill(params)
    if (!prefill || subjectOptions.length === 0) return
    const prefillKey = params.toString()
    if (consumedCreatePrefillRef.current === prefillKey) return
    consumedCreatePrefillRef.current = prefillKey
    setParams(clearCalendarCreatePrefill(params), { replace: true, state: location.state })
    const requestedSubject = subjectOptions.find((subject) => subject.id === prefill.classroomSubjectId)
    if (requestedSubject && requestedSubject.classroomStatus !== 'ACTIVE') {
      setNotice('Lớp đã lưu trữ nên lịch chỉ xem; không thể tạo sự kiện mới.')
      return
    }
    const initialSubject = requestedSubject?.classroomStatus === 'ACTIVE'
      ? requestedSubject.id
      : subjectOptions.find((subject) => subject.classroomStatus === 'ACTIVE')?.id ?? ''
    if (!initialSubject) return
    setDialog({
      mode: 'create',
      classroomSubjectId: initialSubject,
      initialTitle: prefill.title,
      initialDetails: prefill.details,
      initialEventType: prefill.eventType,
      initialStartsAt: prefill.startsAt,
      initialLessonId: prefill.lessonId || undefined,
      initialActivityId: prefill.activityId || undefined,
    })
    void loadLinks(initialSubject)
  }, [loadLinks, location.state, params, setParams, subjectOptions])

  async function handleSave(classroomSubjectId: string, input: TeacherCalendarEventInput) {
    setIsSaving(true)
    try {
      if (dialog?.mode === 'edit' && dialog.event) {
        await teacherCalendarApi.update(dialog.event.id, input)
        setNotice('Đã cập nhật sự kiện lịch.')
      } else {
        const created = await teacherCalendarApi.create(classroomSubjectId, input)
        setNotice('Đã tạo bản nháp sự kiện. Hãy công bố khi sẵn sàng.')
        updateQuery({ classroomSubjectId, classroomId: subjectOptions.find((subject) => subject.id === classroomSubjectId)?.classroomId ?? '', month: created.startsAt.slice(0, 7), day: created.startsAt.slice(0, 10), eventId: created.id })
      }
      setDialog(null)
      setReloadKey((value) => value + 1)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setNotice('Dữ liệu lịch vừa thay đổi. Đã tải lại danh sách; hãy kiểm tra lại sự kiện trước khi lưu tiếp.')
        setReloadKey((value) => value + 1)
      }
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  async function publishEvent(event: TeacherCalendarEvent) {
    setIsSaving(true)
    try {
      await teacherCalendarApi.publish(event.id)
      setNotice('Đã công bố sự kiện và gửi thông báo đến lớp.')
      setReloadKey((value) => value + 1)
    } catch (error) {
      setLoadError(errorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteEvent(event: TeacherCalendarEvent) {
    if (!window.confirm(`Xóa sự kiện “${event.title}”? Bài học hoặc hoạt động liên kết vẫn được giữ nguyên.`)) return
    setIsSaving(true)
    try {
      await teacherCalendarApi.remove(event.id)
      updateQuery({ eventId: '' })
      setNotice('Đã xóa sự kiện lịch.')
      setReloadKey((value) => value + 1)
    } catch (error) {
      setLoadError(errorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="page-content tc-page"><p>Đang tải danh sách lớp...</p></div>

  return (
    <div className="page-content tc-page">
      <div className="page-heading tc-calendar-heading"><span className="section-kicker">LỊCH</span><h1>Lịch giảng dạy</h1><p>Lịch tháng tổng hợp các lớp và môn được phân công.</p></div>
      {loadError && <div className="ti-error" role="alert"><AlertCircle size={15} /> {loadError}<button type="button" className="tl-text-button" onClick={() => setReloadKey((value) => value + 1)}><RotateCcw size={14} /> Thử lại</button></div>}
      {notice && <p className="ti-success" role="status">{notice}</p>}
      <div className="tc-toolbar">
        <label><span>Lớp</span><select aria-label="Lọc theo lớp" value={validClassroomId} onChange={(event) => updateQuery({ classroomId: event.target.value, classroomSubjectId: '', day: '', eventId: '' })}><option value="">Tất cả lớp</option>{classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}{classroom.status === 'ARCHIVED' ? ' · Lưu trữ' : ''}</option>)}</select></label>
        <label><span>Môn trong lớp</span><select aria-label="Lọc theo môn trong lớp" value={validSubjectId} onChange={(event) => updateQuery({ classroomSubjectId: event.target.value, day: '', eventId: '' })}><option value="">Tất cả môn được phân công</option>{subjectOptions.filter((subject) => !validClassroomId || subject.classroomId === validClassroomId).map((subject) => <option key={subject.id} value={subject.id}>{subject.classroomName} · {subject.name}</option>)}</select></label>
        <button className="ti-button primary tc-create-action" type="button" onClick={openCreate} disabled={isReadOnlyFilter || !subjectOptions.some((subject) => subject.classroomStatus === 'ACTIVE')}><Plus size={16} /> Thêm sự kiện</button>
      </div>
      <section className="ti-card ti-margin-top tc-calendar-card"><div className="tc-month-heading"><button type="button" className="ti-button tc-month-control" aria-label="Tháng trước" onClick={() => moveMonth(-1)}><ChevronLeft size={18} /></button><h2>{monthLabel(month)}</h2><button type="button" className="ti-button tc-month-control" aria-label="Tháng sau" onClick={() => moveMonth(1)}><ChevronRight size={18} /></button></div><p className="ti-muted">{isLoadingEvents ? 'Đang tải sự kiện...' : `${filteredEvents.length} sự kiện`}</p><div className="tc-month" aria-label={`Lịch ${monthLabel(month)}`}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => <div className="tc-weekday" key={label}>{label}</div>)}{monthCells(month).map((date, index) => { const dayEvents = filteredEvents.filter((event) => calendarLocalDay(event.startsAt) === date); return date ? <button key={date} type="button" aria-pressed={selectedDay === date} aria-label={`${date}, ${dayEvents.length} sự kiện`} className={`tc-day ${selectedDay === date ? 'selected' : ''}`} onClick={() => updateQuery({ day: date, eventId: dayEvents[0]?.id ?? '' })}><span>{Number(date.slice(-2))}</span>{dayEvents.length > 0 && <><span className="tc-count">{dayEvents.length}<span className="tc-count-text"> sự kiện</span></span><span className="tc-day-summary">{dayEvents.map((event) => event.subjectName).join(' / ')}</span></>}</button> : <div className="tc-day blank" key={`blank-${index}`} /> })}</div>{!isLoadingEvents && !filteredEvents.length && <div className="tc-empty"><CalendarDays size={30} /><h2>Tháng này chưa có sự kiện</h2><p>Chọn ngày để xem hoặc tạo sự kiện khi cần.</p></div>}</section>
      <div className="ti-grid ti-margin-top tc-detail-grid">
        <section className="ti-card tc-day-spotlight"><div className="tc-panel-heading"><div><h2>{selectedDay ? `Ngày ${selectedDay.split('-').reverse().join('/')}` : 'Sự kiện trong tháng'}</h2><p>{selectedDay ? `${selectedDayEvents.length} sự kiện trong ngày` : `${filteredEvents.length} sự kiện trong tháng`}</p></div></div>{(selectedDay ? selectedDayEvents : filteredEvents).map((event) => <button type="button" key={event.id} className={`ti-list-button ${params.get('eventId') === event.id ? 'active' : ''}`} onClick={() => updateQuery({ eventId: event.id, day: calendarLocalDay(event.startsAt) })}><strong>{event.title}</strong><small>{event.classroomName} · {event.subjectName} · {eventDateLabel(event.startsAt)}</small></button>)}{selectedDay && !selectedDayEvents.length && <div className="tc-day-empty"><CalendarDays size={24} /><p>Ngày này chưa có sự kiện.</p></div>}</section>
        <section className="ti-card tc-event-ticket"><div className="tc-ticket-heading"><h2>Chi tiết sự kiện</h2>{selectedEvent && <span className="ti-chip">{eventTypeLabel(selectedEvent.eventType)} · {selectedEvent.publishedAt ? 'Đã công bố' : 'Bản nháp'}</span>}</div>{selectedEvent ? <div className="tc-event-content"><h3>{selectedEvent.title}</h3><div className="tc-event-meta"><p><CalendarDays size={16} /><span><strong>{selectedEvent.classroomName}</strong><small>{selectedEvent.subjectName}</small></span></p><p><Clock3 size={16} /><span><strong>{eventDateLabel(selectedEvent.startsAt)}</strong></span></p></div>{selectedEvent.details && <div className="tc-details"><span>Ghi chú</span><p>{selectedEvent.details}</p></div>}{selectedEvent.lessonId && <Link className="tc-resource-link" to={`${teacherWorkspacePath(selectedEvent.classroomId, selectedEvent.classroomSubjectId)}/lessons/${selectedEvent.lessonId}`}>Mở bài học liên kết <ArrowUpRight size={15} /></Link>}{selectedEvent.activityId && <Link className="tc-resource-link" to={`${teacherWorkspacePath(selectedEvent.classroomId, selectedEvent.classroomSubjectId)}/activities/${selectedEvent.activityId}`}>Mở hoạt động liên kết <ArrowUpRight size={15} /></Link>}{!selectedArchived ? <div className="tc-ticket-actions">{!selectedEvent.publishedAt && <button type="button" className="ti-button primary" onClick={() => void publishEvent(selectedEvent)} disabled={isSaving}>Công bố</button>}<button type="button" className="ti-button" onClick={() => openEdit(selectedEvent)} disabled={isSaving}><Pencil size={14} /> Sửa</button><button type="button" className="ti-button destructive" onClick={() => void deleteEvent(selectedEvent)} disabled={isSaving}><Trash2 size={14} /> Xóa</button></div> : <p className="ti-muted tc-readonly"><Archive size={14} /> Lớp đã lưu trữ · chỉ xem.</p>}</div> : <div className="tc-event-empty"><CalendarDays size={28} /><p>Chọn một sự kiện để xem chi tiết.</p></div>}</section>
      </div>
      {dialog && <CalendarEventDialog key={dialog.mode === 'edit' ? dialog.event?.id : `create-${dialog.classroomSubjectId}`} event={dialog.event} subjects={subjectOptions.filter((subject) => subject.classroomStatus === 'ACTIVE' || subject.id === dialog.classroomSubjectId)} initialClassroomSubjectId={dialog.classroomSubjectId} initialTitle={dialog.initialTitle ?? params.get('title') ?? ''} initialDetails={dialog.initialDetails} initialEventType={dialog.initialEventType} initialStartsAt={dialog.initialStartsAt} initialLessonId={dialog.initialLessonId} initialActivityId={dialog.initialActivityId} lessons={linkLessons} activities={linkActivities} isLoadingLinks={isLoadingLinks} isSaving={isSaving} onClose={() => setDialog(null)} onSubjectChange={(subjectId) => void loadLinks(subjectId)} onSave={handleSave} />}
    </div>
  )
}
