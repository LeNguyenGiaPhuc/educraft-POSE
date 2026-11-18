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
import { ClassroomPreviewDialog } from './ClassroomPreviewDialog'
import { ClassroomFilters } from './ClassroomFilters'
import { ClassroomsTable } from './ClassroomsTable'
import { ApiError } from '../../../lib/api/client'
import { validatePassword } from '../../../lib/accountIdentity'
import { adminApi, type AdminClassroomSummary } from '../../../lib/api/admin'
import './classrooms.css'

type ClassroomStatus = AdminClassroomSummary['status']
type ClassroomCreatePreview = {
  draft: ClassroomDraft
  includeRoster: boolean
  excelFileName: string
  excelPassword: string
  excelRows: StudentImportRow[]
  validationToken: string | null
  normalizationNotices: StudentImportIssue[]
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
  const [excelNormalizationNotices, setExcelNormalizationNotices] = useState<StudentImportIssue[]>([])
  const [excelValidationToken, setExcelValidationToken] = useState<string | null>(null)
  const [excelError, setExcelError] = useState('')
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [classroomPreview, setClassroomPreview] = useState<ClassroomCreatePreview | null>(null)

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
    setClassroomPreview(null)
    setDraft({ ...emptyClassroomDraft, gradeLevel: 10, academicYear: '2026–2027' })
    setFormErrors([])
    setEnableExcel(false)
    setExcelFileName('')
    setExcelPassword('')
    setExcelRows([])
    setExcelIssues([])
    setExcelNormalizationNotices([])
    setExcelValidationToken(null)
    setExcelError('')
    setIsCreateOpen(true)
  }

  function closeCreateModal() {
    setClassroomPreview(null)
    setIsCreateOpen(false)
    setFormErrors([])
    setExcelRows([])
    setExcelIssues([])
    setExcelNormalizationNotices([])
    setExcelValidationToken(null)
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
    setExcelValidationToken(null)
    setExcelNormalizationNotices([])
    setFormErrors([])
    setIsReadingFile(true)
    try {
      const { rows, issues, normalizationNotices } = await readStudentWorkbook(file)
      if (issues.length > 0) {
        setExcelError(issues[0].message)
        setExcelRows(rows)
        setExcelIssues(issues)
        setExcelNormalizationNotices(normalizationNotices ?? [])
      } else {
        const preview = await adminApi.previewNewClassroomRoster(file)
        setExcelRows(preview.rows)
        setExcelIssues(preview.issues)
        setExcelNormalizationNotices(preview.normalizationNotices)
        setExcelValidationToken(preview.validationToken)
        if (!preview.isValid) {
          setExcelError('File chưa hợp lệ theo dữ liệu hiện tại. Vui lòng sửa các dòng báo lỗi rồi tải lại.')
        }
      }
    } catch (error) {
      setExcelError(error instanceof ApiError ? error.message : 'Không thể đọc file. Vui lòng chọn file .xlsx đúng định dạng.')
      setExcelRows([])
      setExcelIssues([])
      setExcelNormalizationNotices([])
      setExcelValidationToken(null)
    } finally {
      setIsReadingFile(false)
    }
  }

  function handleRemoveFile() {
    setExcelFileName('')
    setExcelPassword('')
    setExcelRows([])
    setExcelIssues([])
    setExcelNormalizationNotices([])
    setExcelValidationToken(null)
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

    // 2. Validate the optional roster before showing the final confirmation.
    if (enableExcel) {
      const rosterErrors: string[] = []
      if (!excelFileName) rosterErrors.push('Hãy chọn file Excel danh sách học sinh.')
      if (excelError) rosterErrors.push(excelError)
      if (excelIssues.length > 0) rosterErrors.push('File Excel còn dòng chưa hợp lệ.')
      if (excelRows.length === 0) rosterErrors.push('File Excel phải có ít nhất một học sinh.')
      if (!excelValidationToken) rosterErrors.push('File Excel chưa được máy chủ xác nhận. Vui lòng tải lại file.')
      const excelPasswordError = validatePassword(excelPassword)
      if (excelPasswordError || !excelPassword.trim()) rosterErrors.push(excelPasswordError ?? 'Mật khẩu khởi tạo không được để trống.')
      if (rosterErrors.length > 0) {
        setFormErrors(rosterErrors)
        return
      }
    }

    setFormErrors([])
    setClassroomPreview({
      draft: { ...draft },
      includeRoster: enableExcel,
      excelFileName,
      excelPassword,
      excelRows: [...excelRows],
      validationToken: excelValidationToken,
      normalizationNotices: [...excelNormalizationNotices],
    })
    setIsCreateOpen(false)
  }

  async function confirmCreateClassroom() {
    setIsSaving(true)
    try {
      if (!classroomPreview) return
      let createdName = classroomPreview.draft.name
      let subjectsCreated = 0
      let studentsAdded = 0

      if (classroomPreview.includeRoster) {
        if (!classroomPreview.validationToken) {
          setFormErrors(['File Excel chưa được máy chủ xác nhận. Vui lòng quay lại và tải lại file.'])
          return
        }
        const result = await adminApi.commitNewClassroomRoster({
          validationToken: classroomPreview.validationToken,
          ...classroomPreview.draft,
          initialStudentPassword: classroomPreview.excelPassword.trim(),
          rows: classroomPreview.excelRows,
        })
        studentsAdded = result.importedCount
        const refreshed = await adminApi.listClassrooms({ limit: 100 })
        setClassList(refreshed.items)
        const created = refreshed.items.find((classroom) => classroom.id === result.classroomId)
        createdName = created?.name ?? classroomPreview.draft.name
        subjectsCreated = created?.subjectCount ?? 0
      } else {
        const created = await adminApi.createClassroom(classroomPreview.draft)
        createdName = created.name
        subjectsCreated = created.subjectCount
        const refreshed = await adminApi.listClassrooms({ limit: 100 })
        setClassList(refreshed.items)
      }
      setSuccessInfo({
        classroomName: createdName,
        subjectsCreated,
        studentsAdded,
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

      {/* System notice */}
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
          excelNormalizationNotices={excelNormalizationNotices}
          excelError={excelError}
          isReadingFile={isReadingFile}
          formErrors={formErrors}
          isSaving={isSaving}
          onClose={closeCreateModal}
          onSubmit={handleSubmitCreate}
          onDraftChange={setDraft}
          onPasswordChange={setExcelPassword}
          onEnableExcelChange={setEnableExcel}
          onFileUpload={handleFileUpload}
          onRemoveFile={handleRemoveFile}
          onDownloadTemplate={handleDownloadTemplate}
        />
      )}

      {classroomPreview && (
        <ClassroomPreviewDialog
          draft={classroomPreview.draft}
          excelFileName={classroomPreview.includeRoster ? classroomPreview.excelFileName : ''}
          studentCount={classroomPreview.includeRoster ? classroomPreview.excelRows.length : 0}
          studentRows={classroomPreview.includeRoster ? classroomPreview.excelRows : []}
          normalizationNotices={classroomPreview.normalizationNotices}
          errors={formErrors}
          isSaving={isSaving}
          onBack={() => {
            setClassroomPreview(null)
            setEnableExcel(classroomPreview.includeRoster)
            setExcelFileName(classroomPreview.excelFileName)
            setExcelPassword(classroomPreview.excelPassword)
            setExcelRows(classroomPreview.excelRows)
            setExcelValidationToken(classroomPreview.validationToken)
            setExcelNormalizationNotices(classroomPreview.normalizationNotices)
            setIsCreateOpen(true)
          }}
          onConfirm={confirmCreateClassroom}
        />
      )}
    </div>
  )
}
