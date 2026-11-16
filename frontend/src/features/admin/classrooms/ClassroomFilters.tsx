import { Search } from 'lucide-react'
import type { AdminClassroomSummary } from '../../../lib/api/admin'

type Props = {
  search: string
  gradeFilter: number | 'ALL'
  statusFilter: AdminClassroomSummary['status'] | 'ALL'
  onSearchChange: (value: string) => void
  onGradeChange: (value: number | 'ALL') => void
  onStatusChange: (value: AdminClassroomSummary['status'] | 'ALL') => void
  onCreate: () => void
}

export function ClassroomFilters({ search, gradeFilter, statusFilter, onSearchChange, onGradeChange, onStatusChange, onCreate }: Props) {
  return (
    <div className="cls-toolbar">
      <div className="cls-filters-group">
        <label className="cls-search-input">
          <Search size={16} />
          <span className="sr-only">Tìm tên lớp hoặc năm học</span>
          <input placeholder="Tìm theo tên lớp hoặc năm học..." value={search} onChange={(event) => onSearchChange(event.target.value)} />
        </label>
        <div className="cls-filter-select">
          <span className="sr-only">Lọc theo khối</span>
          <select aria-label="Lọc theo khối" value={gradeFilter} onChange={(event) => onGradeChange(event.target.value === 'ALL' ? 'ALL' : Number(event.target.value))}>
            <option value="ALL">Tất cả các khối</option>
            <option value="10">Khối 10</option>
            <option value="11">Khối 11</option>
            <option value="12">Khối 12</option>
          </select>
        </div>
        <div className="cls-filter-select">
          <span className="sr-only">Lọc theo trạng thái</span>
          <select aria-label="Lọc theo trạng thái" value={statusFilter} onChange={(event) => onStatusChange(event.target.value as Props['statusFilter'])}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang học</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
        </div>
      </div>
      <button type="button" className="cls-btn-create" onClick={onCreate}>Tạo lớp học</button>
    </div>
  )
}
