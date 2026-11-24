import { describe, expect, it, vi } from 'vitest';
import { createGeminiActivityAiProvider } from '../../../../../../backend/src/modules/teacher/activities/gemini-activity-ai.provider.js';
import { QUIZ_SYSTEM_PROMPT } from '../../../../../../backend/src/modules/teacher/activities/quiz-system-prompt.js';
import { WRITTEN_SYSTEM_PROMPT } from '../../../../../../backend/src/modules/teacher/activities/written-system-prompt.js';

const baseOptions = {
  apiKey: 'test-key',
  model: 'gemini-test',
  timeoutMs: 1_000,
  maxContextBytes: 20_000,
};

const baseParams = {
  exerciseType: 'QUIZ' as const,
  difficulty: 'BASIC' as const,
  questionCount: 1,
  lessonIds: ['lesson-1'],
  teacherInstructions: 'Ưu tiên mốc thời gian quan trọng.',
  segments: [{ id: 'segment-1', content: 'Nội dung bài học năm 1986.', lessonId: 'lesson-1', materialTitle: 'Lịch sử' }],
};

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
  }), { status, headers: { 'content-type': 'application/json' } });
}

function quizResponse() {
  return { questions: [{
    prompt: 'Công cuộc Đổi mới bắt đầu năm nào?',
    explanation: 'Nguồn nêu mốc năm 1986.',
    lesson_id: 'lesson-1',
    options: ['1975', '1986', '1990', '2000'],
    answer_key: '1986',
    citations: [{ segment_id: 'segment-1', excerpt: 'năm 1986' }],
  }] };
}

describe('Gemini activity AI provider', () => {
  it('returns unavailable without an API key and does not call Gemini', async () => {
    const fetchMock = vi.fn();
    const provider = createGeminiActivityAiProvider({ ...baseOptions, apiKey: undefined, fetchImpl: fetchMock });

    await expect(provider.generateDraft(baseParams)).resolves.toEqual(expect.objectContaining({ status: 'UNAVAILABLE', questions: [] }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a valid Quiz response with four options and fixed points', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(quizResponse()));
    const provider = createGeminiActivityAiProvider({ ...baseOptions, fetchImpl: fetchMock });

    await expect(provider.generateDraft(baseParams)).resolves.toEqual({
      status: 'READY',
      questions: [{
        prompt: 'Công cuộc Đổi mới bắt đầu năm nào?',
        explanation: 'Nguồn nêu mốc năm 1986.',
        lessonId: 'lesson-1',
        options: ['1975', '1986', '1990', '2000'],
        answerKey: '1986',
        maxPoints: 1,
        citations: [{ segmentId: 'segment-1', excerpt: 'năm 1986' }],
      }],
    });
  });

  it('maps a valid Written response with reference answer and criteria', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ questions: [{
      prompt: 'Giải thích ý nghĩa của công cuộc Đổi mới.',
      explanation: 'Câu trả lời cần nêu thay đổi kinh tế và đời sống.',
      lesson_id: 'lesson-1',
      expected_answer: 'Mở rộng nền kinh tế nhiều thành phần và cải thiện đời sống.',
      marking_criteria: 'Nêu đúng hai ý chính từ nguồn.',
      citations: [{ segment_id: 'segment-1', excerpt: 'Nội dung bài học' }],
    }] }));
    const provider = createGeminiActivityAiProvider({ ...baseOptions, fetchImpl: fetchMock });

    await expect(provider.generateDraft({ ...baseParams, exerciseType: 'WRITTEN' })).resolves.toEqual(expect.objectContaining({
      status: 'READY',
      questions: [expect.objectContaining({
        answerKey: 'Mở rộng nền kinh tế nhiều thành phần và cải thiện đời sống.',
        markingCriteria: 'Nêu đúng hai ý chính từ nguồn.',
        maxPoints: 5,
      })],
    }));
  });

  it('uses the exercise system prompt and keeps dynamic data in user content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(quizResponse()));
    const provider = createGeminiActivityAiProvider({ ...baseOptions, fetchImpl: fetchMock });

    await provider.generateDraft(baseParams);

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.systemInstruction.parts[0].text).toBe(QUIZ_SYSTEM_PROMPT);
    expect(body.systemInstruction.parts[0].text).not.toContain('segment-1');
    expect(body.contents[0].parts[0].text).toContain('segment-1');
    expect(body.contents[0].parts[0].text).toContain(baseParams.teacherInstructions);
    expect(body.generationConfig.responseSchema.type).toBe('OBJECT');
    expect(body.generationConfig.responseSchema.properties.questions.type).toBe('ARRAY');
    expect(body.generationConfig.responseSchema.properties.questions.items.properties.options.type).toBe('ARRAY');

    const writtenFetch = vi.fn().mockResolvedValue(response({ questions: [{
      prompt: 'Nêu ý chính.', explanation: 'Giải thích.', lesson_id: 'lesson-1',
      expected_answer: 'Ý chính.', marking_criteria: 'Đủ ý.',
      citations: [{ segment_id: 'segment-1', excerpt: 'Nội dung' }],
    }] }));
    const writtenProvider = createGeminiActivityAiProvider({ ...baseOptions, fetchImpl: writtenFetch });
    await writtenProvider.generateDraft({ ...baseParams, exerciseType: 'WRITTEN' });
    const writtenBody = JSON.parse(String(writtenFetch.mock.calls[0][1]?.body));
    expect(writtenBody.systemInstruction.parts[0].text).toBe(WRITTEN_SYSTEM_PROMPT);
    expect(writtenBody.generationConfig.responseSchema.type).toBe('OBJECT');
    expect(writtenBody.generationConfig.responseSchema.properties.questions.items.properties.expected_answer.type).toBe('STRING');
  });

  it('retries a transient Gemini response up to maxRetries', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ error: 'busy' }, 503)).mockResolvedValueOnce(response(quizResponse()));
    const provider = createGeminiActivityAiProvider({ ...baseOptions, maxRetries: 1, fetchImpl: fetchMock });

    await expect(provider.generateDraft(baseParams)).resolves.toEqual(expect.objectContaining({ status: 'READY' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['malformed JSON', 'invalid-json'],
    ['wrong question count', { questions: [] }],
    ['unknown citation', { questions: [{ ...quizResponse().questions[0], citations: [{ segment_id: 'other', excerpt: 'năm 1986' }] }] }],
    ['cross lesson citation', { questions: [{ ...quizResponse().questions[0], lesson_id: 'lesson-1', citations: [{ segment_id: 'segment-2', excerpt: 'năm 1986' }] }] }],
    ['excerpt outside source', { questions: [{ ...quizResponse().questions[0], citations: [{ segment_id: 'segment-1', excerpt: 'không có trong nguồn' }] }] }],
  ])('returns FAILED for %s', async (_name, value) => {
    const fetchMock = vi.fn().mockResolvedValue(value === 'invalid-json' ? new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'invalid-json' }] } }] })) : response(value));
    const provider = createGeminiActivityAiProvider({ ...baseOptions, fetchImpl: fetchMock });

    await expect(provider.generateDraft(baseParams)).resolves.toEqual(expect.objectContaining({ status: 'FAILED', questions: [] }));
  });

  it('rejects oversized source context before calling Gemini', async () => {
    const fetchMock = vi.fn();
    const provider = createGeminiActivityAiProvider({ ...baseOptions, maxContextBytes: 2, fetchImpl: fetchMock });

    await expect(provider.generateDraft(baseParams)).resolves.toEqual(expect.objectContaining({ status: 'FAILED', questions: [] }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
