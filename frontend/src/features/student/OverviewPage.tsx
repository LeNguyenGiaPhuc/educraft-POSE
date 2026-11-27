import { useState } from 'react'
import { BookOpen, ClipboardList, MessageCircle, Sparkles, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { StudentScenarioControl } from './ScenarioControl'
import { useStudentScenario } from './useStudentScenario'
import { useApiData } from '../../api/useApiData'
import type { StudentActivity, StudentWorkspace } from '../../api/client'
import './student.css'

function QuickLink({ to, title, detail, icon: Icon }: { to: string; title: string; detail: string; icon: LucideIcon }) {
  return <Link className="student-quick-link" to={to}><Icon size={18} /><span><strong>{title}</strong><small>{detail}</small></span></Link>
}

export function StudentOverviewPage() {
  const { scenario } = useStudentScenario()
  const { data: workspace, loading: workspaceLoading, error: workspaceError } = useApiData<StudentWorkspace>('/student/workspace')
  const { data: activities, loading: activitiesLoading, error: activitiesError } = useApiData<StudentActivity[]>('/student/activities')
  const membership = scenario === 'history-only' ? workspace?.history[0] : workspace?.current
  const visibleSubjects = membership?.subjects ?? []
  const publishedLessonCount = visibleSubjects.reduce((total, subject) => total + subject.lessons.length, 0)
  const currentSubjectIds = new Set(workspace?.current?.subjects.map((subject) => subject.id) ?? [])
  const [now] = useState(() => Date.now())
  const hasOpenWork = (activity: StudentActivity) => {
    if (!currentSubjectIds.has(activity.classroom_subject_id) || activity.status !== 'PUBLISHED') return false
    if (activity.closes_at && (!Number.isFinite(Date.parse(activity.closes_at)) || Date.parse(activity.closes_at) <= now)) return false
    if (activity.kind === 'EXERCISE') return !activity.exercise?.submissions.length
    const latestPeriod = activity.notebookCheck?.periods[0]
    return Boolean(latestPeriod && !latestPeriod.closed_at && Date.parse(latestPeriod.due_at) > now && !latestPeriod.submissions.some((submission) => submission.status === 'CURRENT'))
  }
  const openActivityCount = scenario === 'current' ? (activities ?? []).filter(hasOpenWork).length : 0

  if (workspaceLoading || activitiesLoading) return <div className="page-content student-page"><p role="status">Đang tải dữ liệu học tập…</p></div>
  if (workspaceError || activitiesError) return <div className="page-content student-page"><section className="panel student-empty" role="alert"><h2>Không tải được dữ liệu</h2><p>{workspaceError || activitiesError}</p></section></div>
  if (!workspace) return null

  return <div className="page-content student-page student-overview">
    <header className="page-heading student-overview-heading"><div><span className="eyebrow"><span className="eyebrow-line" />KHÔNG GIAN HỌC SINH</span><h1>Chào {workspace.student.name.split(' ').at(-1)}, hôm nay mình học gì?</h1><p>Bắt đầu từ bài học, hoạt động được giao và tiến độ của riêng em.</p></div><StudentScenarioControl /></header>
      {scenario === 'unassigned' && <section className="panel student-empty"><BookOpen size={30} /><h2>Chưa có lớp học được phân công</h2><p>Khi quản trị viên xếp lớp, môn học và hoạt động được công bố sẽ xuất hiện ở đây.</p><p className="student-muted">Nếu thông tin này chưa đúng, hãy liên hệ giáo viên hoặc quản trị viên.</p></section>}
    {scenario !== 'unassigned' && <>
      <p className="student-context-line">{scenario === 'current' ? `Lớp hiện tại · ${workspace.current?.classroom.name}` : `Đang xem lớp đã học · ${membership?.classroom.name} · chỉ đọc`}</p>
      {scenario === 'history-only' && <div className="student-notice"><BookOpen size={18} /><div><strong>Lớp đã học chỉ để xem lại</strong><p>Em vẫn xem được học liệu và kết quả cũ, nhưng không tạo hoạt động, phiên tự ôn hoặc yêu cầu AI mới.</p></div></div>}
      <section className="student-stat-grid" aria-label="Tổng quan học tập">
        <div className="student-stat-card"><span className="student-stat-icon sage"><BookOpen size={19} /></span><p>Môn học</p><strong>{String(visibleSubjects.length).padStart(2, '0')}</strong><small>{membership?.classroom.name} {scenario === 'history-only' ? '· chỉ đọc' : ''}</small></div>
        <div className="student-stat-card"><span className="student-stat-icon peach"><ClipboardList size={19} /></span><p>Việc sắp tới</p><strong>{String(openActivityCount).padStart(2, '0')}</strong><small>{scenario === 'current' ? 'Bài giáo viên giao' : 'Không có việc mới'}</small></div>
        <div className="student-stat-card"><span className="student-stat-icon blue"><BookOpen size={19} /></span><p>Bài đã công bố</p><strong>{String(publishedLessonCount).padStart(2, '0')}</strong><small>{membership?.classroom.name} {scenario === 'history-only' ? '· chỉ đọc' : ''}</small></div>
      </section>
      <div className="student-overview-grid">
        <section className="panel"><div className="student-panel-heading"><div><span className="student-overline">BẮT ĐẦU TỪ ĐÂY</span><h2>{scenario === 'current' ? 'Gợi ý cho em' : 'Xem lại việc đã học'}</h2></div></div><div className="student-quick-list">
          <QuickLink to={`/student/subjects${scenario === 'current' ? '' : '?scenario=history-only'}`} title="Mở môn học" detail="Bài học và học liệu đã công bố" icon={BookOpen} />
          {scenario === 'current' ? <><QuickLink to="/student/activities" title="Bài được giao & kết quả" detail="Làm bài, nộp bài và xem phản hồi" icon={ClipboardList} /><QuickLink to="/student/practice" title="Tự ôn tập" detail="Tạo phiên luyện riêng" icon={Sparkles} /></> : <QuickLink to="/student/activities?view=results&class=history&scenario=history-only" title="Xem kết quả cũ" detail="Bài nộp và phản hồi đã lưu" icon={ClipboardList} />}
        </div></section>
        <section className="panel"><span className="student-overline">ĐI TỚI</span><h2>Không gian học tập</h2><div className="student-quick-grid"><QuickLink to={`/student/assistant${scenario === 'current' ? '' : `?scenario=${scenario}`}`} title="Trợ lý AI & lịch sử" detail="Hỏi bài và mở lại hội thoại" icon={MessageCircle} /><QuickLink to={`/student/calendar${scenario === 'current' ? '' : `?scenario=${scenario}`}`} title="Lịch & thông báo" detail="Hạn nộp và thông báo" icon={ClipboardList} /></div></section>
      </div>
      {scenario === 'current' && <p className="student-muted">Dữ liệu được tải từ tài khoản của em.</p>}
    </>}
  </div>
}
