import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, BookOpen, CircleAlert, CloudUpload, FileText, Plus, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { assignedSubjects, sampleLessons, type LessonPreview } from '../fixtures'
import { acceptedMaterialTypes, isSupportedMaterial, maxMaterialBytes, processingLabels, publicationLabels } from './lessons.mock'
import './lessons.css'

type Editor = { kind: 'create' | 'edit'; lesson?: LessonPreview }

export function LessonsPage() {
  const [params] = useSearchParams()
  const requested = params.get('classroomSubjectId')
  const [subjectId, setSubjectId] = useState(assignedSubjects.some((item) => item.id === requested) ? requested! : assignedSubjects[0]?.id ?? '')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const visibleLessons = sampleLessons.filter((item) => item.classroomSubjectId === subjectId)
  const subject = assignedSubjects.find((item) => item.id === subjectId)

  function startEditor(next: Editor) {
    setEditor(next)
    setTitle(next.lesson?.title ?? '')
    setFile(null)
    setError('')
    setPreview(false)
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null
    setError('')
    setPreview(false)
    if (chosen && !isSupportedMaterial(chosen)) { setFile(null); setError('Chỉ chọn PDF, PPTX, DOCX, JPEG hoặc PNG.'); return }
    if (chosen && chosen.size > maxMaterialBytes) { setFile(null); setError('Tệp phải không vượt quá 20 MB.'); return }
    setFile(chosen)
  }

  function previewLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) { setError('Hãy nhập tên bài học.'); return }
    setError('')
    setPreview(true)
  }

  return <div className="page-content tl-page"><div className="page-heading"><h1>Bài học & học liệu</h1><p>Chuẩn bị nội dung theo môn được phân công; chỉ học liệu đã công bố và xử lý thành công mới hỗ trợ AI.</p></div><div className="sample-strip"><BookOpen size={16} /> Dữ liệu minh họa. Tệp được chọn chỉ hiển thị trên máy, chưa được tải lên.</div><div className="tl-toolbar"><label htmlFor="tl-subject">Môn học của lớp</label><select id="tl-subject" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setEditor(null) }}>{assignedSubjects.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.classroomId.includes('11a1') ? '11A1' : '11A2'}</option>)}</select><button type="button" className="tl-main-button" onClick={() => startEditor({ kind: 'create' })}><Plus size={17} /> Tạo bài học</button></div>
    {editor ? <div className="tl-editor panel"><button className="tl-back" type="button" onClick={() => setEditor(null)}><ArrowLeft size={16} /> Quay lại danh sách</button><h2>{editor.kind === 'create' ? 'Tạo bài học' : 'Chỉnh sửa bài học'}</h2><p>Bản xem trước biểu mẫu của {subject?.name} · {subjectId.endsWith('11a1') ? '11A1' : '11A2'}</p><form onSubmit={previewLesson} noValidate><label htmlFor="tl-title">Tên bài học <span>*</span></label><input id="tl-title" value={title} onChange={(event) => { setTitle(event.target.value); setPreview(false) }} placeholder="Ví dụ: Cách mạng tháng Tám năm 1945" /><label htmlFor="tl-file">Học liệu hỗ trợ</label><div className="tl-upload"><CloudUpload size={22} /><span>{file ? file.name : 'Chọn tệp để xem trước'}</span><small>PDF, PPTX, DOCX, JPEG, PNG · tối đa 20 MB/tệp</small><input id="tl-file" type="file" accept={acceptedMaterialTypes} onChange={selectFile} /></div>{editor.lesson && <div className="tl-version"><RefreshCw size={16} /> Thay học liệu sẽ tạo phiên bản mới; nguồn đã dùng trong kết quả cũ vẫn được giữ.</div>}{error && <p className="tl-error" role="alert">{error}</p>}<button className="tl-main-button" type="submit">Xem trước bài học</button>{preview && <div className="tl-preview" role="status"><strong>{title.trim()}</strong><p>{file ? `Tệp dự kiến: ${file.name}. Chưa tải lên và chưa xử lý nội dung.` : 'Chưa chọn học liệu.'} Bài học chưa được lưu hoặc công bố.</p><button type="button" disabled title="Chức năng chờ API">Công bố · chờ kết nối API</button></div>}</form></div> : <><div className="tl-summary"><span><strong>{visibleLessons.length}</strong> bài học trong môn</span><span><strong>{visibleLessons.filter((item) => item.status === 'PUBLISHED').length}</strong> đã công bố</span></div>{visibleLessons.length === 0 ? <div className="panel tl-empty"><BookOpen size={29} /><h2>Chưa có bài học</h2><p>Tạo bài học đầu tiên cho môn này khi bạn sẵn sàng.</p></div> : <div className="tl-list">{visibleLessons.map((lesson) => <article className="panel tl-card" key={lesson.id}><div className="tl-card-head"><div className="tl-file-icon"><FileText size={20} /></div><div><h2>{lesson.title}</h2><p>{lesson.materials.length} học liệu</p></div><span className={`tl-tag ${lesson.status.toLowerCase()}`}>{publicationLabels[lesson.status]}</span></div><ul>{lesson.materials.map((material) => <li key={material.id}><FileText size={16} /><span>{material.name}<small>Phiên bản {material.version} · {material.sourcePosition}</small></span><strong className={material.processing.toLowerCase()}>{processingLabels[material.processing]}</strong></li>)}</ul>{lesson.materials.some((material) => material.processing === 'FAILED') && <div className="tl-warning"><CircleAlert size={16} /> Học liệu chưa trích xuất được; AI không dùng tệp này làm nguồn. Có thể chọn tệp thay thế.</div>}<button type="button" className="tl-text-button" onClick={() => startEditor({ kind: 'edit', lesson })}>Xem / chỉnh sửa bản mẫu</button></article>)}</div>}</>}
  </div>
}
