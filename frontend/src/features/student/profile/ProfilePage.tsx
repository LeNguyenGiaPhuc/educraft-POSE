import { useState } from 'react'
import { Link } from 'react-router'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import { studentLessons, studentSubjects } from '../fixtures'
import { getAccessibleSubjects } from '../studentRules'
import { profilePoints, profileStreams } from './profile.mock'
import { getLessonIndicators, getValidPoints } from './profileRules'
import '../student.css'
import './profile.css'

const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN')
const lessonTitle = (id: string) => studentLessons.find((lesson) => lesson.id === id)?.title ?? 'Bài học chưa có thông tin'
const classLabel = (id: string) => {
  const subject = studentSubjects.find((item) => item.id === id)
  return subject ? `${subject.name} · ${subject.classroomName}${subject.historic ? ' · Lớp đã học, chỉ đọc' : ''}` : ''
}

export function ProfilePage() {
  const { scenario } = useStudentScenario()
  const [subjectId, setSubjectId] = useState('all')
  const { current, historic } = getAccessibleSubjects(scenario)
  const subjects = [...current, ...historic]
  const selectedId = subjects.some((subject) => subject.id === subjectId) ? subjectId : 'all'
  const points = profilePoints.filter((point) => subjects.some((subject) => subject.id === point.classroomSubjectId)
    && (selectedId === 'all' || point.classroomSubjectId === selectedId))
  const scenarioQuery = scenario === 'current' ? '' : `?scenario=${scenario}`

  return <div className="page-content student-page profile-page">
    <header className="page-heading"><h1>Hồ sơ học tập</h1><p>Nhìn lại tiến độ từng bài học qua bài được giao và những lần tự luyện của bạn.</p></header>
    <StudentScenarioControl />
    <p className="student-notice">Bản xem trước · dữ liệu mẫu cố định, chưa kết nối API. Chỉ tính kết quả đã chấm hợp lệ, theo thời điểm hoàn thành; không quy đổi bài chờ chấm hoặc chấm lỗi thành 0.</p>
    {subjects.length === 0 ? <section className="panel student-empty"><h2>Chưa có hồ sơ lớp học</h2><p>Tình huống chưa được phân lớp không có dữ liệu môn học mẫu. Liên hệ giáo viên để được xếp lớp.</p></section> : <>
      {scenario === 'history-only' && <p className="student-notice">Chỉ xem lại hồ sơ lớp đã học. Không tạo bài tập hoặc phiên tự luyện mới.</p>}
      <div className="student-toolbar"><label>Lọc môn học<select value={selectedId} onChange={(event) => setSubjectId(event.target.value)}><option value="all">Tất cả môn có thể xem</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name} · {subject.classroomName}{subject.historic ? ' · Lớp đã học' : ''}</option>)}</select></label></div>
      <p className="student-muted">Dưới 50%: ghi nhận khó khăn. Từ 70%: gỡ khó khăn của cùng bài học trong cùng luồng. Từ 50% đến dưới 70%: giữ nguyên. Các lần hoàn thành được sắp từ cũ đến mới.</p>
      <div className="profile-streams">{profileStreams.map((stream) => {
        const validPoints = getValidPoints(points, stream.value)
        const indicators = getLessonIndicators(points, stream.value)
        return <section className={`panel profile-stream ${stream.value === 'SELF_PRACTICE' ? 'profile-private' : ''}`} key={stream.value} aria-labelledby={`profile-${stream.value}`}>
          <h2 id={`profile-${stream.value}`}>{stream.title}</h2><p className="student-muted">{stream.description}</p>
          {validPoints.length === 0 ? <p className="profile-no-data">Chưa có kết quả đã chấm trong môn / lớp đang chọn.</p> : <>
            <h3>Điểm theo lần hoàn thành</h3><ol className="profile-bars">{validPoints.map((point) => <li key={point.id}><a href={`#evidence-${point.id}`} className="profile-point-label">{point.title}<small>{date(point.completedAt)} · {classLabel(point.classroomSubjectId)} · {lessonTitle(point.lessonId)}</small></a><div className="profile-bar-track" aria-hidden="true"><span style={{ width: `${point.score}%` }} /></div><strong>{point.score}%</strong></li>)}</ol>
            <h3>Chỉ báo theo bài học</h3><ul className="profile-indicators">{indicators.map((indicator) => <li key={indicator.lessonId}><div><strong>{lessonTitle(indicator.lessonId)}</strong><span className={`student-badge ${indicator.difficulty ? 'warning' : ''}`}>{indicator.difficulty ? 'Đang gặp khó khăn' : 'Chưa ghi nhận khó khăn hiện tại'}</span></div><p className="student-muted">Chuỗi điểm: {indicator.evidence.map((point) => `${point.score}%`).join(' → ')}. <a className="student-source" href={`#evidence-${indicator.evidence.at(-1)!.id}`}>Xem bằng chứng mới nhất</a></p></li>)}</ul>
          </>}
        </section>
      })}</div>
      {points.length > 0 && <section className="panel profile-evidence"><h2>Bằng chứng của biểu đồ</h2><p className="student-muted">Các điểm tự luyện dưới đây là phiên mẫu riêng của hồ sơ, không phải kết quả vừa được tạo hoặc chấm trực tiếp.</p><ul className="student-list">{points.map((point) => <li key={point.id} id={`evidence-${point.id}`} tabIndex={-1}><h3>{point.title}</h3><p>{lessonTitle(point.lessonId)} · {date(point.completedAt)} · {point.score}% · {point.stream === 'ASSIGNED' ? 'Bài được giao' : 'Tự luyện mẫu'}</p>{point.resultId ? <Link className="student-source" to={`/student/results${scenarioQuery}#source-${point.resultId}-0`}>Xem bài làm, phản hồi và nguồn đối chiếu</Link> : <p className="student-muted">Ví dụ cố định để minh họa quy tắc chỉ báo. Chi tiết câu trả lời của phiên này chưa có trong bản xem trước.</p>}</li>)}</ul></section>}
      <p className="student-notice">Kiểm tra vở không có điểm và không tham gia hai biểu đồ. Nhận xét giáo viên đã chốt được xem riêng tại <Link className="student-source" to={`/student/results${scenarioQuery}`}>Kết quả của tôi</Link>.</p>
    </>}
  </div>
}
