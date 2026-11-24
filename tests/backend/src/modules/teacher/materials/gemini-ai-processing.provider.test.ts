import { describe, expect, it, vi } from 'vitest';
import { createGeminiAiProcessingProvider } from '../../../../../../backend/src/modules/teacher/materials/gemini-ai-processing.provider.js';
import { MATERIAL_SYSTEM_PROMPT } from '../../../../../../backend/src/modules/teacher/materials/material-system-prompt.js';

const baseOptions = {
  apiKey: 'test-key',
  model: 'gemini-test',
  timeoutMs: 1_000,
};

const input = {
  materialVersionId: 'version-id',
  fileName: 'lesson.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 test'),
};

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
  }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Gemini material processing provider', () => {
  it('keeps the material pending when no API key is configured', async () => {
    const provider = createGeminiAiProcessingProvider({ ...baseOptions, apiKey: undefined });

    await expect(provider.process(input)).resolves.toEqual(expect.objectContaining({
      status: 'PENDING',
    }));
  });

  it('sends the file and maps extracted segments', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      segments: [{
        position_type: 'PAGE',
        position_index: 2,
        position_label: 'Page 2',
        ordinal: 99,
        content: 'Lesson content',
      }],
    }));
    const provider = createGeminiAiProcessingProvider({ ...baseOptions, fetchImpl: fetchMock });

    await expect(provider.process(input)).resolves.toEqual({
      status: 'PROCESSED',
      segments: [{
        positionType: 'PAGE',
        positionIndex: 2,
        positionLabel: 'Page 2',
        ordinal: 1,
        content: 'Lesson content',
      }],
    });

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(requestBody.systemInstruction.parts[0].text).toBe(MATERIAL_SYSTEM_PROMPT);
    expect(requestBody.systemInstruction.parts[0].text).not.toContain('lesson.pdf');
    expect(requestBody.contents[0].parts[0].text).toContain('lesson.pdf');
    expect(requestBody.contents[0].parts[0].text).toContain('application/pdf');
    expect(requestBody.contents[0].parts).toHaveLength(2);
    expect(requestBody.contents[0].parts[1].inline_data.mime_type).toBe('application/pdf');
    expect(requestBody.generationConfig.responseSchema.type).toBe('OBJECT');
    expect(requestBody.generationConfig.responseSchema.properties.segments.type).toBe('ARRAY');
    expect(requestBody.generationConfig.responseSchema.properties.segments.items.properties.position_index.type).toBe('INTEGER');
    expect(fetchMock.mock.calls[0][0]).toContain('/models/gemini-test:generateContent?key=test-key');
  });

  it('returns failed for malformed Gemini output', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'not-json' }] } }],
    }), { status: 200 }));
    const provider = createGeminiAiProcessingProvider({ ...baseOptions, fetchImpl: fetchMock });

    await expect(provider.process(input)).resolves.toEqual(expect.objectContaining({
      status: 'FAILED',
    }));
  });

  it('retries a transient Gemini response once', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ error: 'busy' }, 503))
      .mockResolvedValueOnce(response({
        segments: [{
          position_type: 'PAGE',
          position_index: 1,
          position_label: 'Page 1',
          ordinal: 1,
          content: 'Content',
        }],
      }));
    const provider = createGeminiAiProcessingProvider({ ...baseOptions, maxRetries: 1, fetchImpl: fetchMock });

    await expect(provider.process(input)).resolves.toEqual(expect.objectContaining({
      status: 'PROCESSED',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
