import { Check, Eye, FileSpreadsheet, X } from 'lucide-react'
import type { ClassroomDraft } from './classroomForm'

type Props = {
  draft: ClassroomDraft
  excelFileName?: string
  studentCount: number
  errors?: string[]
  isSaving: boolean
  onBack: () => void
  onConfirm: () => void | Promise<void>
}

export function ClassroomPreviewDialog({ draft, excelFileName, studentCount, errors = [], isSaving, onBack, onConfirm }: Props) {
  return (
    <div className="cls-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="classroom-preview-title">
      <div className="cls-modal">
        <div className="cls-modal-head">
          <div>
            <span className="adm-modal-eyebrow">KIỂM TRA TRƯỚC KHI LƯU</span>
            <h3 id="classroom-preview-title">Xác nhận tạo lớp</h3>
          </div>
          <button type="button" className="cls-modal-close" onClick={onBack} aria-label="Đóng preview"><X size={18} /></button>
        </div>
        <div className="cls-modal-body">
          <div className="adm-notice" style={{ margin: 0 }}>
            <Eye size={16} />
            <span>Kiểm tra thông tin lớp trước khi hệ thống tạo dữ liệu.</span>
          </div>
          <dl className="adm-facts" style={{ marginTop: 16 }}>
            <div><dt>Tên lớp</dt><dd>{draft.name.trim()}</dd></div>
            <div><dt>Khối lớp</dt><dd>Khối {draft.gradeLevel}</dd></div>
            <div><dt>Năm học</dt><dd>{draft.academicYear.trim()}</dd></div>
            <div><dt>Môn học</dt><dd>Tự động thêm các môn đang hoạt động</dd></div>
            <div><dt>Danh sách học sinh</dt><dd>{excelFileName ? <span><FileSpreadsheet size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{excelFileName} · {studentCount} học sinh</span> : 'Chưa nhập từ Excel'}</dd></div>
          </dl>
          {errors.length > 0 && <div className="adm-errors" role="alert" style={{ marginTop: 16 }}><strong>Không thể tạo lớp:</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
        </div>
        <div className="cls-modal-foot">
          <button type="button" className="cls-btn-cancel" onClick={onBack} disabled={isSaving}>Quay lại chỉnh sửa</button>
          <button type="button" className="cls-btn-submit" onClick={() => void onConfirm()} disabled={isSaving}>
            <Check size={16} /> {isSaving ? 'Đang tạo...' : 'Xác nhận tạo lớp'}
          </button>
        </div>
      </div>
    </div>
  )
}
