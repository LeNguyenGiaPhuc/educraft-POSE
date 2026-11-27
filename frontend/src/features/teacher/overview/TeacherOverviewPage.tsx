import { useEffect, useState } from 'react'
import { ApiError } from '../../../lib/api/client'
import { teacherDashboardApi, type TeacherDashboardSummary } from '../../../lib/api/teacher/dashboard'
import {
  TeacherDashboardContent,
  TeacherDashboardError,
  TeacherDashboardLoading,
} from './TeacherDashboardView'
import './teacher-dashboard.css'

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Không thể tải tổng quan giáo viên.'
}

export function TeacherOverviewPage() {
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    teacherDashboardApi.getSummary()
      .then((data) => {
        if (cancelled) return
        setSummary(data)
        setLoadError('')
      })
      .catch((error) => {
        if (cancelled) return
        setSummary(null)
        setLoadError(errorMessage(error))
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function retry() {
    setSummary(null)
    setLoadError('')
    setReloadKey((value) => value + 1)
  }

  if (!summary && !loadError) {
    return <TeacherDashboardLoading />
  }

  if (loadError || !summary) {
    return <TeacherDashboardError message={loadError || 'Chưa có dữ liệu tổng quan.'} onRetry={retry} />
  }

  return <TeacherDashboardContent summary={summary} />
}
