import type { ReactNode } from 'react'

type Column = { key: string; label: string }
type Props = {
  columns: Column[]
  rows: Record<string, ReactNode>[]
  empty?: string
  loading?: boolean
  error?: string
  caption?: string
  pagination?: ReactNode
}

export function CraftTable({ columns, rows, empty = 'Chưa có dữ liệu', loading = false, error, caption, pagination }: Props) {
  return <div className="ec-table-shell">
    <div className="ec-table-scroll"><table>
      {caption && <caption>{caption}</caption>}
      <thead><tr>{columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column.key}>{row[column.key]}</td>)}</tr>)}</tbody>
    </table></div>
    {loading && <p className="ec-table-message" role="status">Đang tải dữ liệu…</p>}
    {error && <p className="ec-table-message ec-field-error" role="alert">{error}</p>}
    {!loading && !error && rows.length === 0 && <p className="ec-table-message">{empty}</p>}
    {pagination && <div className="ec-table-pagination">{pagination}</div>}
  </div>
}
