import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { AlertCircle, Archive, ArrowLeft, Calendar, Check, Download, FileText, RotateCcw, Upload, X } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherLessonsApi, type TeacherLessonDetail, type TeacherLessonMaterial } from '../../../lib/api/teacher/lessons'
import { teacherWorkspacePath } from '../../../lib/api/teacher/workspace'
import { acceptedMaterialTypes, getMaterialProcessingClass, isSupportedMaterial, maxMaterialBytes, processingLabels, publicationLabels } from './lessonRules'
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
  const pending = materials.filter((material) => latestVersion(material)?.processingStatus !== 'PROCESSED')
  if (pending.length > 0) return 'Tất cả phiên bản mới nhất của học liệu phải ở trạng thái Đã xử lý.'
  return ''
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
  const backPath = classroomId && classroomSubjectId ? `${teacherWorkspacePath(classroomId, classroomSubjectId)}?tab=lessons` : '/teacher/classes'

  async function refreshLesson() {
    setReloadKey((value) => value + 1)
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

    setIsMutating(true)
    setError('')
    try {
      if (materialId) await teacherLessonsApi.uploadMaterialVersion(materialId, file)
      else await teacherLessonsApi.uploadMaterial(lesson.id, file)
      setMessage('Đã tải học liệu. Trạng thái xử lý được lấy lại từ backend.')
      await refreshLesson()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
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
    if (!lesson || readOnly || publishReason) return
    setIsMutating(true)
    setError('')
    try {
      await teacherLessonsApi.publish(lesson.id)
      setMessage('Đã công bố bài học.')
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
      <div className="page-heading"><span className="section-kicker">{lesson.subject.name} · {lesson.classroom.name}</span><h1>{lesson.title}</h1><p>{lesson.classroom.status === 'ARCHIVED' ? 'Lớp đã lưu trữ · chỉ xem dữ liệu lịch sử.' : 'Quản lý nội dung bài học và học liệu.'}</p></div>
      {readOnly && <div className="sample-strip"><Archive size={16} /> Lớp đã lưu trữ. Bạn có thể xem phiên bản và tải học liệu, nhưng không thể thay đổi dữ liệu.</div>}
      {message && <div className="tl-success-banner" role="status"><Check size={17} /> {message}<button type="button" className="tl-text-button" onClick={() => setMessage('')}><X size={14} /></button></div>}
      {error && <div className="tl-range-error" role="alert"><AlertCircle size={15} /> {error}</div>}

      <section className="panel tl-editor">
        <div className="tl-card-head"><div className="tl-file-icon"><FileText size={20} /></div><div><h2>{lesson.title}</h2><p>Trạng thái: {publicationLabels[lesson.status]}</p></div><span className={`tl-tag ${lesson.status.toLowerCase()}`}>{publicationLabels[lesson.status]}</span></div>
        {!readOnly && (
          <form onSubmit={saveTitle} className="tl-inline-form">
            <label htmlFor="teacher-lesson-edit-title">Tên bài học</label>
            <input id="teacher-lesson-edit-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={250} />
            <button type="submit" className="tl-secondary-button" disabled={isMutating || title.trim() === lesson.title}>Lưu tên</button>
          </form>
        )}

        <h3>Học liệu</h3>
        {lesson.materials.length === 0 ? <p className="tl-help">Chưa có học liệu. Bài học chỉ được công bố sau khi có học liệu đã xử lý.</p> : (
          <ul className="tl-material-list">{lesson.materials.map((material) => { const latest = latestVersion(material); return <li key={material.id}><FileText size={16} /><span><strong>{material.fileName}</strong><small>{material.versions.length} phiên bản · mới nhất v{latest?.versionNo ?? 0}</small></span>{latest && <strong className={getMaterialProcessingClass(latest.processingStatus)}>{processingLabels[latest.processingStatus]}</strong>}<button type="button" className="tl-text-button" onClick={() => void downloadMaterial(material)}><Download size={14} /> Tải xuống</button>{!readOnly && <><label className="tl-secondary-button tl-file-button"><Upload size={14} /> Tải phiên bản<input type="file" accept={acceptedMaterialTypes} onChange={(event) => void uploadMaterial(event, material.id)} disabled={isMutating} /></label><button type="button" className="tl-text-button" onClick={() => void archiveMaterial(material.id)} disabled={isMutating}>Lưu trữ</button></>}</li> })}</ul>
        )}
        {!readOnly && <label className="tl-secondary-button tl-file-button"><Upload size={14} /> Thêm học liệu<input type="file" accept={acceptedMaterialTypes} onChange={(event) => void uploadMaterial(event)} disabled={isMutating} /></label>}

        <div className="tl-publish-box"><strong>Điều kiện công bố</strong><p>{publishReason || 'Bài học đủ điều kiện công bố.'}</p>{!readOnly && lesson.status === 'DRAFT' && <button type="button" className="tl-main-button" onClick={() => void publishLesson()} disabled={Boolean(publishReason) || isMutating}>Công bố bài học</button>}{lesson.status === 'PUBLISHED' && <Link className="tl-secondary-button" to={`/teacher/calendar?create=1&classroomSubjectId=${encodeURIComponent(lesson.classroomSubjectId)}&lessonId=${encodeURIComponent(lesson.id)}&title=${encodeURIComponent(lesson.title)}`}><Calendar size={14} /> Thêm vào lịch</Link>}</div>
      </section>
    </div>
  )
}
