import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'

type Props = { open: boolean; title: string; onClose: () => void; busy?: boolean; children: ReactNode; footer?: ReactNode }

export function ModalShell({ open, title, onClose, busy = false, children, footer }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!dialog.open) dialog.showModal()
    const firstField = dialog.querySelector<HTMLElement>('input, select, textarea')
    const firstButton = dialog.querySelector<HTMLElement>('button, [tabindex="0"]')
    if (firstField) firstField.focus()
    else firstButton?.focus()
    return () => {
      if (dialog.open) dialog.close()
      previousFocus?.focus()
    }
  }, [open])

  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')
    if (!controls?.length) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null
  return <dialog ref={dialogRef} className="ec-modal" role="dialog" aria-modal="true" aria-labelledby="ec-modal-title" onKeyDown={keepFocusInside} onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <div className="ec-modal-window">
      <header className="ec-modal-head"><h2 id="ec-modal-title">{title}</h2><button type="button" className="ec-modal-close" aria-label="Đóng" onClick={onClose} disabled={busy}><X size={20} /></button></header>
      <div className="ec-modal-body">{children}</div>
      {footer && <footer className="ec-modal-foot">{footer}</footer>}
    </div>
  </dialog>
}
