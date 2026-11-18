import { describe, expect, it } from 'vitest';
import { canDeleteNotebookCheck } from '../../../../../../frontend/src/features/teacher/activities/NotebookChecksPanel';

describe('canDeleteNotebookCheck', () => {
  it('allows deletion before the first submission even after publication', () => {
    expect(canDeleteNotebookCheck({ status: 'PUBLISHED', criteriaLockedAt: null })).toBe(true);
  });

  it('blocks deletion after criteria are locked by the first submission', () => {
    expect(canDeleteNotebookCheck({ status: 'PUBLISHED', criteriaLockedAt: '2026-11-18T00:00:00.000Z' })).toBe(false);
  });
});
