export const minCalendarDateTime = '1900-01-01T00:00'
export const maxCalendarDateTime = '2100-12-31T23:59'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function calendarLocalDay(value: string): string {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getCalendarMonth(value: string, now = new Date()): string {
  const isValid = /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    && Number(value.slice(0, 4)) >= 1900
    && Number(value.slice(0, 4)) <= 2100
  if (isValid) return value
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

export function monthCells(month: string): string[] {
  const [year, number] = month.split('-').map(Number)
  const offset = (new Date(year, number - 1, 1).getDay() + 6) % 7
  const days = new Date(year, number, 0).getDate()
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    if (index < offset || index >= offset + days) return ''
    return `${month}-${pad(index - offset + 1)}`
  })
}

export function monthRange(month: string): { from: string; to: string } {
  const [year, number] = month.split('-').map(Number)
  return {
    from: new Date(year, number - 1, 1, 0, 0, 0, 0).toISOString(),
    to: new Date(year, number, 0, 23, 59, 59, 999).toISOString(),
  }
}

// Match the month calendar's supported years; compare local values without timezone conversion.
export function isCalendarDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value))
    && value >= minCalendarDateTime
    && value <= maxCalendarDateTime
}
