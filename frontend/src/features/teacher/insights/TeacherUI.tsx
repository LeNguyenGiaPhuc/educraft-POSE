import type { ReactNode } from 'react'
import './insights.css'

export function TeacherHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="ti-heading"><div><h1>{title}</h1><p>{description}</p></div>{children}</div>
}

export function PreviewNotice({ children }: { children?: ReactNode }) {
  return <div className="ti-notice" role="note">{children ?? 'Đây là giao diện xem trước với dữ liệu mẫu. Thao tác chưa ghi lên hệ thống.'}</div>
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="ti-empty"><strong>{title}</strong><p>{detail}</p></div>
}
