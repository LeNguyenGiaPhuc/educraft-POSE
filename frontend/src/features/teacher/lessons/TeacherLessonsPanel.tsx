import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, BookOpen, FileText, Plus, RotateCcw } from 'lucide-react'
import { Link } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherLessonsApi, type TeacherLessonSummary } from '../../../lib/api/teacher/lessons'
import { teacherWorkspacePath } from '../../../lib/api/teacher/workspace'
import type { TeacherClassroomSubjectContext } from '../../../lib/api/teacher/types'
import { processingLabels, publicationLabels, getMaterialProcessingClass } from './lessonRules'
import './lessons.css'

type Props = { context: TeacherClassroomSubjectContext }
type StatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED'

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Bạn không có quyền xem bài học của môn này.'
    if (error.status === 404) return 'Không tìm thấy môn học hoặc bài học được yêu cầu.'
    return error.message
  }
  return 'Không thể tải danh sách bài học. Hãy thử lại.'
}

export function TeacherLessonsPanel({ context }: Props) {
  const [lessons, setLessons] = useState<TeacherLessonSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setLoadError('')
    teacherLessonsApi.list(context.classroomSubjectId)
      .then((items) => {
        if (!cancelled) setLessons(items)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [context.classroomSubjectId, reloadKey])

  const visibleLessons = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('vi')
    return lessons.filter((lesson) => {
      if (status !== 'ALL' && lesson.status !== status) return false
      if (!normalizedSearch) return true
      return `${lesson.title} ${lesson.materials.map((material) => material.name).join(' ')}`
        .toLocaleLowerCase('vi')
        .includes(normalizedSearch)
    })
  }, [lessons, search, status])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setFormError('Tên bài học không được để trống.')
      return
    }

    setFormError('')
    setIsSaving(true)
    try {
      await teacherLessonsApi.create(context.classroomSubjectId, title.trim())
      setTitle('')
      setIsCreateOpen(false)
      setReloadKey((value) => value + 1)
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="panel tw-api-panel tl-api-panel" aria-live="polite">
      <div className="tl-api-heading">
        <div>
          <span className="section-kicker">BÀI HỌC & HỌC LIỆU</span>
          <h2>{context.subjectName}</h2>
          <p>{context.readOnly ? 'Dữ liệu lớp đã lưu trữ ở chế độ chỉ xem.' : 'Tạo bài học, quản lý học liệu và công bố khi đủ điều kiện.'}</p>
        </div>
        {!context.readOnly && (
          <button type="button" className="tl-main-button" onClick={() => { setFormError(''); setIsCreateOpen(true) }}>
            <Plus size={16} /> Tạo bài học
          </button>
        )}
      </div>

      <div className="tl-api-filters">
        <label>Tìm bài học<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên bài học hoặc học liệu" /></label>
        <label>Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="ALL">Tất cả</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã công bố</option></select></label>
      </div>

      {isLoading && <div className="tc-empty"><BookOpen size={25} /><p>Đang tải bài học...</p></div>}
      {!isLoading && loadError && (
        <div className="tc-empty" role="alert">
          <AlertCircle size={25} /><h2>Không thể tải bài học</h2><p>{loadError}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)}><RotateCcw size={14} /> Thử lại</button>
        </div>
      )}
      {!isLoading && !loadError && visibleLessons.length === 0 && (
        <div className="tc-empty"><FileText size={30} /><h2>Chưa có bài học phù hợp</h2><p>Điều chỉnh bộ lọc hoặc tạo bài học mới.</p></div>
      )}
      {!isLoading && !loadError && visibleLessons.length > 0 && (
        <div className="tl-list">
          {visibleLessons.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} context={context} />)}
        </div>
      )}

      {isCreateOpen && (
        <dialog open className="tl-modal-overlay" aria-labelledby="teacher-create-lesson-title" onCancel={(event) => { event.preventDefault(); if (!isSaving) setIsCreateOpen(false) }}>
          <div className="tl-modal-window">
            <div className="tl-modal-head"><div><span className="tl-modal-eyebrow">BÀI HỌC</span><h2 id="teacher-create-lesson-title" className="tl-modal-title">Tạo bài học mới</h2></div></div>
            <form onSubmit={handleCreate}>
              <div className="tl-modal-body">
                <label htmlFor="teacher-lesson-title">Tên bài học *</label>
                <input id="teacher-lesson-title" value={title} onChange={(event) => { setTitle(event.target.value); setFormError('') }} maxLength={250} autoFocus />
                {formError && <p className="tl-error" role="alert">{formError}</p>}
              </div>
              <div className="tl-modal-foot"><button type="button" className="tl-secondary-button" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>Hủy</button><button type="submit" className="tl-main-button" disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Tạo bản nháp'}</button></div>
            </form>
          </div>
        </dialog>
      )}
    </section>
  )
}

function LessonRow({ lesson, context }: { lesson: TeacherLessonSummary; context: TeacherClassroomSubjectContext }) {
  const path = `${teacherWorkspacePath(context.classroomId, context.classroomSubjectId)}/lessons/${encodeURIComponent(lesson.id)}`
  return (
    <article className="panel tl-card">
      <div className="tl-card-head">
        <div className="tl-file-icon"><FileText size={20} /></div>
        <div>
          <h2><Link to={path}>{lesson.title}</Link></h2>
          <p>{lesson.materials.length} học liệu · {lesson.publishedAt ? `Công bố ${new Date(lesson.publishedAt).toLocaleDateString('vi-VN')}` : 'Chưa công bố'}</p>
        </div>
        <span className={`tl-tag ${lesson.status.toLowerCase()}`}>{publicationLabels[lesson.status]}</span>
      </div>
      <ul className="tl-material-list">
        {lesson.materials.length === 0 && <li><span>Chưa có học liệu</span></li>}
        {lesson.materials.map((material) => <li key={material.id}><FileText size={15} /><span>{material.name}<small>Phiên bản {material.version}{material.sourcePosition ? ` · ${material.sourcePosition}` : ''}</small></span><strong className={getMaterialProcessingClass(material.processing)}>{processingLabels[material.processing]}</strong></li>)}
      </ul>
      <Link className="tl-text-button" to={path}>Mở chi tiết bài học</Link>
    </article>
  )
}
