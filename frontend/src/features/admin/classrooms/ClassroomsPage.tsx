import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router'
import {
  AlertCircle,
  Archive,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Plus,
  RotateCcw,
  School,
  Search,
  Users,
  X,
} from 'lucide-react'
import { type ClassroomStatus } from '../fixtures'
import {
  emptyClassroomDraft,
  validateClassroomDraft,
  type ClassroomDraft,
} from './classrooms.mock'
import {
  downloadStudentTemplateXlsx,
  readStudentWorkbook,
  type StudentImportIssue,
  type StudentImportRow,
} from './studentImport'
import { ClassroomDetailPage } from './ClassroomDetailPage'
import { ApiError } from '../../../lib/api/client'
import { adminApi, type AdminClassroomSummary } from '../../../lib/api/admin'
import './classrooms.css'

function getProgressStatusClass(isComplete: boolean, assigned: number): string {
  if (isComplete) return 'is-complete'
  if (assigned > 0) return 'is-partial'
  return ''
}

export function ClassroomsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [classList, setClassList] = useState<AdminClassroomSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<number | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<ClassroomStatus | 'ALL'>('ALL')

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [draft, setDraft] = useState<ClassroomDraft>(emptyClassroomDraft)
  const [formErrors, setFormErrors] = useState<string[]>([])

  // Excel Option in Modal
  const [enableExcel, setEnableExcel] = useState(false)
  const [excelFileName, setExcelFileName] = useState('')
  const [excelPassword, setExcelPassword] = useState('')
  const [excelRows, setExcelRows] = useState<StudentImportRow[]>([])
  const [excelIssues, setExcelIssues] = useState<StudentImportIssue[]>([])
  const [excelError, setExcelError] = useState('')
  const [isReadingFile, setIsReadingFile] = useState(false)

  // Success Feedback
  const [successInfo, setSuccessInfo] = useState<{
    classroomName: string
    subjectsCreated: number
    studentsAdded: number
  } | null>(null)

  // Selected class in URL search param (direct detail view)
  const selectedClassId = searchParams.get('id')

  // Metrics
  const activeClassesCount = useMemo(() => classList.filter((c) => c.status === 'ACTIVE').length, [classList])
  const archivedClassesCount = useMemo(() => classList.filter((c) => c.status === 'ARCHIVED').length, [classList])
  const totalStudentsCount = useMemo(() => classList.reduce((acc, c) => acc + c.studentCount, 0), [classList])

  // Filtered List
  const visibleClassrooms = useMemo(() => {
    const term = search.trim().toLowerCase()
    return classList.filter((item) => {
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.academicYear.toLowerCase().includes(term)
      const matchGrade = gradeFilter === 'ALL' || item.gradeLevel === gradeFilter
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
      return matchSearch && matchGrade && matchStatus
    })
  }, [classList, search, gradeFilter, statusFilter])

  useEffect(() => {
    if (selectedClassId) return

    let cancelled = false
    setIsLoading(true)
    setLoadError('')

    adminApi.listClassrooms({ limit: 100 })
      .then((response) => {
        if (!cancelled) setClassList(response.items)
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof ApiError ? error.message : 'Không thể tải danh sách lớp học.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedClassId])

  // Excel Validation Metrics
  const excelSummary = useMemo(() => {
    if (!excelRows.length) return null
    return {
      total: excelRows.length,
      errorsCount: excelIssues.length,
      validCount: excelRows.length - excelIssues.length,
    }
  }, [excelRows, excelIssues])

  // Handlers
  function openCreateModal() {
    setDraft({ ...emptyClassroomDraft, gradeLevel: 10, academicYear: '2026–2027' })
    setFormErrors([])
    setEnableExcel(false)
    setExcelFileName('')
    setExcelPassword('')
    setExcelRows([])
    setExcelIssues([])
    setExcelError('')
    setIsCreateOpen(true)
  }

  function closeCreateModal() {
    setIsCreateOpen(false)
    setFormErrors([])
    setExcelRows([])
    setExcelIssues([])
    setExcelFileName('')
    setExcelPassword('')
    setExcelError('')
  }

  async function handleDownloadTemplate() {
    await downloadStudentTemplateXlsx()
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setExcelError('')
    if (!file) return

    setExcelPassword('')
    setExcelFileName(file.name)
    setIsReadingFile(true)
    try {
      const { rows, issues } = await readStudentWorkbook(file)
      if (issues.length > 0) {
        setExcelError(issues[0].message)
        setExcelRows([])
        setExcelIssues(issues)
      } else {
        setExcelRows(rows)
        setExcelIssues([])
      }
    } catch {
      setExcelError('Không thể đọc file. Vui lòng chọn file .xlsx đúng định dạng.')
      setExcelRows([])
      setExcelIssues([])
    } finally {
      setIsReadingFile(false)
    }
  }

  function handleRemoveFile() {
    setExcelFileName('')
    setExcelPassword('')
    setExcelRows([])
    setExcelIssues([])
    setExcelError('')
  }

  async function handleSubmitCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // 1. Validate basic class info
    const errors = validateClassroomDraft(draft)
    if (errors.length > 0) {
      setFormErrors(errors)
      return
    }

    // 2. Excel import is completed from the created classroom detail page.
    if (enableExcel) {
      setFormErrors(['Hãy tạo lớp trước, sau đó mở chi tiết lớp để nhập Excel và xem kết quả kiểm tra từ backend.'])
      return
    }

    // 3. Create classroom through the backend
    setIsSaving(true)
    try {
      const created = await adminApi.createClassroom(draft)
      const subjectsCreated = created.subjectCount
      await adminApi.listClassrooms({ limit: 100 }).then((response) => setClassList(response.items))
      setSuccessInfo({
        classroomName: created.name,
        subjectsCreated,
        studentsAdded: 0,
      })

      closeCreateModal()
    } catch (err) {
      setFormErrors([err instanceof ApiError ? err.message : 'Có lỗi xảy ra khi tạo lớp.'])
    } finally {
      setIsSaving(false)
    }
  }

  function handleSelectClassroom(id: string) {
    setSearchParams({ id })
  }

  // Render detail view if URL has ?id=...
  if (selectedClassId) {
    return (
      <ClassroomDetailPage
        classroomId={selectedClassId}
        onBack={() => setSearchParams({})}
      />
    )
  }

  return (
    <div className="page-content adm-page cls-container">
      {/* Heading */}
      <div className="page-heading">
        <span className="eyebrow">
          <span className="eyebrow-line" /> QUẢN TRỊ HỆ THỐNG
        </span>
        <h1>Lớp học</h1>
        <p>
          Quản lý danh mục lớp, khối và năm học. Mỗi lớp độc lập chứa phân bổ môn học và phân công giáo viên.
        </p>
      </div>

      {/* Demo Notice */}
      <div className="adm-notice">
        <School size={17} />
        <span>
          Dữ liệu lớp học được tải từ hệ thống. Mỗi lớp mới sẽ tự động nhận các môn đang hoạt động trong danh mục chung.
        </span>
      </div>

      {/* Success Notification */}
      {successInfo && (
        <div className="cls-success-banner" role="status">
          <CheckCircle2 size={19} />
          <div style={{ flex: 1 }}>
            <strong>Đã tạo lớp “{successInfo.classroomName}” trên hệ thống.</strong>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
              Đã tự động khởi tạo {successInfo.subjectsCreated} môn học từ danh mục chung với giáo viên “Chưa phân công”.
              {successInfo.studentsAdded > 0 && ` Đã thêm ${successInfo.studentsAdded} học sinh vào lớp.`}
            </p>
          </div>
          <button
            type="button"
            className="cls-btn-detail"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => setSuccessInfo(null)}
          >
            Đóng
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="cls-stats-grid">
        <div className="cls-stat-card">
          <div className="cls-stat-icon">
            <School size={22} />
          </div>
          <div className="cls-stat-info">
            <span className="cls-stat-value">{classList.length}</span>
            <span className="cls-stat-label">Tổng số lớp học</span>
          </div>
        </div>

        <div className="cls-stat-card">
          <div className="cls-stat-icon is-active">
            <Check size={22} />
          </div>
          <div className="cls-stat-info">
            <span className="cls-stat-value">{activeClassesCount}</span>
            <span className="cls-stat-label">Lớp đang học</span>
          </div>
        </div>

        <div className="cls-stat-card">
          <div className="cls-stat-icon is-archived">
            <Archive size={22} />
          </div>
          <div className="cls-stat-info">
            <span className="cls-stat-value">{archivedClassesCount}</span>
            <span className="cls-stat-label">Lớp đã lưu trữ</span>
          </div>
        </div>

        <div className="cls-stat-card">
          <div className="cls-stat-icon is-students">
            <Users size={22} />
          </div>
          <div className="cls-stat-info">
            <span className="cls-stat-value">{totalStudentsCount}</span>
            <span className="cls-stat-label">Học sinh trong lớp</span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="cls-toolbar">
        <div className="cls-filters-group">
          {/* Search */}
          <label className="cls-search-input">
            <Search size={16} />
            <span className="sr-only">Tìm tên lớp hoặc năm học</span>
            <input
              placeholder="Tìm theo tên lớp hoặc năm học..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          {/* Grade filter */}
          <div className="cls-filter-select">
            <span className="sr-only">Lọc theo khối</span>
            <select
              aria-label="Lọc theo khối"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            >
              <option value="ALL">Tất cả các khối</option>
              <option value="10">Khối 10</option>
              <option value="11">Khối 11</option>
              <option value="12">Khối 12</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="cls-filter-select">
            <span className="sr-only">Lọc theo trạng thái</span>
            <select
              aria-label="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ClassroomStatus | 'ALL')}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang học</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </div>
        </div>

        {/* Action Button */}
        <button type="button" className="cls-btn-create" onClick={openCreateModal}>
          <Plus size={16} /> Tạo lớp học
        </button>
      </div>

      {/* Classroom Catalog Table */}
      <div className="cls-card-wrapper">
        {isLoading ? (
          <div className="cls-empty-box">
            <p>Đang tải danh sách lớp học...</p>
          </div>
        ) : loadError ? (
          <div className="cls-empty-box" role="alert">
            <div className="cls-empty-icon">
              <AlertCircle size={28} />
            </div>
            <strong>Không thể tải danh sách lớp học</strong>
            <p>{loadError}</p>
            <button
              type="button"
              className="cls-btn-detail"
              onClick={() => {
                setIsLoading(true)
                setLoadError('')
                adminApi.listClassrooms({ limit: 100 })
                  .then((response) => setClassList(response.items))
                  .catch((error) => setLoadError(error instanceof ApiError ? error.message : 'Không thể tải danh sách lớp học.'))
                  .finally(() => setIsLoading(false))
              }}
            >
              <RotateCcw size={14} /> Thử lại
            </button>
          </div>
        ) : visibleClassrooms.length === 0 ? (
          <div className="cls-empty-box">
            <div className="cls-empty-icon">
              <School size={28} />
            </div>
            <strong>Không có lớp học phù hợp</strong>
            <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh các bộ lọc khối và trạng thái.</p>
            <button
              type="button"
              className="cls-btn-detail"
              onClick={() => {
                setSearch('')
                setGradeFilter('ALL')
                setStatusFilter('ALL')
              }}
            >
              <RotateCcw size={14} /> Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <table className="cls-table">
            <thead>
              <tr>
                <th>Tên lớp</th>
                <th>Khối & Năm học</th>
                <th>Sĩ số hiện tại</th>
                <th>Phân công môn học</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleClassrooms.map((item) => {
                const assigned = item.assignedTeacherCount
                const total = item.subjectCount
                const percentage = total === 0 ? 0 : Math.round((assigned / total) * 100)
                const isComplete = total > 0 && assigned === total

                return (
                  <tr key={item.id}>
                    {/* Class name badge */}
                    <td>
                      <span className="cls-badge-name">{item.name}</span>
                    </td>

                    {/* Grade and year */}
                    <td>
                      <div className="cls-grade-year">
                        <strong>Khối {item.gradeLevel}</strong>
                        <small>Năm học: {item.academicYear}</small>
                      </div>
                    </td>

                    {/* Student count */}
                    <td>
                      <span className="cls-student-count">
                        <Users size={14} />
                        {item.studentCount} học sinh
                      </span>
                    </td>

                    {/* Subject ratio and mini progress bar */}
                    <td>
                      <div className="cls-subject-progress">
                        <div
                          className={`cls-ratio-text ${getProgressStatusClass(
                            isComplete,
                            assigned
                          )}`}
                        >
                          <span>{assigned}/{total} môn</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="cls-progress-bar">
                          <div
                            className={`cls-progress-fill ${getProgressStatusClass(
                              isComplete,
                              assigned
                            )}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td>
                      <span
                        className={`cls-status-pill ${
                          item.status === 'ACTIVE' ? 'is-active' : 'is-archived'
                        }`}
                      >
                        {item.status === 'ACTIVE' ? 'Đang học' : 'Lưu trữ'}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="cls-btn-detail"
                        onClick={() => handleSelectClassroom(item.id)}
                      >
                        Xem chi tiết lớp <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Tạo Lớp Học */}
      {isCreateOpen && (
        <div className="cls-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-class-title">
          <div className="cls-modal">
            {/* Modal Header */}
            <div className="cls-modal-head">
              <h3 id="create-class-title">Tạo lớp học mới</h3>
              <button
                type="button"
                className="cls-modal-close"
                onClick={closeCreateModal}
                aria-label="Đóng modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitCreate} noValidate>
              <div className="cls-modal-body">
                {/* Basic inputs */}
                <div className="cls-field-group">
                  <div className="cls-field">
                    <label htmlFor="create-name">Tên lớp *</label>
                    <input
                      id="create-name"
                      required
                      placeholder="Ví dụ: 11A3"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  </div>

                  <div className="cls-field">
                    <label htmlFor="create-grade">Khối lớp *</label>
                    <select
                      id="create-grade"
                      value={draft.gradeLevel}
                      onChange={(e) => setDraft({ ...draft, gradeLevel: Number(e.target.value) })}
                    >
                      <option value={10}>Khối 10</option>
                      <option value={11}>Khối 11</option>
                      <option value={12}>Khối 12</option>
                    </select>
                  </div>

                  <div className="cls-field cls-field-full">
                    <label htmlFor="create-year">Năm học *</label>
                    <input
                      id="create-year"
                      required
                      placeholder="Ví dụ: 2026–2027"
                      value={draft.academicYear}
                      onChange={(e) => setDraft({ ...draft, academicYear: e.target.value })}
                    />
                  </div>
                </div>

                {/* Auto-Subject Assignment Notice */}
                <div className="adm-notice" style={{ margin: 0, padding: '10px 14px' }}>
                  <BookOpen size={16} />
                  <span>
                    Hệ thống sẽ tự động gán các môn đang hoạt động trong danh mục cho lớp mới với trạng thái
                    <em> Chưa phân công</em> giáo viên. Có thể nhập Excel sau khi mở chi tiết lớp.
                  </span>
                </div>

                {/* Excel Student Import Option */}
                <div className="cls-excel-card">
                  <div className="cls-excel-header">
                    <label
                      htmlFor="excel-toggle"
                      className="cls-excel-title"
                      style={{ cursor: 'default', userSelect: 'none' }}
                    >
                      <input
                        type="checkbox"
                        id="excel-toggle"
                        checked={enableExcel}
                        disabled
                        onChange={(e) => {
                          setEnableExcel(e.target.checked)
                          if (!e.target.checked) {
                            handleRemoveFile()
                            setExcelPassword('')
                          }
                        }}
                        style={{ accentColor: '#286449', width: 16, height: 16 }}
                      />
                      <span>Nhập danh sách học sinh bằng Excel sau khi tạo lớp</span>
                    </label>

                    <button
                      type="button"
                      className="cls-btn-template"
                      onClick={handleDownloadTemplate}
                      title="Tải file mẫu Excel (.xlsx)"
                    >
                      <Download size={13} /> Tải file mẫu Excel
                    </button>
                  </div>

                  <p className="cls-excel-help">
                    File Excel (.xlsx) gồm 3 cột theo thứ tự: <strong>Họ và tên</strong>, <strong>Tên đăng nhập</strong>, <strong>Thông tin liên hệ</strong>.
                    Hệ thống sẽ kiểm tra từng dòng theo nguyên tắc toàn vẹn (tất cả hợp lệ mới tạo tài khoản và gán vào lớp).
                  </p>

                  {enableExcel && (
                    <>
                      <div className="cls-field" style={{ margin: '8px 0 12px' }}>
                        <label htmlFor="create-excel-password">
                          Mật khẩu khởi tạo chung cho học sinh *
                        </label>
                        <input
                          id="create-excel-password"
                          type="password"
                          autoComplete="new-password"
                          required={enableExcel}
                          placeholder="Nhập mật khẩu ban đầu cấp cho toàn bộ học sinh trong file"
                          value={excelPassword}
                          onChange={(e) => setExcelPassword(e.target.value)}
                        />
                        <span style={{ fontSize: '12px', color: '#6b7280', marginTop: 3 }}>
                          Sau khi tạo lớp, mở chi tiết lớp để preview và nhập file qua máy chủ.
                        </span>
                      </div>

                      {!excelFileName ? (
                        <div className="cls-excel-actions">
                          <label className="cls-file-dropzone">
                            <FileUp size={15} /> {isReadingFile ? 'Đang đọc file...' : 'Chọn file danh sách (.xlsx)'}
                            <input
                              type="file"
                              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                              onChange={handleFileUpload}
                              disabled={isReadingFile}
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="cls-file-chosen">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileSpreadsheet size={16} />
                            <strong>{excelFileName}</strong>
                          </div>
                          <button
                            type="button"
                            className="cls-btn-remove-file"
                            onClick={handleRemoveFile}
                          >
                            Xóa file
                          </button>
                        </div>
                      )}

                      {/* File Reading Error */}
                      {excelError && (
                        <div className="cls-error-container">
                          <div className="cls-error-title">
                            <AlertCircle size={15} /> Lỗi đọc file
                          </div>
                          <p style={{ margin: 0, fontSize: '12px', color: '#b72727' }}>{excelError}</p>
                        </div>
                      )}

                      {/* Summary Metrics */}
                      {excelSummary && !excelError && (
                        <div className="cls-summary-chips">
                          <div className="cls-summary-chip cls-chip-total">
                            <strong>{excelSummary.total}</strong>
                            <span>Tổng số dòng</span>
                          </div>
                          <div className="cls-summary-chip cls-chip-new">
                            <strong>{excelSummary.validCount}</strong>
                            <span>Hợp lệ</span>
                          </div>
                          <div className="cls-summary-chip cls-chip-error">
                            <strong>{excelSummary.errorsCount}</strong>
                            <span>Dòng lỗi</span>
                          </div>
                        </div>
                      )}

                      {/* Detailed Error Breakdown (if errors exist) */}
                      {excelIssues.length > 0 && (
                        <div className="cls-error-container">
                          <div className="cls-error-title">
                            <AlertCircle size={15} />
                            Có {excelIssues.length} dòng dữ liệu không hợp lệ (Không thể tạo lớp kèm file):
                          </div>
                          <div className="cls-error-list">
                            {excelIssues.map((err) => (
                              <div key={`${err.line}-${err.message}`} className="cls-error-item">
                                <span className="cls-error-line">Dòng {err.line}</span>
                                <div>
                                  <span style={{ color: '#b72727' }}>{err.message}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* All Valid Banner */}
                      {excelSummary && excelSummary.total > 0 && excelIssues.length === 0 && !excelError && (
                        <div
                          className="adm-inline-note"
                          style={{
                            margin: 0,
                            background: '#e8f6e8',
                            color: '#216235',
                            border: '1px solid #c2e6c4',
                          }}
                        >
                          <CheckCircle2 size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                          Toàn bộ {excelSummary.total} dòng đều hợp lệ để tạo tài khoản và phân vào lớp mới.
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Form General Errors */}
                {formErrors.length > 0 && (
                  <div className="adm-errors" role="alert" style={{ margin: 0 }}>
                    <strong>Vui lòng kiểm tra lại:</strong>
                    <ul>
                      {formErrors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="cls-modal-foot">
                <button type="button" className="cls-btn-cancel" onClick={closeCreateModal}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="cls-btn-submit"
                  disabled={isSaving}
                  title={
                    isSaving ? 'Đang tạo lớp học' : undefined
                  }
                >
                  {isSaving ? 'Đang lưu...' : 'Xác nhận tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
