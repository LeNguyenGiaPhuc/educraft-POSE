import { useEffect, useState } from 'react'
import { apiRequest } from './client'

export function useApiData<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    apiRequest<T>(path)
      .then((result) => { if (active) setData(result) })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [path])

  return { data, loading, error }
}
