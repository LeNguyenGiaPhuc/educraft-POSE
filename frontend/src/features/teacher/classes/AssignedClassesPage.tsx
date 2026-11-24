import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertCircle, Archive, ArrowRight, BookOpen, RotateCcw, Search, School, Users } from 'lucide-react'
import { Link } from 'react-router'
import { ApiError } from '../../../lib/api/client'
import { teacherWorkspaceApi } from '../../../lib/api/teacher/workspace'
import type { TeacherClassroomSummary } from '../../../lib/api/teacher/types'
import './classes.css'

export function AssignedClassesPage() {
  const [classrooms, setClassrooms] = useState<TeacherClassroomSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<number | 'ALL'>('ALL')

  function loadClassrooms() {
    setIsLoading(true)
    setLoadError('')

    teacherWorkspaceApi.listClassrooms()
      .then(setClassrooms)
      .catch((error) => {
        setLoadError(error instanceof ApiError ? error.message : 'Không thể tải danh sách lớp học.')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    let cancelled = false

    teacherWorkspaceApi.listClassrooms()
      .then((data) => {
        if (!cancelled) setClassrooms(data)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof ApiError ? error.message : 'Không thể tải danh sách lớp học.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const visibleClassrooms = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('vi')

    return classrooms.filter((classroom) => {
      const matchesSearch = !term || classroom.name.toLocaleLowerCase('vi').includes(term) || classroom.academicYear.toLocaleLowerCase('vi').includes(term)
      const matchesGrade = gradeFilter === 'ALL' || classroom.gradeLevel === gradeFilter
      return matchesSearch && matchesGrade
    })
  }, [classrooms, search, gradeFilter])

  const activeClassrooms = visibleClassrooms.filter((classroom) => classroom.status === 'ACTIVE')
  const archivedClassrooms = visibleClassrooms.filter((classroom) => classroom.status === 'ARCHIVED')
  const sections = [
    { title: 'Lớp hiện tại', icon: <School size={17} />, classrooms: activeClassrooms, archived: false },
    { title: 'Lịch sử giảng dạy', icon: <Archive size={17} />, classrooms: archivedClassrooms, archived: true },
  ]

  return (
    <div className="page-content tc-page">
      <div className="page-heading">
        <span className="eyebrow"><span className="eyebrow-line" /> GIẢNG DẠY</span>
        <h1>Lớp của tôi</h1>
        <p>Danh sách lớp được phân công theo môn học. Lớp đã qua năm học được giữ lại ở phần lịch sử để tra cứu.</p>
      </div>

      <div className="tc-catalog-filters">
        <div className="tc-catalog-search">
          <Search size={16} />
          <label className="sr-only" htmlFor="teacher-class-search">Tìm lớp học</label>
          <input id="teacher-class-search" type="text" placeholder="Tìm theo tên lớp, năm học..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="tc-catalog-filter-grade">
          <label htmlFor="teacher-grade-filter">Khối:</label>
          <select id="teacher-grade-filter" value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value === 'ALL' ? 'ALL' : Number(event.target.value))}>
            <option value="ALL">Tất cả các khối</option>
            <option value="10">Khối 10</option>
            <option value="11">Khối 11</option>
            <option value="12">Khối 12</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="panel tc-empty"><p>Đang tải danh sách lớp học...</p></div>
      ) : loadError ? (
        <ClassroomState
          role="alert"
          icon={<AlertCircle size={28} />}
          title="Không thể tải danh sách lớp"
          detail={loadError}
          action={<button type="button" onClick={loadClassrooms}><RotateCcw size={14} /> Thử lại</button>}
        />
      ) : visibleClassrooms.length === 0 ? (
        <ClassroomState
          icon={<School size={28} />}
          title="Chưa có lớp phù hợp"
          detail="Hãy thử thay đổi từ khóa hoặc bộ lọc khối."
        />
      ) : (
        <>
          {sections.map((section) => (
            <ClassroomSection key={section.title} {...section} />
          ))}
        </>
      )}
    </div>
  )
}

function ClassroomState({ role, icon, title, detail, action }: { role?: 'alert' | 'status'; icon: ReactNode; title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="panel tc-empty" role={role}>
      {icon}
      <h2>{title}</h2>
      <p>{detail}</p>
      {action}
    </div>
  )
}

function ClassroomSection({ title, icon, classrooms, archived = false }: { title: string; icon: ReactNode; classrooms: TeacherClassroomSummary[]; archived?: boolean }) {
  if (classrooms.length === 0) return null

  return (
    <section className="tc-catalog-section" aria-labelledby={archived ? 'archived-classrooms-title' : 'active-classrooms-title'}>
      <div className="tc-section-title">
        {icon}
        <h2 id={archived ? 'archived-classrooms-title' : 'active-classrooms-title'}>{title}</h2>
        <span>{classrooms.length} lớp</span>
      </div>
      <div className="tc-class-grid">
        {classrooms.map((classroom) => (
          <div key={classroom.id} className={`panel tc-class-card ${archived ? 'is-archived' : ''}`}>
            <div className="tc-class-card-head">
              <div className="tc-class-card-badge">Khối {classroom.gradeLevel}</div>
              <span className="tc-class-card-year">{classroom.academicYear}</span>
            </div>
            <div className="tc-class-card-body">
              <h2 className="tc-class-card-title">{classroom.name}</h2>
              <div className="tc-class-card-meta">
                <div className="tc-class-meta-item"><BookOpen size={15} /><span>{classroom.subjects.map((subject) => subject.name).join(', ') || 'Chưa phân môn'}</span></div>
                <div className="tc-class-meta-item"><Users size={15} /><span>{classroom.studentCount} học sinh</span></div>
              </div>
            </div>
            <div className="tc-class-card-foot">
              <Link to={`/teacher/classes/${classroom.id}`} className={`tc-class-card-btn ${archived ? 'is-read-only' : ''}`}>
                {archived ? 'Xem lịch sử' : 'Vào lớp'} <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
