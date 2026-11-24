import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { AlertCircle, Archive, ArrowLeft, BookOpen, RotateCcw, School, Users } from 'lucide-react'
import { ApiError } from '../../../lib/api/client'
import { teacherWorkspaceApi, teacherWorkspacePath } from '../../../lib/api/teacher/workspace'
import type { TeacherClassroomStudent, TeacherClassroomSubjectContext } from '../../../lib/api/teacher/types'
import { TeacherLessonsPanel } from '../lessons/TeacherLessonsPanel'
import { ClassStatisticsPage } from '../statistics/ClassStatisticsPage'
import { SubmissionsPage } from '../submissions/SubmissionsPage'
import { ActivitiesPage } from '../activities/ActivitiesPage'
import './classes.css'

type WorkspaceTab = 'lessons' | 'activities' | 'submissions' | 'students' | 'statistics'

const tabs: { id: WorkspaceTab; label: string }[] = [
  { id: 'lessons', label: 'Bài học & học liệu' },
  { id: 'activities', label: 'Hoạt động' },
  { id: 'submissions', label: 'Bài nộp & kết quả' },
  { id: 'students', label: 'Học sinh' },
  { id: 'statistics', label: 'Thống kê' },
]

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return tabs.some((tab) => tab.id === value)
}

function getWorkspaceErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Bạn không còn quyền truy cập môn học này.'
    if (error.status === 404) return 'Không tìm thấy môn học hoặc lớp học được yêu cầu.'
    return error.message
  }

  return 'Không thể tải workspace môn học. Hãy thử lại.'
}

