import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

type Common = { id: string; label: string; hint?: string; error?: string; required?: boolean }
type Props = Common & InputHTMLAttributes<HTMLInputElement> & {
  kind?: 'text' | 'search' | 'textarea' | 'select' | 'checkbox' | 'radio'
  options?: { value: string; label: string }[]
  children?: ReactNode
}

export function Field({ id, label, hint, error, kind = 'text', options = [], children, required, type, ...props }: Props) {
  const description = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  const common = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': description, required }
  let control: ReactNode
  if (kind === 'textarea') {
    control = <textarea {...common} {...props as TextareaHTMLAttributes<HTMLTextAreaElement>} />
  } else if (kind === 'select') {
    control = <select {...common} {...props as SelectHTMLAttributes<HTMLSelectElement>}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
  } else {
    const inputType = kind === 'text' ? type ?? 'text' : kind
    control = <input {...common} {...props} type={inputType} />
  }
  return <div className={`ec-field${kind === 'checkbox' || kind === 'radio' ? ' ec-field-choice' : ''}`}>
    <label htmlFor={id}>{kind === 'checkbox' || kind === 'radio' ? control : null}<span>{label}{required && <span aria-hidden="true"> *</span>}</span></label>
    {kind !== 'checkbox' && kind !== 'radio' && control}
    {children}
    {hint && <small id={`${id}-hint`} className="ec-field-hint">{hint}</small>}
    {error && <small id={`${id}-error`} className="ec-field-error">{error}</small>}
  </div>
}
