import { describe, expect, it } from 'vitest';
import { BadRequestError } from '../../../../../../backend/src/shared/errors/app-error.js';
import {
  requireQuestionCitations,
  validateExerciseQuestionShape,
  validateQuestionSources,
  type EligibleActivitySegment,
} from '../../../../../../backend/src/modules/teacher/activities/activity-validation.js';

const lessonOne = '00000000-0000-4000-8000-000000000001';
const lessonTwo = '00000000-0000-4000-8000-000000000002';
const segmentOne = '00000000-0000-4000-8000-000000000011';
const segmentTwo = '00000000-0000-4000-8000-000000000012';

function baseQuestion(overrides: Record<string, unknown> = {}) {
  return {
    prompt: 'Question',
    options: ['A', 'B', 'C', 'D'],
    answerKey: 'A',
    explanation: '',
    maxPoints: 1,
    lessonId: lessonOne,
    citations: [{ segmentId: segmentOne, excerpt: 'source text' }],
    ...overrides,
  } as any;
}

const segments: EligibleActivitySegment[] = [
  { id: segmentOne, lessonId: lessonOne, content: 'This is source text for lesson one.' },
  { id: segmentTwo, lessonId: lessonTwo, content: 'This is source text for lesson two.' },
];

describe('activity validation', () => {
  describe('validateExerciseQuestionShape', () => {
    it('accepts a complete quiz question', () => {
      expect(() => validateExerciseQuestionShape('QUIZ', [baseQuestion()])).not.toThrow();
    });

    it('rejects a quiz with fewer than four options', () => {
      expect(() => validateExerciseQuestionShape('QUIZ', [
        baseQuestion({ options: ['A', 'B'] }),
      ])).toThrow(BadRequestError);
    });

    it('rejects duplicate quiz options', () => {
      expect(() => validateExerciseQuestionShape('QUIZ', [
        baseQuestion({ options: ['A', 'A', 'C', 'D'] }),
      ])).toThrow(BadRequestError);
    });

    it('rejects a written question without a reference answer', () => {
      expect(() => validateExerciseQuestionShape('WRITTEN', [
        baseQuestion({ options: undefined, answerKey: undefined, markingCriteria: 'Use the rubric.' }),
      ])).toThrow(BadRequestError);
    });
  });

  describe('validateQuestionSources', () => {
    it('accepts citations that belong to the selected lesson and excerpt', () => {
      expect(() => validateQuestionSources(
        [baseQuestion()],
        new Set([lessonOne]),
        segments,
      )).not.toThrow();
    });

    it('rejects a citation from another lesson', () => {
      expect(() => validateQuestionSources(
        [baseQuestion({ citations: [{ segmentId: segmentTwo, excerpt: 'source text' }] })],
        new Set([lessonOne]),
        segments,
      )).toThrow(BadRequestError);
    });

    it('rejects an excerpt that is not contained in the segment', () => {
      expect(() => validateQuestionSources(
        [baseQuestion({ citations: [{ segmentId: segmentOne, excerpt: 'not in source' }] })],
        new Set([lessonOne]),
        segments,
      )).toThrow(BadRequestError);
    });
  });

  it('requires citations when an activity is being published', () => {
    expect(() => requireQuestionCitations([baseQuestion({ citations: [] })])).toThrow(BadRequestError);
  });
});
