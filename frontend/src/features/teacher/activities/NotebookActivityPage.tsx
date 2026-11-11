import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, Check, CircleAlert, ImagePlus, Plus, Trash2 } from 'lucide-react'
import type { ActivityPublicationDraft } from './activities.mock'
import { suggestedCriteria, type NotebookCriterionDraft } from './notebook.mock'

type Props = { classroomSubjectId: string; onBack: () => void; onPublish?: (value: ActivityPublicationDraft) => void }

export function NotebookActivityPage({ classroomSubjectId, onBack, onPublish }: Props) {
  const nextId = useRef(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [criteria, setCriteria] = useState<NotebookCriterionDraft[]>([])
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)

  function addCriterion(content = '', confirmed = false) {
    const id = String(nextId.current++)
    setCriteria((current) => [...current, { id, content, confirmed }])
    setPreview(false)
    setError('')
  }

  function updateCriterion(id: string, update: Partial<NotebookCriterionDraft>) {
    setCriteria((current) => current.map((item) => item.id === id ? { ...item, ...update } : item))
    setPreview(false)
  }

  function moveCriterion(index: number, delta: number) {
    const next = [...criteria]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setCriteria(next)
    setPreview(false)
  }

  function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? [])
    if (chosen.some((file) => !/\.(jpe?g|png)$/i.test(file.name))) {
      setError('Ảnh mẫu cần ở định dạng JPEG hoặc PNG.')
      return
    }
    setImages(chosen)
    setError('')
    setPreview(false)
  }

  function showPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !description.trim()) { setError('Hãy nhập tên và mô tả kiểm tra vở.'); return }
    if (!closesAt || new Date(closesAt).getTime() <= Date.now()) { setError('Hãy chọn thời điểm đóng nhận bài trong tương lai.'); return }
    if (images.length === 0) { setError('Cần ít nhất một ảnh vở mẫu.'); return }
    if (criteria.length === 0 || criteria.some((item) => !item.content.trim() || !item.confirmed)) { setError('Cần ít nhất một tiêu chí nội dung và xác nhận tất cả tiêu chí trước khi công bố.'); return }
    setError('')
    setPreview(true)
  }

  const classroomName = classroomSubjectId.endsWith('11a1') ? '11A1' : '11A2'
  return <section className="panel ta-editor"><button className="ta-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Danh sách hoạt động</button><div className="ta-editor-head"><span className="ta-step">KIỂM TRA VỞ · {classroomName}</span><h2>Tạo kiểm tra vở</h2><p>Giáo viên cung cấp ảnh mẫu và xác nhận từng tiêu chí nội dung trước khi học sinh nộp bài.</p></div><form onSubmit={showPreview} noValidate><div className="ta-field"><label htmlFor="ta-notebook-title">Tên hoạt động</label><input id="ta-notebook-title" value={title} onChange={(event) => { setTitle(event.target.value); setPreview(false) }} placeholder="Ví dụ: Kiểm tra vở bài Cách mạng tháng Tám" /></div><div className="ta-field"><label htmlFor="ta-notebook-description">Nội dung kiểm tra</label><textarea id="ta-notebook-description" value={description} onChange={(event) => { setDescription(event.target.value); setPreview(false) }} placeholder="Học sinh cần ghi các nội dung chính của bài học..." /></div><div className="ta-field"><label htmlFor="ta-notebook-close">Đóng nhận bài</label><input id="ta-notebook-close" type="datetime-local" value={closesAt} onChange={(event) => { setClosesAt(event.target.value); setPreview(false) }} /></div><div className="ta-reference"><label htmlFor="ta-notebook-images"><ImagePlus size={20} /> Ảnh vở mẫu (ít nhất 1 ảnh)</label><input id="ta-notebook-images" type="file" accept="image/jpeg,image/png" multiple onChange={selectImages} /><p>Chọn JPEG hoặc PNG. Các tệp chỉ được liệt kê để xem trước, chưa được tải lên.</p>{images.length > 0 && <ul>{images.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</li>)}</ul>}</div><div className="ta-criteria-head"><div><h3>Tiêu chí nội dung</h3><p>Không dùng phần trăm, trọng số hoặc kết quả Đạt/Không đạt.</p></div><button type="button" className="ta-secondary" onClick={() => addCriterion()}><Plus size={16} /> Thêm tiêu chí</button></div>{criteria.length === 0 ? <div className="ta-criteria-empty">Chưa có tiêu chí nào. Hãy nhập thủ công hoặc chọn gợi ý mẫu bên dưới.</div> : <div className="ta-criteria-list">{criteria.map((item, index) => <div className="ta-criterion" key={item.id}><span className="ta-criterion-number">{index + 1}</span><div><label htmlFor={`criterion-${item.id}`}>Nội dung tiêu chí {index + 1}</label><textarea id={`criterion-${item.id}`} value={item.content} onChange={(event) => updateCriterion(item.id, { content: event.target.value, confirmed: false })} placeholder="Ví dụ: Ghi đủ các mốc chính của bài học" /><label className="ta-confirm"><input type="checkbox" checked={item.confirmed} onChange={(event) => updateCriterion(item.id, { confirmed: event.target.checked })} /> <Check size={14} /> Giáo viên xác nhận tiêu chí này</label></div><div className="ta-criterion-actions"><button type="button" aria-label={`Đưa tiêu chí ${index + 1} lên`} disabled={index === 0} onClick={() => moveCriterion(index, -1)}><ArrowUp size={16} /></button><button type="button" aria-label={`Đưa tiêu chí ${index + 1} xuống`} disabled={index === criteria.length - 1} onClick={() => moveCriterion(index, 1)}><ArrowDown size={16} /></button><button type="button" aria-label={`Xóa tiêu chí ${index + 1}`} onClick={() => { setCriteria((current) => current.filter((candidate) => candidate.id !== item.id)); setPreview(false) }}><Trash2 size={16} /></button></div></div>)}</div>}<div className="ta-suggestions"><strong>Gợi ý minh họa từ ảnh mẫu</strong><p>Đây là dữ liệu mẫu, chưa gọi OCR/AI. Giáo viên phải chỉnh và xác nhận trước khi dùng.</p>{suggestedCriteria.map((suggestion) => <button type="button" key={suggestion} onClick={() => addCriterion(suggestion)}><Plus size={14} /> {suggestion}</button>)}</div><div className="ta-locked-note"><CircleAlert size={17} /> Sau khi đã có bài nộp đầu tiên, các tiêu chí đã xác nhận của hoạt động này sẽ được khóa, kể cả khi giáo viên mở lại thời gian nộp.</div>{error && <p className="ta-error" role="alert">{error}</p>}<button className="ta-primary" type="submit">Xem trước trước khi công bố</button></form>{preview && <div className="ta-preview-result" role="status"><strong>{title}</strong><p>{description}</p><p>Đóng nhận bài: {new Date(closesAt).toLocaleString('vi-VN')} · {images.length} ảnh mẫu · {criteria.length} tiêu chí giáo viên đã xác nhận.</p><ol>{criteria.map((item) => <li key={item.id}>{item.content}</li>)}</ol><p>Chưa có hoạt động nào được lưu hoặc công bố.</p><button type="button" onClick={() => onPublish?.({ title, closesAt, type: 'NOTEBOOK', content: { kind: 'NOTEBOOK', description, criteria: structuredClone(criteria), images: images.map(file => ({ name: file.name, size: file.size })) } })}>Công bố mô phỏng</button></div>}</section>
}
