import { BookCheck, FileText } from 'lucide-react'
import { Link } from 'react-router'
import type { StudentResults, StudentWorkspace } from '../../../api/client'
import { useApiData } from '../../../api/useApiData'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import '../student.css'
import './results.css'

const statusLabel: Record<string, string> = { RECORDED: 'Đã ghi nhận', NEEDS_SUPPLEMENTATION: 'Cần bổ sung', UNDETERMINED: 'Chưa xác định' }
const date = (value: string) => new Date(value).toLocaleString('vi-VN')

export function ResultsPage() {
  const { scenario } = useStudentScenario()
  const { data: workspace, loading: workspaceLoading, error: workspaceError } = useApiData<StudentWorkspace>('/student/workspace')
  const { data, loading, error } = useApiData<StudentResults>('/student/results')
  if (workspaceLoading || loading) return <div className="page-content student-page"><p role="status">Đang tải kết quả…</p></div>
  if (workspaceError || error) return <div className="page-content student-page"><section className="panel student-empty" role="alert"><h2>Không tải được kết quả</h2><p>{workspaceError || error}</p></section></div>
  if (!workspace || !data) return null

  const currentClassIds = new Set(workspace.current ? [workspace.current.classroom.id] : [])
  const historyClassIds = new Set(workspace.history.map((item) => item.classroom.id))
  const isVisible = (classroomId: string) => scenario === 'history-only' ? historyClassIds.has(classroomId) : currentClassIds.has(classroomId)
  const exercises = data.exercises.filter((item) => isVisible(item.activity.activity.classroomSubject.classroom.id))
  const notebooks = data.notebooks.filter((item) => isVisible(item.period.activity.activity.classroomSubject.classroom.id) && item.assessment)
  const hasResults = exercises.length + notebooks.length > 0

  return <div className="page-content student-page result-page">
    <header className="page-heading"><span className="eyebrow"><span className="eyebrow-line" />PHẢN HỒI HỌC TẬP</span><h1>Kết quả của tôi</h1><p>Xem lại bài làm đã lưu, kết quả đã chấm và nội dung cần bổ sung.</p></header>
    <StudentScenarioControl />
    {scenario === 'history-only' && <p className="student-notice">Đây là kết quả của lớp đã học. Màn hình chỉ cho phép xem lại.</p>}
    {!hasResults ? <section className="panel student-empty"><BookCheck size={28} aria-hidden="true" /><h2>Chưa có kết quả để xem</h2><p>Kết quả sẽ xuất hiện sau khi có bài nộp hoặc giáo viên chốt kiểm tra vở.</p></section> : <>
      {exercises.length > 0 && <section className="result-group"><h2 className="student-section-title">Bài tập được giao</h2><div className="student-stack">{exercises.map((result) => {
        const activity = result.activity.activity
        const subject = activity.classroomSubject.subject
        const classroom = activity.classroomSubject.classroom
        const graded = result.grading_status === 'GRADED'
        const total = graded ? result.answers.reduce((sum, answer) => ({ earned: sum.earned + Number(answer.earned_points ?? 0), maximum: sum.maximum + Number(answer.question.max_points) }), { earned: 0, maximum: 0 }) : null
        return <article className="panel result-card" key={result.id}><div className="student-panel-heading"><div><span className={`student-badge ${graded ? 'muted' : 'warning'}`}>{graded ? 'Đã chấm' : result.grading_status === 'FAILED' ? 'Chấm lỗi' : 'Đang chờ chấm'}</span><h3>{activity.title}</h3><p>{subject.name} · {classroom.name} · Nộp {date(result.submitted_at)}</p></div>{total && <div className="result-score"><strong>{total.earned}/{total.maximum}</strong><span>Điểm bài tập</span></div>}</div>
          {!graded && <p className="student-notice">Câu trả lời đã được lưu. Điểm và phản hồi chỉ xuất hiện sau khi chấm thành công.</p>}
          <ol className="result-answers">{result.answers.map((answer, index) => <li key={answer.question_id}><h4>Câu {index + 1}. {answer.question.prompt}</h4><p><strong>Câu trả lời của bạn:</strong> {answer.answer}</p>{graded && <><p className="result-answer-mark">{Number(answer.earned_points)}/{Number(answer.question.max_points)} điểm</p>{answer.explanation && <p>{answer.explanation}</p>}{answer.question.citations.map((citation) => <aside key={citation.segment.id} className="result-source"><FileText size={16} aria-hidden="true" /><div><strong>Nguồn đối chiếu · {answer.question.lesson.title}</strong><p>{citation.segment.materialVersion.material.file_name} · phiên bản {citation.segment.materialVersion.version_no} · {citation.segment.position_label}</p><Link className="student-source" to={`/student/lessons/${answer.question.lesson.id}`}>Mở bài học</Link></div></aside>)}</>}</li>)}</ol>
        </article>
      })}</div></section>}
      {notebooks.length > 0 && <section className="result-group"><h2 className="student-section-title">Kiểm tra vở · kết quả giáo viên đã chốt</h2><div className="student-stack">{notebooks.map((submission) => {
        const activity = submission.period.activity.activity
        const assessment = submission.assessment!
        return <article className="panel result-card" key={submission.id}><div className="student-panel-heading"><div><span className="student-badge">Giáo viên đã chốt</span><h3>{activity.title}</h3><p>{activity.classroomSubject.subject.name} · {activity.classroomSubject.classroom.name} · Chốt {date(assessment.reviewed_at)}</p></div><BookCheck size={24} aria-hidden="true" /></div><dl className="result-criteria">{assessment.results.map((item) => <div key={item.criterion.id}><dt>{item.criterion.content}</dt><dd><span className={`student-badge ${item.status === 'RECORDED' ? '' : 'warning'}`}>{statusLabel[item.status] ?? item.status}</span>{item.note && <p>{item.note}</p>}</dd></div>)}</dl><div className="result-teacher"><strong>Giáo viên đánh giá: {assessment.evaluator.full_name}</strong>{assessment.teacher_comment && <p>{assessment.teacher_comment}</p>}</div></article>
      })}</div></section>}
    </>}
  </div>
}
