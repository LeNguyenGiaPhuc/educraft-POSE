import { useState, type FormEvent } from 'react'
import { notebookCriteria } from '../insights/fixtures'
import { exampleQuestions, type ActivityContent, type ActivityPreview, type ExerciseQuestion } from './activities.mock'

type Props = {
  activity: ActivityPreview
  onSave: (value: ActivityPreview) => void
  onClose: () => void
}

export function ActivityEditDialog({ activity, onSave, onClose }: Props) {
  const [title, setTitle] = useState(activity.title)
  const [closesAt, setClosesAt] = useState(activity.closesAt)
  const [content, setContent] = useState<ActivityContent>(() => activity.content ?? (activity.type === 'NOTEBOOK'
    ? { kind: 'NOTEBOOK', description: '', criteria: notebookCriteria.map(item => ({ id: item.id, content: item.content, confirmed: true })), images: [] }
    : { kind: 'EXERCISE', questions: structuredClone(exampleQuestions[activity.type]), sourceLessons: [], difficulty: 'BASIC', requestedCount: exampleQuestions[activity.type].length }))
  const [error, setError] = useState('')

  function updateQuestion(id: string, change: Partial<ExerciseQuestion>) {
    setContent(current => current.kind === 'EXERCISE'
      ? { ...current, questions: current.questions.map(item => item.id === id ? { ...item, ...change } : item) }
      : current)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !Number.isFinite(Date.parse(closesAt))) {
      setError('Nhập tên hoạt động và thời điểm đóng hợp lệ.')
      return
    }
    if (content.kind === 'NOTEBOOK' && (!content.criteria.length || content.criteria.some(item => !item.content.trim()))) {
      setError('Mỗi tiêu chí kiểm tra vở cần có nội dung.')
      return
    }
    if (content.kind === 'EXERCISE' && content.questions.some(item =>
      !item.prompt.trim() || !item.answer.trim() || !item.explanation.trim() || !item.citation.trim()
      || !Number.isFinite(item.maxPoints) || item.maxPoints <= 0
      || item.options?.some(option => !option.trim())
      || (item.options && !item.options.includes(item.answer))
    )) {
      setError('Hoàn thiện câu hỏi, đáp án, điểm tối đa, giải thích và trích dẫn trước khi lưu.')
      return
    }
    onSave({ ...activity, title: title.trim(), closesAt, content })
  }

  return (
    <div className="ta-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="activity-edit-title">
      <div className="ta-dialog-window">
        <div className="ta-dialog-header">
          <h2 id="activity-edit-title">Sửa hoạt động</h2>
          <button type="button" className="ta-dialog-close-btn" aria-label="Đóng" onClick={onClose}>×</button>
        </div>
        <div className="ta-dialog-body">
          <form className="ta-edit-form" onSubmit={submit}>
            <label>Tên hoạt động<input value={title} onChange={event => setTitle(event.target.value)} /></label>
            <label>Đóng nhận bài<input type="datetime-local" value={closesAt} onChange={event => setClosesAt(event.target.value)} /></label>
            {content.kind === 'NOTEBOOK' ? (
              <>
                <label>Nội dung kiểm tra
                  <textarea value={content.description} onChange={event => setContent({ ...content, description: event.target.value })} />
                </label>
                {content.criteria.map((criterion, index) => (
                  <label key={criterion.id}>Tiêu chí {index + 1}
                    <textarea value={criterion.content} onChange={event => setContent({ ...content, criteria: content.criteria.map(item => item.id === criterion.id ? { ...item, content: event.target.value } : item) })} />
                  </label>
                ))}
                <p>Ảnh mẫu đang là dữ liệu minh họa; chức năng thay ảnh sẽ nối backend ở giai đoạn sau.</p>
              </>
            ) : content.questions.map((question, index) => (
              <fieldset key={question.id}>
                <legend>Câu {index + 1}</legend>
                <label>Nội dung câu hỏi<textarea value={question.prompt} onChange={event => updateQuestion(question.id, { prompt: event.target.value })} /></label>
                {question.options?.map((option, optionIndex) => (
                  <label key={optionIndex}>Lựa chọn {optionIndex + 1}
                    <input value={option} onChange={event => updateQuestion(question.id, {
                      options: question.options?.map((value, i) => i === optionIndex ? event.target.value : value),
                      answer: question.answer === option ? event.target.value : question.answer,
                    })} />
                  </label>
                ))}
                <label>Đáp án
                  {question.options ? <select value={question.answer} onChange={event => updateQuestion(question.id, { answer: event.target.value })}>{question.options.map((option, optionIndex) => <option key={optionIndex} value={option}>{option}</option>)}</select>
                    : <textarea value={question.answer} onChange={event => updateQuestion(question.id, { answer: event.target.value })} />}
                </label>
                {!question.options && <label>Tiêu chí chấm<textarea value={question.markingCriteria ?? ''} onChange={event => updateQuestion(question.id, { markingCriteria: event.target.value })} /></label>}
                <label>Điểm tối đa<input type="number" min="0.5" step="0.5" value={Number.isNaN(question.maxPoints) ? '' : question.maxPoints} onChange={event => updateQuestion(question.id, { maxPoints: event.target.valueAsNumber })} /></label>
                <label>Bài học / chủ đề<input value={question.lessonTag} onChange={event => updateQuestion(question.id, { lessonTag: event.target.value })} /></label>
                <label>Giải thích<textarea value={question.explanation} onChange={event => updateQuestion(question.id, { explanation: event.target.value })} /></label>
                <label>Trích dẫn nguồn<input value={question.citation} onChange={event => updateQuestion(question.id, { citation: event.target.value })} /></label>
              </fieldset>
            ))}
            {!activity.content && <p className="adm-inline-note">Hoạt động mẫu cũ không có nội dung lưu sẵn. Câu hỏi trên chỉ là dữ liệu minh họa để chỉnh sửa.</p>}
            {error && <p role="alert" className="ta-error">{error}</p>}
            <div className="ta-confirm-actions">
              <button type="button" className="ta-secondary" onClick={onClose}>Hủy</button>
              <button type="submit" className="ta-primary">Lưu bản xem trước</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
