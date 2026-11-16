import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react'
import type {
  TeacherNotebookCheckDetail,
  TeacherNotebookCriterion,
} from '../../../lib/api/teacher/notebookChecks'

type DraftCriterion = { id: string; content: string }

type Props = {
  activity?: TeacherNotebookCheckDetail
  isSaving: boolean
  onCancel: () => void
  onSave: (input: {
    title: string
    description: string
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

function initialCriteria(criteria: TeacherNotebookCriterion[] | undefined): DraftCriterion[] {
  return criteria?.map((criterion) => ({ id: criterion.id, content: criterion.content })) ?? []
}

export function NotebookCheckForm({ activity, isSaving, onCancel, onSave }: Props) {
  const locked = Boolean(activity?.criteriaLockedAt)
  const [title, setTitle] = useState(activity?.title ?? '')
  const [description, setDescription] = useState(activity?.description ?? '')
  const [closesAt, setClosesAt] = useState(localDateTime(activity?.closesAt))
  const [criteria, setCriteria] = useState<DraftCriterion[]>(() => initialCriteria(activity?.criteria))
  const [files, setFiles] = useState<File[]>([])
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
    setError('')
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

    setError('')
    await onSave({
      title: title.trim(),
      description: description.trim(),
      closesAt: toIso(closesAt),
      criteria: cleanCriteria.map((content) => ({ content })),
      files,
    })
  }

  return (
    <form className="tn-form" onSubmit={submit} noValidate>
      <div className="ta-form-grid">
        <label>Tên hoạt động *<input value={title} maxLength={250} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Đóng nhận bài<input type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} /></label>
      </div>
      <label>Mô tả<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>

      <fieldset className="tn-section">
        <legend>Ảnh vở mẫu</legend>
        <label className="tn-file-picker">
          <ImagePlus size={17} /> Chọn ảnh JPEG/PNG
          <input type="file" accept="image/jpeg,image/png" multiple onChange={selectFiles} disabled={locked} />
        </label>
        <p className="tn-help">Ảnh được tải lên sau khi lưu hoạt động. Mỗi file tối đa 10MB.</p>
        {files.length > 0 && <ul className="tn-file-list">{files.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}</ul>}
        {activity && activity.referenceFiles.length > 0 && <p className="tn-help">Đã có {activity.referenceFiles.length} ảnh mẫu trên backend.</p>}
      </fieldset>

      <fieldset className="tn-section">
        <legend>Tiêu chí nội dung {locked && '(đã khóa)'}</legend>
        <p className="tn-help">Mỗi tiêu chí là một nội dung giáo viên muốn kiểm tra. Không dùng phần trăm hoặc điểm số.</p>
        {criteria.length === 0 && <p className="tn-empty">Chưa có tiêu chí.</p>}
        <div className="tn-criteria-list">
          {criteria.map((criterion, index) => (
            <div className="tn-criterion-row" key={criterion.id}>
              <span>{index + 1}</span>
              <textarea value={criterion.content} rows={2} disabled={locked} onChange={(event) => updateCriterion(criterion.id, event.target.value)} placeholder="Ví dụ: Ghi đủ các mốc chính của bài học" />
              <div className="tn-criterion-actions">
                <button type="button" aria-label="Đưa tiêu chí lên" disabled={locked || index === 0} onClick={() => moveCriterion(index, -1)}><ArrowUp size={14} /></button>
                <button type="button" aria-label="Đưa tiêu chí xuống" disabled={locked || index === criteria.length - 1} onClick={() => moveCriterion(index, 1)}><ArrowDown size={14} /></button>
                <button type="button" aria-label="Xóa tiêu chí" disabled={locked} onClick={() => removeCriterion(criterion.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="ta-secondary" disabled={locked} onClick={addCriterion}><Plus size={14} /> Thêm tiêu chí</button>
      </fieldset>

      {locked && <p className="tn-lock-note">Hoạt động đã có bài nộp nên ảnh mẫu và tiêu chí không thể thay đổi.</p>}
      {error && <p className="ta-error" role="alert">{error}</p>}
      <div className="ta-confirm-actions">
        <button type="button" className="ta-secondary" disabled={isSaving} onClick={onCancel}>Hủy</button>
        <button type="submit" className="ta-primary" disabled={isSaving || locked}>{isSaving ? 'Đang lưu...' : activity ? 'Lưu thay đổi' : 'Tạo bản nháp'}</button>
      </div>
    </form>
  )
}
