import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, School, Search, Users } from 'lucide-react'
import { Link } from 'react-router'
import { assignedClasses, currentTeacherId } from '../fixtures'
import { classScenarios, type ClassScenario } from './classes.mock'
import './classes.css'

export function AssignedClassesPage() {
  const [scenario, setScenario] = useState<ClassScenario>('assigned')
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<number | 'ALL'>('ALL')

  // Classes where current teacher is assigned to at least one subject
  const allClasses = useMemo(() => {
    return assignedClasses.filter((item) =>
      item.subjects.some((subject) => subject.teacherId === currentTeacherId)
    )
  }, [])

  // Filtered classes based on search and grade
  const visibleClasses = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allClasses.filter((item) => {
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.academicYear.toLowerCase().includes(term)
      const matchGrade = gradeFilter === 'ALL' || item.gradeLevel === gradeFilter
      return matchSearch && matchGrade
    })
  }, [allClasses, search, gradeFilter])

  return (
    <div className="page-content tc-page">
      <div className="page-heading">
        <span className="eyebrow">
          <span className="eyebrow-line" /> GIÁNG DẠY
        </span>
        <h1>Lớp của tôi</h1>
        <p>Danh mục các lớp học bạn đang được phân công phụ trách môn trong năm học.</p>
      </div>

      <div className="tc-toolbar">
        <span>Dữ liệu minh họa · Giáo viên Lịch sử</span>
        <label>
          Tình huống mẫu{' '}
          <select
            value={scenario}
            onChange={(event) => setScenario(event.target.value as ClassScenario)}
          >
            {Object.entries(classScenarios).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {scenario === 'empty' ? (
        <div className="panel tc-empty">
          <School size={28} />
          <h2>Chưa được phân công lớp</h2>
          <p>Khi Admin phân công bạn vào môn học của một lớp, lớp đó sẽ xuất hiện tại danh mục này.</p>
        </div>
      ) : scenario === 'revoked' ? (
        <div className="panel tc-empty" role="alert">
          <School size={28} />
          <h2>Phân công đã thay đổi</h2>
          <p>Bạn không còn quyền phụ trách các môn học tại lớp này. Hãy tải lại danh mục lớp.</p>
          <button type="button" onClick={() => setScenario('assigned')}>
            Xem danh sách hiện tại
          </button>
        </div>
      ) : (
        <>
          {/* Filters Bar */}
          <div className="tc-catalog-filters">
            <div className="tc-catalog-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Tìm theo tên lớp, năm học..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="tc-catalog-filter-grade">
              <label htmlFor="grade-filter-select">Khối:</label>
              <select
                id="grade-filter-select"
                value={gradeFilter}
                onChange={(e) =>
                  setGradeFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                }
              >
                <option value="ALL">Tất cả các khối</option>
                <option value={10}>Khối 10</option>
                <option value={11}>Khối 11</option>
                <option value={12}>Khối 12</option>
              </select>
            </div>
          </div>

          {/* Classes Cards Grid */}
          {visibleClasses.length === 0 ? (
            <div className="panel tc-empty" style={{ padding: '40px 20px' }}>
              <School size={24} />
              <h3>Không tìm thấy lớp học phù hợp</h3>
              <p>Hãy thử tìm với từ khóa hoặc bộ lọc khối khác.</p>
            </div>
          ) : (
            <div className="tc-class-grid">
              {visibleClasses.map((item) => {
                const mySubjects = item.subjects.filter(
                  (s) => s.teacherId === currentTeacherId
                )
                return (
                  <div key={item.id} className="panel tc-class-card">
                    <div className="tc-class-card-head">
                      <div className="tc-class-card-badge">Khối {item.gradeLevel}</div>
                      <span className="tc-class-card-year">{item.academicYear}</span>
                    </div>

                    <div className="tc-class-card-body">
                      <h2 className="tc-class-card-title">{item.name}</h2>
                      <div className="tc-class-card-meta">
                        <div className="tc-class-meta-item">
                          <BookOpen size={15} />
                          <span>
                            {mySubjects.map((s) => s.name).join(', ') || 'Chưa phân môn'}
                          </span>
                        </div>
                        <div className="tc-class-meta-item">
                          <Users size={15} />
                          <span>{item.students.length} học sinh</span>
                        </div>
                      </div>
                    </div>

                    <div className="tc-class-card-foot">
                      <Link
                        to={`/teacher/classes/${item.id}`}
                        className="tc-class-card-btn"
                      >
                        Vào lớp <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
