import { Plus, Search, X } from 'lucide-react'

type Props = {
  value: string
  onChange: (value: string) => void
  onCreate: () => void
}

export function SubjectToolbar({ value, onChange, onCreate }: Props) {
  return (
    <div className="sbj-toolbar">
      <div className="sbj-search-box">
        <Search size={18} />
        <input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Tìm môn học" aria-label="Tìm kiếm môn học" />
        {value && <button type="button" className="sbj-alert-close" onClick={() => onChange('')} aria-label="Xóa tìm kiếm"><X size={15} /></button>}
      </div>
      <div className="sbj-toolbar-actions"><button type="button" className="sbj-btn-primary" onClick={onCreate}><Plus size={17} /> Thêm môn học</button></div>
    </div>
  )
}
