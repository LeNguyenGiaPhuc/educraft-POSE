import { AlertCircle, ArrowRight, RotateCcw, School, Users } from 'lucide-react'
import type { AdminClassroomSummary } from '../../../lib/api/admin'

type Props = {
  classrooms: AdminClassroomSummary[]
  isLoading: boolean
  loadError: string
  onRetry: () => void
  onResetFilters: () => void
  onSelect: (classroomId: string) => void
}

function progressClass(isComplete: boolean, assigned: number): string {
  if (isComplete) return 'is-complete'
  if (assigned > 0) return 'is-partial'
  return ''
}

export function ClassroomsTable({ classrooms, isLoading, loadError, onRetry, onResetFilters, onSelect }: Props) {
  return (
    <div className="cls-card-wrapper">
      {isLoading ? <div className="cls-empty-box"><p>Đang tải danh sách lớp học...</p></div> : loadError ? (
        <div className="cls-empty-box" role="alert">
          <div className="cls-empty-icon"><AlertCircle size={28} /></div>
          <strong>Không thể tải danh sách lớp học</strong>
          <p>{loadError}</p>
          <button type="button" className="cls-btn-detail" onClick={onRetry}><RotateCcw size={14} /> Thử lại</button>
        </div>
      ) : classrooms.length === 0 ? (
        <div className="cls-empty-box">
          <div className="cls-empty-icon"><School size={28} /></div>
          <strong>Không có lớp học phù hợp</strong>
          <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh các bộ lọc khối và trạng thái.</p>
          <button type="button" className="cls-btn-detail" onClick={onResetFilters}><RotateCcw size={14} /> Đặt lại bộ lọc</button>
        </div>
      ) : (
        <table className="cls-table">
          <thead><tr><th>Tên lớp</th><th>Khối & Năm học</th><th>Sĩ số hiện tại</th><th>Phân công môn học</th><th>Trạng thái</th><th style={{ textAlign: 'right' }}>Thao tác</th></tr></thead>
          <tbody>
            {classrooms.map((item) => {
              const assigned = item.assignedTeacherCount
              const total = item.subjectCount
              const percentage = total === 0 ? 0 : Math.round((assigned / total) * 100)
              const stateClass = progressClass(total > 0 && assigned === total, assigned)
              return (
                <tr key={item.id}>
                  <td><span className="cls-badge-name">{item.name}</span></td>
                  <td><div className="cls-grade-year"><strong>Khối {item.gradeLevel}</strong><small>Năm học: {item.academicYear}</small></div></td>
                  <td><span className="cls-student-count"><Users size={14} />{item.studentCount} học sinh</span></td>
                  <td><div className="cls-subject-progress"><div className={`cls-ratio-text ${stateClass}`}><span>{assigned}/{total} môn</span><span>{percentage}%</span></div><div className="cls-progress-bar"><div className={`cls-progress-fill ${stateClass}`} style={{ width: `${percentage}%` }} /></div></div></td>
                  <td><span className={`cls-status-pill ${item.status === 'ACTIVE' ? 'is-active' : 'is-archived'}`}>{item.status === 'ACTIVE' ? 'Đang học' : 'Lưu trữ'}</span></td>
                  <td style={{ textAlign: 'right' }}><button type="button" className="cls-btn-detail" onClick={() => onSelect(item.id)}>Xem chi tiết lớp <ArrowRight size={14} /></button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
