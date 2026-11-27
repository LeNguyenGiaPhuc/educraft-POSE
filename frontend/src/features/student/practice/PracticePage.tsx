import { useState, type FormEvent } from 'react'
import { BookOpen, LockKeyhole, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import type { StudentPracticeSession, StudentWorkspace } from '../../../api/client'
import { studentApi } from '../../../api/client'
import { useApiData } from '../../../api/useApiData'
import { StudentScenarioControl } from '../ScenarioControl'
import { useStudentScenario } from '../useStudentScenario'
import '../student.css'
import './practice.css'

export function PracticePage() {
  const { scenario } = useStudentScenario()
  const [params] = useSearchParams()
  const { data: workspace, loading, error } = useApiData<StudentWorkspace>('/student/workspace')
  const [subjectId, setSubjectId] = useState(params.get('subject') ?? '')
  const [lessonIds, setLessonIds] = useState<string[]>(() => params.get('lesson') ? [params.get('lesson')!] : [])
  const [exerciseType, setExerciseType] = useState<'QUIZ' | 'WRITTEN'>('QUIZ')
  const [difficulty, setDifficulty] = useState<'BASIC' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE')
  const [questionCount, setQuestionCount] = useState(5)
  const [session, setSession] = useState<StudentPracticeSession | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  if (loading) return <div className="page-content student-page"><p role="status">Đang tải học liệu…</p></div>
  if (error) return <div className="page-content student-page"><section className="panel student-empty" role="alert"><h2>Không tải được môn học</h2><p>{error}</p></section></div>
  if (!workspace) return null

  const currentSubjects = workspace.current?.subjects ?? []
  const subject = currentSubjects.find((item) => item.id === subjectId) ?? currentSubjects[0]
  const lessons = subject?.lessons.filter((lesson) => lesson.materials.some((material) => material.versions.some((version) => version.processingStatus === 'PROCESSED'))) ?? []
  const selectedLessons = lessons.filter((lesson) => lessonIds.includes(lesson.id))
  const validCount = Number.isInteger(questionCount) && questionCount >= 1 && questionCount <= 20

  async function createSession() {
    if (!subject || selectedLessons.length === 0 || !validCount) return
    setSending(true)
    setMessage('')
    try {
      const created = await studentApi.createPracticeSession({ classroomSubjectId: subject.id, lessonIds: selectedLessons.map((lesson) => lesson.id), exerciseType, difficulty, questionCount })
      setSession(created)
      setAnswers({})
      setHasSubmitted(false)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể tạo phiên tự ôn.')
    } finally {
      setSending(false)
    }
  }

  async function submitAnswers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    if (session.questions.some((question) => !answers[question.id]?.trim())) {
      setMessage('Trả lời tất cả câu hỏi trước khi nộp phiên tự ôn.')
      return
    }
    setSending(true)
    setMessage('')
    try {
      const result = await studentApi.submitPracticeSession(session.id, session.questions.map((question) => ({ questionId: question.id, answer: answers[question.id].trim() })))
      setHasSubmitted(true)
      setMessage(result.status === 'GRADED' ? `Đã lưu và chấm phiên tự ôn. Tổng điểm: ${result.totalScore ?? 0}.` : 'Câu trả lời đã được lưu và đang chờ chấm; chưa có điểm.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể nộp câu trả lời.')
    } finally {
      setSending(false)
    }
  }

  return <div className="page-content student-page practice-page">
    <header className="page-heading"><span className="eyebrow"><span className="eyebrow-line" />TỰ HỌC</span><h1>Luyện tập độc lập</h1><p>Chọn học liệu đã công bố của lớp hiện tại để tạo phiên riêng.</p></header>
    <StudentScenarioControl />
    {scenario !== 'current' || !workspace.current ? <section className="panel student-empty"><LockKeyhole size={30} /><h2>Chưa thể tạo phiên tự ôn</h2><p>{scenario === 'history-only' ? 'Lớp đã học chỉ cho phép xem lại.' : 'Em chưa được phân vào lớp hiện tại.'}</p></section> : <div className="practice-layout">
      <section className="panel practice-config" aria-labelledby="practice-config-title"><h2 id="practice-config-title">Cấu hình phiên</h2>
        <label className="student-field">Môn học<select value={subject?.id ?? ''} onChange={(event) => { setSubjectId(event.target.value); setLessonIds([]); setSession(null) }}>{currentSubjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        {!subject || lessons.length === 0 ? <p className="student-notice">Môn này chưa có bài học chứa học liệu đã công bố và xử lý thành công.</p> : <fieldset className="practice-lessons"><legend>Chọn bài học làm nguồn</legend>{lessons.map((lesson) => <label key={lesson.id} className="practice-lesson"><input type="checkbox" checked={lessonIds.includes(lesson.id)} disabled={Boolean(session)} onChange={(event) => setLessonIds((previous) => event.target.checked ? [...previous, lesson.id] : previous.filter((id) => id !== lesson.id))} /><span><strong>{lesson.title}</strong><small>{lesson.materials.filter((material) => material.versions.some((version) => version.processingStatus === 'PROCESSED')).length} học liệu đã xử lý</small></span></label>)}</fieldset>}
        <div className="practice-options"><label className="student-field">Loại câu hỏi<select value={exerciseType} disabled={Boolean(session)} onChange={(event) => setExerciseType(event.target.value as 'QUIZ' | 'WRITTEN')}><option value="QUIZ">Trắc nghiệm (Quiz)</option><option value="WRITTEN">Tự luận ngắn</option></select></label><label className="student-field">Số câu hỏi (1–20)<input type="number" min="1" max="20" step="1" value={questionCount} disabled={Boolean(session)} onChange={(event) => setQuestionCount(Number(event.target.value))} /></label><label className="student-field">Độ khó<select value={difficulty} disabled={Boolean(session)} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}><option value="BASIC">Cơ bản</option><option value="INTERMEDIATE">Vừa</option><option value="ADVANCED">Nâng cao</option></select></label></div>
        <button type="button" className="student-action" onClick={createSession} disabled={sending || Boolean(session) || !selectedLessons.length || !validCount}>{sending ? 'Đang tạo phiên…' : 'Tạo phiên luyện tập'}</button><p className="student-muted">Câu hỏi chỉ được tạo từ nguồn đã xác thực. Nếu AI chưa khả dụng, phiên sẽ không được tạo.</p>
      </section>
      <section className="panel practice-preview" aria-labelledby="practice-preview-title"><div className="student-panel-heading"><div><h2 id="practice-preview-title">Phiên tự ôn</h2><p>{session ? 'Câu hỏi đã được tạo bởi dịch vụ AI' : 'Chưa có phiên luyện tập đang làm'}</p></div><span className="student-badge muted">Riêng tư</span></div>
        {session ? <form onSubmit={submitAnswers}><p>{session.questions.length} câu · {session.exercise_type === 'QUIZ' ? 'Trắc nghiệm' : 'Tự luận ngắn'}</p>{session.questions.map((question, index) => <fieldset className="sa-question" key={question.id} disabled={hasSubmitted || (session.status !== 'PENDING' && Boolean(session.started_at))}><legend>Câu {index + 1}. {question.prompt}</legend>{question.lesson && <small>{question.lesson.title}</small>}{session.exercise_type === 'QUIZ' && Array.isArray(question.options) ? <div className="sa-options">{question.options.filter((option): option is string => typeof option === 'string').map((option) => <label key={option}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))} />{option}</label>)}</div> : <textarea value={answers[question.id] ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} aria-label={`Câu trả lời ${index + 1}`} />}{question.citations.map((citation) => <p key={citation.segment.id}><Link className="student-source" to={`/student/lessons/${question.lesson_id}`}>Nguồn: {citation.segment.position_label} · {question.lesson.title}</Link></p>)}</fieldset>)}<button className="student-action" type="submit" disabled={sending || hasSubmitted}>{sending ? 'Đang lưu câu trả lời…' : hasSubmitted ? 'Đã nộp phiên tự ôn' : 'Nộp phiên tự ôn'}</button></form> : <div className="practice-message"><BookOpen size={25} /><h3>Chọn học liệu để bắt đầu</h3><p>{currentSubjects.length ? 'Chọn môn, bài học và cấu hình phiên. Ứng dụng sẽ chỉ dùng nguồn đã công bố, xử lý thành công.' : 'Lớp hiện tại chưa có môn học.'}</p></div>}
        {message && <p className="student-notice" role="status"><Sparkles size={16} /> {message}</p>}
      </section>
    </div>}
  </div>
}
