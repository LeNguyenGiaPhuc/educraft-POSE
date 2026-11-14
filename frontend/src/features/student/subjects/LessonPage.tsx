import { ArrowLeft, ArrowRight, BookOpen, ClipboardList, FileText, MessageCircle, Sparkles } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { summaryLessons } from '../summary/summary.mock'
import { getAccessibleSubjects, getVisibleLessons } from '../studentRules'
import { useStudentScenario } from '../useStudentScenario'
import '../student.css'
import './subjects.css'

export function LessonPage() {
  const { lessonId } = useParams()
  const { scenario } = useStudentScenario()
  const { current, historic } = getAccessibleSubjects(scenario)
  const subjects = [...current, ...historic]
  const subject = subjects.find((item) => getVisibleLessons(item.id).some((lesson) => lesson.id === lessonId))
  const lesson = subject ? getVisibleLessons(subject.id).find((item) => item.id === lessonId) : undefined
  if (!subject || !lesson) return <Navigate to={`/student/subjects${scenario === 'current' ? '' : `?scenario=${scenario}`}`} replace />
  const summary = summaryLessons.find((item) => item.id === lesson.id && item.published && item.processed)
  const query = scenario === 'current' ? subject.historic ? '?class=history' : '' : `?scenario=${scenario}`

  return <div className="page-content student-page lesson-reading-page">
    <Link className="student-back-link" to={`/student/subjects/${subject.id}${query}`}><ArrowLeft size={16} /> Về môn {subject.name}</Link>
    <header className="page-heading"><span className="eyebrow"><span className="eyebrow-line" />{subject.name.toUpperCase()} · BÀI ĐÃ CÔNG BỐ</span><h1>{lesson.title}</h1><p>Đọc nội dung từ học liệu giáo viên đã công bố. Mọi phần tóm tắt mẫu đều có nguồn đối chiếu.</p></header>
    <div className="lesson-reading-layout"><article className="panel lesson-reading-content"><span className="lesson-content-label"><BookOpen size={17} /> NỘI DUNG BÀI HỌC</span><p>{summary?.excerpt ?? `Bài học “${lesson.title}” đã được công bố cho lớp ${subject.classroomName}. Nội dung chi tiết sẽ hiển thị từ kho học liệu khi kết nối API.`}</p><div className="lesson-source-box"><strong>Học liệu đã dùng</strong>{lesson.materials.map((material) => <span key={material.id}><FileText size={15} /> {material.name} · {material.sourcePosition}</span>)}</div>{summary ? <section className="lesson-summary-box"><span><Sparkles size={15} /> TÓM TẮT THEO HỌC LIỆU</span><p>{summary.summary}</p><small>Bản tóm tắt mẫu · đối chiếu với {summary.material}, {summary.position}</small></section> : <p className="student-notice">Chưa có bản tóm tắt đủ nguồn cho bài học này.</p>}</article>
      <aside className="lesson-reading-aside"><section className="panel"><span className="student-overline">TIẾP THEO</span><h2>Tiếp tục học</h2><Link to={`/student/assistant${query}`}><MessageCircle size={18} /><span><strong>{subject.historic ? 'Xem lịch sử hỏi đáp' : 'Hỏi trợ lý học tập'}</strong><small>{subject.historic ? 'Hội thoại cũ chỉ đọc' : 'Hỏi về bài học này'}</small></span><ArrowRight size={16} /></Link>{!subject.historic && <Link to={`/student/practice${query}`}><Sparkles size={18} /><span><strong>Tự ôn bài này</strong><small>Tạo phiên luyện tập riêng</small></span><ArrowRight size={16} /></Link>}<Link to={`/student/activities${query}`}><ClipboardList size={18} /><span><strong>Bài được giao & kết quả</strong><small>Xem công việc liên quan</small></span><ArrowRight size={16} /></Link></section></aside>
    </div>
  </div>
}
