import type { TeacherActivitySummary } from '../../../lib/api/teacher/activities'
import type { TeacherNotebookCheckSummary } from '../../../lib/api/teacher/notebookChecks'

export type StatisticsActivityOption = {
  id: string
  title: string
  kind: 'EXERCISE' | 'NOTEBOOK_CHECK'
  status: 'PUBLISHED' | 'CLOSED'
}

export type StatisticsPeriodOption = {
  id: string
  periodNo: number
}

type StatisticsActivitySource = TeacherActivitySummary | TeacherNotebookCheckSummary

export function getEligibleStatisticsActivities(items: StatisticsActivitySource[]): StatisticsActivityOption[] {
  const options: StatisticsActivityOption[] = []

  for (const item of items) {
    if (item.status !== 'PUBLISHED' && item.status !== 'CLOSED') {
      continue
    }

    options.push({
      id: item.id,
      title: item.title,
      kind: item.kind,
      status: item.status,
    })
  }

  return options
}

export function getStatisticsActivityId(value: string | null, options: StatisticsActivityOption[]): string {
  if (!value) {
    return ''
  }

  const selected = options.find((item) => item.id === value)
  return selected ? selected.id : ''
}

export function getStatisticsPeriodId(value: string | null, periods: StatisticsPeriodOption[]): string {
  if (!value) {
    return ''
  }

  return periods.some((period) => period.id === value) ? value : ''
}