export function TeacherSubjectWorkspace() {
  const { classroomId, classroomSubjectId } = useParams()
  const [params, setParams] = useSearchParams()
  const [context, setContext] = useState<TeacherClassroomSubjectContext | null>(null)
  const [students, setStudents] = useState<TeacherClassroomStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!classroomSubjectId) return

    let cancelled = false

    Promise.all([
      teacherWorkspaceApi.getClassroomSubject(classroomSubjectId),
      teacherWorkspaceApi.listClassroomSubjectStudents(classroomSubjectId),
    ])
      .then(([nextContext, nextStudents]) => {
        if (cancelled) return
        if (classroomId && nextContext.classroomId !== classroomId) {
          setLoadError('Môn học không thuộc lớp được yêu cầu.')
          setContext(null)
          setStudents([])
          return
        }
        setContext(nextContext)
        setStudents(nextStudents)
      })
      .catch((error) => {
        if (cancelled) return
        setContext(null)
        setStudents([])
        setLoadError(getWorkspaceErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [classroomId, classroomSubjectId, reloadKey])

  const requestedTab = params.get('tab')
  const tab: WorkspaceTab = isWorkspaceTab(requestedTab) ? requestedTab : 'lessons'
  const search = params.get('studentSearch') ?? ''
  const visibleStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('vi')
    if (!normalizedSearch) return students
    return students.filter((student) => student.name.toLocaleLowerCase('vi').includes(normalizedSearch))
  }, [search, students])

  function getTabPath(nextTab: WorkspaceTab): string {
    if (!context) return '#'
    const nextParams = new URLSearchParams(params)
    nextParams.set('tab', nextTab)
    if (nextTab !== 'students') nextParams.delete('studentSearch')
    return `${teacherWorkspacePath(context.classroomId, context.classroomSubjectId)}?${nextParams.toString()}`
  }

  function handleStudentSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextSearch = String(formData.get('studentSearch') ?? '').trim()
    const nextParams = new URLSearchParams(params)
    nextParams.set('tab', 'students')
    if (nextSearch) nextParams.set('studentSearch', nextSearch)
    else nextParams.delete('studentSearch')
    setParams(nextParams)
  }

  if (isLoading) {
    return <div className="page-content tw-page"><p>Đang tải workspace môn học...</p></div>
  }

  if (loadError || !context) {
    return (
      <div className="page-content tw-page">
        <Link className="tc-back-link" to={classroomId ? `/teacher/classes/${classroomId}` : '/teacher/classes'}><ArrowLeft size={15} /> Quay lại lớp</Link>
        <div className="panel tc-empty" role="alert">
          <AlertCircle size={28} />
          <h2>Không thể tải workspace môn học</h2>
          <p>{loadError || 'Môn học không khả dụng.'}</p>
          <button type="button" onClick={() => { setIsLoading(true); setLoadError(''); setReloadKey((value) => value + 1) }}><RotateCcw size={14} /> Thử lại</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content tw-page">
      <header className="tw-class-header">
        <div>
          <div className="tc-status-line">
            {context.readOnly ? <Archive size={14} /> : <School size={14} />}
            {context.readOnly ? 'LỊCH SỬ GIẢNG DẠY' : 'LỚP HIỆN TẠI'}
          </div>
          <h1>{context.classroomName} · {context.subjectName}</h1>
          <p>Khối {context.gradeLevel} · Năm học {context.academicYear} · {context.studentCount} học sinh</p>
        </div>
        <span className={`tc-status-pill ${context.readOnly ? 'is-archived' : 'is-active'}`}>
          {context.readOnly ? 'Chỉ xem' : 'Đang hoạt động'}
        </span>
      </header>

      {context.readOnly && (
        <div className="tc-archive-notice" role="status">
          <Archive size={16} />
          <span>Lớp đã lưu trữ. Bạn vẫn xem được học liệu và dữ liệu lịch sử, nhưng không thể thay đổi nội dung.</span>
        </div>
      )}

      <section className="tw-subject-summary" aria-label="Thông tin môn học">
        <BookOpen size={19} />
        <div>
          <strong>{context.subjectName}</strong>
          <span>{context.lessonCount} bài học · {context.activityCount} hoạt động · {context.studentCount} học sinh</span>
        </div>
      </section>

      <nav className="tw-tabs" aria-label="Không gian môn học">
        {tabs.map((item) => (
          <Link key={item.id} aria-current={tab === item.id ? 'page' : undefined} to={getTabPath(item.id)}>{item.label}</Link>
        ))}
      </nav>

      {tab === 'lessons' ? (
        <TeacherLessonsPanel context={context} />
      ) : tab === 'activities' ? (
        <ActivitiesPage classroomSubjectId={context.classroomSubjectId} />
      ) : tab === 'statistics' ? (
        <ClassStatisticsPage classroomSubjectId={context.classroomSubjectId} embedded />
      ) : tab === 'submissions' ? (
        <SubmissionsPage
          classroomSubjectId={context.classroomSubjectId}
          classroomName={context.classroomName}
          subjectName={context.subjectName}
          readOnly={context.readOnly}
        />
      ) : tab === 'students' ? (
        <section className="panel tw-api-panel">
          <div className="page-heading">
            <h2>Học sinh trong môn học</h2>
            <p>{context.readOnly ? 'Danh sách lịch sử của lớp đã lưu trữ.' : 'Danh sách học sinh hiện tại của lớp.'}</p>
          </div>
          <form className="tw-search" role="search" onSubmit={handleStudentSearch}>
            <label>Tìm học sinh<input name="studentSearch" defaultValue={search} placeholder="Nhập tên học sinh" /></label>
            <button type="submit">Tìm kiếm</button>
          </form>
          {visibleStudents.length === 0 ? (
            <div className="tc-empty"><Users size={25} /><h2>Không tìm thấy học sinh</h2><p>Thử tìm bằng một phần tên hoặc bỏ từ khóa.</p></div>
          ) : (
            <ul className="tw-students">
              {visibleStudents.map((student) => <StudentRow key={`${student.id}-${student.joinedAt ?? 'membership'}`} student={student} archived={context.readOnly} studentPath={`${teacherWorkspacePath(context.classroomId, context.classroomSubjectId)}/students/${student.id}`} />)}
            </ul>
          )}
        </section>
      ) : (
        <section className="panel tw-api-panel" aria-live="polite">
          <BookOpen size={25} />
          <h2>{tabs.find((item) => item.id === tab)?.label}</h2>
          <p>{context.readOnly ? 'Dữ liệu lịch sử được giữ ở chế độ chỉ xem.' : 'Chức năng này sẽ được nối API trong đợt Activities/Statistics tiếp theo.'}</p>
          <span className="tc-muted">Chưa dùng dữ liệu fixture để tránh hiển thị hoặc ghi nhầm dữ liệu mẫu.</span>
        </section>
      )}
    </div>
  )
}

function StudentRow({ student, archived, studentPath }: { student: TeacherClassroomStudent; archived: boolean; studentPath: string }) {
  return (
    <li>
      <strong><Link to={studentPath}>{student.name}</Link></strong>
      <span>@{student.username}</span>
      {archived && student.joinedAt && <span>Vào lớp: {formatDate(student.joinedAt)}</span>}
      {archived && student.leftAt && <span>Rời lớp: {formatDate(student.leftAt)}</span>}
    </li>
  )
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}
