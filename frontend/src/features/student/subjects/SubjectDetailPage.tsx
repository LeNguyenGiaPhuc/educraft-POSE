import { ArrowLeft, ArrowRight, BookOpen, ClipboardList, MessageCircle, Sparkles } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import type { StudentWorkspace } from '../../../api/client'
import { useApiData } from '../../../api/useApiData'
import '../student.css'
import './subjects.css'

export function SubjectDetailPage() {
  const { subjectId } = useParams()
  const { data, loading, error } = useApiData<StudentWorkspace>('/student/workspace')
  if (loading) return <div className="page-content student-page"><p role="status">Đang tải môn học…</p></div>
  if (error) return <div className="page-content student-page"><section className="panel student-empty" role="alert"><h2>Không tải được môn học</h2><p>{error}</p></section></div>
  if (!data) return null

  const historicMemberships = data.history
  const subject = data.current?.subjects.find((item) => item.id === subjectId)
    ?? historicMemberships.flatMap((membership) => membership.subjects).find((item) => item.id === subjectId)
  const historical = Boolean(subject && historicMemberships.some((membership) => membership.subjects.some((item) => item.id === subject.id)))
  if (!subject) return <Navigate to="/student/subjects" replace />
  const membership = historical ? historicMemberships.find((item) => item.subjects.some((entry) => entry.id === subject.id)) : data.current
  const lessons = subject.lessons
  const query = historical ? '?class=history' : ''
  const classroomName = membership?.classroom.name ?? ''

  return <div className="page-content student-page subject-detail-page">
    <Link className="student-back-link" to={`/student/subjects${query}`}><ArrowLeft size={16} /> Về danh sách môn học</Link>
    <header className="page-heading"><span className="eyebrow"><span className="eyebrow-line" />{subject.name.toUpperCase()} · LỚP {classroomName}</span><h1>{subject.name}</h1><p>{subject.teacher?.name ?? 'Chưa phân công giáo viên'} · {membership?.classroom.academicYear}{historical ? ' · Lớp đã học, chỉ xem lại' : ''}</p></header>
    <section className="panel subject-lessons-panel"><div className="student-panel-heading"><div><h2>Bài học đã công bố</h2><p>{lessons.length} bài học có thể xem</p></div></div>{lessons.length ? <div className="subject-lesson-rows">{lessons.map((lesson) => <Link to={`/student/lessons/${lesson.id}${query}`} key={lesson.id}><span className="subject-icon"><BookOpen size={18} /></span><span><strong>{lesson.title}</strong><small>{lesson.materials.length} học liệu đính kèm</small></span><ArrowRight size={17} /></Link>)}</div> : <p className="student-muted">Môn này chưa có bài học được công bố.</p>}</section>
    <div className="subject-actions"><Link to={`/student/activities${query}${query ? '&' : '?'}subject=${subject.id}`}><ClipboardList size={17} /><span><strong>Bài được giao & kết quả</strong><small>Xem công việc trong môn</small></span></Link>{!historical && <Link to={`/student/practice${query}${query ? '&' : '?'}subject=${subject.id}`}><Sparkles size={17} /><span><strong>Tự ôn môn này</strong><small>Tạo phiên luyện tập riêng</small></span></Link>}<Link to={`/student/assistant${query}${query ? '&' : '?'}subject=${subject.id}`}><MessageCircle size={17} /><span><strong>{historical ? 'Xem lịch sử hỏi đáp' : 'Hỏi trợ lý học tập'}</strong><small>{historical ? 'Hội thoại cũ chỉ đọc' : 'Dùng học liệu đã công bố'}</small></span></Link></div>
  </div>
}
