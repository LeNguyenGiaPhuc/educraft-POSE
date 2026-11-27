import type { ReactNode } from 'react'

type Props = { kind: 'success' | 'error' | 'info' | 'warning' | 'empty' | 'loading'; children: ReactNode }

export function Feedback({ kind, children }: Props) {
  return <div className={`ec-feedback ec-feedback-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>
}
