import { describe, it, expect } from 'vitest';
import { parsePaginationParams, createPaginationMeta } from '../../../../backend/src/shared/pagination/pagination.util.js';

describe('Pagination Utilities', () => {
  it('parses default pagination params when none provided', () => {
    const params = parsePaginationParams({});
    expect(params.page).toBe(1);
    expect(params.limit).toBe(20);
    expect(params.skip).toBe(0);
    expect(params.take).toBe(20);
  });

  it('parses valid custom pagination params', () => {
    const params = parsePaginationParams({ page: '3', limit: '15', search: '  Toán  ' });
    expect(params.page).toBe(3);
    expect(params.limit).toBe(15);
    expect(params.skip).toBe(30);
    expect(params.take).toBe(15);
    expect(params.search).toBe('Toán');
  });

  it('clamps invalid or boundary page and limit values', () => {
    const underflow = parsePaginationParams({ page: '-5', limit: '0' });
    expect(underflow.page).toBe(1);
    expect(underflow.limit).toBe(1);

    const overflow = parsePaginationParams({ page: '2', limit: '500' });
    expect(overflow.page).toBe(2);
    expect(overflow.limit).toBe(100); // capped at max limit 100
  });

  it('creates correct metadata for page 1 with more pages', () => {
    const meta = createPaginationMeta({ page: 1, limit: 20, totalItems: 55 });
    expect(meta).toEqual({
      page: 1,
      limit: 20,
      totalItems: 55,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false,
    });
  });

  it('creates correct metadata for the last page', () => {
    const meta = createPaginationMeta({ page: 3, limit: 20, totalItems: 55 });
    expect(meta).toEqual({
      page: 3,
      limit: 20,
      totalItems: 55,
      totalPages: 3,
      hasNextPage: false,
      hasPrevPage: true,
    });
  });

  it('handles empty results (0 items)', () => {
    const meta = createPaginationMeta({ page: 1, limit: 20, totalItems: 0 });
    expect(meta).toEqual({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });
});
