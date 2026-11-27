import { ArrowLeft, ArrowRight, BookOpen, ClipboardList, FileText, MessageCircle, Sparkles } from 'lucide-react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import type { StudentLesson } from '../../../api/client'
import { useApiData } from '../../../api/useApiData'
import { useStudentScenario } from '../useStudentScenario'
import '../student.css'
import './subjects.css'

export function LessonPage() {
  const { lessonId = '' } = useParams()
  const { scenario } = useStudentScenario()
  const { data: lesson, loading, error } = useApiData<StudentLesson>(`/student/lessons/${encodeURIComponent(lessonId)}`)
  const [searchParams, setSearchParams] = useSearchParams()
  if (loading) return <div className="page-content student-page"><p role="status">Đang tải bài học…</p></div>
  if (error) return <div className="page-content student-page"><section className="panel student-empty" role="alert"><h2>Không tải được bài học</h2><p>{error}</p></section></div>
  if (!lesson) return <Navigate to="/student/subjects" replace />

  const historic = lesson.classroom?.status === 'ARCHIVED' || scenario === 'history-only' || searchParams.get('class') === 'history'
  const query = historic ? '?class=history' : ''
  const selectedMaterialId = searchParams.get('source')
  const selectedMaterial = lesson.materials.find((material) => material.id === selectedMaterialId)
  const usableMaterials = lesson.materials.filter((material) => material.versions.some((version) => version.processingStatus === 'PROCESSED'))

  return <div className="page-content student-page lesson-reading-page">
    <Link className="student-back-link" to={`/student/subjects${query}`}><ArrowLeft size={16} /> Về danh sách môn học</Link>
    <header className="page-heading"><span className="eyebrow"><span className="eyebrow-line" />{lesson.subject?.name.toUpperCase()} · BÀI ĐÃ CÔNG BỐ</span><h1>{lesson.title}</h1><p>Học liệu và nội dung được tải từ lớp {lesson.classroom?.name}.</p></header>
    <div className="lesson-reading-layout"><article className="panel lesson-reading-content"><span className="lesson-content-label"><BookOpen size={17} /> HỌC LIỆU ĐÃ CÔNG BỐ</span>
      {lesson.materials.length ? <div className="lesson-source-box"><strong>Nguồn học liệu</strong>{lesson.materials.map((material) => {
        const version = material.versions[0]
        const ready = version?.processingStatus === 'PROCESSED'
        return <div key={material.id}><button type="button" className="student-source" disabled={!ready} onClick={() => { const updated = new URLSearchParams(searchParams); updated.set('source', material.id); setSearchParams(updated) }}><FileText size={15} /> {material.name}{version ? ` · v${version.number}` : ' · Chưa xử lý'}</button>{!ready && <small>Học liệu chưa xử lý thành công nên chưa dùng được làm nguồn.</small>}</div>
      })}</div> : <p className="student-notice">Bài học đã công bố nhưng chưa có học liệu đã xử lý để hiển thị.</p>}
      {selectedMaterial && <section className="lesson-material-preview" aria-live="polite"><span><FileText size={15} /> NỘI DUNG ĐÃ TRÍCH XUẤT</span><h2>{selectedMaterial.name}</h2>{selectedMaterial.versions[0]?.sources.length ? selectedMaterial.versions[0].sources.map((source) => <blockquote key={source.id}><p>{source.content}</p><small>{source.position}</small></blockquote>) : <p>Học liệu chưa có đoạn nội dung được trích xuất.</p>}</section>}
      {historic ? <p className="student-notice">Lớp đã học chỉ cho phép xem lại, không tạo yêu cầu AI mới.</p> : <section className="student-notice"><strong>Tóm tắt AI</strong><p>{usableMaterials.length ? 'Chưa cấu hình dịch vụ AI. Không tạo bản tóm tắt giả.' : 'Không có học liệu đã xử lý nên chưa đủ bằng chứng để tóm tắt.'}</p><button type="button" className="student-action secondary" disabled title="Cần cấu hình dịch vụ AI">{usableMaterials.length ? 'Tóm tắt · chờ cấu hình AI' : 'Chưa đủ học liệu để tóm tắt'}</button></section>}
    </article>
    <aside className="lesson-reading-aside"><section className="panel"><span className="student-overline">TIẾP THEO</span><h2>Tiếp tục học</h2><Link to={`/student/assistant${query}${query ? '&' : '?'}subject=${lesson.subject?.id}&lesson=${lesson.id}`}><MessageCircle size={18} /><span><strong>{historic ? 'Xem lịch sử hỏi đáp' : 'Hỏi trợ lý học tập'}</strong><small>{historic ? 'Hội thoại cũ chỉ đọc' : 'Hỏi về bài học này'}</small></span><ArrowRight size={16} /></Link>{!historic && <Link to={`/student/practice${query}${query ? '&' : '?'}subject=${lesson.subject?.id}&lesson=${lesson.id}`}><Sparkles size={18} /><span><strong>Tự ôn bài này</strong><small>Tạo phiên luyện tập riêng</small></span><ArrowRight size={16} /></Link>}<Link to={`/student/activities${query}${query ? '&' : '?'}subject=${lesson.subject?.id}`}><ClipboardList size={18} /><span><strong>Bài được giao & kết quả</strong><small>Xem công việc liên quan</small></span><ArrowRight size={16} /></Link></section></aside></div>
  </div>
}
