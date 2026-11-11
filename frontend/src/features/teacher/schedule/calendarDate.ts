export const minCalendarDateTime = '1900-01-01T00:00'
export const maxCalendarDateTime = '2100-12-31T23:59'

// Match the month calendar's supported years; compare local values without timezone conversion.
export function isCalendarDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value))
    && value >= minCalendarDateTime
    && value <= maxCalendarDateTime
}
