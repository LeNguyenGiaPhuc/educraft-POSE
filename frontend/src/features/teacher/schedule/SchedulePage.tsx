import { useState, type FormEvent } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { assignedSubjects, scheduleItems } from '../insights/fixtures'
import { EmptyState, PreviewNotice, SubjectPicker, TeacherHeading } from '../insights/TeacherUI'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
const dateLabel = (value: string) => dateFormatter.format(new Date(value))

export function SchedulePage() {
  const [subjectId, setSubjectId] = useState('history-11a2')
  const [selectedId, setSelectedId] = useState('event-1')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Kiểm tra')
  const [dateTime, setDateTime] = useState('')
  const [details, setDetails] = useState('')
  const [message, setMessage] = useState('')
  const events = scheduleItems.filter((item) => item.subjectId === subjectId)
  const selected = events.find((item) => item.id === selectedId) ?? events[0]
  const subject = assignedSubjects.find((item) => item.id === subjectId)!

  function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !dateTime || !details.trim()) { setMessage('Nhập tiêu đề, thời gian và nội dung trước khi xem trước.'); return }
    if (new Date(dateTime).getTime() <= Date.now()) { setMessage('Thời gian sự kiện phải ở tương lai.'); return }
    setMessage(`Xem trước: “${title.trim()}” — ${dateLabel(dateTime)}. Chưa công bố hoặc tạo thông báo.`)
  }

  return <div className="page-content">
    <TeacherHeading title="Lịch môn học" description="Công bố lịch theo môn được phân công. Học sinh thấy sự kiện trên lịch và nhận một thông báo khi giáo viên công bố." />
    <PreviewNotice>Sự kiện và thông báo dưới đây là dữ liệu mẫu. Không có nhắc nhở tự động lặp lại.</PreviewNotice>
    <div className="ti-heading"><SubjectPicker value={subjectId} onChange={(id) => { setSubjectId(id); setSelectedId(''); setMessage('') }} /><button className="ti-button primary" type="button" onClick={() => { setShowForm(!showForm); setMessage('') }}><Plus size={15} /> {showForm ? 'Đóng biểu mẫu' : 'Thêm sự kiện'}</button></div>
    {showForm && <section className="ti-card ti-margin-top"><h2>Tạo sự kiện · {subject.classroom} {subject.subject}</h2><form className="ti-form" onSubmit={preview}><div className="ti-form-grid"><label className="ti-field">Tiêu đề<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Kiểm tra bài 2" /></label><label className="ti-field">Loại sự kiện<select value={type} onChange={(event) => setType(event.target.value)}><option>Kiểm tra</option><option>Ôn tập</option><option>Chuẩn bị bài</option><option>Khác</option></select></label></div><label className="ti-field">Ngày và giờ bắt đầu<input type="datetime-local" value={dateTime} onChange={(event) => setDateTime(event.target.value)} /></label><label className="ti-field">Nội dung cụ thể<textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Học sinh cần chuẩn bị gì?" /></label><div className="ti-actions"><button className="ti-button primary" type="submit">Xem trước khi công bố</button><button className="ti-button" type="button" disabled title="Cần kết nối API để công bố">Công bố · chưa kết nối</button></div>{message && <p className={message.startsWith('Xem trước') ? 'ti-success' : 'ti-error'} role="status">{message}</p>}</form></section>}
    <div className="ti-grid ti-margin-top"><section className="ti-card"><h2>Sự kiện đã công bố</h2>{events.length ? events.map((event) => <button className={`ti-list-button ${selected?.id === event.id ? 'active' : ''}`} key={event.id} type="button" onClick={() => setSelectedId(event.id)}><strong>{event.title}</strong><small>{dateLabel(event.startsAt)} · {event.type}</small></button>) : <EmptyState title="Chưa có sự kiện" detail="Khi giáo viên công bố, sự kiện sẽ xuất hiện trên lịch học sinh." />}</section><section className="ti-card"><h2>Chi tiết sự kiện</h2>{selected ? <><span className="ti-chip">{selected.type}</span><h3 className="ti-margin-top">{selected.title}</h3><div className="ti-detail-list"><div><strong>Thời gian</strong>{dateLabel(selected.startsAt)}</div><div><strong>Lớp · môn</strong>{subject.classroom} · {subject.subject}</div><div><strong>Nội dung</strong>{selected.details}</div><div><strong>Thông báo</strong>Một thông báo được giữ trong hộp thông báo học sinh từ lúc công bố.</div></div><hr className="ti-separator" /><div className="ti-actions"><button className="ti-button" disabled title="Cần kết nối API để sửa">Sửa · chưa kết nối</button><button className="ti-button" disabled title="Cần kết nối API để hủy">Hủy · chưa kết nối</button></div></> : <EmptyState title="Chọn một sự kiện" detail="Chi tiết sẽ hiển thị ở đây." />}</section></div>
    <div className="ti-card ti-margin-top"><h2><CalendarDays size={17} /> Tháng 11 · 2026</h2><div className="ti-row"><span className="ti-muted">Các ngày có sự kiện của {subject.classroom} · {subject.subject}</span><span className="ti-chip neutral">{events.length} sự kiện</span></div><div className="ti-actions ti-margin-top">{events.map((event) => <button key={event.id} type="button" className="ti-button" onClick={() => setSelectedId(event.id)}>{new Date(event.startsAt).getDate()}/11 · {event.title}</button>)}</div></div>
  </div>
}
