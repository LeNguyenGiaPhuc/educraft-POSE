import { UserRound } from 'lucide-react'
import type { AdminAccount } from '../../../lib/api/admin'

type Props = {
  accounts: AdminAccount[]
  selectedId: string | null
  isLoading: boolean
  onSelect: (accountId: string) => void
}

function initials(fullName: string): string {
  return fullName.split(' ').slice(-2).map((part) => part[0]).join('')
}

export function AccountsTable({ accounts, selectedId, isLoading, onSelect }: Props) {
  if (isLoading) {
    return <div className="adm-empty"><UserRound size={30} /><strong>Đang tải tài khoản...</strong></div>
  }

  if (accounts.length === 0) {
    return <div className="adm-empty"><UserRound size={30} /><strong>Không tìm thấy tài khoản</strong><p>Thử đổi từ khóa hoặc bộ lọc.</p></div>
  }

  return (
    <div className="adm-list">
      {accounts.map((account) => (
        <button key={account.id} type="button" className={`adm-row ${selectedId === account.id ? 'is-selected' : ''}`} onClick={() => onSelect(account.id)}>
          <span className={`adm-avatar ${account.role === 'TEACHER' ? 'is-teacher' : ''}`}>{initials(account.fullName)}</span>
          <span className="adm-row-copy">
            <strong>{account.fullName}</strong>
            <small>@{account.username} · {account.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'}</small>
          </span>
          <span className={`adm-status ${account.status === 'ACTIVE' ? 'active' : 'inactive'}`}>{account.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}</span>
        </button>
      ))}
    </div>
  )
}
