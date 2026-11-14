import { useState } from 'react'
import { ArrowRight, BookOpen, ClipboardCheck, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import { studentLessons, type ClassroomSubjectPreview } from '../fixtures'
import { getAccessibleSubjects } from '../studentRules'
import { profilePoints, profileStreams } from './profile.mock'
import { getLessonIndicators, getValidPoints, type ProfilePoint, type ScoreStream } from './profileRules'
import '../student.css'
import './profile.css'

const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN')
const lessonTitle = (id: string) => studentLessons.find((lesson) => lesson.id === id)?.title ?? 'Bài học chưa có thông tin'

function latestScore(points: ProfilePoint[], stream: ScoreStream) {
  return getValidPoints(points, stream).at(-1)?.score ?? null
}

function ProgressBar({ label, score, privateStream = false }: { label: string; score: number | null; privateStream?: boolean }) {
  return <><div className="profile-summary-line"><span>{privateStream ? <Sparkles size={14} /> : <ClipboardCheck size={14} />}{label}</span><strong>{score === null ? '—' : `${score}%`}</strong></div><div className={`profile-summary-track ${privateStream ? 'private' : ''}`}><span style={{ width: `${score ?? 0}%` }} /></div></>
}

function SubjectProgressCard({ subject, points, selected, onSelect }: { subject: ClassroomSubjectPreview; points: ProfilePoint[]; selected: boolean; onSelect: () => void }) {
  const assignedScore = latestScore(points, 'ASSIGNED')
  const practiceScore = latestScore(points, 'SELF_PRACTICE')
  const hasDifficulty = profileStreams.some((stream) => getLessonIndicators(points, stream.value).some((indicator) => indicator.difficulty))
  return <button type="button" className="profile-subject-card" aria-pressed={selected} onClick={onSelect}><div className="profile-subject-title"><span className="subject-icon"><BookOpen size={18} /></span><span><strong>{subject.name}</strong><small>Lớp {subject.classroomName}{subject.historic ? ' · chỉ đọc' : ''}</small></span><ArrowRight size={16} /></div><ProgressBar label="Bài được giao" score={assignedScore} /><ProgressBar label="Tự ôn tập" score={practiceScore} privateStream />{hasDifficulty && <span className="profile-difficulty">Có nội dung cần ôn thêm</span>}</button>
}

function StreamPanel({ points, stream }: { points: ProfilePoint[]; stream: typeof profileStreams[number] }) {
  const validPoints = getValidPoints(points, stream.value)
  const indicators = getLessonIndicators(points, stream.value)
  return <section className={`panel profile-stream ${stream.value === 'SELF_PRACTICE' ? 'profile-private' : ''}`}><h2>{stream.title}</h2><p className="student-muted">{stream.description}</p>{validPoints.length === 0 ? <p className="profile-no-data">Chưa có kết quả đã chấm trong môn này.</p> : <><h3>Điểm theo lần hoàn thành</h3><ol className="profile-bars">{validPoints.map((point) => <li key={point.id}><a href={`#evidence-${point.id}`} className="profile-point-label">{point.title}<small>{date(point.completedAt)} · {lessonTitle(point.lessonId)}</small></a><div className="profile-bar-track" aria-hidden="true"><span style={{ width: `${point.score}%` }} /></div><strong>{point.score}%</strong></li>)}</ol><h3>Chỉ báo theo bài học</h3><ul className="profile-indicators">{indicators.map((indicator) => <li key={indicator.lessonId}><div><strong>{lessonTitle(indicator.lessonId)}</strong><span className={`student-badge ${indicator.difficulty ? 'warning' : ''}`}>{indicator.difficulty ? 'Đang gặp khó khăn' : 'Đang tiến bộ'}</span></div><p className="student-muted">Chuỗi điểm: {indicator.evidence.map((point) => `${point.score}%`).join(' → ')}</p></li>)}</ul></>}</section>
}

export function ProfilePage() {
  const { scenario } = useStudentScenario()
  const [params] = useSearchParams()
  const { current, historic } = getAccessibleSubjects(scenario)
  const subjects = [...current, ...historic]
  const [subjectId, setSubjectId] = useState(() => params.get('class') === 'history' ? historic[0]?.id ?? 'history-11a2' : 'history-11a2')
  const selected = subjects.find((subject) => subject.id === subjectId) ?? subjects[0]
  const selectedPoints = selected ? profilePoints.filter((point) => point.classroomSubjectId === selected.id) : []
  const scenarioQuery = scenario === 'current' ? '' : `&scenario=${scenario}`

  return <div className="page-content student-page profile-page">
    <header className="page-heading profile-heading"><div><span className="eyebrow"><span className="eyebrow-line" />TIẾN ĐỘ CÁ NHÂN</span><h1>Tiến độ của em</h1><p>Xem nhanh từng môn, sau đó mở chi tiết bài được giao và những lần tự ôn.</p></div><StudentScenarioControl /></header>
    <p className="student-notice">Dữ liệu mẫu chỉ tính kết quả đã chấm hợp lệ. Bài chờ chấm hoặc chấm lỗi không bị quy đổi thành 0.</p>
    {!subjects.length ? <section className="panel student-empty"><BookOpen size={30} /><h2>Chưa có tiến độ để xem</h2><p>Tiến độ sẽ xuất hiện khi em được xếp lớp và có kết quả học tập.</p></section> : <>
      {[{ title: 'Lớp hiện tại', items: current }, { title: 'Lớp đã học · chỉ xem lại', items: historic }].map((group) => group.items.length > 0 && <section className="profile-subject-group" key={group.title}><h2>{group.title}</h2><div className="profile-subject-grid">{group.items.map((subject) => <SubjectProgressCard key={subject.id} subject={subject} points={profilePoints.filter((point) => point.classroomSubjectId === subject.id)} selected={selected?.id === subject.id} onSelect={() => setSubjectId(subject.id)} />)}</div></section>)}
      {selected && <section className="profile-detail-heading"><div><span>CHI TIẾT MÔN HỌC</span><h2>{selected.name} · Lớp {selected.classroomName}</h2></div><p>{selected.historic ? 'Dữ liệu lớp cũ chỉ để xem lại.' : 'Bài được giao và tự ôn được theo dõi riêng.'}</p></section>}
      <div className="profile-streams">{profileStreams.map((stream) => <StreamPanel key={stream.value} points={selectedPoints} stream={stream} />)}</div>
      {selectedPoints.length > 0 && <section className="panel profile-evidence"><h2>Bằng chứng của tiến độ</h2><ul className="student-list">{selectedPoints.map((point) => <li key={point.id} id={`evidence-${point.id}`} tabIndex={-1}><h3>{point.title}</h3><p>{lessonTitle(point.lessonId)} · {date(point.completedAt)} · {point.score}% · {point.stream === 'ASSIGNED' ? 'Bài được giao' : 'Tự ôn mẫu'}</p>{point.resultId ? <Link className="student-source" to={`/student/activities?view=results${scenarioQuery}`}>Xem bài làm, phản hồi và nguồn đối chiếu</Link> : <p className="student-muted">Phiên minh họa chưa có chi tiết câu trả lời.</p>}</li>)}</ul></section>}
    </>}
  </div>
}
