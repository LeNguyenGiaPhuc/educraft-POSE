import type { ReactNode } from 'react'
import { BookOpen, TriangleAlert } from 'lucide-react'
import './teacher-feedback.css'

type Props = {
  title: string
  description: string
  tone?: 'empty' | 'filtered' | 'error'
  icon?: ReactNode
  action?: ReactNode
}

export function TeacherEmptyState({ title, description, tone = 'empty', icon, action }: Props) {
  const isError = tone === 'error'

  return (
    <div className={`teacher-empty-state is-${tone}`} role={isError ? 'alert' : 'status'}>
      <div className="teacher-empty-state-icon" aria-hidden="true">
        {icon ?? (isError ? <TriangleAlert size={24} /> : <BookOpen size={24} />)}
      </div>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action && <div className="teacher-empty-state-action">{action}</div>}
    </div>
  )
}
