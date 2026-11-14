import { ArrowLeft, ArrowRight, BookOpen, ClipboardList, FileText, MessageCircle, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import { summaryLessons } from '../summary/summary.mock'
import { getAccessibleSubjects, getVisibleLessons } from '../studentRules'
import { useStudentScenario } from '../useStudentScenario'
import '../student.css'
import './subjects.css'

export function LessonPage() {
  const { lessonId } = useParams()
  const { scenario } = useStudentScenario()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedMaterialId, setSelectedMaterialId] = useState(() => searchParams.get('source') ?? '')
  const { current, historic } = getAccessibleSubjects(scenario)
  const subjects = [...current, ...historic]
  const subject = subjects.find((item) => getVisibleLessons(item.id).some((lesson) => lesson.id === lessonId))
  const lesson = subject ? getVisibleLessons(subject.id).find((item) => item.id === lessonId) : undefined
  if (!subject || !lesson) return <Navigate to={`/student/subjects${scenario === 'current' ? '' : `?scenario=${scenario}`}`} replace />
  const summary = summaryLessons.find((item) => item.id === lesson.id && item.published && item.processed)
  const canRequestSummary = !subject.historic && lesson.materials.some((material) => material.processing === 'PROCESSED')
  const summaryRequested = searchParams.get('summary') === 'requested'
  const visibleSummary = !subject.historic && summaryRequested ? summary : undefined
  const selectedMaterial = lesson.materials.find((material) => material.id === selectedMaterialId)
  const query = scenario === 'current' ? subject.historic ? '?class=history' : '' : `?scenario=${scenario}`

  return <div className="page-content student-page lesson-reading-page">
    <Link className="student-back-link" to={`/student/subjects/${subject.id}${query}`}><ArrowLeft size={16} /> Về môn {subject.name}</Link>
    <header className="page-heading"><span className="eyebrow"><span className="eyebrow-line" />{subject.name.toUpperCase()} · BÀI ĐÃ CÔNG BỐ</span><h1>{lesson.title}</h1><p>Đọc nội dung từ học liệu giáo viên đã công bố. Mọi phần tóm tắt mẫu đều có nguồn đối chiếu.</p></header>
    <div className="lesson-reading-layout"><article className="panel lesson-reading-content"><span className="lesson-content-label"><BookOpen size={17} /> NỘI DUNG BÀI HỌC</span><p>{visibleSummary?.excerpt ?? `Bài học “${lesson.title}” đã được công bố cho lớp ${subject.classroomName}. Nội dung chi tiết sẽ hiển thị từ kho học liệu khi kết nối API.`}</p><div className="lesson-source-box"><strong>Học liệu đã dùng</strong>{lesson.materials.map((material) => <div key={material.id}><button type="button" className="student-source" disabled={material.processing !== 'PROCESSED'} onClick={() => setSelectedMaterialId(material.id)}><FileText size={15} /> {material.name} · {material.sourcePosition}</button>{material.processing !== 'PROCESSED' && <small>Chưa mở được vì học liệu chưa xử lý thành công.</small>}</div>)}</div>{selectedMaterial && <section className="lesson-material-preview" aria-live="polite"><span><FileText size={15} /> XEM HỌC LIỆU</span><h2>{selectedMaterial.name}</h2><p>Phiên bản {selectedMaterial.version} · {selectedMaterial.sourcePosition}</p><p className="student-muted">Bản xem trước chưa tải tệp thật. Khi nối API, nút này sẽ mở tệp riêng tư sau khi kiểm tra quyền truy cập.</p></section>}{subject.historic ? <p className="student-notice">Lớp đã học chỉ cho phép đọc nội dung và bản tóm tắt đã lưu; không tạo yêu cầu AI mới.</p> : !summaryRequested ? <div className="student-toolbar"><button type="button" className="student-action" disabled={!canRequestSummary} onClick={() => { const next = new URLSearchParams(searchParams); next.set('summary', 'requested'); setSearchParams(next) }}>{canRequestSummary ? 'Tạo tóm tắt theo học liệu' : 'Chưa đủ học liệu để tóm tắt'}</button></div> : visibleSummary ? <section className="lesson-summary-box"><span><Sparkles size={15} /> TÓM TẮT THEO HỌC LIỆU</span><p>{visibleSummary.summary}</p><small>Bản tóm tắt mẫu · đối chiếu với {visibleSummary.material}, {visibleSummary.position}</small></section> : <p className="student-notice">Chưa đủ nguồn đã xử lý để tạo tóm tắt cho bài học này.</p>}</article>
      <aside className="lesson-reading-aside"><section className="panel"><span className="student-overline">TIẾP THEO</span><h2>Tiếp tục học</h2><Link to={`/student/assistant${query}${query ? '&' : '?'}subject=${subject.id}&lesson=${lesson.id}`}><MessageCircle size={18} /><span><strong>{subject.historic ? 'Xem lịch sử hỏi đáp' : 'Hỏi trợ lý học tập'}</strong><small>{subject.historic ? 'Hội thoại cũ chỉ đọc' : 'Hỏi về bài học này'}</small></span><ArrowRight size={16} /></Link>{!subject.historic && <Link to={`/student/practice${query}${query ? '&' : '?'}subject=${subject.id}&lesson=${lesson.id}`}><Sparkles size={18} /><span><strong>Tự ôn bài này</strong><small>Tạo phiên luyện tập riêng</small></span><ArrowRight size={16} /></Link>}<Link to={`/student/activities${query}${query ? '&' : '?'}subject=${subject.id}`}><ClipboardList size={18} /><span><strong>Bài được giao & kết quả</strong><small>Xem công việc liên quan</small></span><ArrowRight size={16} /></Link></section></aside>
    </div>
  </div>
}
