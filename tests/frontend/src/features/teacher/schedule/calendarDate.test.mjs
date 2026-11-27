import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'

const source = stripTypeScriptTypes(
  readFileSync(new URL('../../../../../../frontend/src/features/teacher/schedule/calendarDate.ts', import.meta.url), 'utf8')
)
const {
  calendarLocalDay,
  getCalendarMonth,
  isCalendarDateTime,
  maxCalendarDateTime,
  minCalendarDateTime,
  monthCells,
} = await import(`data:text/javascript,${encodeURIComponent(source)}`)

test('calendar accepts both supported year boundaries', () => {
  assert.equal(isCalendarDateTime(minCalendarDateTime), true)
  assert.equal(isCalendarDateTime('1900-12-31T23:59'), true)
  assert.equal(isCalendarDateTime('2100-01-01T00:00'), true)
  assert.equal(isCalendarDateTime(maxCalendarDateTime), true)
})
test('calendar rejects dates outside its navigable year range', () => {
  for (const value of ['1899-12-31T23:59', '2101-01-01T00:00', '9999-12-31T23:59', '', 'invalid']) {
    assert.equal(isCalendarDateTime(value), false, value)
  }
})

test('calendar uses the current local month when the query is missing or invalid', () => {
  const now = new Date(2027, 1, 3, 8, 30)
  assert.equal(getCalendarMonth('', now), '2027-02')
  assert.equal(getCalendarMonth('invalid', now), '2027-02')
  assert.equal(getCalendarMonth('2028-12', now), '2028-12')
})

test('calendar groups explicit-offset timestamps by the browser local day', () => {
  const value = '2026-12-01T00:30:00+07:00'
  const expected = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(value))
  assert.equal(calendarLocalDay(value), expected)
})

test('calendar month cells include leap day and exclude neighboring months', () => {
  const cells = monthCells('2028-02').filter(Boolean)
  assert.equal(cells[0], '2028-02-01')
  assert.equal(cells.at(-1), '2028-02-29')
  assert.equal(cells.length, 29)
})
