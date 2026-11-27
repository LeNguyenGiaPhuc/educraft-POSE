export function formatRate(value: number | null): string {
  if (value === null) return 'Chưa có dữ liệu'
  return `${Math.round(value * 100)}%`
}

export function formatPercentage(value: number | null): string {
  if (value === null) return 'Chưa có dữ liệu'
  return `${Math.round(value)}%`
}

export function safePercentage(value: number, total: number): number | null {
  if (total <= 0) return null
  return (value / total) * 100
}
