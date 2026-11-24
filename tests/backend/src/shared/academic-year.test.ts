import { describe, expect, it } from 'vitest';
import { normalizeAcademicYear } from '../../../../backend/src/shared/academic-year.js';

describe('normalizeAcademicYear', () => {
  it('normalizes hyphen and en-dash academic years', () => {
    expect(normalizeAcademicYear('2026-2027')).toBe('2026-2027');
    expect(normalizeAcademicYear('2026–2027')).toBe('2026-2027');
  });

  it('rejects malformed or non-consecutive academic years', () => {
    expect(normalizeAcademicYear('2026/2027')).toBeNull();
    expect(normalizeAcademicYear('2026-2028')).toBeNull();
  });
});
