import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router'
import {
  Archive,
  Check,
  CheckCircle2,
  School,
  Users,
} from 'lucide-react'
import { emptyClassroomDraft, validateClassroomDraft, type ClassroomDraft } from './classroomForm'
import {
  downloadStudentTemplateXlsx,
  readStudentWorkbook,
  type StudentImportIssue,
  type StudentImportRow,
} from './studentImport'
import { ClassroomDetailPage } from './ClassroomDetailPage'
import { ClassroomCreateDialog } from './ClassroomCreateDialog'
import { ClassroomFilters } from './ClassroomFilters'
import { ClassroomsTable } from './ClassroomsTable'
import { ApiError } from '../../../lib/api/client'
import { adminApi, type AdminClassroomSummary } from '../../../lib/api/admin'
import './classrooms.css'

type ClassroomStatus = AdminClassroomSummary['status']

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

      <ClassroomFilters
        search={search}
        gradeFilter={gradeFilter}
        statusFilter={statusFilter}
        onSearchChange={setSearch}
        onGradeChange={setGradeFilter}
        onStatusChange={setStatusFilter}
        onCreate={openCreateModal}
      />

      <ClassroomsTable
        classrooms={visibleClassrooms}
        isLoading={isLoading}
        loadError={loadError}
        onRetry={() => {
          setIsLoading(true)
          setLoadError('')
          adminApi.listClassrooms({ limit: 100 })
            .then((response) => setClassList(response.items))
            .catch((error) => setLoadError(error instanceof ApiError ? error.message : 'Không thể tải danh sách lớp học.'))
            .finally(() => setIsLoading(false))
        }}
        onResetFilters={() => {
          setSearch('')
          setGradeFilter('ALL')
          setStatusFilter('ALL')
        }}
        onSelect={handleSelectClassroom}
      />

      {isCreateOpen && (
        <ClassroomCreateDialog
          draft={draft}
          enableExcel={enableExcel}
          excelFileName={excelFileName}
          excelPassword={excelPassword}
          excelRows={excelRows}
          excelIssues={excelIssues}
          excelError={excelError}
          isReadingFile={isReadingFile}
          formErrors={formErrors}
          isSaving={isSaving}
          onClose={closeCreateModal}
          onSubmit={handleSubmitCreate}
          onDraftChange={setDraft}
          onPasswordChange={setExcelPassword}
          onFileUpload={handleFileUpload}
          onRemoveFile={handleRemoveFile}
          onDownloadTemplate={handleDownloadTemplate}
        />
      )}
    </div>
  )
}
