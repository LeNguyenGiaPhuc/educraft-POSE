import { describe, expect, it } from 'vitest';
import {
  promptTopicsQuerySchema,
  statisticsQuerySchema,
} from '../../../../../../backend/src/modules/teacher/results/results.schemas.js';

describe('statisticsQuerySchema', () => {
  it('rejects a period filter without an activity filter', () => {
    expect(() => statisticsQuerySchema.parse({
      periodId: '11111111-1111-4111-8111-111111111111',
    })).toThrow();
  });

  it('accepts a period filter with an activity filter', () => {
    expect(statisticsQuerySchema.parse({
      activityId: '22222222-2222-4222-8222-222222222222',
      periodId: '11111111-1111-4111-8111-111111111111',
    })).toEqual({
      activityId: '22222222-2222-4222-8222-222222222222',
      periodId: '11111111-1111-4111-8111-111111111111',
    });
  });
});

describe('promptTopicsQuerySchema', () => {
  it.each(['2026-02-30', '2026-99-99', '2023-02-29'])('rejects invalid calendar dates: %s', (date) => {
    expect(() => promptTopicsQuerySchema.parse({
      periodStart: date,
      periodEnd: '2026-03-01',
    })).toThrow();
  });

  it('accepts a valid leap day and an inclusive ordered range', () => {
    expect(promptTopicsQuerySchema.parse({
      periodStart: '2024-02-29',
      periodEnd: '2024-03-01',
    })).toEqual({
      periodStart: '2024-02-29',
      periodEnd: '2024-03-01',
    });
  });
});
