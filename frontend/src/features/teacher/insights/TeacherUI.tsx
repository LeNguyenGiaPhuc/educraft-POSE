import type { ReactNode } from 'react'
import './insights.css'

export function TeacherHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="ti-heading"><div><h1>{title}</h1><p>{description}</p></div>{children}</div>
}

export function InfoNotice({ children }: { children?: ReactNode }) {
  return <div className="ti-notice" role="note">{children ?? 'Thông tin này được tải từ hệ thống EduCraft.'}</div>
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="ti-empty"><strong>{title}</strong><p>{detail}</p></div>
}
