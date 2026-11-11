import { Link, useLocation, useParams } from 'react-router'
import { TeacherBackButton } from '../components/TeacherBackButton'
import { getTeacherSubjectContext, teacherSubjectPath } from '../fixtures'
import { EmptyState, PreviewNotice } from '../insights/TeacherUI'
import { StudentProgress } from '../progress/ProgressPage'
import { StudentPromptTopics } from '../ai-summary/PromptSummaryPage'
import { studentWork, resultLabels } from './student-data'
import '../classes/classes.css'

export function StudentDetailPage() {
  const route = useParams()
  const location = useLocation()
  const context = getTeacherSubjectContext(route.classroomSubjectId, route.classroomId)
  const student = context?.classroom.students.find(item => item.id === route.studentId)
  const parent = context ? teacherSubjectPath(context.subject.id, 'students') : '/teacher/classes'
  if (!context || !student) return <div className="page-content"><TeacherBackButton fallbackTo={parent} /><h1>Học sinh không khả dụng</h1><EmptyState title="Không tìm thấy học sinh trong lớp/môn này" detail="Quay lại danh sách học sinh của môn được phân công để chọn lại." /></div>
  const work = studentWork(context.subject.id, student.id)
  const base = parent.split('?')[0]
  const returnTo = location.pathname + location.search
  return <div className="page-content tw-page"><div className="page-heading"><h1>{student.name}</h1><p>{context.classroom.name} · {context.subject.name} · {context.classroom.academicYear}</p></div><PreviewNotice>Hồ sơ xem trước · chỉ bài được giao và chủ đề thuộc môn đang chọn. Chưa kết nối API.</PreviewNotice><section className="ti-card"><h2>Lịch sử hoạt động được giao</h2>{work.length ? <div className="ti-table-wrap"><table className="ti-table"><thead><tr><th>Hoạt động</th><th>Thời hạn mẫu</th><th>Kết quả / trạng thái</th></tr></thead><tbody>{work.map(({ activity, result, notebook }) => <tr key={activity.id}><td><Link state={{ returnTo }} to={`${base}/activities/${activity.id}?${new URLSearchParams({ returnTo })}`}>{activity.title}</Link></td><td>{new Date(activity.closesAt).toLocaleDateString('vi-VN')}</td><td>{activity.type === 'NOTEBOOK' ? notebook?.status === 'LOCKED' ? 'Đã nộp · xem tiêu chí riêng bên dưới' : 'Chưa nộp' : result?.status === 'GRADED' && typeof result.score === 'number' ? `${result.score}/10` : result ? resultLabels[result.status] : 'Chưa nộp'}</td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có hoạt động được giao" detail="Các hoạt động của lớp/môn này sẽ xuất hiện tại đây." />}</section><StudentProgress subjectId={context.subject.id} studentId={student.id} /><section className="ti-card"><h2>Kiểm tra vở · không tính điểm</h2><p className="ti-muted">Chỉ lịch sử nhận xét đã chốt được trình bày bên dưới. Gợi ý AI tạm không phải đánh giá chính thức.</p>{work.filter(item => item.activity.type === 'NOTEBOOK').map(({ activity, notebook }) => <div className="tw-evidence" key={activity.id}><h3><Link state={{ returnTo }} to={`${base}/activities/${activity.id}?${new URLSearchParams({ returnTo })}`}>{activity.title}</Link></h3>{notebook?.finalizedHistory.length ? <ul>{notebook.finalizedHistory.map((entry, index) => <li key={`${entry.date}-${index}`}>{entry.date} · {entry.summary} · {entry.evaluator}</li>)}</ul> : <p>{notebook?.status === 'LOCKED' ? 'Đã nộp · chưa có nhận xét được chốt.' : 'Chưa nộp vở.'}</p>}</div>)}{!work.some(item => item.activity.type === 'NOTEBOOK') && <EmptyState title="Chưa có kiểm tra vở" detail="Nhận xét kiểm tra vở được giữ riêng, không cộng vào xu hướng điểm." />}</section><StudentPromptTopics subjectId={context.subject.id} studentId={student.id} /></div>
}
