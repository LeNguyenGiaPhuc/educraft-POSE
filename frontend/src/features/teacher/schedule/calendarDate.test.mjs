import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'

const source = stripTypeScriptTypes(readFileSync(new URL('./calendarDate.ts', import.meta.url), 'utf8'))
const { isCalendarDateTime, minCalendarDateTime, maxCalendarDateTime } = await import(`data:text/javascript,${encodeURIComponent(source)}`)

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
