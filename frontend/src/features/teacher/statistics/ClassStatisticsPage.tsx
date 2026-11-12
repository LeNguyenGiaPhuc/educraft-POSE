import { Link, useParams, useSearchParams } from 'react-router'
import { getTeacherSubjectContext, teacherSubjectPath } from '../fixtures'
import { sampleActivities, readActivityPreviews } from '../activities/activities.mock'
import { studentWork } from '../students/student-data'
import { EmptyState, PreviewNotice } from '../insights/TeacherUI'
import { TeacherBackButton } from '../components/TeacherBackButton'

export function ClassStatisticsPage({ classroomSubjectId, embedded = false }: { classroomSubjectId?: string; embedded?: boolean }) {
  const route = useParams()
  const [params] = useSearchParams()
  const context = getTeacherSubjectContext(classroomSubjectId ?? route.classroomSubjectId ?? params.get('classroomSubjectId') ?? undefined, route.classroomId)
  if (!context) return <div className="page-content"><TeacherBackButton /><h1>Thống kê lớp / môn</h1><EmptyState title="Chọn một môn được phân công" detail="Mở Lớp của tôi để xem thống kê đúng lớp và môn." /></div>
  const { classroom, subject } = context
  const base = teacherSubjectPath(subject.id, 'statistics').split('?')[0]
  const activities = [...sampleActivities, ...readActivityPreviews()].filter(item => item.classroomSubjectId === subject.id)
  const rows = activities.map(activity => {
    const work = classroom.students.flatMap(student => studentWork(subject.id, student.id).filter(item => item.activity.id === activity.id))
    const submitted = work.filter(item => activity.type === 'NOTEBOOK' ? item.notebook?.status === 'LOCKED' : item.result && item.result.status !== 'MISSING').length
    const scores = work.flatMap(item => item.result?.status === 'GRADED' && typeof item.result.score === 'number' ? [item.result.score] : [])
    return { activity, submitted, graded: scores.length, failed: work.filter(item => item.result?.status === 'FAILED').length, processing: work.filter(item => item.result?.status === 'PROCESSING').length, average: scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : undefined, finalized: work.filter(item => item.notebook?.finalizedHistory.length).length }
  })
  return <div className={embedded ? 'tw-statistics' : 'page-content'}>{!embedded && <TeacherBackButton fallbackTo={teacherSubjectPath(subject.id, 'statistics')} />}<div className="page-heading"><h1>Thống kê học tập</h1><p>{classroom.name} · {subject.name} — tổng hợp bài nộp, kết quả và tình trạng chấm.</p></div><PreviewNotice>Thống kê mẫu được tính từ cùng bài nộp/kết quả trong hồ sơ học sinh, chưa kết nối API.</PreviewNotice><section className="ti-card"><h2>Quiz & tự luận</h2>{rows.some(item => item.activity.type !== 'NOTEBOOK') ? <div className="ti-table-wrap"><table className="ti-table"><thead><tr><th>Hoạt động</th><th>Đã nộp / cần nộp</th><th>Trạng thái chấm</th><th>Điểm TB đã chấm</th></tr></thead><tbody>{rows.filter(item => item.activity.type !== 'NOTEBOOK').map(item => <tr key={item.activity.id}><td><Link state={{ returnTo: teacherSubjectPath(subject.id, 'statistics') }} to={`${base}/activities/${item.activity.id}`}>{item.activity.title}</Link></td><td>{item.submitted}/{classroom.students.length}</td><td>{item.graded} đã chấm · {item.processing} đang chấm · {item.failed} lỗi</td><td>{item.average ? `${item.average}/10` : 'Chưa có điểm'}</td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có hoạt động có điểm" detail="Dữ liệu sẽ xuất hiện khi lớp có Quiz hoặc tự luận được giao." />}</section><section className="ti-card"><h2>Kiểm tra vở · tách riêng, không có điểm tổng</h2>{rows.filter(item => item.activity.type === 'NOTEBOOK').map(item => <p key={item.activity.id}><Link state={{ returnTo: teacherSubjectPath(subject.id, 'statistics') }} to={`${base}/activities/${item.activity.id}`}>{item.activity.title}</Link> · {item.submitted}/{classroom.students.length} đã nộp · {item.finalized} học sinh có lịch sử đã chốt</p>)}{!rows.some(item => item.activity.type === 'NOTEBOOK') && <p>Chưa có kiểm tra vở trong môn này.</p>}</section><section className="ti-card"><h2>Xem bằng chứng theo học sinh</h2><ul className="tw-topics">{classroom.students.map(student => <li key={student.id}><Link state={{ returnTo: teacherSubjectPath(subject.id, 'statistics') }} to={`${base}/students/${student.id}`}>{student.name} · Bài nộp & kết quả</Link></li>)}</ul></section></div>
}
