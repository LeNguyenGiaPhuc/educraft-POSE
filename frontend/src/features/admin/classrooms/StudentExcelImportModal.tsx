import { useMemo, useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  KeyRound,
  RotateCcw,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { ApiError } from '../../../lib/api/client'
import { adminApi, type AdminClassroomDetail } from '../../../lib/api/admin'
import {
  downloadStudentTemplateXlsx,
  readStudentWorkbook,
  type ImportIssue,
  type StudentImportRow,
} from './studentImport'

export type StudentExcelImportClassroom = Pick<
  AdminClassroomDetail,
  'id' | 'name' | 'gradeLevel' | 'academicYear'
>

export interface StudentExcelImportModalProps {
  isOpen: boolean
  onClose: () => void
  classroom: StudentExcelImportClassroom
  onSuccess: (importedCount: number) => void
}

export function StudentExcelImportModal({
  isOpen,
  onClose,
  classroom,
  onSuccess,
}: StudentExcelImportModalProps) {
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [importRows, setImportRows] = useState<StudentImportRow[]>([])
  const [issues, setIssues] = useState<ImportIssue[]>([])
  const [parseError, setParseError] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [validationToken, setValidationToken] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const hasErrors = issues.length > 0
  const isAllValid =
    !hasErrors &&
    importRows.length > 0 &&
    Boolean(tempPassword.trim()) &&
    Boolean(validationToken)

  // Issues by line map for quick table lookup
  const issuesByLine = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const issue of issues) {
      const list = map.get(issue.line) ?? []
      list.push(issue.message)
      map.set(issue.line, list)
    }
    return map
  }, [issues])

  if (!isOpen) return null

  async function handleDownloadTemplate() {
    try {
      await downloadStudentTemplateXlsx()
    } catch {
      setParseError('Không thể tạo file mẫu Excel lúc này.')
    }
  }

  async function processSelectedFile(file: File) {
    setTempPassword('')
    setFileName(file.name)
    setFileSize(file.size)
    setParseError('')
    setValidationToken(null)

    const result = await readStudentWorkbook(file)
    setImportRows(result.rows)
    setIssues(result.issues)

    if (result.issues.length > 0 || result.rows.length === 0) {
      setParseError(result.issues.map((i) => i.message).join(' '))
      return
    }

    setIsPreviewing(true)
    try {
      const preview = await adminApi.previewRoster(classroom.id, file)
      setImportRows(preview.rows)
      setIssues(preview.issues)
      setValidationToken(preview.validationToken)
      if (!preview.isValid) {
        setParseError('File chưa hợp lệ theo dữ liệu hiện tại. Vui lòng sửa các dòng báo lỗi rồi tải lại.')
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Không thể kiểm tra file với máy chủ.'
      setParseError(message)
      setIssues(result.rows.map((row) => ({ line: row.line, message })))
      setValidationToken(null)
    } finally {
      setIsPreviewing(false)
    }
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await processSelectedFile(file)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await processSelectedFile(file)
  }

  function handleReset() {
    setFileName('')
    setFileSize(null)
    setImportRows([])
    setIssues([])
    setParseError('')
    setTempPassword('')
    setValidationToken(null)
    setIsPreviewing(false)
    setIsSubmitting(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleCloseModal() {
    handleReset()
    onClose()
  }

  async function handleConfirmImport() {
    if (!isAllValid || !validationToken) return

    setIsSubmitting(true)
    setParseError('')
    try {
      const result = await adminApi.commitRoster(classroom.id, {
        validationToken,
        defaultPassword: tempPassword.trim(),
        rows: importRows,
      })
      handleReset()
      onSuccess(result.importedCount)
      onClose()
    } catch (error) {
      setParseError(error instanceof ApiError ? error.message : 'Không thể nhập danh sách học sinh.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="cls-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-excel-modal-title"
    >
      <div className="cls-modal cls-import-modal">
        {/* Modal Header */}
        <div className="cls-modal-head">
          <div>
            <div className="cls-modal-badge">
              <FileSpreadsheet size={14} /> Nhập danh sách học sinh từ Excel (.xlsx)
            </div>
            <h3 id="import-excel-modal-title" style={{ marginTop: 4 }}>
              Thêm học sinh vào lớp {classroom.name} (Khối {classroom.gradeLevel} · {classroom.academicYear})
            </h3>
          </div>
          <button
            type="button"
            className="cls-modal-close"
            onClick={handleCloseModal}
            aria-label="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="cls-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Instructions and Download Template */}
          <div className="cls-import-topbar">
            <div className="cls-import-guide">
              <p>
                File Excel (<code>.xlsx</code>) có hàng đầu gồm đúng 3 cột theo thứ tự:
                <strong> Họ và tên</strong>, <strong>Tên đăng nhập</strong>, <strong>Thông tin liên hệ</strong>.
                Bản xem trước kiểm tra từng dòng; tài khoản và mật khẩu sẽ được tạo trong một giao dịch trên hệ thống.
              </p>
            </div>
            <button
              type="button"
              className="cls-btn-template"
              onClick={handleDownloadTemplate}
            >
              <Download size={14} /> Tải file mẫu .xlsx
            </button>
          </div>

          {/* Upload Area / Dropzone */}
          {!fileName ? (
            <div
              className={`cls-dropzone ${isDragging ? 'is-dragging' : ''}`}
              role="button"
              tabIndex={0}
              aria-label="Chọn file Excel danh sách học sinh"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileSelected}
                style={{ display: 'none' }}
              />
              <div className="cls-dropzone-icon">
                <Upload size={28} />
              </div>
              <div className="cls-dropzone-text">
                <strong>Nhấn để chọn file hoặc kéo thả file Excel (.xlsx) vào đây</strong>
                <span>Hệ thống chỉ chấp nhận file định dạng .xlsx có cấu trúc chuẩn 3 cột</span>
              </div>
            </div>
          ) : (
            <div className="cls-file-selected-bar">
              <div className="cls-file-info">
                <FileText size={20} className="cls-file-icon" />
                <div>
                  <strong>{fileName}</strong>
                  {fileSize !== null && fileSize > 0 && (
                    <small>({(fileSize / 1024).toFixed(1)} KB)</small>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="cls-btn-reupload"
                onClick={handleReset}
              >
                <RotateCcw size={14} /> Đổi file khác
              </button>
            </div>
          )}

          {/* Password field for the import batch */}
          {importRows.length > 0 && (
            <div className="cls-field" style={{ marginTop: 14, background: '#f8faf9', padding: '14px', borderRadius: '8px', border: '1px solid #d8e5de' }}>
              <label htmlFor="temp-import-password" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#163323' }}>
                <KeyRound size={15} /> Mật khẩu tạm chung cho đợt import *
              </label>
              <input
                id="temp-import-password"
                type="password"
                autoComplete="new-password"
                placeholder="Nhập mật khẩu tạm cấp cho toàn bộ học sinh mới..."
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                minLength={8}
                required
                style={{ marginTop: 6 }}
              />
              <small style={{ color: '#688272', fontSize: '12px', marginTop: 4, display: 'block' }}>
                Mật khẩu khởi tạo phải có ít nhất 8 ký tự.
              </small>
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="cls-error-container" style={{ marginTop: 12 }}>
              <div className="cls-error-title">
                <AlertCircle size={15} /> Lỗi cấu trúc file Excel
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#b72727' }}>{parseError}</p>
            </div>
          )}

          {/* Statistics Cards */}
          {importRows.length > 0 && (
            <div className="cls-stats-grid cls-import-stats" style={{ marginTop: 16 }}>
              {/* Card 1: Total */}
              <div className="cls-stat-card cls-import-stat-card">
                <div className="cls-stat-icon is-students">
                  <Users size={20} />
                </div>
                <div className="cls-stat-info">
                  <span className="cls-stat-value">{importRows.length}</span>
                  <span className="cls-stat-label">Tổng số dòng</span>
                </div>
              </div>

              {/* Card 2: Valid */}
              <div className="cls-stat-card cls-import-stat-card">
                <div className="cls-stat-icon is-active">
                  <UserPlus size={20} />
                </div>
                <div className="cls-stat-info">
                  <span className="cls-stat-value" style={{ color: issues.length === 0 ? '#1e7e34' : '#6c757d' }}>
                    {issues.length === 0 ? importRows.length : 0}
                  </span>
                  <span className="cls-stat-label">Tài khoản hợp lệ</span>
                </div>
              </div>

              {/* Card 3: Issues */}
              <div className="cls-stat-card cls-import-stat-card">
                <div
                  className="cls-stat-icon"
                  style={{
                    background: issues.length > 0 ? '#fde8e8' : '#f4f4f2',
                    color: issues.length > 0 ? '#c81e1e' : '#6c757d',
                  }}
                >
                  <AlertCircle size={20} />
                </div>
                <div className="cls-stat-info">
                  <span
                    className="cls-stat-value"
                    style={{ color: issues.length > 0 ? '#c81e1e' : '#6c757d' }}
                  >
                    {issues.length}
                  </span>
                  <span className="cls-stat-label">Dòng phát hiện lỗi</span>
                </div>
              </div>
            </div>
          )}

          {/* Atomic Warning Banner if errors exist */}
          {hasErrors && (
            <div className="cls-atomic-banner" role="alert" style={{ marginTop: 14 }}>
              <div className="cls-atomic-title">
                <AlertTriangle size={17} />
                <span>File có {issues.length} lỗi. Vui lòng sửa lại file và tải lên lại (nguyên tắc: không nhập một phần).</span>
              </div>
              <p style={{ margin: '4px 0 0 23px', fontSize: '12px', color: '#842029' }}>
                Hệ thống đảm bảo tính toàn vẹn (Atomic All-or-Nothing). Không có tài khoản nào được tạo cho đến khi toàn bộ các dòng đều hợp lệ 100%.
              </p>
            </div>
          )}

          {/* All Valid Banner */}
          {isAllValid && (
            <div
              className="cls-success-banner"
              style={{ marginTop: 14, padding: '12px 16px' }}
              role="status"
            >
              <CheckCircle2 size={18} />
              <div>
                <strong>Hợp lệ 100%! Toàn bộ {importRows.length} học sinh đủ điều kiện để tạo tài khoản và thêm vào lớp {classroom.name}.</strong>
                <p style={{ margin: '2px 0 0', fontSize: '12px' }}>
                  Hệ thống sẽ tạo tài khoản và ghi nhận học sinh vào lớp trong một giao dịch.
                </p>
              </div>
            </div>
          )}

          {/* Full Preview Table */}
          {importRows.length > 0 && (
            <div className="cls-preview-table-wrapper" style={{ marginTop: 16 }}>
              <div className="cls-preview-table-head">
                <h4>Xem trước chi tiết từng dòng ({importRows.length} dòng)</h4>
                <small>Kiểm tra kỹ thông tin trước khi xác nhận nhập</small>
              </div>
              <div className="cls-table-scroll">
                <table className="cls-table cls-preview-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>Dòng #</th>
                      <th style={{ width: '180px' }}>Họ và tên</th>
                      <th style={{ width: '160px' }}>Tên đăng nhập</th>
                      <th style={{ width: '200px' }}>Thông tin liên hệ</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Trạng thái</th>
                      <th>Chi tiết lỗi / Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row) => {
                      const rowIssues = issuesByLine.get(row.line) ?? []
                      const isError = rowIssues.length > 0
                      return (
                        <tr
                          key={row.line}
                          className={isError ? 'cls-row-error' : 'cls-row-new'}
                        >
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            <span className="cls-row-num">{row.line}</span>
                          </td>
                          <td>
                            <strong>{row.fullName || '—'}</strong>
                          </td>
                          <td>
                            <code className="cls-username-pill">{row.username || '—'}</code>
                          </td>
                          <td>
                            <span className="cls-contact-text">{row.contact || '—'}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isError ? (
                              <span className="cls-status-pill cls-pill-err">
                                <AlertCircle size={12} /> Lỗi
                              </span>
                            ) : (
                              <span className="cls-status-pill cls-pill-new">
                                <UserPlus size={12} /> Hợp lệ
                              </span>
                            )}
                          </td>
                          <td>
                            {isError ? (
                              <span className="cls-row-message is-error">
                                {rowIssues.join(' ')}
                              </span>
                            ) : (
                              <span className="cls-row-message is-success">
                                Đủ điều kiện tạo tài khoản mới
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="cls-modal-foot">
          <button type="button" className="cls-btn-cancel" onClick={handleCloseModal}>
            Đóng
          </button>
          <button
            type="button"
            className="cls-btn-submit"
            onClick={handleConfirmImport}
            disabled={!isAllValid || isPreviewing || isSubmitting}
            title={
              importRows.length === 0
                ? 'Vui lòng tải lên file Excel (.xlsx)'
                : hasErrors
                ? 'File có dòng lỗi. Vui lòng sửa lại toàn bộ file trước khi nhập.'
                : !tempPassword.trim()
                ? 'Vui lòng nhập mật khẩu tạm cho đợt import'
                : isPreviewing
                ? 'Đang kiểm tra file với máy chủ'
                : isSubmitting
                ? 'Đang nhập danh sách'
                : 'Xác nhận tạo tài khoản và thêm học sinh vào lớp'
            }
          >
            <UserPlus size={15} />
            {isPreviewing
              ? 'Đang kiểm tra...'
              : isSubmitting
              ? 'Đang nhập...'
              : `Xác nhận nhập danh sách ${importRows.length > 0 ? `(${importRows.length} học sinh)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
