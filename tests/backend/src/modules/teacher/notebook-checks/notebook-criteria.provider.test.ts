import { describe, expect, it, vi } from 'vitest';
import { createGeminiNotebookCriteriaProvider } from '../../../../../../backend/src/modules/teacher/notebook-checks/gemini-notebook-criteria.provider.js';
import { NOTEBOOK_CRITERIA_SYSTEM_PROMPT } from '../../../../../../backend/src/modules/teacher/notebook-checks/notebook-criteria-system-prompt.js';

const baseOptions = {
  apiKey: 'test-key',
  model: 'gemini-test',
  timeoutMs: 1_000,
  maxRetries: 0,
  maxTotalBytes: 1024 * 1024,
};

const input = {
  images: [{ buffer: Buffer.from('sample-image'), mimeType: 'image/jpeg' }],
};

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
  }), { status, headers: { 'content-type': 'application/json' } });
}

describe('Gemini notebook criteria provider', () => {
  it('returns unavailable without an API key and does not call Gemini', async () => {
    const fetchMock = vi.fn();
    const provider = createGeminiNotebookCriteriaProvider({ ...baseOptions, apiKey: undefined, fetchImpl: fetchMock });

    await expect(provider.suggestCriteria(input)).resolves.toEqual(expect.objectContaining({
      status: 'UNAVAILABLE',
      criteria: [],
    }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps valid criteria, removes case-insensitive duplicates, and uses a separate system prompt', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ criteria: [
      { content: 'Ghi đủ các mốc chính' },
      { content: 'ghi đủ các mốc chính' },
      { content: 'Nêu được ý nghĩa của bài học' },
    ] }));
    const provider = createGeminiNotebookCriteriaProvider({ ...baseOptions, fetchImpl: fetchMock });

    await expect(provider.suggestCriteria(input)).resolves.toEqual({
      status: 'READY',
      criteria: [
        { content: 'Ghi đủ các mốc chính' },
        { content: 'Nêu được ý nghĩa của bài học' },
      ],
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.systemInstruction.parts[0].text).toBe(NOTEBOOK_CRITERIA_SYSTEM_PROMPT);
    expect(body.systemInstruction.parts[0].text).not.toContain('sample-image');
    expect(body.contents[0].parts.some((part: Record<string, unknown>) => part.inline_data)).toBe(true);
    expect(body.generationConfig.responseSchema.properties.criteria.type).toBe('ARRAY');
  });

  it.each([
    ['malformed JSON', 'not-json'],
    ['empty criteria', { criteria: [] }],
    ['oversized criterion', { criteria: [{ content: 'a'.repeat(501) }] }],
  ])('returns FAILED for %s', async (_name, value) => {
    const fetchMock = vi.fn().mockResolvedValue(value === 'not-json'
      ? new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not-json' }] } }] }), { status: 200 })
      : response(value));
    const provider = createGeminiNotebookCriteriaProvider({ ...baseOptions, fetchImpl: fetchMock });

    await expect(provider.suggestCriteria(input)).resolves.toEqual(expect.objectContaining({
      status: 'FAILED',
      criteria: [],
    }));
  });

  it('returns FAILED before calling Gemini when the total image size is too large', async () => {
    const fetchMock = vi.fn();
    const provider = createGeminiNotebookCriteriaProvider({ ...baseOptions, maxTotalBytes: 1, fetchImpl: fetchMock });

    await expect(provider.suggestCriteria(input)).resolves.toEqual(expect.objectContaining({ status: 'FAILED', criteria: [] }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
