import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { assignedActivities, assignedSubjects } from '../insights/fixtures'
import { EmptyState, PreviewNotice, SubjectPicker, TeacherHeading } from '../insights/TeacherUI'

export function ClassStatisticsPage() {
  const [params] = useSearchParams()
  const initialId = assignedSubjects.some((item) => item.id === params.get('classroomSubjectId')) ? params.get('classroomSubjectId')! : 'history-11a2'
  const [subjectId, setSubjectId] = useState(initialId)
  const [kind, setKind] = useState('ALL')
  const subject = assignedSubjects.find((item) => item.id === subjectId)!
  const items = assignedActivities.filter((item) => item.subjectId === subjectId && (kind === 'ALL' || item.kind === kind))
  const quizWritten = items.filter((item) => item.kind !== 'NOTEBOOK')
  const notebook = items.filter((item) => item.kind === 'NOTEBOOK')
  const submitted = items.reduce((sum, item) => sum + item.submitted, 0)
  const eligible = items.reduce((sum, item) => sum + item.eligible, 0)

  return <div className="page-content"><TeacherHeading title="Thống kê lớp" description="Theo dõi mức tham gia trong môn được phân công. Kết quả có điểm và kiểm tra vở được trình bày riêng." /><PreviewNotice /><div className="ti-heading"><SubjectPicker value={subjectId} onChange={setSubjectId} /><label className="ti-picker">Loại hoạt động<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="ALL">Tất cả</option><option value="QUIZ">Quiz</option><option value="WRITTEN">Tự luận ngắn</option><option value="NOTEBOOK">Kiểm tra vở</option></select></label></div><div className="ti-stats"><div className="ti-stat"><strong>{items.length}</strong><span>Hoạt động trong bộ lọc</span></div><div className="ti-stat"><strong>{submitted}/{eligible}</strong><span>Lượt nộp / lượt cần nộp</span></div><div className="ti-stat"><strong>{eligible ? Math.round(submitted / eligible * 100) : 0}%</strong><span>Tỷ lệ tham gia mẫu</span></div></div><div className="ti-grid"><section className="ti-card"><h2>Quiz & tự luận · có điểm</h2>{quizWritten.length ? <div className="ti-table-wrap"><table className="ti-table"><thead><tr><th>Hoạt động</th><th>Đã nộp</th><th>Trạng thái</th><th>Điểm TB</th></tr></thead><tbody>{quizWritten.map((item) => <tr key={item.id}><td>{item.title}</td><td>{item.submitted}/{item.eligible}</td><td>{item.state}</td><td>{item.average === undefined ? 'Chưa có' : `${item.average}/10`}</td></tr>)}</tbody></table></div> : <EmptyState title="Không có hoạt động có điểm" detail="Thử chọn loại hoạt động khác hoặc chờ kết quả chấm." />}</section><section className="ti-card"><h2>Kiểm tra vở · không tính điểm</h2>{notebook.length ? notebook.map((item) => <div className="ti-row" key={item.id}><div><strong>{item.title}</strong><small>Đã nộp {item.submitted}/{item.eligible} · {subject.classroom}</small></div><span className="ti-chip neutral">Tiêu chí nội dung</span></div>) : <EmptyState title="Chưa có kiểm tra vở" detail="Kết quả kiểm tra vở không được cộng vào biểu đồ điểm." />}</section></div></div>
}
