import { ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router'

function safeTeacherReturnUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/teacher') || /[\\\s]/.test(value)) return undefined
  try {
    const url = new URL(value, 'https://educraft.local')
    if (url.origin !== 'https://educraft.local' || (url.pathname !== '/teacher' && !url.pathname.startsWith('/teacher/'))) return undefined
    return `${url.pathname}${url.search}${url.hash}`
  } catch { return undefined }
}

export function TeacherBackButton({ fallbackTo = '/teacher/classes', returnTo }: { fallbackTo?: string; returnTo?: string }) {
  const location = useLocation()
  const state = location.state as { returnTo?: unknown } | null
  const target = safeTeacherReturnUrl(returnTo) ?? safeTeacherReturnUrl(new URLSearchParams(location.search).get('returnTo')) ?? safeTeacherReturnUrl(state?.returnTo) ?? safeTeacherReturnUrl(fallbackTo) ?? '/teacher/classes'
  const current = `${location.pathname}${location.search}${location.hash}`
  return <Link className="back-link" to={target === current ? '/teacher/classes' : target}><ArrowLeft size={17} /> Quay lại</Link>
}
