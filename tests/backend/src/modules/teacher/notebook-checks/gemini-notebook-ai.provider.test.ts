import { describe, expect, it, vi } from 'vitest';
import { createGeminiNotebookAiProvider } from '../../../../../../backend/src/modules/teacher/notebook-checks/gemini-notebook-ai.provider.js';
import { NOTEBOOK_EVALUATION_SYSTEM_PROMPT } from '../../../../../../backend/src/modules/teacher/notebook-checks/notebook-evaluation-system-prompt.js';
import { NOTEBOOK_OCR_SYSTEM_PROMPT } from '../../../../../../backend/src/modules/teacher/notebook-checks/notebook-ocr-system-prompt.js';

const baseOptions = {
  apiKey: 'test-key',
  model: 'gemini-test',
  timeoutMs: 1_000,
  maxReferenceImages: 4,
  maxSubmissionImages: 10,
  maxTotalBytes: 1024 * 1024,
};

const input = {
  submissionId: 'submission-id',
  referenceFiles: [{ buffer: Buffer.from('reference'), mimeType: 'image/jpeg' }],
  submissionFiles: [{ buffer: Buffer.from('submission'), mimeType: 'image/jpeg' }],
  criteria: [{ id: 'criterion-id', content: 'Ghi đủ ý', orderIndex: 1 }],
};

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
  }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Gemini notebook AI provider', () => {
  it('returns unavailable without an API key', async () => {
    const provider = createGeminiNotebookAiProvider({ ...baseOptions, apiKey: undefined });

    await expect(provider.analyzeSubmission(input)).resolves.toEqual(expect.objectContaining({
      status: 'UNAVAILABLE',
    }));
  });

  it('sends reference and submission images, then maps criterion suggestions', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ reference_text: 'Bài mẫu', submission_text: 'Bài nộp' }))
      .mockResolvedValueOnce(response({ suggestions: [{
        criterion_id: 'criterion-id',
        status: 'RECORDED',
        note: 'Đủ ý',
        evidence: 'Có nội dung chính',
        confidence: 0.8,
      }] }));
    const provider = createGeminiNotebookAiProvider({ ...baseOptions, fetchImpl: fetchMock });

    await expect(provider.analyzeSubmission(input)).resolves.toEqual({
      status: 'READY',
      ocrText: 'Bài mẫu:\nBài mẫu\n\nBài nộp:\nBài nộp',
      suggestions: [{
        criterionId: 'criterion-id',
        status: 'RECORDED',
        note: 'Đủ ý',
        evidence: 'Có nội dung chính',
        confidence: 0.8,
      }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(firstBody.systemInstruction.parts[0].text).toBe(NOTEBOOK_OCR_SYSTEM_PROMPT);
    expect(secondBody.systemInstruction.parts[0].text).toBe(NOTEBOOK_EVALUATION_SYSTEM_PROMPT);
    expect(firstBody.systemInstruction.parts[0].text).not.toContain('criterion-id');
    expect(secondBody.systemInstruction.parts[0].text).not.toContain('Ghi đủ ý');
    expect(firstBody.contents[0].parts[0].text).toContain('1 ảnh vở mẫu');
    expect(firstBody.contents[0].parts[0].text).toContain('1 ảnh bài nộp');
    expect(secondBody.contents[0].parts[0].text).toContain('criterion-id');
    expect(secondBody.contents[0].parts[0].text).toContain('Ghi đủ ý');
    const imageParts = firstBody.contents[0].parts.filter((part: Record<string, unknown>) => part.inline_data);
    expect(imageParts).toHaveLength(2);
    expect(firstBody.generationConfig.responseSchema.type).toBe('OBJECT');
    expect(firstBody.generationConfig.responseSchema.properties.reference_text.type).toBe('STRING');
    expect(secondBody.generationConfig.responseSchema.type).toBe('OBJECT');
    expect(secondBody.generationConfig.responseSchema.properties.suggestions.type).toBe('ARRAY');
    expect(secondBody.generationConfig.responseSchema.properties.suggestions.items.properties.confidence.type).toBe('NUMBER');
    expect(fetchMock.mock.calls[0][0]).toContain('/models/gemini-test:generateContent?key=test-key');
  });

  it('returns failed when Gemini returns malformed JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'not-json' }] } }],
    }), { status: 200 }));
    const provider = createGeminiNotebookAiProvider({ ...baseOptions, fetchImpl: fetchMock });

    await expect(provider.analyzeSubmission(input)).resolves.toEqual(expect.objectContaining({
      status: 'FAILED',
    }));
  });

  it('retries a transient Gemini failure once when configured', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ error: 'busy' }, 503))
      .mockResolvedValueOnce(response({ reference_text: 'Bài mẫu', submission_text: 'Bài nộp' }))
      .mockResolvedValueOnce(response({ suggestions: [] }));
    const provider = createGeminiNotebookAiProvider({ ...baseOptions, maxRetries: 1, fetchImpl: fetchMock });

    await expect(provider.analyzeSubmission(input)).resolves.toEqual(expect.objectContaining({
      status: 'READY',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns failed when the image byte limit is exceeded', async () => {
    const provider = createGeminiNotebookAiProvider({ ...baseOptions, maxTotalBytes: 1 });

    await expect(provider.analyzeSubmission(input)).resolves.toEqual(expect.objectContaining({
      status: 'FAILED',
    }));
  });
});
