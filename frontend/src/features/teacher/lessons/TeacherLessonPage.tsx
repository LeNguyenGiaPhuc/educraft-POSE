import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { AlertCircle, Archive, ArrowLeft, Calendar, Check, Download, FileText, RotateCcw, Upload, X } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherLessonsApi, type TeacherLessonDetail, type TeacherLessonMaterial } from '../../../lib/api/teacher/lessons'
import { teacherWorkspacePath } from '../../../lib/api/teacher/workspace'
import { acceptedMaterialTypes, getLessonPublishAction, getMaterialProcessingClass, isSupportedMaterial, maxMaterialBytes, processingLabels, publicationLabels } from './lessonRules'
import './lessons.css'

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Bạn chỉ có thể xem dữ liệu của môn được phân công.'
    if (error.status === 404) return 'Không tìm thấy bài học này.'
    return error.message
  }
  return 'Không thể tải bài học. Hãy thử lại.'
}

function latestVersion(material: TeacherLessonMaterial) {
  return [...material.versions].sort((left, right) => right.versionNo - left.versionNo)[0]
}

function publishBlockReason(lesson: TeacherLessonDetail): string {
  const materials = lesson.materials.filter((material) => material.status !== 'ARCHIVED')
  if (materials.length === 0) return 'Cần ít nhất một học liệu đang giữ lại.'
  const pending = materials.filter((material) => {
    const active = material.versions.find((version) => version.id === material.activeVersionId)
    return active?.processingStatus !== 'PROCESSED'
  })
  if (pending.length > 0) return 'Tất cả phiên bản mới nhất của học liệu phải ở trạng thái Đã xử lý.'
  return ''
}

export function PendingMaterialUploadRow({ fileName }: { fileName: string }) {
  return (
    <li className="tl-material-uploading" aria-live="polite">
      <div className="tl-material-main">
        <span className="tl-material-icon"><Upload size={16} /></span>
        <span className="tl-material-copy"><strong>{fileName}</strong><small>Đang gửi tệp lên hệ thống</small></span>
        <strong className="tl-material-status processing">Đang tải lên</strong>
      </div>
    </li>
  )
}

