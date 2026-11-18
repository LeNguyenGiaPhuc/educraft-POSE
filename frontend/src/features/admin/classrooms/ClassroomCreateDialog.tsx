import { AlertCircle, BookOpen, CheckCircle2, Download, FileSpreadsheet, FileUp, X } from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'
import type { ClassroomDraft } from './classroomForm'
import type { StudentImportIssue, StudentImportRow } from './studentImport'

type Props = {
  draft: ClassroomDraft
  enableExcel: boolean
  excelFileName: string
  excelPassword: string
  excelRows: StudentImportRow[]
  excelIssues: StudentImportIssue[]
  excelNormalizationNotices?: StudentImportIssue[]
  excelError: string
  isReadingFile: boolean
  formErrors: string[]
  isSaving: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDraftChange: (draft: ClassroomDraft) => void
  onPasswordChange: (value: string) => void
  onEnableExcelChange: (value: boolean) => void
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: () => void
  onDownloadTemplate: () => void
}

export function ClassroomCreateDialog({ draft, enableExcel, excelFileName, excelPassword, excelRows, excelIssues, excelNormalizationNotices = [], excelError, isReadingFile, formErrors, isSaving, onClose, onSubmit, onDraftChange, onPasswordChange, onEnableExcelChange, onFileUpload, onRemoveFile, onDownloadTemplate }: Props) {
  const errorLines = new Set(excelIssues.filter((issue) => issue.line > 0).map((issue) => issue.line))
  const excelSummary = excelRows.length === 0 ? null : { total: excelRows.length, errorsCount: errorLines.size, validCount: Math.max(0, excelRows.length - errorLines.size) }

  return (
    <div className="cls-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-class-title">
      <div className="cls-modal">
        <div className="cls-modal-head"><h3 id="create-class-title">Tạo lớp học mới</h3><button type="button" className="cls-modal-close" onClick={onClose} aria-label="Đóng modal"><X size={18} /></button></div>
        <form onSubmit={onSubmit} noValidate>
          <div className="cls-modal-body">
            <div className="cls-field-group">
              <div className="cls-field"><label htmlFor="create-name">Tên lớp *</label><input id="create-name" required placeholder="Ví dụ: 11A3" value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} /></div>
              <div className="cls-field"><label htmlFor="create-grade">Khối lớp *</label><select id="create-grade" value={draft.gradeLevel} onChange={(event) => onDraftChange({ ...draft, gradeLevel: Number(event.target.value) })}><option value={10}>Khối 10</option><option value={11}>Khối 11</option><option value={12}>Khối 12</option></select></div>
              <div className="cls-field cls-field-full"><label htmlFor="create-year">Năm học *</label><input id="create-year" required placeholder="Ví dụ: 2026–2027" value={draft.academicYear} onChange={(event) => onDraftChange({ ...draft, academicYear: event.target.value })} /></div>
            </div>
            <div className="adm-notice" style={{ margin: 0, padding: '10px 14px' }}><BookOpen size={16} /><span>Hệ thống sẽ tự động gán các môn đang hoạt động trong danh mục cho lớp mới với trạng thái <em>Chưa phân công</em> giáo viên. Bạn có thể nhập Excel ngay trong bước tạo lớp.</span></div>
            <div className="cls-excel-card">
              <div className="cls-excel-header"><label htmlFor="excel-toggle" className="cls-excel-title" style={{ cursor: 'pointer', userSelect: 'none' }}><input type="checkbox" id="excel-toggle" checked={enableExcel} onChange={(event) => onEnableExcelChange(event.target.checked)} style={{ accentColor: '#286449', width: 16, height: 16 }} /><span>Nhập danh sách học sinh bằng Excel cùng lúc</span></label><button type="button" className="cls-btn-template" onClick={onDownloadTemplate} title="Tải file mẫu Excel (.xlsx)"><Download size={13} /> Tải file mẫu Excel</button></div>
              <p className="cls-excel-help">File Excel (.xlsx) gồm 3 cột theo thứ tự: <strong>Họ và tên</strong>, <strong>Tên đăng nhập</strong>, <strong>Thông tin liên hệ</strong>. Hệ thống sẽ kiểm tra từng dòng theo nguyên tắc toàn vẹn (tất cả hợp lệ mới tạo lớp, tài khoản và phân lớp trong một giao dịch).</p>
              {enableExcel && <>
                {excelNormalizationNotices.length > 0 && <div className="adm-inline-note" style={{ margin: 0 }}><CheckCircle2 size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Hệ thống đã chuẩn hóa {excelNormalizationNotices.length} giá trị trước khi tạo tài khoản. Bạn có thể xem lại ở bước xác nhận.</div>}
                <div className="cls-field" style={{ margin: '8px 0 12px' }}><label htmlFor="create-excel-password">Mật khẩu khởi tạo chung cho học sinh *</label><input id="create-excel-password" type="password" autoComplete="new-password" required placeholder="Nhập mật khẩu ban đầu cấp cho toàn bộ học sinh trong file" value={excelPassword} onChange={(event) => onPasswordChange(event.target.value)} /><span style={{ fontSize: '12px', color: '#6b7280', marginTop: 3 }}>Mật khẩu này được băm ở backend và dùng chung cho tài khoản học sinh mới.</span></div>
                {!excelFileName ? <div className="cls-excel-actions"><label className="cls-file-dropzone"><FileUp size={15} /> {isReadingFile ? 'Đang đọc file...' : 'Chọn file danh sách (.xlsx)'}<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFileUpload} disabled={isReadingFile} /></label></div> : <div className="cls-file-chosen"><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileSpreadsheet size={16} /><strong>{excelFileName}</strong></div><button type="button" className="cls-btn-remove-file" onClick={onRemoveFile}>Xóa file</button></div>}
                {excelError && <div className="cls-error-container"><div className="cls-error-title"><AlertCircle size={15} /> Lỗi đọc file</div><p style={{ margin: 0, fontSize: '12px', color: '#b72727' }}>{excelError}</p></div>}
                {excelSummary && !excelError && <div className="cls-summary-chips"><div className="cls-summary-chip cls-chip-total"><strong>{excelSummary.total}</strong><span>Tổng số dòng</span></div><div className="cls-summary-chip cls-chip-new"><strong>{excelSummary.validCount}</strong><span>Hợp lệ</span></div><div className="cls-summary-chip cls-chip-error"><strong>{excelSummary.errorsCount}</strong><span>Dòng lỗi</span></div></div>}
                {excelIssues.length > 0 && <div className="cls-error-container"><div className="cls-error-title"><AlertCircle size={15} /> Có {excelIssues.length} dòng dữ liệu không hợp lệ (Không thể tạo lớp kèm file):</div><div className="cls-error-list">{excelIssues.map((error) => <div key={`${error.line}-${error.message}`} className="cls-error-item"><span className="cls-error-line">Dòng {error.line}</span><div><span style={{ color: '#b72727' }}>{error.message}</span></div></div>)}</div></div>}
                {excelSummary && excelSummary.total > 0 && excelIssues.length === 0 && !excelError && <div className="adm-inline-note" style={{ margin: 0, background: '#e8f6e8', color: '#216235', border: '1px solid #c2e6c4' }}><CheckCircle2 size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Toàn bộ {excelSummary.total} dòng đều hợp lệ để tạo tài khoản và phân vào lớp mới.</div>}
              </>}
            </div>
            {formErrors.length > 0 && <div className="adm-errors" role="alert" style={{ margin: 0 }}><strong>Vui lòng kiểm tra lại:</strong><ul>{formErrors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
          </div>
          <div className="cls-modal-foot"><button type="button" className="cls-btn-cancel" onClick={onClose} disabled={isReadingFile || isSaving}>Hủy</button><button type="submit" className="cls-btn-submit" disabled={isSaving || isReadingFile} title={isReadingFile ? 'Đang kiểm tra file Excel với máy chủ' : isSaving ? 'Đang tạo lớp học' : undefined}>{isReadingFile ? 'Đang kiểm tra Excel...' : isSaving ? 'Đang lưu...' : 'Xác nhận tạo lớp'}</button></div>
        </form>
      </div>
    </div>
  )
}
