import { AlertCircle, BookOpen, Pencil, Power, PowerOff } from 'lucide-react'
import type { AdminAccount, AdminSubject } from '../../../lib/api/admin'

type Props = {
  subjects: AdminSubject[]
  teachers: AdminAccount[]
  activeClassroomCount: number
  isLoading: boolean
  loadError: string
  searchTerm: string
  statusSavingId: string | null
  onClearSearch: () => void
  onEdit: (subject: AdminSubject) => void
  onToggleStatus: (subject: AdminSubject) => void
}

function teacherInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return (parts[0]?.[0] || 'GV').toUpperCase()
}

export function SubjectsTable({ subjects, teachers, activeClassroomCount, isLoading, loadError, searchTerm, statusSavingId, onClearSearch, onEdit, onToggleStatus }: Props) {
  return (
    <div className="sbj-table-card">
      <div className="sbj-table-header"><div className="sbj-table-header-title"><span>Danh sách môn học</span><span className="sbj-table-count-badge">{subjects.length} môn</span></div></div>
      {isLoading ? <div className="sbj-empty-state"><BookOpen size={28} /><h3>Đang tải danh mục môn học...</h3></div> : loadError ? (
        <div className="sbj-empty-state" role="alert"><AlertCircle size={28} /><h3>Không thể tải danh mục môn học</h3><p>{loadError}</p></div>
      ) : subjects.length === 0 ? (
        <div className="sbj-empty-state"><div className="sbj-empty-icon"><BookOpen size={28} /></div><h3>Không tìm thấy môn học phù hợp</h3><p>Không có môn học nào khớp với từ khóa “{searchTerm}”. Hãy thử tìm kiếm bằng từ khóa khác hoặc thêm môn mới.</p><button type="button" className="sbj-btn-secondary" onClick={onClearSearch}>Xóa bộ lọc tìm kiếm</button></div>
      ) : (
        <div className="sbj-table-responsive">
          <table className="sbj-table">
            <thead><tr><th style={{ width: '28%' }}>Môn học</th><th style={{ width: '32%' }}>Giáo viên chuyên môn</th><th style={{ width: '22%' }}>Phạm vi</th><th style={{ width: '18%' }}>Trạng thái & thao tác</th></tr></thead>
            <tbody>
              {subjects.map((subject) => {
                const eligible = teachers.filter((teacher) => teacher.specializedSubjectId === subject.id)
                const statusActionLabel = statusSavingId === subject.id ? 'Đang lưu...' : subject.isActive ? 'Tắt' : 'Bật'
                return (
                  <tr key={subject.id}>
                    <td><div className="sbj-subject-cell"><div className="sbj-subject-icon" aria-hidden="true" /><div><span className="sbj-subject-name">{subject.name}</span></div></div></td>
                    <td><div className="sbj-teachers-col">{eligible.length > 0 ? <><div className="sbj-teachers-summary"><span>{eligible.length} giáo viên chuyên môn:</span></div><div className="sbj-teacher-tags">{eligible.map((teacher) => <span key={teacher.id} className="sbj-teacher-tag" title={`${teacher.fullName} (${teacher.qualification || 'Giáo viên'})`}><span className="sbj-teacher-avatar-sm">{teacherInitials(teacher.fullName)}</span><span>{teacher.fullName}</span></span>)}</div></> : <span className="sbj-no-teachers-badge"><AlertCircle size={14} /> Chưa có giáo viên chuyên môn</span>}</div></td>
                    <td><div><span className={`sbj-scope-badge ${subject.isActive ? '' : 'is-inactive'}`}>{subject.isActive ? `${activeClassroomCount} lớp đang học` : 'Không mở cho lớp mới'}</span></div></td>
                    <td><div className="sbj-status-cell"><span className={`sbj-status-badge ${subject.isActive ? 'is-active' : 'is-inactive'}`}>{subject.isActive ? 'Đang áp dụng' : 'Ngừng áp dụng'}</span><div className="sbj-row-actions"><button type="button" className="sbj-row-action" onClick={() => onEdit(subject)} aria-label={`Sửa môn ${subject.name}`}><Pencil size={14} /> Sửa</button><button type="button" className="sbj-row-action sbj-row-action-muted" onClick={() => onToggleStatus(subject)} disabled={statusSavingId === subject.id}>{subject.isActive ? <PowerOff size={14} /> : <Power size={14} />}{statusActionLabel}</button></div></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