export function TeacherLessonPage() {
  const { lessonId, classroomId, classroomSubjectId } = useParams()
  const [lesson, setLesson] = useState<TeacherLessonDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isMutating, setIsMutating] = useState(false)
  const [pendingUpload, setPendingUpload] = useState<{ fileName: string; materialId?: string } | null>(null)

  useEffect(() => {
    if (!lessonId) return
    let cancelled = false
    setIsLoading(true)
    setLoadError('')
    teacherLessonsApi.getDetail(lessonId)
      .then((data) => {
        if (cancelled) return
        setLesson(data)
        setTitle(data.title)
      })
      .catch((requestError) => {
        if (!cancelled) {
          setLesson(null)
          setLoadError(errorMessage(requestError))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [lessonId, reloadKey])

  const readOnly = lesson?.classroom.status === 'ARCHIVED'
  const publishReason = useMemo(() => lesson ? publishBlockReason(lesson) : '', [lesson])
  const publishAction = useMemo(() => lesson ? getLessonPublishAction(lesson.status, lesson.materials) : null, [lesson])
  const backPath = classroomId && classroomSubjectId ? `${teacherWorkspacePath(classroomId, classroomSubjectId)}?tab=lessons` : '/teacher/classes'

  async function refreshLesson() {
    if (!lessonId) return
    const data = await teacherLessonsApi.getDetail(lessonId)
    setLesson(data)
    setTitle(data.title)
  }

  async function saveTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lesson || readOnly || !title.trim() || title.trim() === lesson.title) return
    setIsMutating(true)
    setError('')
    try {
      await teacherLessonsApi.update(lesson.id, { title: title.trim() })
      setMessage('Đã cập nhật tên bài học.')
      await refreshLesson()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setIsMutating(false)
    }
  }

  async function uploadMaterial(event: ChangeEvent<HTMLInputElement>, materialId?: string) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !lesson || readOnly) return
    if (!isSupportedMaterial(file)) {
      setError('Chỉ nhận PDF, PPTX, DOCX, JPG hoặc PNG.')
      return
    }
    if (file.size > maxMaterialBytes) {
      setError('Học liệu không được vượt quá 20 MB.')
      return
    }

    setPendingUpload({ fileName: file.name, materialId })
    setIsMutating(true)
    setError('')
    setMessage('')
    try {
      if (materialId) await teacherLessonsApi.uploadMaterialVersion(materialId, file)
      else await teacherLessonsApi.uploadMaterial(lesson.id, file)
      setMessage('Đã tải học liệu. Hệ thống đang kiểm tra và xử lý tệp.')
      await refreshLesson()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setPendingUpload(null)
      setIsMutating(false)
    }
  }

  async function archiveMaterial(materialId: string) {
    if (!lesson || readOnly || !window.confirm('Lưu trữ học liệu này? Dữ liệu phiên bản cũ vẫn được giữ lại.')) return
    setIsMutating(true)
    setError('')
    try {
      await teacherLessonsApi.archiveMaterial(materialId)
      setMessage('Đã lưu trữ học liệu.')
      await refreshLesson()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setIsMutating(false)
    }
  }

  async function publishLesson() {
    if (!lesson || readOnly || publishReason || !publishAction) return
    setIsMutating(true)
    setError('')
    try {
      await teacherLessonsApi.publish(lesson.id)
      setMessage(publishAction.label === 'Cập nhật nội dung công bố' ? 'Đã cập nhật nội dung công bố.' : 'Đã công bố bài học.')
      await refreshLesson()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setIsMutating(false)
    }
  }

  async function retryMaterialProcessing(material: TeacherLessonMaterial) {
    if (!lesson || readOnly || isMutating) return
    const latest = latestVersion(material)
    if (!latest || (latest.processingStatus !== 'FAILED' && latest.processingStatus !== 'PENDING')) return

    setIsMutating(true)
    setError('')
    try {
      const result = await teacherLessonsApi.retryMaterialProcessing(material.id)
      setMessage(result.processingStatus === 'PROCESSED'
        ? 'Đã xử lý học liệu thành công.'
        : 'Học liệu chưa xử lý được. Bạn có thể thử lại sau.')
      await refreshLesson()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setIsMutating(false)
    }
  }

  async function downloadMaterial(material: TeacherLessonMaterial) {
    setError('')
    try {
      const download = await teacherLessonsApi.downloadMaterial(material.id)
      const url = URL.createObjectURL(download.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = download.fileName ?? material.fileName
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  if (isLoading) return <div className="page-content tl-page"><p>Đang tải bài học...</p></div>
  if (loadError || !lesson) {
    return <div className="page-content tl-page"><Link className="tl-back" to={backPath}><ArrowLeft size={16} /> Quay lại workspace</Link><div className="panel tl-empty" role="alert"><AlertCircle size={36} /><h2>Không thể tải bài học</h2><p>{loadError || 'Bài học không khả dụng.'}</p><button type="button" className="tl-main-button" onClick={() => setReloadKey((value) => value + 1)}><RotateCcw size={14} /> Thử lại</button></div></div>
  }

  return (
    <div className="page-content tl-page">
      <Link className="tl-back" to={backPath}><ArrowLeft size={16} /> Quay lại workspace</Link>
      <div className="page-heading"><span className="section-kicker">{lesson.subject.name} · {lesson.classroom.name}</span><h1>{lesson.title}</h1>{lesson.classroom.status === 'ARCHIVED' && <p>Lớp đã lưu trữ · chỉ xem dữ liệu lịch sử.</p>}</div>
      {readOnly && <div className="sample-strip"><Archive size={16} /> Lớp đã lưu trữ. Bạn có thể xem phiên bản và tải học liệu, nhưng không thể thay đổi dữ liệu.</div>}
      {message && <div className="tl-success-banner" role="status"><Check size={17} /> {message}<button type="button" className="tl-text-button" aria-label="Đóng thông báo" onClick={() => setMessage('')}><X size={14} /></button></div>}
      {error && <div className="tl-range-error" role="alert"><AlertCircle size={15} /> {error}</div>}

      <section className="panel tl-editor">
        <div className="tl-card-head"><div className="tl-file-icon"><FileText size={20} /></div><div><h2>{lesson.title}</h2></div><span className={`tl-tag ${lesson.status.toLowerCase()}`}>{publicationLabels[lesson.status]}</span></div>
        {!readOnly && (
          <form onSubmit={saveTitle} className="tl-inline-form">
            <label htmlFor="teacher-lesson-edit-title">Tên bài học</label>
            <input id="teacher-lesson-edit-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={250} />
            <button type="submit" className="tl-secondary-button" disabled={isMutating || title.trim() === lesson.title}>Lưu tên</button>
          </form>
        )}

        <h3>Học liệu</h3>
        {lesson.materials.length === 0 && !pendingUpload ? <p className="tl-help">Chưa có học liệu. Bài học chỉ được công bố sau khi có học liệu đã xử lý.</p> : (
          <ul className="tl-material-list">{pendingUpload && !pendingUpload.materialId && <PendingMaterialUploadRow fileName={pendingUpload.fileName} />}{lesson.materials.map((material) => { const latest = latestVersion(material); const canRetry = latest && (latest.processingStatus === 'FAILED' || latest.processingStatus === 'PENDING'); const isUploadingVersion = pendingUpload?.materialId === material.id; return <li key={material.id}><div className="tl-material-main"><span className="tl-material-icon"><FileText size={16} /></span><span className="tl-material-copy"><strong>{material.fileName}</strong><small>{isUploadingVersion ? `Đang tải ${pendingUpload.fileName}` : `${material.versions.length} phiên bản · mới nhất v${latest?.versionNo ?? 0}`}</small></span>{isUploadingVersion ? <strong className="tl-material-status processing">Đang tải phiên bản</strong> : latest && <strong className={`tl-material-status ${getMaterialProcessingClass(latest.processingStatus)}`}>{processingLabels[latest.processingStatus]}</strong>}</div><div className="tl-material-actions"><button type="button" className="tl-material-action" onClick={() => void downloadMaterial(material)} disabled={isMutating}><Download size={14} /> Tải xuống</button>{!readOnly && <>{canRetry && !isUploadingVersion && <button type="button" className="tl-material-action" onClick={() => void retryMaterialProcessing(material)} disabled={isMutating}><RotateCcw size={14} /> Xử lý lại</button>}<label className="tl-material-action tl-file-button"><Upload size={14} /> Tải phiên bản mới<input aria-label="Tải phiên bản học liệu" type="file" accept={acceptedMaterialTypes} onChange={(event) => void uploadMaterial(event, material.id)} disabled={isMutating} /></label><button type="button" className="tl-material-action tl-material-archive" onClick={() => void archiveMaterial(material.id)} disabled={isMutating}><Archive size={14} /> Lưu trữ</button></>}</div></li> })}</ul>
        )}
        {!readOnly && <label className="tl-secondary-button tl-file-button"><Upload size={14} /> Thêm học liệu<input aria-label="Thêm học liệu" type="file" accept={acceptedMaterialTypes} onChange={(event) => void uploadMaterial(event)} disabled={isMutating} /></label>}

        <div className="tl-publish-box"><strong>Điều kiện công bố</strong><p>{publishReason || (publishAction ? 'Nội dung đã sẵn sàng để công bố.' : 'Nội dung hiện tại đã được công bố.')}</p>{!readOnly && publishAction && <button type="button" className="tl-main-button" onClick={() => void publishLesson()} disabled={Boolean(publishReason) || isMutating}>{publishAction.label}</button>}{lesson.status === 'PUBLISHED' && <Link className="tl-secondary-button" to={`/teacher/calendar?create=1&classroomSubjectId=${encodeURIComponent(lesson.classroomSubjectId)}&lessonId=${encodeURIComponent(lesson.id)}&title=${encodeURIComponent(lesson.title)}`}><Calendar size={14} /> Thêm vào lịch</Link>}</div>
      </section>
    </div>
  )
}
