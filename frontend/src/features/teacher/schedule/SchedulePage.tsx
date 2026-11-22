import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Archive, CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherActivitiesApi } from '../../../lib/api/teacher/activities'
import { teacherCalendarApi, type TeacherCalendarEvent, type TeacherCalendarEventInput } from '../../../lib/api/teacher/calendar'
import { teacherLessonsApi } from '../../../lib/api/teacher/lessons'
import type { TeacherClassroomStatus, TeacherClassroomSummary, TeacherAssignedSubject } from '../../../lib/api/teacher/types'
import { teacherWorkspaceApi, teacherWorkspacePath } from '../../../lib/api/teacher/workspace'
import { TeacherBackButton } from '../components/TeacherBackButton'
import { CalendarEventDialog, type CalendarLinkOption } from './CalendarEventDialog'
import { getCalendarCreatePrefill } from './calendarPrefill'
import { eventTypeLabel } from './calendarEventType'
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

function monthCells(month: string): string[] {
  const [year, number] = month.split('-').map(Number)
  const offset = (new Date(year, number - 1, 1).getDay() + 6) % 7
  const days = new Date(year, number, 0).getDate()
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    if (index < offset || index >= offset + days) return ''
    return `${month}-${String(index - offset + 1).padStart(2, '0')}`
  })
}

