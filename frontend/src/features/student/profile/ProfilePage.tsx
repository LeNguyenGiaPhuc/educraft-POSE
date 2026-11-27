import { BookOpen, ClipboardCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import type { StudentProfile, StudentWorkspace } from '../../../api/client'
import { useApiData } from '../../../api/useApiData'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import '../student.css'
import './profile.css'

export function ProfilePage() {
  const { scenario } = useStudentScenario()
  const { data: workspace, loading: workspaceLoading, error: workspaceError } = useApiData<StudentWorkspace>('/student/workspace')
  const { data, loading, error } = useApiData<StudentProfile>('/student/profile')
  const memberships = scenario === 'history-only' ? workspace?.history ?? [] : workspace?.current ? [workspace.current] : []
  const allowedSubjectIds = new Set(memberships.flatMap((membership) => membership.subjects.map((subject) => subject.id)))
  const points = (data?.points ?? []).filter((point) => allowedSubjectIds.has(point.classroom_subject_id))

  if (workspaceLoading || loading) return <div className="page-content student-page"><p role="status">Đang tải tiến độ…</p></div>
  if (workspaceError || error) return <div className="page-content student-page"><section className="panel student-empty" role="alert"><h2>Không tải được tiến độ</h2><p>{workspaceError || error}</p></section></div>
  if (!workspace || !data) return null

  const subjects = memberships.flatMap((membership) => membership.subjects.map((subject) => ({ ...subject, classroomId: membership.classroom.id, classroomName: membership.classroom.name, historical: membership.leftAt !== null || membership.classroom.status === 'ARCHIVED' })))
  return <div className="page-content student-page profile-page">
    <header className="page-heading"><span className="eyebrow"><span className="eyebrow-line" />HỒ SƠ HỌC TẬP</span><h1>Tiến độ theo môn</h1><p>Điểm bài được giao và tự ôn được theo dõi riêng. Kiểm tra vở không tính vào biểu đồ điểm.</p></header>
    <StudentScenarioControl />
    {scenario === 'history-only' && <p className="student-notice">Đang xem dữ liệu lớp đã học ở chế độ chỉ đọc.</p>}
    {subjects.length === 0 ? <section className="panel student-empty"><BookOpen size={28} /><h2>Chưa có lớp để hiển thị tiến độ</h2><p>Tiến độ theo môn sẽ xuất hiện sau khi em được xếp lớp.</p></section> : <div className="profile-subject-grid">{subjects.map((subject) => {
      const subjectPoints = points.filter((point) => point.classroom_subject_id === subject.id)
      const streams = [
        { id: 'ASSIGNED' as const, label: 'Bài được giao', icon: ClipboardCheck },
        { id: 'SELF_PRACTICE' as const, label: 'Tự ôn tập', icon: Sparkles },
      ]
      return <section className="panel profile-subject-card" key={`${subject.classroomId}-${subject.id}`}><header className="profile-subject-title"><span className="subject-icon"><BookOpen size={18} /></span><span><strong>{subject.name}</strong><small>{subject.classroomName}{subject.historical ? ' · chỉ đọc' : ''}</small></span></header>
        {streams.map((stream) => {
          const entries = subjectPoints.filter((point) => point.stream === stream.id)
          const Icon = stream.icon
          return <section className={`profile-stream ${stream.id === 'SELF_PRACTICE' ? 'profile-private' : ''}`} key={stream.id}><h3><Icon size={15} /> {stream.label}</h3>{entries.length === 0 ? <p className="profile-no-data">Chưa có kết quả đã chấm trong luồng này.</p> : <><ol className="profile-bars">{entries.map((point) => {
            const score = Math.round(Number(point.earned_points) / Number(point.max_points) * 100)
            return <li key={point.id}><div className="profile-point-label">{point.lesson.title}<small>{new Date(point.occurred_at).toLocaleDateString('vi-VN')}</small></div><div className="profile-bar-track" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div><strong>{score}%</strong></li>
          })}</ol><ul className="profile-indicators">{[...new Set(entries.map((point) => point.lesson_id))].map((lessonId) => {
            const indicator = data.progress.find((item) => item.lesson_id === lessonId && item.stream === stream.id)
            const lesson = entries.find((point) => point.lesson_id === lessonId)?.lesson
            return <li key={lessonId}><div><strong>{lesson?.title}</strong><span className={`student-badge ${indicator?.has_difficulty ? 'warning' : ''}`}>{indicator?.has_difficulty ? 'Cần ôn thêm' : 'Đang tiến bộ'}</span></div></li>
          })}</ul></>}</section>
        })}
        <Link className="student-source" to={`/student/activities?view=results&subject=${subject.id}${subject.historical ? '&class=history' : ''}`}>Xem bài làm và phản hồi</Link>
      </section>
    })}</div>}
  </div>
}
