import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import type { AssignedExercise } from './activities.mock'

export function ExerciseWork({ activity, readOnly }: { activity: AssignedExercise; readOnly: boolean }) {
  const { search } = useLocation()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const canAnswer = activity.state === 'OPEN' && !activity.submitted && !readOnly

  function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (activity.questions.some((question) => !answers[question.id]?.trim())) {
      setMessage('Bạn cần trả lời tất cả câu hỏi trước khi xem trước bài làm.')
      return
    }
    setMessage('Bài làm đã đủ câu trả lời để xem trước. Chưa có câu trả lời nào được nộp hoặc chấm.')
  }

  if (activity.submitted) return <section className="panel sa-work">
    <h2>{activity.title}</h2>
    <p className="student-notice">Bài đã nộp một lần. Câu trả lời mẫu bên dưới được giữ nguyên; hệ thống không tạo lượt nộp thứ hai.</p>
    {activity.questions.map((question) => <div className="sa-answer" key={question.id}><strong>{question.prompt}</strong><p>{activity.submittedAnswers?.[question.id]}</p></div>)}
    <p className="student-notice">{activity.grading === 'GRADED' ? 'Đã chấm thành công. Xem điểm và giải thích trong mục Kết quả.' : activity.grading === 'FAILED' ? 'Chấm bài gặp lỗi. Bài làm được giữ lại để xử lý tiếp; chưa có điểm.' : 'Đang chấm bài. Bài làm đã được giữ lại; chưa có điểm.'}</p>
    <Link className="student-action" to={`/student/results${search}`}>Xem kết quả</Link>
  </section>

  return <section className="panel sa-work"><h2>{activity.title}</h2><p>{activity.kind === 'QUIZ' ? 'Quiz' : 'Tự luận ngắn'} · {activity.questions.length} câu hỏi · {activity.state === 'OPEN' ? 'Đang mở' : 'Đã đóng'}</p>
    {readOnly && <p className="student-notice">Hoạt động thuộc lớp đã học. Bạn chỉ có thể xem lại.</p>}
    <form onSubmit={preview}>
      {activity.questions.map((question, index) => <fieldset className="sa-question" key={question.id} disabled={!canAnswer}>
        <legend>Câu {index + 1}. {question.prompt}</legend><small>Bài học: {question.lesson}</small>
        {activity.kind === 'QUIZ' ? <div className="sa-options">{question.options?.map((option) => <label key={option}><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => { setAnswers((current) => ({ ...current, [question.id]: option })); setMessage('') }} /> {option}</label>)}</div> : <textarea aria-label={`Trả lời câu ${index + 1}`} value={answers[question.id] ?? ''} onChange={(event) => { setAnswers((current) => ({ ...current, [question.id]: event.target.value })); setMessage('') }} placeholder="Nhập câu trả lời của bạn" />}
      </fieldset>)}
      {canAnswer && <div className="student-toolbar"><button type="submit" className="student-action">Kiểm tra bài làm</button><button type="button" disabled title="Cần kết nối API để nộp">Nộp bài · chưa kết nối</button></div>}
      {message && <p className="student-notice" role="status">{message}</p>}
    </form>
  </section>
}
