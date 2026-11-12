import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  CircleAlert,
  CloudUpload,
  FileText,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { assignedClasses, assignedSubjects, registerTeacherPreviewItem, type LessonPreview } from '../fixtures'
import {
  acceptedMaterialTypes,
  isSupportedMaterial,
  maxMaterialBytes,
  processingLabels,
  publicationLabels,
  canPublishMaterials,
  sampleReplacement,
} from './lessons.mock'
import { publishedLessonPreviews, readTeacherLessons } from './lesson-preview-store'
import './lessons.css'

type Material = LessonPreview['materials'][number] & { local?: boolean }

export function LessonsPage() {
  const route = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const subjectId = route.classroomSubjectId ?? params.get('classroomSubjectId') ?? assignedSubjects[0]?.id
  const subject = assignedSubjects.find((item) => item.id === subjectId && (!route.classroomId || item.classroomId === route.classroomId))

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState('ALL')
  const [publishedFrom, setPublishedFrom] = useState('')
  const [publishedTo, setPublishedTo] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [versionTrigger, setVersionTrigger] = useState(0)
  const [successBanner, setSuccessBanner] = useState<string | null>(() => {
    return (location.state as { successLessonTitle?: string })?.successLessonTitle
      ? `Đã tạo và công bố bài học “${(location.state as { successLessonTitle: string }).successLessonTitle}” thành công.`
      : null
  })

  // Re-read lessons based on versionTrigger
  const lessons = useMemo(() => {
    void versionTrigger
    if (!subject) return []
    return readTeacherLessons().filter((item) => item.classroomSubjectId === subject.id)
  }, [subject, versionTrigger])

  if (!subject) {
    return (
      <div className="page-content tl-page">
        <Link className="tl-back" to="/teacher/classes">
          <ArrowLeft size={16} /> Quay lại lớp của tôi
        </Link>
        <h1>Không tìm thấy môn được phân công</h1>
        <p>Chọn lại lớp và môn để xem bài học.</p>
      </div>
    )
  }

  const classroom = assignedClasses.find((item) => item.id === subject.classroomId)
  const workspace = `/teacher/classes/${subject.classroomId}/subjects/${subject.id}`
  const parent = `${workspace}?tab=lessons`
  const currentRouteLesson = lessons.find((item) => item.id === route.lessonId)

  const isModalOpen =
    isCreateOpen ||
    route.lessonId === 'new' ||
    Boolean(route.lessonId && currentRouteLesson) ||
    selectedLessonId !== null
  const editingLesson = currentRouteLesson ?? lessons.find((item) => item.id === selectedLessonId)

  function closeModal() {
    setIsCreateOpen(false)
    setSelectedLessonId(null)
    if (route.lessonId) {
      navigate(parent, { replace: true })
    }
  }

  function handleSuccess(title: string) {
    setSuccessBanner(`Đã lưu và công bố bài học “${title}” thành công.`)
    setVersionTrigger((v) => v + 1)
    closeModal()
  }

  const dateRangeError = Boolean(publishedFrom && publishedTo && publishedFrom > publishedTo)
  const hasActiveFilters = Boolean(searchTerm || status !== 'ALL' || publishedFrom || publishedTo)

  function resetFilters() {
    setSearchTerm('')
    setStatus('ALL')
    setPublishedFrom('')
    setPublishedTo('')
  }

  const visible = lessons.filter((item) => {
    if (dateRangeError) return false

    // 1. Status filter
    if (status !== 'ALL' && item.status !== status) return false

    // 2. Keyword search
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      const titleMatch = item.title.toLowerCase().includes(term)
      const materialMatch = item.materials.some((m) => m.name.toLowerCase().includes(term))
      if (!titleMatch && !materialMatch) return false
    }

    // 3. Date range filter
    if (publishedFrom || publishedTo) {
      if (!item.publishedAt) return false
      if (publishedFrom && item.publishedAt < publishedFrom) return false
      if (publishedTo && item.publishedAt > publishedTo) return false
    }

    return true
  })

  return (
    <div className="tl-page">
      <div className="page-heading">
        <h1>Bài học & học liệu</h1>
        <p>{classroom?.name} · {subject.name} — chuẩn bị nội dung và kiểm tra nguồn học liệu.</p>
      </div>

      <div className="sample-strip">
        <BookOpen size={16} /> Dữ liệu mẫu, chưa kết nối API. Các thao tác chỉ minh họa trong phiên xem.
      </div>

      {successBanner && (
        <div className="tl-success-banner" role="status">
          <CheckCircle2 size={18} />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Advanced Filter Toolbar */}
      <div className="tl-filter-container">
        <div className="tl-filter-row">
          {/* Keyword Search */}
          <div className="tl-search-field">
            <Search size={16} />
            <input
              type="text"
              placeholder="Tìm theo tên bài học hoặc học liệu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="tl-filter-field">
            <label htmlFor="tl-status">Trạng thái:</label>
            <select
              id="tl-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              {Object.entries(publicationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Switch Subject (if direct url) */}
          {!route.classroomSubjectId && (
            <div className="tl-filter-field">
              <label htmlFor="tl-subject">Lớp / môn:</label>
              <select
                id="tl-subject"
                value={subject.id}
                onChange={(e) => setParams({ classroomSubjectId: e.target.value })}
              >
                {assignedSubjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {assignedClasses.find((entry) => entry.id === item.classroomId)?.name} · {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            className="tl-main-button"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={17} /> Tạo bài học
          </button>
        </div>

        {/* Date Range Row */}
        <div className="tl-date-filter-row">
          <div className="tl-date-group">
            <Calendar size={15} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#385e42' }}>Khoảng ngày công bố:</span>
            <label htmlFor="tl-date-from" className="sr-only">Từ ngày công bố</label>
            <input
              id="tl-date-from"
              type="date"
              value={publishedFrom}
              onChange={(e) => setPublishedFrom(e.target.value)}
              title="Công bố từ ngày"
            />
            <span style={{ color: '#7a9483' }}>đến</span>
            <label htmlFor="tl-date-to" className="sr-only">Đến ngày công bố</label>
            <input
              id="tl-date-to"
              type="date"
              value={publishedTo}
              onChange={(e) => setPublishedTo(e.target.value)}
              title="Công bố đến ngày"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="tl-reset-btn"
              onClick={resetFilters}
            >
              <RotateCcw size={14} /> Xóa bộ lọc
            </button>
          )}
        </div>

        {dateRangeError && (
          <div className="tl-range-error" role="alert">
            <AlertCircle size={15} />
            <span>Ngày bắt đầu không được lớn hơn ngày kết thúc. Vui lòng chọn lại.</span>
          </div>
        )}
      </div>

      <div className="tl-summary">
        <span>Tổng cộng: <strong>{visible.length} bài học</strong></span>
        <span>Đã công bố: <strong>{visible.filter((i) => i.status === 'PUBLISHED').length}</strong></span>
        <span>Bản nháp: <strong>{visible.filter((i) => i.status === 'DRAFT').length}</strong></span>
      </div>

      {!visible.length ? (
        <div className="panel tl-empty">
          <FileText size={38} />
          <h2>Không tìm thấy bài học phù hợp</h2>
          <p>
            {hasActiveFilters
              ? 'Thử điều chỉnh từ khóa hoặc xóa khoảng thời gian lọc.'
              : 'Môn học này hiện chưa có bài học nào. Bạn có thể bấm "Tạo bài học" để bắt đầu.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="tl-reset-btn"
              onClick={resetFilters}
              style={{ marginTop: 12 }}
            >
              <RotateCcw size={14} /> Đặt lại tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="tl-list">
          {visible.map((item) => (
            <article className="panel tl-card" key={item.id}>
              <div className="tl-card-head">
                <FileText size={22} />
                <div>
                  <h2>
                    <button
                      type="button"
                      className="tl-title-button"
                      onClick={() => setSelectedLessonId(item.id)}
                    >
                      {item.title}
                    </button>
                  </h2>
                  <p>
                    {item.materials.length} học liệu ·{' '}
                    {item.publishedAt ? `Ngày công bố: ${item.publishedAt}` : 'Chưa công bố (Bản nháp)'}
                  </p>
                </div>
                <span className={`tl-tag ${item.status.toLowerCase()}`}>
                  {publicationLabels[item.status]}
                </span>
              </div>
              <MaterialList materials={item.materials} />
              <button
                type="button"
                className="tl-text-button"
                onClick={() => setSelectedLessonId(item.id)}
              >
                Mở chi tiết & phiên bản
              </button>
            </article>
          ))}
        </div>
      )}

      {/* Modal Popup Dialog cho Tạo bài học & Chỉnh sửa bài học */}
      {isModalOpen && (
        <LessonModal
          key={editingLesson?.id ?? (route.lessonId === 'new' ? 'new-lesson-route' : 'new-lesson-state')}
          lesson={editingLesson}
          subjectId={subject.id}
          context={`${classroom?.name} · ${subject.name}`}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}

function MaterialList({ materials, onRemove }: { materials: Material[]; onRemove?: (id: string) => void }) {
  return (
    <ul className="tl-material-list">
      {materials.map((material) => (
        <li key={material.id}>
          <FileText size={16} />
          <span>
            {material.name}
            <small>
              Phiên bản {material.version} · {material.local ? 'Tệp cục bộ, chưa tải lên' : `${material.sourcePosition} · dữ liệu mẫu`}
            </small>
          </span>
          <strong className={material.processing.toLowerCase()}>
            {material.local ? 'Chưa tải / xử lý' : `${processingLabels[material.processing]} (mẫu)`}
          </strong>
          {onRemove && (
            <button
              className="tl-text-button"
              type="button"
              aria-label={`Xóa ${material.name} khỏi bản xem trước`}
              onClick={() => onRemove(material.id)}
            >
              Xóa
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function LessonModal({
  lesson,
  subjectId,
  context,
  onClose,
  onSuccess,
}: {
  lesson?: LessonPreview
  subjectId: string
  context: string
  onClose: () => void
  onSuccess: (title: string) => void
}) {
  const [previewKey] = useState(() => lesson?.id ?? `preview-lesson-${subjectId}-${Date.now()}`)
  const cached = publishedLessonPreviews.get(previewKey)
  const [title, setTitle] = useState(cached?.title ?? lesson?.title ?? '')
  const [materials, setMaterials] = useState<Material[]>(() => cached?.materials ?? lesson?.materials.map((item) => ({ ...item })) ?? [])
  const [errors, setErrors] = useState<string[]>([])
  const [publishedVersion, setPublishedVersion] = useState<LessonPreview | undefined>(() => {
    const current = cached ?? (lesson?.status === 'PUBLISHED' ? lesson : undefined)
    return current ? { ...current, materials: current.materials.map((item) => ({ ...item })) } : undefined
  })
  const publishedMaterials = publishedVersion?.materials ?? []
  const ready = canPublishMaterials(materials)
  const lessonId = previewKey

  // Scroll lock and Escape listener
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

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
    event.target.value = ''
  }

  function publishPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setErrors(['Hãy nhập tên bài học.'])
      return
    }
    if (!ready) {
      setErrors(['Cần ít nhất một học liệu và tất cả phải đã xử lý. Xóa hoặc thay tệp lỗi; tệp cục bộ cần API xử lý.'])
      return
    }
    setErrors([])
    registerTeacherPreviewItem('lesson', lessonId, subjectId)
    const nextVersion: LessonPreview = {
      id: lessonId,
      classroomSubjectId: subjectId,
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString().slice(0, 10),
      title: title.trim(),
      materials: materials.map((item) => ({ ...item })),
    }
    publishedLessonPreviews.set(previewKey, nextVersion)
    setPublishedVersion(nextVersion)
    // Form closes/disappears immediately upon save!
    onSuccess(title.trim())
  }

  function demonstrate(processing: Material['processing']) {
    setMaterials(sampleReplacement(processing))
    setErrors([])
  }

  return (
    <div
      className="tl-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="tl-modal-window">
        <div className="tl-modal-head">
          <div>
            <span className="tl-modal-eyebrow">POPUP BÀI HỌC & HỌC LIỆU</span>
            <h2 id="lesson-modal-title" className="tl-modal-title">
              {lesson ? 'Chi tiết & chỉnh sửa bài học' : 'Tạo bài học mới'}
            </h2>
          </div>
          <button
            type="button"
            className="tl-modal-close"
            onClick={onClose}
            aria-label="Đóng biểu mẫu bài học"
            title="Đóng (Escape)"
          >
            <X size={18} />
          </button>
        </div>

        <div className="tl-modal-body">
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#4b6c55', fontWeight: 600 }}>{context}</p>
          <div className="sample-strip" style={{ marginBottom: 16 }}>
            <BookOpen size={16} /> Chưa kết nối API: không tải tệp, xử lý AI, lưu hoặc công bố thật.
          </div>

          {publishedMaterials.length > 0 && (
            <section className="panel tl-card tl-published" style={{ marginBottom: 18 }}>
              <h2>Phiên bản đang phục vụ học sinh (mẫu)</h2>
              <p>{publishedVersion?.title}. Phiên bản hợp lệ này vẫn được giữ khi bản thay thế đang xử lý hoặc thất bại; trích dẫn cũ không thay đổi.</p>
              <MaterialList materials={publishedMaterials} />
            </section>
          )}

          <form onSubmit={publishPreview} noValidate>
            <label htmlFor="tl-title">Tên bài học *</label>
            <input
              id="tl-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ví dụ: Bài 5: Cách mạng tháng Tám năm 1945"
            />

            <label htmlFor="tl-files" style={{ marginTop: 14 }}>Thêm hoặc thay học liệu</label>
            <div className="tl-upload">
              <CloudUpload size={22} />
              <span>Chọn nhiều tệp trên máy</span>
              <small>PDF, PPTX, DOCX, JPEG, PNG · tối đa 20 MB mỗi tệp</small>
              <input id="tl-files" type="file" multiple accept={acceptedMaterialTypes} onChange={selectFiles} />
            </div>
            <p className="tl-help">Để thay tệp lỗi, xóa tệp đó rồi chọn tệp thay thế. Tệp trên máy chỉ được liệt kê; không tự chuyển thành đã xử lý.</p>

            {materials.length ? (
              <MaterialList
                materials={materials}
                onRemove={(id) => setMaterials((current) => current.filter((item) => item.id !== id))}
              />
            ) : (
              <p className="tl-warning">Chưa có học liệu. Không thể công bố bản xem trước.</p>
            )}

            <fieldset className="tl-scenarios">
              <legend>Thử trạng thái bằng dữ liệu mẫu</legend>
              <p>Thay danh sách xem trước bằng fixture; không xử lý các tệp bạn chọn.</p>
              <div className="tl-actions">
                <button type="button" onClick={() => demonstrate('PROCESSING')}>Mẫu đang xử lý</button>
                <button type="button" onClick={() => demonstrate('FAILED')}>Mẫu một tệp lỗi</button>
                <button type="button" onClick={() => demonstrate('PROCESSED')}>Mẫu đã xử lý</button>
              </div>
            </fieldset>

            {errors.length > 0 && (
              <div className="tl-error" role="alert" style={{ marginTop: 10 }}>
                {errors.map((error) => <p key={error}>{error}</p>)}
              </div>
            )}

            <p className={ready ? 'tl-ready' : 'tl-warning'} style={{ marginTop: 12 }}>
              <CircleAlert size={16} />
              {ready ? 'Tất cả học liệu mẫu đã xử lý: đủ điều kiện xem trước công bố.' : 'Chưa đủ điều kiện: cần ít nhất một học liệu, tất cả đã xử lý.'}
            </p>

            <div className="tl-modal-foot" style={{ padding: '18px 0 0', background: 'transparent' }}>
              <button type="button" className="tl-secondary-button" onClick={onClose}>
                Hủy bỏ
              </button>
              <button className="tl-main-button" type="submit" disabled={!ready || !title.trim()}>
                <Check size={16} /> {lesson ? 'Lưu cập nhật bài học' : 'Lưu và công bố bài học'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