function monthRange(month: string): { from: string; to: string } {
  const [year, number] = month.split('-').map(Number)
  return {
    from: new Date(Date.UTC(year, number - 1, 1, 0, 0, 0)).toISOString(),
    to: new Date(Date.UTC(year, number, 0, 23, 59, 59, 999)).toISOString(),
  }
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
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) && Number(rawMonth.slice(0, 4)) >= 1900 && Number(rawMonth.slice(0, 4)) <= 2100 ? rawMonth : '2026-11'
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
  const selectedDayEvents = filteredEvents.filter((event) => event.startsAt.slice(0, 10) === selectedDay)
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
    setDialog({ mode: 'create', classroomSubjectId: initialSubject })
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
  }, [loadLinks, params, subjectOptions])

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
      setNotice('Đã công bố sự kiện và tạo thông báo theo backend.')
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
      <TeacherBackButton fallbackTo="/teacher/classes" />
      <div className="page-heading"><span className="section-kicker">LỊCH</span><h1>Lịch giảng dạy</h1><p>Lịch tháng tổng hợp các lớp và môn được phân công.</p></div>
      {loadError && <div className="ti-error" role="alert"><AlertCircle size={15} /> {loadError}<button type="button" className="tl-text-button" onClick={() => setReloadKey((value) => value + 1)}><RotateCcw size={14} /> Thử lại</button></div>}
      {notice && <p className="ti-success" role="status">{notice}</p>}
      <div className="tc-toolbar"><label>Lớp<select value={validClassroomId} onChange={(event) => updateQuery({ classroomId: event.target.value, classroomSubjectId: '', day: '', eventId: '' })}><option value="">Tất cả lớp</option>{classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}{classroom.status === 'ARCHIVED' ? ' · Lưu trữ' : ''}</option>)}</select></label><label>Môn trong lớp<select value={validSubjectId} onChange={(event) => updateQuery({ classroomSubjectId: event.target.value, day: '', eventId: '' })}><option value="">Tất cả môn được phân công</option>{subjectOptions.filter((subject) => !validClassroomId || subject.classroomId === validClassroomId).map((subject) => <option key={subject.id} value={subject.id}>{subject.classroomName} · {subject.name}</option>)}</select></label><button className="ti-button primary" type="button" onClick={openCreate} disabled={isReadOnlyFilter || !subjectOptions.some((subject) => subject.classroomStatus === 'ACTIVE')}><Plus size={16} /> Thêm sự kiện</button></div>
      <section className="ti-card ti-margin-top"><div className="tc-month-heading"><button type="button" className="ti-button" aria-label="Tháng trước" onClick={() => moveMonth(-1)}><ChevronLeft size={18} /></button><h2>{monthLabel(month)}</h2><button type="button" className="ti-button" aria-label="Tháng sau" onClick={() => moveMonth(1)}><ChevronRight size={18} /></button></div><p className="ti-muted">{isLoadingEvents ? 'Đang tải sự kiện...' : `${filteredEvents.length} sự kiện · Chọn ngày để xem chi tiết.`}</p><div className="tc-month" aria-label={`Lịch ${monthLabel(month)}`}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => <div className="tc-weekday" key={label}>{label}</div>)}{monthCells(month).map((date, index) => { const dayEvents = filteredEvents.filter((event) => event.startsAt.slice(0, 10) === date); return date ? <button key={date} type="button" aria-pressed={selectedDay === date} aria-label={`${date}, ${dayEvents.length} sự kiện`} className={`tc-day ${selectedDay === date ? 'selected' : ''}`} onClick={() => updateQuery({ day: date, eventId: dayEvents[0]?.id ?? '' })}><span>{Number(date.slice(-2))}</span>{dayEvents.length > 0 && <><span className="tc-count">{dayEvents.length}<span className="tc-count-text"> sự kiện</span></span><span className="tc-day-summary">{dayEvents.map((event) => event.subjectName).join(' / ')}</span></>}</button> : <div className="tc-day blank" key={`blank-${index}`} /> })}</div>{!isLoadingEvents && !filteredEvents.length && <div className="tc-empty"><CalendarDays size={28} /><h2>Tháng này chưa có sự kiện</h2><p>Đổi tháng, điều chỉnh bộ lọc hoặc thêm sự kiện mới.</p></div>}</section>
      <div className="ti-grid ti-margin-top"><section className="ti-card"><h2>{selectedDay ? `Ngày ${selectedDay.split('-').reverse().join('/')}` : 'Sự kiện trong tháng'}</h2>{(selectedDay ? selectedDayEvents : filteredEvents).map((event) => <button type="button" key={event.id} className={`ti-list-button ${params.get('eventId') === event.id ? 'active' : ''}`} onClick={() => updateQuery({ eventId: event.id, day: event.startsAt.slice(0, 10) })}><strong>{event.title}</strong><small>{event.classroomName} · {event.subjectName} · {new Date(event.startsAt).toLocaleString('vi-VN')}</small></button>)}{selectedDay && !selectedDayEvents.length && <p>Ngày này chưa có sự kiện.</p>}</section><section className="ti-card"><h2>Chi tiết sự kiện</h2>{selectedEvent ? <><span className="ti-chip">{eventTypeLabel(selectedEvent.eventType)} · {selectedEvent.publishedAt ? 'Đã công bố' : 'Bản nháp'}</span><h3>{selectedEvent.title}</h3><p><strong>{selectedEvent.classroomName} · {selectedEvent.subjectName}</strong></p><p>{new Date(selectedEvent.startsAt).toLocaleString('vi-VN')}</p><p className="tc-details">{selectedEvent.details}</p>{!selectedArchived ? <div className="ti-actions"><button type="button" className="ti-button" onClick={() => openEdit(selectedEvent)} disabled={isSaving}><Pencil size={14} /> Sửa</button>{!selectedEvent.publishedAt && <button type="button" className="ti-button primary" onClick={() => void publishEvent(selectedEvent)} disabled={isSaving}>Công bố</button>}<button type="button" className="ti-button" onClick={() => void deleteEvent(selectedEvent)} disabled={isSaving} style={{ color: '#b91c1c', borderColor: '#fca5a5' }}><Trash2 size={14} /> Xóa</button></div> : <p className="ti-muted"><Archive size={14} /> Lớp đã lưu trữ · chỉ xem.</p>}{selectedEvent.lessonId && <Link className="ti-button" to={`${teacherWorkspacePath(selectedEvent.classroomId, selectedEvent.classroomSubjectId)}/lessons/${selectedEvent.lessonId}`}>Mở bài học liên kết</Link>}{selectedEvent.activityId && <Link className="ti-button" to={`${teacherWorkspacePath(selectedEvent.classroomId, selectedEvent.classroomSubjectId)}/activities/${selectedEvent.activityId}`}>Mở hoạt động liên kết</Link>}</> : <p>Chọn một sự kiện để xem chi tiết.</p>}</section></div>
      {dialog && <CalendarEventDialog key={dialog.mode === 'edit' ? dialog.event?.id : `create-${dialog.classroomSubjectId}`} event={dialog.event} subjects={subjectOptions.filter((subject) => subject.classroomStatus === 'ACTIVE' || subject.id === dialog.classroomSubjectId)} initialClassroomSubjectId={dialog.classroomSubjectId} initialTitle={dialog.initialTitle ?? params.get('title') ?? ''} initialDetails={dialog.initialDetails} initialEventType={dialog.initialEventType} initialStartsAt={dialog.initialStartsAt} initialLessonId={dialog.initialLessonId} initialActivityId={dialog.initialActivityId} lessons={linkLessons} activities={linkActivities} isLoadingLinks={isLoadingLinks} isSaving={isSaving} onClose={() => setDialog(null)} onSubjectChange={(subjectId) => void loadLinks(subjectId)} onSave={handleSave} />}
    </div>
  )
}
