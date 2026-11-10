import { useState } from 'react'
import { FileText } from 'lucide-react'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import { getSummarySources, summaryLessons } from './summary.mock'
import './summary.css'

export function SummaryPage() {
  const { scenario } = useStudentScenario()
  const [lessonId, setLessonId] = useState(summaryLessons[0].id)
  const sources = getSummarySources(lessonId, scenario)
  const lesson = summaryLessons.find((item) => item.id === lessonId)!
  return <div className="page-content sa-summary">
    <header className="page-heading"><div><h1>Tóm tắt bài học</h1><p>Chọn một bài học để ôn lại ý chính cùng nguồn đối chiếu.</p></div></header>
    <p className="sa-preview">Bản xem trước · Nội dung AI bên dưới là ví dụ soạn sẵn, chưa tạo từ API.</p>
    <StudentScenarioControl /><div className="sa-controls">
      {scenario === 'current' && <label>Bài học đã công bố<select value={lessonId} onChange={(event) => setLessonId(event.target.value)}>{summaryLessons.filter((item) => item.published).map((item) => <option value={item.id} key={item.id}>{item.subject} · {item.title}</option>)}</select></label>}</div>
    {scenario !== 'current' ? <section className="panel sa-summary-body"><FileText size={26} aria-hidden="true" /><h2>Chưa có nguồn cho yêu cầu mới</h2><p>{scenario === 'unassigned' ? 'Bạn chưa thuộc lớp hiện tại. Khi được xếp lớp, bài học phù hợp sẽ xuất hiện ở đây.' : 'Học liệu lớp cũ chỉ để xem lại; không tạo tóm tắt mới.'}</p></section> : <section className="panel sa-summary-body"><h2>{lesson.title}</h2><span className="sa-tag">{lesson.subject} · 11A2</span>{sources.length ? <><h3>Bản tóm tắt AI mẫu</h3><p className="sa-summary-text">{sources[0].summary} <a href={`#summary-${sources[0].materialId}`}>[1]</a></p><details open id={`summary-${sources[0].materialId}`}><summary>Nguồn [1] · {sources[0].material} · v{sources[0].version} · {sources[0].position}</summary><blockquote>{sources[0].excerpt}</blockquote><p>Trích đoạn minh họa từ học liệu mẫu đã xử lý và công bố của đúng bài học này.</p></details></> : <div className="sa-insufficient" role="status"><h3>Chưa đủ bằng chứng</h3><p>Học liệu của bài này xử lý thất bại. Chưa có nguồn hợp lệ để tạo tóm tắt; hãy chọn bài khác hoặc chờ học liệu được cập nhật.</p></div>}</section>}
    <div className="sa-request"><button type="button" disabled>Yêu cầu tóm tắt · chờ kết nối API</button><p>Không cần giáo viên duyệt. Chỉ học liệu đã xử lý, đã công bố của một bài được chọn mới được dùng.</p></div>
  </div>
}
