import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'destructive'
  loading?: boolean
  children: ReactNode
}

export function ConnectedAction({ variant = 'primary', loading = false, disabled, children, className = '', ...props }: Props) {
  return <button {...props} disabled={disabled || loading} aria-busy={loading || undefined} className={`ec-action ec-action-${variant} ${className}`.trim()}>
    {variant === 'primary' && <span className="ec-action-mark" aria-hidden="true" />}
    <span>{children}</span>
  </button>
}
