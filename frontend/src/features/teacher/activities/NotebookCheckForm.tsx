import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react'
import type {
  TeacherNotebookCheckDetail,
  TeacherNotebookCriterion,
} from '../../../lib/api/teacher/notebookChecks'
import { teacherNotebookChecksApi } from '../../../lib/api/teacher/notebookChecks'
import { mergeNotebookCriteriaSuggestions, type NotebookCriterionDraft } from './notebookCriteriaSuggestions'

type Props = {
  classroomSubjectId: string
  activity?: TeacherNotebookCheckDetail
  isSaving: boolean
  onCancel: () => void
  onSave: (input: {
    title: string
    description: string
    dueAt: string | null
    closesAt: string | null
    criteria: Array<{ content: string }>
    files: File[]
  }) => Promise<void>
}

function localDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

function initialCriteria(criteria: TeacherNotebookCriterion[] | undefined): NotebookCriterionDraft[] {
  return criteria?.map((criterion) => ({ id: criterion.id, content: criterion.content })) ?? []
}

export function NotebookCheckForm({ classroomSubjectId, activity, isSaving, onCancel, onSave }: Props) {
  const locked = Boolean(activity?.criteriaLockedAt)
  const [title, setTitle] = useState(activity?.title ?? '')
  const [description, setDescription] = useState(activity?.description ?? '')
  const [dueAt, setDueAt] = useState(localDateTime(activity?.periods[0]?.dueAt ?? activity?.closesAt))
  const [criteria, setCriteria] = useState<NotebookCriterionDraft[]>(() => initialCriteria(activity?.criteria))
  const [files, setFiles] = useState<File[]>([])
  const [suggestions, setSuggestions] = useState<Array<{ content: string }>>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestionMessage, setSuggestionMessage] = useState('')
  const [error, setError] = useState('')

  function addCriterion() {
    setCriteria((current) => [...current, { id: `new-${Date.now()}-${current.length}`, content: '' }])
  }

  function updateCriterion(id: string, content: string) {
    setCriteria((current) => current.map((criterion) => criterion.id === id ? { ...criterion, content } : criterion))
  }

  function moveCriterion(index: number, direction: number) {
    const target = index + direction
    if (target < 0 || target >= criteria.length) return
    const next = [...criteria]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setCriteria(next)
  }

  function removeCriterion(id: string) {
    setCriteria((current) => current.filter((criterion) => criterion.id !== id))
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? [])
    const invalid = chosen.find((file) => !['image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024)
    if (invalid) {
      setError('Ảnh mẫu chỉ nhận JPEG/PNG và mỗi file không quá 10MB.')
      return
    }
    setFiles(chosen)
    setSuggestions([])
    setSuggestionMessage('')
    setError('')
  }

  async function suggestCriteria() {
    if (files.length === 0) {
      setError('Cần chọn ít nhất một ảnh vở mẫu trước khi xin gợi ý.')
      return
    }

    setIsSuggesting(true)
    setError('')
    setSuggestionMessage('')
    try {
      const result = await teacherNotebookChecksApi.suggestCriteria(classroomSubjectId, files)
      setSuggestions(result.criteria)
      if (result.status !== 'READY') {
        setSuggestionMessage(result.message ?? 'AI chưa thể gợi ý tiêu chí; giáo viên có thể nhập thủ công.')
      }
    } catch (suggestionError) {
      setSuggestionMessage(suggestionError instanceof Error ? suggestionError.message : 'Không thể lấy gợi ý tiêu chí.')
      setSuggestions([])
    } finally {
      setIsSuggesting(false)
    }
  }

  function addSuggestions(nextSuggestions: Array<{ content: string }>) {
    setCriteria((current) => mergeNotebookCriteriaSuggestions(current, nextSuggestions))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanCriteria = criteria.map((criterion) => criterion.content.trim()).filter(Boolean)
    if (!title.trim()) {
      setError('Tên hoạt động không được để trống.')
      return
    }
    if (criteria.length > 0 && cleanCriteria.length !== criteria.length) {
      setError('Tiêu chí không được để trống.')
      return
    }
    if (cleanCriteria.length === 0) {
      setError('Cần ít nhất một tiêu chí trước khi tạo hoạt động.')
      return
    }
    if (!activity && !dueAt) {
      setError('Cần chọn hạn nộp cho đợt đầu tiên.')
      return
    }
    if (!activity && files.length === 0) {
      setError('Cần chọn ít nhất một ảnh vở mẫu.')
      return
    }

    setError('')
    await onSave({
      title: title.trim(),
      description: description.trim(),
      dueAt: toIso(dueAt),
      closesAt: toIso(dueAt),
      criteria: cleanCriteria.map((content) => ({ content })),
      files,
    })
  }

  return (
    <form className="tn-form" onSubmit={submit} noValidate>
      <div className="ta-form-grid">
        <label>Tên hoạt động *<input value={title} maxLength={250} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>{activity ? 'Đóng nhận bài' : 'Hạn nộp đợt đầu *'}<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
      </div>
      <label>Mô tả<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>

      <fieldset className="tn-section">
        <legend>Ảnh vở mẫu</legend>
        <label className="tn-file-picker">
          <ImagePlus size={17} /> Chọn ảnh JPEG/PNG
          <input type="file" accept="image/jpeg,image/png" multiple onChange={selectFiles} disabled={locked} />
        </label>
        <p className="tn-help">{activity ? 'Ảnh được tải lên sau khi lưu hoạt động. Mỗi file tối đa 10MB.' : 'Chọn 1–5 ảnh JPEG/PNG để tạo và công bố hoạt động. Mỗi file tối đa 10MB.'}</p>
        {files.length > 0 && <ul className="tn-file-list">{files.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}</ul>}
        {activity && activity.referenceFiles.length > 0 && <p className="tn-help">Đã có {activity.referenceFiles.length} ảnh mẫu trên backend.</p>}
        <button type="button" className="ta-secondary" disabled={locked || isSuggesting || files.length === 0} onClick={() => void suggestCriteria()}>{isSuggesting ? 'Đang đọc ảnh...' : 'Gợi ý tiêu chí bằng AI'}</button>
        {suggestionMessage && <p className="tn-help" role="status">{suggestionMessage}</p>}
      </fieldset>

      <fieldset className="tn-section">
        <legend>Tiêu chí nội dung {locked && '(đã khóa)'}</legend>
        <p className="tn-help">Mỗi tiêu chí là một nội dung giáo viên muốn kiểm tra. Không dùng phần trăm hoặc điểm số.</p>
        {criteria.length === 0 && <p className="tn-empty">Chưa có tiêu chí.</p>}
        <div className="tn-criteria-list">
          {criteria.map((criterion, index) => (
            <div className="tn-criterion-row" key={criterion.id}>
              <span>{index + 1}</span>
              <textarea aria-label={`Tiêu chí ${index + 1}`} value={criterion.content} rows={2} disabled={locked} onChange={(event) => updateCriterion(criterion.id, event.target.value)} placeholder="Ví dụ: Ghi đủ các mốc chính của bài học" />
              <div className="tn-criterion-actions">
                <button type="button" aria-label="Đưa tiêu chí lên" disabled={locked || index === 0} onClick={() => moveCriterion(index, -1)}><ArrowUp size={14} /></button>
                <button type="button" aria-label="Đưa tiêu chí xuống" disabled={locked || index === criteria.length - 1} onClick={() => moveCriterion(index, 1)}><ArrowDown size={14} /></button>
                <button type="button" aria-label="Xóa tiêu chí" disabled={locked} onClick={() => removeCriterion(criterion.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="ta-secondary" disabled={locked} onClick={addCriterion}><Plus size={14} /> Thêm tiêu chí</button>
        {suggestions.length > 0 && <div className="ta-suggestions"><strong>Gợi ý từ ảnh mẫu</strong><p>Giáo viên chọn từng tiêu chí hoặc thêm tất cả; AI không tự động chốt.</p><button type="button" className="ta-secondary" disabled={locked} onClick={() => addSuggestions(suggestions)}>Thêm tất cả gợi ý</button>{suggestions.map((suggestion) => <button type="button" key={suggestion.content} className="ta-secondary" disabled={locked} onClick={() => addSuggestions([suggestion])}>Thêm: {suggestion.content}</button>)}</div>}
      </fieldset>

      {locked && <p className="tn-lock-note">Hoạt động đã có bài nộp nên ảnh mẫu và tiêu chí không thể thay đổi.</p>}
      {error && <p className="ta-error" role="alert">{error}</p>}
      <div className="ta-confirm-actions">
        <button type="button" className="ta-secondary" disabled={isSaving} onClick={onCancel}>Hủy</button>
        <button type="submit" className="ta-primary" disabled={isSaving || locked}>{isSaving ? 'Đang lưu...' : activity ? 'Lưu thay đổi' : 'Tạo và công bố'}</button>
      </div>
    </form>
  )
}
