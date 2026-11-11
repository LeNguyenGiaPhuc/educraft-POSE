import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { getTeacherSubjectContext, teacherSubjectPath } from '../fixtures'
import { EmptyState, PreviewNotice } from '../insights/TeacherUI'
import { TeacherBackButton } from '../components/TeacherBackButton'
import { studentScores } from '../students/student-data'

export function StudentProgress({ subjectId, studentId }: { subjectId: string; studentId: string }) {
  const location = useLocation()
  const returnTo = location.pathname + location.search
  const points = studentScores(subjectId, studentId)
  const lessons = [...new Set(points.map(point => point.lesson))].map(lesson => {
    const evidence = points.filter(point => point.lesson === lesson)
    let difficult = false
    for (const point of evidence) { if (point.percent < 50) difficult = true; else if (point.percent >= 70) difficult = false }
    return { lesson, evidence, difficult }
  })
  const base = teacherSubjectPath(subjectId).split('?')[0]
  return <section className="ti-card"><h2>Xu hướng điểm bài được giao</h2><p className="ti-muted">Chỉ Quiz / tự luận đã chấm thành công; không gồm tự ôn hoặc kiểm tra vở.</p>{points.length ? <><div className="ti-chart" role="img" aria-label={points.map(point => `${point.submittedAt}: ${point.percent}%`).join('; ')}>{points.map(point => <div className="ti-bar-item" key={point.id}><span>{point.percent}%</span><div className={`ti-bar ${point.percent < 50 ? 'low' : ''}`} style={{ height: `${Math.max(4, point.percent)}%` }} /><small>{point.submittedAt.slice(5)}</small></div>)}</div><h3>Dấu hiệu theo bài học · minh họa</h3><p className="ti-muted">Dưới 50% đánh dấu gặp khó; từ 70% xóa dấu; khoảng giữa giữ trạng thái trước. Đây là căn cứ hỗ trợ dạy học, không kết luận năng lực.</p>{lessons.map(item => <details className="tw-evidence" key={item.lesson}><summary>{item.lesson} · {item.difficult ? 'Đang gặp khó' : 'Không đánh dấu khó'}</summary><ul>{item.evidence.map(point => <li key={point.id}><Link to={`${base}/activities/${point.id}?${new URLSearchParams({ returnTo })}`}>{point.submittedAt} · {point.activity}: {point.percent}%</Link></li>)}</ul></details>)}</> : <EmptyState title="Chưa có kết quả chấm hợp lệ" detail="Khi có Quiz hoặc tự luận đã chấm trong môn này, xu hướng sẽ xuất hiện tại đây." />}</section>
}

export function ProgressPage() {
  const route = useParams()
  const [params] = useSearchParams()
  const context = getTeacherSubjectContext(route.classroomSubjectId ?? params.get('classroomSubjectId') ?? undefined, route.classroomId)
  return <div className="page-content"><TeacherBackButton /><h1>Tiến độ học sinh</h1><PreviewNotice />{context ? <ul>{context.classroom.students.map(student => <li key={student.id}><Link to={teacherSubjectPath(context.subject.id).split('?')[0] + '/students/' + student.id}>{student.name} · Xem tiến độ</Link></li>)}</ul> : <EmptyState title="Chọn lớp và môn để xem tiến độ" detail="Mở Lớp của tôi rồi chọn một môn được phân công." />}</div>
}
