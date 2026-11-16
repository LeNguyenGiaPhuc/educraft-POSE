import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { TeacherCalendarEvent, TeacherCalendarEventInput } from '../../../lib/api/teacher/calendar'
import type { TeacherAssignedSubject } from '../../../lib/api/teacher/types'
import { isCalendarDateTime, maxCalendarDateTime, minCalendarDateTime } from './calendarDate'
import './schedule.css'

export type CalendarLinkOption = { id: string; title: string }

type Props = {
  event?: TeacherCalendarEvent
  subjects: TeacherAssignedSubject[]
  initialClassroomSubjectId: string
  initialTitle?: string
  lessons: CalendarLinkOption[]
  activities: CalendarLinkOption[]
  isLoadingLinks: boolean
  isSaving: boolean
  onClose: () => void
  onSubjectChange: (classroomSubjectId: string) => void
  onSave: (classroomSubjectId: string, input: TeacherCalendarEventInput) => Promise<void>
}

function toDateTimeLocal(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function CalendarEventDialog({
  event,
  subjects,
  initialClassroomSubjectId,
  initialTitle,
  lessons,
  activities,
  isLoadingLinks,
  isSaving,
  onClose,
  onSubjectChange,
  onSave,
}: Props) {
  const [classroomSubjectId, setClassroomSubjectId] = useState(event?.classroomSubjectId ?? initialClassroomSubjectId)
  const [title, setTitle] = useState(event?.title ?? initialTitle ?? '')
  const [details, setDetails] = useState(event?.details ?? '')
  const [eventType, setEventType] = useState(event?.eventType ?? 'LESSON')
  const [startsAt, setStartsAt] = useState(toDateTimeLocal(event?.startsAt))
  const [link, setLink] = useState(event?.lessonId ? `lesson:${event.lessonId}` : event?.activityId ? `activity:${event.activityId}` : '')
  const [error, setError] = useState('')

  function handleSubjectChange(value: string) {
    setClassroomSubjectId(value)
    setLink('')
    setError('')
    onSubjectChange(value)
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (!classroomSubjectId || !title.trim() || !details.trim() || !isCalendarDateTime(startsAt)) {
      setError('Nhập lớp/môn, tiêu đề, nội dung và thời gian hợp lệ trong khoảng 1900–2100.')
      return
    }

    const separator = link.indexOf(':')
    const linkKind = separator > 0 ? link.slice(0, separator) : ''
    const linkId = separator > 0 ? link.slice(separator + 1) : ''
    if (linkKind === 'lesson' && !lessons.some((item) => item.id === linkId)) {
      setError('Bài học liên kết không thuộc môn đang chọn.')
      return
    }
    if (linkKind === 'activity' && !activities.some((item) => item.id === linkId)) {
      setError('Hoạt động liên kết không thuộc môn đang chọn.')
      return
    }

    setError('')
    const input: TeacherCalendarEventInput = {
      title: title.trim(),
      details: details.trim(),
      eventType: eventType.trim() || 'LESSON',
      startsAt: new Date(startsAt).toISOString(),
      lessonId: linkKind === 'lesson' ? linkId : null,
      activityId: linkKind === 'activity' ? linkId : null,
    }

    try {
      await onSave(classroomSubjectId, input)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu sự kiện lịch.')
    }
  }

  return (
    <dialog open className="tc-modal-overlay" aria-labelledby="calendar-event-dialog-title" onCancel={(event) => { event.preventDefault(); if (!isSaving) onClose() }}>
      <div className="tc-modal-window">
        <div className="tc-modal-header">
          <div><span className="tc-modal-eyebrow">LỊCH SỰ KIỆN</span><h2 id="calendar-event-dialog-title" className="tc-modal-title">{event ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}</h2></div>
          <button type="button" className="tc-modal-close" onClick={onClose} disabled={isSaving} aria-label="Đóng"><X size={18} /></button>
        </div>
        <form className="ti-form" onSubmit={handleSubmit}>
          <div className="tc-modal-body">
            <label className="ti-field">Lớp · môn<select value={classroomSubjectId} onChange={(formEvent) => handleSubjectChange(formEvent.target.value)} disabled={Boolean(event) || isSaving}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
            <label className="ti-field">Nội dung liên kết (không bắt buộc)<select value={link} onChange={(formEvent) => setLink(formEvent.target.value)} disabled={isSaving || isLoadingLinks}><option value="">Sự kiện độc lập</option>{lessons.map((item) => <option key={`lesson:${item.id}`} value={`lesson:${item.id}`}>Bài học: {item.title}</option>)}{activities.map((item) => <option key={`activity:${item.id}`} value={`activity:${item.id}`}>Hoạt động: {item.title}</option>)}</select>{isLoadingLinks && <small>Đang tải nội dung đã công bố...</small>}</label>
            <div className="ti-form-grid"><label className="ti-field">Tiêu đề<input required maxLength={250} value={title} onChange={(formEvent) => setTitle(formEvent.target.value)} disabled={isSaving} /></label><label className="ti-field">Loại sự kiện<input maxLength={80} value={eventType} onChange={(formEvent) => setEventType(formEvent.target.value)} disabled={isSaving} /></label></div>
            <label className="ti-field">Ngày và giờ<input required type="datetime-local" min={minCalendarDateTime} max={maxCalendarDateTime} value={startsAt} onChange={(formEvent) => setStartsAt(formEvent.target.value)} disabled={isSaving} /></label>
            <label className="ti-field">Nội dung / yêu cầu chuẩn bị<textarea required value={details} onChange={(formEvent) => setDetails(formEvent.target.value)} disabled={isSaving} /></label>
            {error && <p className="ti-error" role="alert">{error}</p>}
          </div>
          <div className="ti-actions"><button type="submit" className="ti-button primary" disabled={isSaving}>{isSaving ? 'Đang lưu...' : event ? 'Lưu thay đổi' : 'Tạo bản nháp'}</button><button type="button" className="ti-button" onClick={onClose} disabled={isSaving}>Hủy</button></div>
        </form>
      </div>
    </dialog>
  )
}
