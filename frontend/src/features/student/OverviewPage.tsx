import { BookOpen, ClipboardList, MessageCircle, Sparkles, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { getAccessibleSubjects, getVisibleLessons } from './studentRules'
import { studentIdentity } from './fixtures'
import { assignedExercises } from './activities/activities.mock'
import { StudentScenarioControl } from './ScenarioControl'
import { useStudentScenario } from './useStudentScenario'
import './student.css'

function QuickLink({ to, title, detail, icon: Icon }: { to: string; title: string; detail: string; icon: LucideIcon }) {
  return <Link className="student-quick-link" to={to}><Icon size={18} /><span><strong>{title}</strong><small>{detail}</small></span></Link>
}

export function StudentOverviewPage() {
  const { scenario } = useStudentScenario()
  const { current, historic } = getAccessibleSubjects(scenario)
  const visibleSubjects = scenario === 'current' ? current : historic
  const publishedLessonCount = visibleSubjects.reduce((total, subject) => total + getVisibleLessons(subject.id).length, 0)
  const openActivityCount = scenario === 'current'
    ? assignedExercises.filter((activity) => activity.state === 'OPEN').length + 1
    : 0

  return <div className="page-content student-page student-overview">
    <header className="page-heading student-overview-heading"><div><span className="eyebrow"><span className="eyebrow-line" />KHÔNG GIAN HỌC SINH</span><h1>Chào {studentIdentity.name.split(' ')[2] ?? studentIdentity.name}, hôm nay mình học gì?</h1><p>Bắt đầu từ bài học, hoạt động được giao và tiến độ của riêng em.</p></div><StudentScenarioControl /></header>
    {scenario === 'unassigned' && <section className="panel student-empty"><BookOpen size={30} /><h2>Chưa có lớp học được phân công</h2><p>Khi quản trị viên xếp lớp, môn học và hoạt động được công bố sẽ xuất hiện ở đây.</p><p className="student-muted">Nếu thông tin này chưa đúng, hãy liên hệ giáo viên hoặc quản trị viên.</p></section>}
    {scenario !== 'unassigned' && <>
      <p className="student-context-line">{scenario === 'current' ? 'Lớp hiện tại · 11A2' : 'Đang xem lớp đã học · 10A1 · chỉ đọc'}</p>
      {scenario === 'history-only' && <div className="student-notice"><BookOpen size={18} /><div><strong>Lớp đã học chỉ để xem lại</strong><p>Em vẫn xem được học liệu và kết quả cũ, nhưng không tạo hoạt động, phiên tự ôn hoặc yêu cầu AI mới.</p></div></div>}
      <section className="student-stat-grid" aria-label="Tổng quan học tập">
        <div className="student-stat-card"><span className="student-stat-icon sage"><BookOpen size={19} /></span><p>Môn học</p><strong>{String(visibleSubjects.length).padStart(2, '0')}</strong><small>{scenario === 'current' ? 'Trong lớp 11A2' : 'Lớp 10A1 · chỉ đọc'}</small></div>
        <div className="student-stat-card"><span className="student-stat-icon peach"><ClipboardList size={19} /></span><p>Việc sắp tới</p><strong>{String(openActivityCount).padStart(2, '0')}</strong><small>{scenario === 'current' ? 'Bài giáo viên giao' : 'Không có việc mới'}</small></div>
        <div className="student-stat-card"><span className="student-stat-icon blue"><BookOpen size={19} /></span><p>Bài đã công bố</p><strong>{String(publishedLessonCount).padStart(2, '0')}</strong><small>{scenario === 'current' ? 'Trong lớp 11A2' : 'Trong lớp 10A1 · chỉ đọc'}</small></div>
      </section>
      <div className="student-overview-grid">
        <section className="panel"><div className="student-panel-heading"><div><span className="student-overline">BẮT ĐẦU TỪ ĐÂY</span><h2>{scenario === 'current' ? 'Gợi ý cho em' : 'Xem lại việc đã học'}</h2></div></div><div className="student-quick-list">
          <QuickLink to={`/student/subjects${scenario === 'current' ? '' : '?scenario=history-only'}`} title="Mở môn học" detail="Bài học và học liệu đã công bố" icon={BookOpen} />
          {scenario === 'current' ? <><QuickLink to="/student/activities" title="Bài được giao & kết quả" detail="Làm bài, nộp bài và xem phản hồi" icon={ClipboardList} /><QuickLink to="/student/practice" title="Tự ôn tập" detail="Tạo phiên luyện riêng" icon={Sparkles} /></> : <QuickLink to="/student/activities?view=results&class=history&scenario=history-only" title="Xem kết quả cũ" detail="Bài nộp và phản hồi đã lưu" icon={ClipboardList} />}
        </div></section>
        <section className="panel"><span className="student-overline">ĐI TỚI</span><h2>Không gian học tập</h2><div className="student-quick-grid"><QuickLink to={`/student/assistant${scenario === 'current' ? '' : `?scenario=${scenario}`}`} title="Trợ lý AI & lịch sử" detail="Hỏi bài và mở lại hội thoại" icon={MessageCircle} /><QuickLink to={`/student/calendar${scenario === 'current' ? '' : `?scenario=${scenario}`}`} title="Lịch & thông báo" detail="Hạn nộp và thông báo" icon={ClipboardList} /></div></section>
      </div>
      {scenario === 'current' && <p className="student-muted">Bản xem trước dùng dữ liệu mẫu. Bài nộp, tóm tắt, luyện tập và chat thật sẽ được kết nối API ở bước sau.</p>}
    </>}
  </div>
}
