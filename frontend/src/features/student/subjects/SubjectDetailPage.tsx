import { ArrowLeft, ArrowRight, BookOpen, ClipboardList, MessageCircle, Sparkles } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { useStudentScenario } from '../useStudentScenario'
import { getAccessibleSubjects, getVisibleLessons } from '../studentRules'
import '../student.css'
import './subjects.css'

export function SubjectDetailPage() {
  const { subjectId } = useParams()
  const { scenario } = useStudentScenario()
  const { current, historic } = getAccessibleSubjects(scenario)
  const subject = [...current, ...historic].find((item) => item.id === subjectId)
  if (!subject) return <Navigate to={`/student/subjects${scenario === 'current' ? '' : `?scenario=${scenario}`}`} replace />
  const lessons = getVisibleLessons(subject.id)
  const query = scenario === 'current' ? subject.historic ? '?class=history' : '' : `?scenario=${scenario}`

  return <div className="page-content student-page subject-detail-page">
    <Link className="student-back-link" to={`/student/subjects${query}`}><ArrowLeft size={16} /> Về danh sách môn học</Link>
    <header className="page-heading"><span className="eyebrow"><span className="eyebrow-line" />{subject.name.toUpperCase()} · LỚP {subject.classroomName}</span><h1>{subject.name}</h1><p>{subject.teacherName ?? 'Chưa phân công giáo viên'} · {subject.academicYear}{subject.historic ? ' · Lớp đã học, chỉ xem lại' : ''}</p></header>
    <section className="panel subject-lessons-panel"><div className="student-panel-heading"><div><h2>Bài học đã công bố</h2><p>{lessons.length} bài học có thể xem</p></div></div>{lessons.length ? <div className="subject-lesson-rows">{lessons.map((lesson) => <Link to={`/student/lessons/${lesson.id}${query}`} key={lesson.id}><span className="subject-icon"><BookOpen size={18} /></span><span><strong>{lesson.title}</strong><small>{lesson.materials.length} học liệu đính kèm</small></span><ArrowRight size={17} /></Link>)}</div> : <p className="student-muted">Môn này chưa có bài học được công bố.</p>}</section>
    <div className="subject-actions"><Link to={`/student/activities${query}${query ? '&' : '?'}subject=${subject.id}`}><ClipboardList size={17} /><span><strong>Bài được giao & kết quả</strong><small>Xem công việc trong môn</small></span></Link>{!subject.historic && <Link to={`/student/practice${query}${query ? '&' : '?'}subject=${subject.id}`}><Sparkles size={17} /><span><strong>Tự ôn môn này</strong><small>Tạo phiên luyện tập riêng</small></span></Link>}<Link to={`/student/assistant${query}${query ? '&' : '?'}subject=${subject.id}`}><MessageCircle size={17} /><span><strong>{subject.historic ? 'Xem lịch sử hỏi đáp' : 'Hỏi trợ lý học tập'}</strong><small>{subject.historic ? 'Hội thoại cũ chỉ đọc' : 'Dùng học liệu đã công bố'}</small></span></Link></div>
  </div>
}
