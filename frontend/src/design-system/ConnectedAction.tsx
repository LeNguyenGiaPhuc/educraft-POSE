import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'destructive'
  loading?: boolean
  markIcon?: ReactNode
  children: ReactNode
}

export function ConnectedAction({ variant = 'primary', loading = false, markIcon, disabled, children, className = '', ...props }: Props) {
  return <button {...props} disabled={disabled || loading} aria-busy={loading || undefined} className={`ec-action ec-action-${variant} ${className}`.trim()}>
    {variant === 'primary' && <span className={`ec-action-mark${markIcon ? ' ec-action-mark-custom' : ''}`} aria-hidden="true">{markIcon}</span>}
    <span>{children}</span>
  </button>
}
