import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canEditActivityContent,
  canDeleteActivity,
  getActivitySubmissionCount,
  readActivityChanges,
  writeActivityChanges,
} from './activities.mock.ts'

test('activities permission: canEditActivityContent is allowed strictly when 0 submissions', () => {
  assert.equal(canEditActivityContent(0), true, '0 submissions should allow editing content')
  assert.equal(canEditActivityContent(1), false, '1 submission must prevent editing content')
  assert.equal(canEditActivityContent(2), false, '2 submissions must prevent editing content')
  assert.equal(canEditActivityContent(10), false, '10 submissions must prevent editing content')
})

test('activity previews keep edits and deletions through a route remount', () => {
  const values = new Map()
  globalThis.sessionStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const changes = { updated: { 'quiz-1': { id: 'quiz-1', classroomSubjectId: 'history-11a2', title: 'Đã sửa', type: 'QUIZ', status: 'CLOSED', closesAt: '2026-11-30T20:00' } }, deleted: ['quiz-2'] }
  writeActivityChanges(changes)
  assert.deepEqual(readActivityChanges(), changes)
  delete globalThis.sessionStorage
})

test('activities permission: canDeleteActivity is allowed strictly when 0 submissions', () => {
  assert.equal(canDeleteActivity(0), true, '0 submissions should allow deletion')
  assert.equal(canDeleteActivity(1), false, '1 submission must lock deletion permanently')
  assert.equal(canDeleteActivity(5), false, 'multiple submissions must lock deletion permanently')
})

test('activities permission: getActivitySubmissionCount retrieves correct count from assigned list', () => {
  const mockAssigned = [
    { id: 'act-0', submitted: 0 },
    { id: 'act-1', submitted: 1 },
    { id: 'act-3', submitted: 3 },
  ]

  assert.equal(getActivitySubmissionCount('act-0', mockAssigned), 0)
  assert.equal(getActivitySubmissionCount('act-1', mockAssigned), 1)
  assert.equal(getActivitySubmissionCount('act-3', mockAssigned), 3)
  assert.equal(getActivitySubmissionCount('act-nonexistent', mockAssigned), 0)
})
