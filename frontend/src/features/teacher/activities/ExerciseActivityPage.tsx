import { useState, type FormEvent } from 'react'
import { ArrowLeft, CircleAlert, FileSearch, Sparkles } from 'lucide-react'
import { readPublishedTeacherLessons } from '../lessons/lesson-preview-store'
import { difficultyLabels, exampleQuestions, type Difficulty, type ExerciseQuestion, type ExerciseType, type ActivityPublicationDraft } from './activities.mock'

type Props = { classroomSubjectId: string; type: ExerciseType; onBack: () => void; onPublish?: (value: ActivityPublicationDraft) => void }

export function ExerciseActivityPage({ classroomSubjectId, type, onBack, onPublish }: Props) {
  const eligibleLessons = readPublishedTeacherLessons().filter((item) => item.classroomSubjectId === classroomSubjectId)
  const [selectedLessons, setSelectedLessons] = useState<string[]>([])
  const [count, setCount] = useState(5)
  const [difficulty, setDifficulty] = useState<Difficulty>('BASIC')
  const [title, setTitle] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [showNoSource, setShowNoSource] = useState(false)
  const [draft, setDraft] = useState<ExerciseQuestion[] | null>(null)
  const [error, setError] = useState('')
  const isQuiz = type === 'QUIZ'

  function toggleLesson(id: string) {
    setSelectedLessons((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    setDraft(null)
  }

  function previewDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) { setError('Hãy nhập tên hoạt động.'); return }
    if (!Number.isInteger(count) || count < 1 || count > 20) { setError('Số câu hỏi phải từ 1 đến 20.'); return }
    if (showNoSource || eligibleLessons.length === 0) { setError('Chưa có học liệu đã công bố và xử lý thành công để làm nguồn.'); return }
    if (!selectedLessons.length) { setError('Hãy chọn ít nhất một bài học đã công bố.'); return }
    if (!closesAt || new Date(closesAt).getTime() <= Date.now()) { setError('Hãy chọn thời điểm đóng nhận bài trong tương lai.'); return }
    setError('')
    setDraft(exampleQuestions[type].map((question) => ({ ...question, options: question.options ? [...question.options] : undefined })))
  }

  function updateQuestion(id: string, field: keyof ExerciseQuestion, value: string | number) {
    setDraft((current) => current?.map((question) => question.id === id ? { ...question, [field]: value } : question) ?? null)
  }

  function updateOption(id: string, index: number, value: string) {
    setDraft((current) => current?.map((question) => question.id === id ? { ...question, options: question.options?.map((option, i) => i === index ? value : option) } : question) ?? null)
  }

  const sourcesReady = !showNoSource && eligibleLessons.length > 0
  const draftComplete = draft?.every((question) => question.prompt.trim() && question.answer.trim() && question.lessonTag.trim() && question.explanation.trim() && question.citation.trim() && Number.isFinite(question.maxPoints) && question.maxPoints > 0 && (isQuiz ? question.options?.every((option) => option.trim()) : question.markingCriteria?.trim())) ?? false

  return <section className="panel ta-editor"><button className="ta-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Danh sách hoạt động</button><div className="ta-editor-head"><span className="ta-step">TẠO TRONG MỘT LƯỢT</span><h2>{isQuiz ? 'Tạo quiz' : 'Tạo bài tự luận ngắn'}</h2><p>Chọn học liệu trước, xem bản nháp minh họa, chỉnh lại câu hỏi rồi mới công bố khi API được kết nối.</p></div><form onSubmit={previewDraft} noValidate><div className="ta-form-grid"><div className="ta-field"><label htmlFor="ta-ex-title">Tên hoạt động</label><input id="ta-ex-title" value={title} onChange={(event) => { setTitle(event.target.value); setDraft(null) }} placeholder={isQuiz ? 'Ví dụ: Ôn tập Cách mạng tháng Tám' : 'Ví dụ: Trình bày ý nghĩa lịch sử'} /></div><div className="ta-field"><label htmlFor="ta-ex-count">Số câu hỏi (1–20)</label><input id="ta-ex-count" type="number" min="1" max="20" value={Number.isNaN(count) ? '' : count} onChange={(event) => { setCount(event.target.valueAsNumber); setDraft(null) }} /></div><div className="ta-field"><label htmlFor="ta-ex-difficulty">Độ khó</label><select id="ta-ex-difficulty" value={difficulty} onChange={(event) => { setDifficulty(event.target.value as Difficulty); setDraft(null) }}>{Object.entries(difficultyLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div><div className="ta-field"><label htmlFor="ta-ex-close">Đóng nhận bài</label><input id="ta-ex-close" type="datetime-local" value={closesAt} onChange={(event) => { setClosesAt(event.target.value); setDraft(null) }} /></div></div><fieldset className="ta-lesson-picker"><legend>Bài học đã công bố và xử lý xong</legend>{sourcesReady ? eligibleLessons.map((lesson) => <label key={lesson.id}><input type="checkbox" checked={selectedLessons.includes(lesson.id)} onChange={() => toggleLesson(lesson.id)} /> <span>{lesson.title}</span></label>) : <p><CircleAlert size={17} /> Không có nguồn hợp lệ. Giáo viên cần xử lý hoặc chọn học liệu khác.</p>}</fieldset><label className="ta-scenario"><input type="checkbox" checked={showNoSource} onChange={(event) => { setShowNoSource(event.target.checked); setDraft(null) }} /> Xem tình huống nguồn chưa xử lý (mẫu kiểm thử)</label>{error && <p className="ta-error" role="alert">{error}</p>}<button className="ta-primary" type="submit"><Sparkles size={17} /> Xem bản nháp minh họa</button><p className="ta-hint">Chưa gửi yêu cầu đến AI. Bản nháp bên dưới là dữ liệu mẫu, không phải câu hỏi được hệ thống tạo.</p></form>
    {draft && <div className="ta-review"><div className="ta-review-head"><div><span className="ta-step">GIÁO VIÊN DUYỆT</span><h3>Bản nháp câu hỏi</h3></div><span>{draft.length}/{count} câu minh họa</span></div><p className="ta-hint">{draft.length < count ? `Bản nháp mới có ${draft.length}/${count} câu mẫu. AI thật sẽ phải tạo đủ trước khi công bố.` : `Đây là ${draft.length} câu mẫu để xem giao diện; chưa có AI tạo câu hỏi thật.`}</p>{draft.map((question, index) => <article className="ta-question" key={question.id}><div className="ta-question-number">Câu {index + 1}</div><div className="ta-field"><label htmlFor={`prompt-${question.id}`}>Nội dung câu hỏi</label><textarea id={`prompt-${question.id}`} value={question.prompt} onChange={(event) => updateQuestion(question.id, 'prompt', event.target.value)} /></div>{isQuiz ? <><div className="ta-options">{question.options?.map((option, optionIndex) => <div className="ta-field" key={optionIndex}><label htmlFor={`${question.id}-option-${optionIndex}`}>Lựa chọn {String.fromCharCode(65 + optionIndex)}</label><input id={`${question.id}-option-${optionIndex}`} value={option} onChange={(event) => updateOption(question.id, optionIndex, event.target.value)} /></div>)}</div><div className="ta-field"><label htmlFor={`${question.id}-answer`}>Đáp án đúng</label><select id={`${question.id}-answer`} value={question.answer} onChange={(event) => updateQuestion(question.id, 'answer', event.target.value)}>{question.options?.map((option, i) => <option key={i} value={option}>{String.fromCharCode(65 + i)} · {option}</option>)}</select></div></> : <><div className="ta-field"><label htmlFor={`${question.id}-answer`}>Đáp án mong đợi</label><textarea id={`${question.id}-answer`} value={question.answer} onChange={(event) => updateQuestion(question.id, 'answer', event.target.value)} /></div><div className="ta-field"><label htmlFor={`${question.id}-criteria`}>Tiêu chí chấm</label><textarea id={`${question.id}-criteria`} value={question.markingCriteria ?? ''} onChange={(event) => updateQuestion(question.id, 'markingCriteria', event.target.value)} /></div></>}<div className="ta-form-grid"><div className="ta-field"><label htmlFor={`${question.id}-points`}>Điểm tối đa</label><input id={`${question.id}-points`} type="number" min="0.5" step="0.5" value={Number.isNaN(question.maxPoints) ? '' : question.maxPoints} onChange={(event) => updateQuestion(question.id, 'maxPoints', event.target.valueAsNumber)} /></div><div className="ta-field"><label htmlFor={`${question.id}-tag`}>Bài học / chủ đề</label><input id={`${question.id}-tag`} value={question.lessonTag} onChange={(event) => updateQuestion(question.id, 'lessonTag', event.target.value)} /></div></div><div className="ta-field"><label htmlFor={`${question.id}-explanation`}>Giải thích</label><textarea id={`${question.id}-explanation`} value={question.explanation} onChange={(event) => updateQuestion(question.id, 'explanation', event.target.value)} /></div><div className="ta-field"><label htmlFor={`${question.id}-citation`}>Nguồn trích dẫn</label><input id={`${question.id}-citation`} value={question.citation} onChange={(event) => updateQuestion(question.id, 'citation', event.target.value)} /></div></article>)}{!draftComplete && <p className="ta-error"><CircleAlert size={16} /> Bản nháp thiếu nội dung bắt buộc hoặc nguồn trích dẫn; chưa thể công bố.</p>}<div className="ta-publish"><FileSearch size={18} /><span>{draftComplete ? 'Câu hỏi mẫu đã đủ trường hiển thị. Khi kết nối backend, cần kiểm tra nguồn và đủ số câu trước khi công bố thật.' : 'Hãy hoàn thiện các câu hỏi mẫu.'}</span><button type="button" disabled={!draftComplete} onClick={() => onPublish?.({ title, closesAt, type, content: { kind: 'EXERCISE', questions: structuredClone(draft), sourceLessons: structuredClone(eligibleLessons.filter(lesson => selectedLessons.includes(lesson.id))), difficulty, requestedCount: count } })}>Công bố mô phỏng</button></div></div>}
  </section>
}
