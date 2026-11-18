import { describe, expect, it } from 'vitest';
import { statisticsQuerySchema } from '../../../../../../backend/src/modules/teacher/results/results.schemas.js';

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
