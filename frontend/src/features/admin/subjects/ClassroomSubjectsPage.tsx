import { useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Plus,
  School,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import {
  getEligibleTeachers,
  subjects,
  type Subject,
} from '../fixtures'
import {
  addNewSubject,
  getActiveClassrooms,
  getActiveSpecializedTeachers,
  slugifySubjectName,
  validateNewSubject,
} from './subjects.mock'
import './subjects.css'

export function ClassroomSubjectsPage() {
  const [subjectList, setSubjectList] = useState<Subject[]>(() => [...subjects])
  const [searchTerm, setSearchTerm] = useState('')

  // Add Subject Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  // Derived stats
  const activeClassrooms = useMemo(() => getActiveClassrooms(), [])
  const totalEligibleTeachers = useMemo(() => getActiveSpecializedTeachers().length, [])

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return subjectList
    return subjectList.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term)
    )
  }, [subjectList, searchTerm])

  // Suggested slug preview for modal
  const previewSlug = useMemo(
    () => slugifySubjectName(newSubjectName),
    [newSubjectName]
  )

  function openAddModal() {
    setNewSubjectName('')
    setFormErrors([])
    setIsModalOpen(true)
  }

  function closeAddModal() {
    setIsModalOpen(false)
    setNewSubjectName('')
    setFormErrors([])
  }

  function handleCreateSubject(e: FormEvent) {
    e.preventDefault()
    const errors = validateNewSubject(newSubjectName)
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }

    const trimmed = newSubjectName.trim()
    const activeCount = addNewSubject(trimmed)

    // Synchronize subject list state
    setSubjectList([...subjects])
    setSuccessNotice(
      `Đã thêm môn ${trimmed} vào danh mục chung và tự động mở môn cho ${activeCount} lớp đang hoạt động (trạng thái: Chưa phân công giáo viên).`
    )
    closeAddModal()
  }

  function getTeacherInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return (parts[0]?.[0] || 'GV').toUpperCase()
  }

  return (
    <div className="page-content adm-page sbj-page">
      {/* Page Heading */}
      <div className="page-heading">
        <span className="eyebrow">
          <span className="eyebrow-line" /> QUẢN TRỊ HỆ THỐNG
        </span>
        <h1>Danh mục môn học chung</h1>
        <p>
          Danh mục môn học áp dụng thống nhất cho toàn trường. Mọi lớp đang học (ACTIVE) đều tự động có đủ môn trong danh mục.
        </p>
      </div>

      {/* Notice Banner */}
      <div className="sbj-notice" role="region" aria-label="Thông báo danh mục">
        <BookOpen size={19} className="sbj-notice-icon" />
        <div>
          <strong>Quy tắc danh mục chung:</strong> Môn học được quản lý tập trung và tự động mở cho tất cả lớp đang hoạt động với trạng thái <em>Chưa phân công giáo viên</em>. Việc chỉ định giáo viên phụ trách môn được thực hiện linh hoạt tại trang <strong>Chi tiết lớp học</strong>.
        </div>
      </div>

      {/* Success Alert Banner */}
      {successNotice && (
        <div className="sbj-alert-success" role="status">
          <div className="sbj-alert-content">
            <CheckCircle2 size={18} />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            className="sbj-alert-close"
            onClick={() => setSuccessNotice(null)}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="sbj-stats-grid">
        <div className="sbj-stat-card">
          <div className="sbj-stat-icon is-subjects">
            <BookOpen size={24} />
          </div>
          <div className="sbj-stat-info">
            <span className="sbj-stat-value">{subjectList.length}</span>
            <span className="sbj-stat-label">Tổng số môn học</span>
            <span className="sbj-stat-sublabel">Trong danh mục chung</span>
          </div>
        </div>

        <div className="sbj-stat-card">
          <div className="sbj-stat-icon is-teachers">
            <GraduationCap size={24} />
          </div>
          <div className="sbj-stat-info">
            <span className="sbj-stat-value">{totalEligibleTeachers}</span>
            <span className="sbj-stat-label">Giáo viên chuyên môn</span>
            <span className="sbj-stat-sublabel">Sẵn sàng phân công</span>
          </div>
        </div>

        <div className="sbj-stat-card">
          <div className="sbj-stat-icon is-classrooms">
            <School size={24} />
          </div>
          <div className="sbj-stat-info">
            <span className="sbj-stat-value">{activeClassrooms.length}</span>
            <span className="sbj-stat-label">Lớp học áp dụng</span>
            <span className="sbj-stat-sublabel">Lớp đang hoạt động</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search and Action */}
      <div className="sbj-toolbar">
        <div className="sbj-search-box">
          <Search size={18} color="#7d9484" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm theo tên môn học hoặc mã định danh..."
            aria-label="Tìm kiếm môn học"
          />
          {searchTerm && (
            <button
              type="button"
              className="sbj-alert-close"
              onClick={() => setSearchTerm('')}
              aria-label="Xóa tìm kiếm"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="sbj-toolbar-actions">
          <button
            type="button"
            className="sbj-btn-primary"
            onClick={openAddModal}
          >
            <Plus size={17} /> Thêm môn học mới
          </button>
        </div>
      </div>

      {/* Catalog Table Card */}
      <div className="sbj-table-card">
        <div className="sbj-table-header">
          <div className="sbj-table-header-title">
            <span>Danh sách môn học</span>
            <span className="sbj-table-count-badge">
              {filteredSubjects.length} môn
            </span>
          </div>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="sbj-empty-state">
            <div className="sbj-empty-icon">
              <BookOpen size={28} />
            </div>
            <h3>Không tìm thấy môn học phù hợp</h3>
            <p>
              Không có môn học nào khớp với từ khóa &ldquo;{searchTerm}&rdquo;. Hãy thử tìm kiếm bằng từ khóa khác hoặc thêm môn mới.
            </p>
            <button
              type="button"
              className="sbj-btn-secondary"
              onClick={() => setSearchTerm('')}
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        ) : (
          <div className="sbj-table-responsive">
            <table className="sbj-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Tên môn học</th>
                  <th style={{ width: '18%' }}>Mã môn (ID)</th>
                  <th style={{ width: '32%' }}>Giáo viên chuyên môn</th>
                  <th style={{ width: '22%' }}>Phạm vi áp dụng</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((subject) => {
                  const eligible = getEligibleTeachers(subject.id)
                  const hasEligible = eligible.length > 0

                  return (
                    <tr key={subject.id}>
                      {/* Subject Name */}
                      <td>
                        <div className="sbj-subject-cell">
                          <div className="sbj-subject-icon">
                            <BookOpen size={18} />
                          </div>
                          <div>
                            <span className="sbj-subject-name">{subject.name}</span>
                            <span className="sbj-subject-meta">Môn học chuẩn</span>
                          </div>
                        </div>
                      </td>

                      {/* Subject ID */}
                      <td>
                        <span className="sbj-code-badge">{subject.id}</span>
                      </td>

                      {/* Qualified Teachers */}
                      <td>
                        <div className="sbj-teachers-col">
                          {hasEligible ? (
                            <>
                              <div className="sbj-teachers-summary">
                                <span>{eligible.length} giáo viên chuyên môn:</span>
                              </div>
                              <div className="sbj-teacher-tags">
                                {eligible.map((teacher) => (
                                  <span
                                    key={teacher.id}
                                    className="sbj-teacher-tag"
                                    title={`${teacher.fullName} (${teacher.qualification || 'Giáo viên'})`}
                                  >
                                    <span className="sbj-teacher-avatar-sm">
                                      {getTeacherInitials(teacher.fullName)}
                                    </span>
                                    <span>{teacher.fullName}</span>
                                  </span>
                                ))}
                              </div>
                            </>
                          ) : (
                            <span className="sbj-no-teachers-badge">
                              <AlertCircle size={14} /> Chưa có giáo viên chuyên môn
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Scope of Application */}
                      <td>
                        <div>
                          <span className="sbj-scope-badge">
                            <Sparkles size={13} /> Áp dụng cho tất cả lớp đang học
                          </span>
                          <span className="sbj-scope-sub">
                            Tự động mở tại {activeClassrooms.length} lớp ACTIVE
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Thêm môn học mới */}
      {isModalOpen && (
        <div
          className="sbj-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAddModal()
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-subject-title"
        >
          <div className="sbj-modal">
            <div className="sbj-modal-head">
              <h2 id="modal-add-subject-title" className="sbj-modal-title">
                <Plus size={20} color="#286449" /> Thêm môn học mới
              </h2>
              <button
                type="button"
                className="sbj-modal-close-btn"
                onClick={closeAddModal}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubject}>
              <div className="sbj-modal-body">
                <p className="sbj-modal-intro">
                  Khi thêm một môn mới, hệ thống sẽ tự động tạo môn cho mọi lớp <strong>đang hoạt động</strong> (trạng thái: <em>Chưa phân công giáo viên</em>). Các lớp đã lưu trữ giữ nguyên dữ liệu lịch sử.
                </p>

                {/* Subject Name Input */}
                <div className="sbj-form-field">
                  <label htmlFor="new-subject-name" className="sbj-form-label">
                    Tên môn học <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="new-subject-name"
                    type="text"
                    className="sbj-form-input"
                    value={newSubjectName}
                    onChange={(e) => {
                      setNewSubjectName(e.target.value)
                      if (formErrors.length > 0) setFormErrors([])
                    }}
                    placeholder="Ví dụ: Hóa học, Sinh học, Tin học..."
                    autoFocus
                  />
                  {newSubjectName.trim() && (
                    <div className="sbj-slug-preview">
                      <span>Mã môn dự kiến:</span>
                      <code>{previewSlug}</code>
                    </div>
                  )}
                </div>

                {/* Scope Preview */}
                <div className="sbj-scope-preview-box">
                  <span className="sbj-scope-preview-label">
                    Phạm vi áp dụng tự động ({activeClassrooms.length} lớp đang học):
                  </span>
                  <div className="sbj-scope-classes-list">
                    {activeClassrooms.map((c) => (
                      <span key={c.id} className="sbj-scope-class-chip">
                        <School size={12} /> {c.name} ({c.academicYear})
                      </span>
                    ))}
                  </div>
                  <span className="sbj-scope-preview-note">
                    * Môn học sẽ được mở với trạng thái Chưa phân công giáo viên. Admin có thể phân công giáo viên sau tại chi tiết từng lớp.
                  </span>
                </div>

                {/* Form Errors */}
                {formErrors.length > 0 && (
                  <div className="sbj-form-errors" role="alert">
                    <strong>Không thể thêm môn học:</strong>
                    <ul>
                      {formErrors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="sbj-modal-foot">
                <button
                  type="button"
                  className="sbj-btn-secondary"
                  onClick={closeAddModal}
                >
                  Hủy
                </button>
                <button type="submit" className="sbj-btn-primary">
                  <Plus size={16} /> Xác nhận thêm môn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
