import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, BookOpen, CircleAlert, CloudUpload, FileText, Plus } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { assignedClasses, assignedSubjects, registerTeacherPreviewItem, type LessonPreview } from '../fixtures'
import { TeacherBackButton } from '../components/TeacherBackButton'
import { acceptedMaterialTypes, isSupportedMaterial, maxMaterialBytes, processingLabels, publicationLabels, canPublishMaterials, sampleReplacement } from './lessons.mock'
import { publishedLessonPreviews, readTeacherLessons } from './lesson-preview-store'
import './lessons.css'

type Material = LessonPreview['materials'][number] & { local?: boolean }

export function LessonsPage() {
  const route = useParams()
  const [params, setParams] = useSearchParams()
  const subjectId = route.classroomSubjectId ?? params.get('classroomSubjectId') ?? assignedSubjects[0]?.id
  const subject = assignedSubjects.find((item) => item.id === subjectId && (!route.classroomId || item.classroomId === route.classroomId))
  const [status, setStatus] = useState('ALL')
  if (!subject) return <div className="page-content tl-page"><Link className="tl-back" to="/teacher/classes"><ArrowLeft size={16} /> Quay lại lớp của tôi</Link><h1>Không tìm thấy môn được phân công</h1><p>Chọn lại lớp và môn để xem bài học.</p></div>
  const classroom = assignedClasses.find((item) => item.id === subject.classroomId)
  const workspace = `/teacher/classes/${subject.classroomId}/subjects/${subject.id}`
  const parent = `${workspace}?tab=lessons`
  const lessons = readTeacherLessons().filter((item) => item.classroomSubjectId === subject.id)
  const lesson = lessons.find((item) => item.id === route.lessonId)
  const creating = route.lessonId === 'new'
  if (route.lessonId && !creating && !lesson) return <div className="page-content tl-page"><Link className="tl-back" to={parent}><ArrowLeft size={16} /> Quay lại bài học</Link><h1>Bài học không khả dụng</h1><p>Bài học không thuộc lớp/môn này hoặc liên kết không còn hợp lệ.</p></div>
  if (creating || lesson) return <LessonEditor key={`${subject.id}-${route.lessonId}`} lesson={lesson} subjectId={subject.id} classroomId={subject.classroomId} context={`${classroom?.name} · ${subject.name}`} parent={parent} />
  const visible = lessons.filter((item) => status === 'ALL' || item.status === status)
  return <div className="tl-page"><div className="page-heading"><h1>Bài học & học liệu</h1><p>{classroom?.name} · {subject.name} — chuẩn bị nội dung và kiểm tra nguồn học liệu.</p></div>
    <div className="sample-strip"><BookOpen size={16} /> Dữ liệu mẫu, chưa kết nối API. Các thao tác chỉ minh họa trong phiên xem.</div>
    <div className="tl-toolbar">{!route.classroomSubjectId && <><label htmlFor="tl-subject">Lớp / môn</label><select id="tl-subject" value={subject.id} onChange={(event) => setParams({ classroomSubjectId: event.target.value })}>{assignedSubjects.map((item) => <option key={item.id} value={item.id}>{assignedClasses.find((entry) => entry.id === item.classroomId)?.name} · {item.name}</option>)}</select></>}
      <label htmlFor="tl-status">Trạng thái</label><select id="tl-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">Tất cả</option>{Object.entries(publicationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <Link className="tl-main-button" to={`${workspace}/lessons/new`}><Plus size={17} /> Tạo bài học</Link></div>
    <p className="tl-summary">{visible.length} bài học · {lessons.filter((item) => item.status === 'PUBLISHED').length} đã công bố trong dữ liệu mẫu</p>
    {visible.length === 0 ? <div className="panel tl-empty"><BookOpen size={28} /><h2>Chưa có bài học phù hợp</h2><p>Đổi bộ lọc hoặc tạo bài học cho môn này.</p></div> : <div className="tl-list">{visible.map((item) => <article className="panel tl-card" key={item.id}><div className="tl-card-head"><FileText size={22} /><div><h2><Link to={`${workspace}/lessons/${item.id}`}>{item.title}</Link></h2><p>{item.materials.length} học liệu · bản mẫu</p></div><span className={`tl-tag ${item.status.toLowerCase()}`}>{publicationLabels[item.status]}</span></div><MaterialList materials={item.materials} /><Link className="tl-text-button" to={`${workspace}/lessons/${item.id}`}>Mở chi tiết & phiên bản</Link></article>)}</div>}
  </div>
}

function MaterialList({ materials, onRemove }: { materials: Material[]; onRemove?: (id: string) => void }) {
  return <ul className="tl-material-list">{materials.map((material) => <li key={material.id}><FileText size={16} /><span>{material.name}<small>Phiên bản {material.version} · {material.local ? 'Tệp cục bộ, chưa tải lên' : `${material.sourcePosition} · dữ liệu mẫu`}</small></span><strong className={material.processing.toLowerCase()}>{material.local ? 'Chưa tải / xử lý' : `${processingLabels[material.processing]} (mẫu)`}</strong>{onRemove && <button className="tl-text-button" type="button" aria-label={`Xóa ${material.name} khỏi bản xem trước`} onClick={() => onRemove(material.id)}>Xóa</button>}</li>)}</ul>
}

function LessonEditor({ lesson, subjectId, classroomId, context, parent }: { lesson?: LessonPreview; subjectId: string; classroomId: string; context: string; parent: string }) {
  const navigate = useNavigate()
  const [previewKey] = useState(() => lesson?.id ?? `preview-lesson-${subjectId}-${Date.now()}`)
  const cached = publishedLessonPreviews.get(previewKey)
  const [title, setTitle] = useState(cached?.title ?? lesson?.title ?? '')
  const [materials, setMaterials] = useState<Material[]>(() => cached?.materials ?? lesson?.materials.map((item) => ({ ...item })) ?? [])
  const [errors, setErrors] = useState<string[]>([])
  const [published, setPublished] = useState(!!cached)
  const [deferred, setDeferred] = useState(false)
  const [publishedVersion, setPublishedVersion] = useState<LessonPreview | undefined>(() => {
    const current = cached ?? (lesson?.status === 'PUBLISHED' ? lesson : undefined)
    return current ? { ...current, materials: current.materials.map((item) => ({ ...item })) } : undefined
  })
  const publishedMaterials = publishedVersion?.materials ?? []
  const ready = canPublishMaterials(materials)
  const lessonId = previewKey

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    const rejected: string[] = []
    const accepted: Material[] = []
    selected.forEach((file, index) => {
      if (!isSupportedMaterial(file)) rejected.push(`${file.name}: chỉ chấp nhận PDF, PPTX, DOCX, JPEG hoặc PNG.`)
      else if (file.size > maxMaterialBytes) rejected.push(`${file.name}: vượt quá 20 MB. Hãy chọn tệp nhỏ hơn.`)
      else accepted.push({ id: `local-${Date.now()}-${index}`, name: file.name, version: Math.max(0, ...materials.map((item) => item.version)) + 1, processing: 'PROCESSING', sourcePosition: 'Chưa tải lên', local: true })
    })
    setMaterials((current) => [...current, ...accepted])
    setErrors(rejected)
    setPublished(false)
    event.target.value = ''
  }

  function publishPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) { setErrors(['Hãy nhập tên bài học.']); return }
    if (!ready) { setErrors(['Cần ít nhất một học liệu và tất cả phải đã xử lý. Xóa hoặc thay tệp lỗi; tệp cục bộ cần API xử lý.']); return }
    setErrors([])
    registerTeacherPreviewItem('lesson', lessonId, subjectId)
    const nextVersion: LessonPreview = { id: lessonId, classroomSubjectId: subjectId, status: 'PUBLISHED', title: title.trim(), materials: materials.map((item) => ({ ...item })) }
    publishedLessonPreviews.set(previewKey, nextVersion)
    setPublishedVersion(nextVersion)
    setPublished(true)
    setDeferred(false)
    if (!lesson) navigate(parent.split('?')[0] + '/lessons/' + lessonId, { replace: true })
  }

  function demonstrate(processing: Material['processing']) {
    setMaterials(sampleReplacement(processing))
    setPublished(false)
    setErrors([])
  }

  const calendar = new URLSearchParams({ create: '1', classroomId, classroomSubjectId: subjectId, lessonId, publication: 'preview', title: title.trim() })
  return <div className="page-content tl-page"><TeacherBackButton fallbackTo={parent} /><div className="page-heading"><h1>{lesson ? 'Chi tiết bài học' : 'Tạo bài học'}</h1><p>{context}</p></div>
    <div className="sample-strip"><BookOpen size={16} /> Chưa kết nối API: không tải tệp, xử lý AI, lưu hoặc công bố thật.</div>
    {publishedMaterials.length > 0 && <section className="panel tl-card tl-published"><h2>Phiên bản đang phục vụ học sinh (mẫu)</h2><p>{publishedVersion?.title}. Phiên bản hợp lệ này vẫn được giữ khi bản thay thế đang xử lý hoặc thất bại; trích dẫn cũ không thay đổi.</p><MaterialList materials={publishedMaterials} /></section>}
    <section className="panel tl-card tl-editor"><h2>{lesson ? 'Bản chỉnh sửa xem trước' : 'Nội dung bài học mới'}</h2><form onSubmit={publishPreview} noValidate>
      <label htmlFor="tl-title">Tên bài học *</label><input id="tl-title" value={title} onChange={(event) => { setTitle(event.target.value); setPublished(false) }} />
      <label htmlFor="tl-files">Thêm hoặc thay học liệu</label><div className="tl-upload"><CloudUpload size={22} /><span>Chọn nhiều tệp trên máy</span><small>PDF, PPTX, DOCX, JPEG, PNG · tối đa 20 MB mỗi tệp</small><input id="tl-files" type="file" multiple accept={acceptedMaterialTypes} onChange={selectFiles} /></div>
      <p className="tl-help">Để thay tệp lỗi, xóa tệp đó rồi chọn tệp thay thế. Tệp trên máy chỉ được liệt kê; không tự chuyển thành đã xử lý.</p>
      {materials.length ? <MaterialList materials={materials} onRemove={(id) => { setMaterials((current) => current.filter((item) => item.id !== id)); setPublished(false) }} /> : <p className="tl-warning">Chưa có học liệu. Không thể công bố bản xem trước.</p>}
      <fieldset className="tl-scenarios"><legend>Thử trạng thái bằng dữ liệu mẫu</legend><p>Thay danh sách xem trước bằng fixture; không xử lý các tệp bạn chọn.</p><div className="tl-actions"><button type="button" onClick={() => demonstrate('PROCESSING')}>Mẫu đang xử lý</button><button type="button" onClick={() => demonstrate('FAILED')}>Mẫu một tệp lỗi</button><button type="button" onClick={() => demonstrate('PROCESSED')}>Mẫu đã xử lý</button></div></fieldset>
      {errors.length > 0 && <div className="tl-error" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
      <p className={ready ? 'tl-ready' : 'tl-warning'}><CircleAlert size={16} />{ready ? 'Tất cả học liệu mẫu đã xử lý: đủ điều kiện xem trước công bố.' : 'Chưa đủ điều kiện: cần ít nhất một học liệu, tất cả đã xử lý.'}</p>
      <button className="tl-main-button" type="submit" disabled={!ready || !title.trim()}>Mô phỏng công bố bài học</button>
      {published && <div className="tl-preview" role="status"><h3>Đã công bố trong bản xem trước</h3><p>{title.trim()} hiện ở trạng thái mẫu đã công bố cho {context}. Chưa lưu lên hệ thống. Bài học không cần lịch và không tự gửi thông báo.</p>{deferred ? <p>Đã bỏ qua lịch. Bài học vẫn được công bố trong bản xem trước này.</p> : <div className="tl-actions"><Link className="tl-main-button" to={`/teacher/calendar?${calendar}`} state={{ lessonPreview: { id: lessonId, classroomSubjectId: subjectId, title: title.trim(), status: 'PUBLISHED', materials }, returnTo: parent.split('?')[0] + '/lessons/' + lessonId }}>Thêm vào lịch</Link><button type="button" onClick={() => setDeferred(true)}>Để sau</button></div>}<p>Hủy tạo lịch không hủy bài học. Bản xem trước chỉ tồn tại trong phiên thao tác, tải lại sẽ về dữ liệu mẫu.</p></div>}
    </form></section>
  </div>
}
