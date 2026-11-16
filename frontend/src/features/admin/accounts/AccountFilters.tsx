import { Filter, Search } from 'lucide-react'
import type { AdminAccount } from '../../../lib/api/admin'

type Props = {
  search: string
  roleFilter: Exclude<AdminAccount['role'], 'ADMIN'> | 'ALL'
  statusFilter: AdminAccount['status'] | 'ALL'
  onSearchChange: (value: string) => void
  onRoleChange: (value: Exclude<AdminAccount['role'], 'ADMIN'> | 'ALL') => void
  onStatusChange: (value: AdminAccount['status'] | 'ALL') => void
}

export function AccountFilters({ search, roleFilter, statusFilter, onSearchChange, onRoleChange, onStatusChange }: Props) {
  return (
    <div className="adm-filters">
      <label className="adm-search">
        <Search size={17} />
        <span className="sr-only">Tìm tài khoản</span>
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm theo tên hoặc tên đăng nhập" />
      </label>
      <label className="adm-filter">
        <Filter size={16} />
        <span className="sr-only">Lọc vai trò</span>
        <select value={roleFilter} onChange={(event) => onRoleChange(event.target.value as Props['roleFilter'])}>
          <option value="ALL">Mọi vai trò</option>
          <option value="TEACHER">Giáo viên</option>
          <option value="STUDENT">Học sinh</option>
        </select>
      </label>
      <label className="adm-filter">
        <span className="sr-only">Lọc trạng thái</span>
        <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value as Props['statusFilter'])}>
          <option value="ALL">Mọi trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
        </select>
      </label>
    </div>
  )
}
