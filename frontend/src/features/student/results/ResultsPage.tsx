import { useState } from 'react'
import { BookCheck, FileText } from 'lucide-react'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import { studentSubjects } from '../fixtures'
import { asGradePreview, exerciseResults, getResultGroup, getResultSource, notebookResults, type ExerciseResult, type GradeState, type NotebookResult } from './results.mock'
import '../student.css'
import './results.css'

const findingLabels = { RECORDED: 'Đã ghi nhận', NEEDS_SUPPLEMENTATION: 'Cần bổ sung', UNDETERMINED: 'Chưa xác định' }
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN')

function ExerciseFeedback({ result }: { result: ExerciseResult }) {
  const subject = studentSubjects.find((item) => item.id === result.classroomSubjectId)
  const total = result.status === 'GRADED' ? result.answers.reduce((sum, answer) => ({ earned: sum.earned + answer.earned, maximum: sum.maximum + answer.maximum }), { earned: 0, maximum: 0 }) : null
  return <article className="panel result-card">
    <div className="student-panel-heading"><div><span className="student-badge muted">{result.kind === 'QUIZ' ? 'Trắc nghiệm' : 'Tự luận ngắn'}</span><h3>{result.title}</h3><p>{subject?.name} · {subject?.classroomName} · Nộp {date(result.submittedAt)}</p></div>{total ? <div className="result-score"><strong>{total.earned}/{total.maximum}</strong><span>Điểm luyện tập</span></div> : <span className="student-badge warning">{result.status === 'PENDING' ? 'Đang chờ chấm' : 'Chấm bài gặp lỗi'}</span>}</div>
    {result.status !== 'GRADED' && <p className="student-notice">Câu trả lời đã được giữ lại. {result.status === 'FAILED' ? 'Cần xử lý lại việc chấm bài khi kết nối API; bạn không cần nộp lại.' : 'Điểm và giải thích chỉ xuất hiện khi chấm thành công.'}</p>}
    <ol className="result-answers">{result.answers.map((answer, index) => {
      const graded = result.status === 'GRADED' ? result.answers[index] : null
      const source = graded ? getResultSource(graded, result.classroomSubjectId) : null
      const sourceId = `source-${result.id}-${index}`
      return <li key={answer.question}><h4>{answer.question}</h4><p><strong>Câu trả lời của bạn:</strong> {answer.answer}</p>{graded && <><p className="result-answer-mark">{graded.earned === graded.maximum ? 'Đúng' : graded.earned === 0 ? 'Chưa đúng' : 'Đạt một phần'} · {graded.earned}/{graded.maximum} điểm</p><p>{graded.explanation}</p>{source ? <><span className="student-badge muted">{source.lesson.title}</span><p><a className="student-source" href={`#${sourceId}`}>{source.material.name} · {graded.position}</a></p><aside tabIndex={-1} id={sourceId} className="result-source"><FileText size={16} aria-hidden="true" /><div><strong>Thông tin nguồn đối chiếu</strong><p>{source.lesson.title} · {source.material.name} · Phiên bản {source.material.version}</p><p>{graded.position} · Học liệu đã công bố, đã xử lý.</p><p className="student-muted">Vị trí nguồn mẫu; mở nội dung tệp gốc chờ kết nối kho học liệu.</p></div></aside></> : <p className="student-notice">Chưa đủ nguồn hợp lệ để đối chiếu phản hồi này.</p>}</>}</li>
    })}</ol>
  </article>
}

function NotebookFeedback({ result, previous }: { result: NotebookResult; previous: boolean }) {
  return <article className="panel result-card"><div className="student-panel-heading"><div><span className="student-badge">Giáo viên đã chốt</span><h3>{previous ? 'Lần chốt trước' : 'Kiểm tra vở · Kết quả mới nhất'}</h3><p>Lịch sử · 11A2 · {date(result.finalizedAt)}</p></div><BookCheck size={24} aria-hidden="true" /></div><dl className="result-criteria">{result.criteria.map((criterion) => <div key={criterion.title}><dt>{criterion.title}</dt><dd><span className={`student-badge ${criterion.status === 'RECORDED' ? '' : 'warning'}`}>{findingLabels[criterion.status]}</span><p>{criterion.note}</p></dd></div>)}</dl><div className="result-teacher"><strong>Giáo viên đánh giá: {result.evaluator}</strong><p>{result.comment}</p></div></article>
}

export function ResultsPage() {
  const { scenario } = useStudentScenario()
  const [gradeState, setGradeState] = useState<GradeState>('GRADED')
  return <div className="page-content student-page result-page"><header className="page-heading"><span className="eyebrow"><span className="eyebrow-line" />PHẢN HỒI HỌC TẬP</span><h1>Kết quả của tôi</h1><p>Xem lại bài làm, hiểu phần cần bổ sung và đối chiếu học liệu.</p></header><StudentScenarioControl /><p className="student-notice">Dữ liệu minh họa của riêng học sinh. Điểm bài tập hỗ trợ học tập, không thay thế điểm đánh giá chính thức. Kiểm tra vở chỉ hiển thị nhận xét đã được giáo viên chốt.</p><div className="student-toolbar"><label>Trạng thái chấm minh họa · bài lớp 11A2<select value={gradeState} onChange={(event) => setGradeState(event.target.value as GradeState)}><option value="GRADED">Đã chấm</option><option value="PENDING">Đang chờ chấm</option><option value="FAILED">Chấm gặp lỗi</option></select></label><p className="student-muted">Các trạng thái là những ví dụ thay thế của cùng một lần nộp.</p></div>{scenario !== 'current' && <p className="student-notice">Chưa có lớp hiện tại. Bạn vẫn có thể đọc kết quả của chính mình từ các lớp đã học.</p>}
    {(['current', 'historic'] as const).map((group) => {
      const exercises = exerciseResults.filter((result) => getResultGroup(result, scenario) === group)
      const notebooks = notebookResults.filter((result) => getResultGroup(result, scenario) === group)
      if (!exercises.length && !notebooks.length) return null
      return <section key={group} className="result-group"><h2 className="student-section-title">{group === 'current' ? 'Lớp hiện tại' : 'Lịch sử các lớp · chỉ xem lại'}</h2><div className="student-stack">{exercises.map((result) => <ExerciseFeedback key={result.id} result={result.classroomSubjectId === 'history-11a2' ? asGradePreview(result, gradeState) : result} />)}{notebooks.length > 0 && <><h3 className="result-notebook-heading">Nhận xét kiểm tra vở</h3><NotebookFeedback result={notebooks[0]} previous={false} />{notebooks.length > 1 && <details className="result-history"><summary>Xem {notebooks.length - 1} lần chốt trước</summary><div className="student-stack">{notebooks.slice(1).map((result) => <NotebookFeedback key={result.id} result={result} previous />)}</div></details>}</>}</div></section>
    })}
  </div>
}
