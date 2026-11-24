import { AppError } from '../../../shared/errors/app-error.js';
import { NOTEBOOK_CRITERIA_SYSTEM_PROMPT } from './notebook-criteria-system-prompt.js';
import type {
  NotebookCriteriaSuggestionParams,
  NotebookCriteriaSuggestionProvider,
  NotebookCriteriaSuggestionResult,
} from './notebook-criteria-suggestion.provider.js';

type GeminiNotebookCriteriaProviderOptions = {
  apiKey?: string;
  model: string;
  timeoutMs: number;
  maxRetries?: number;
  maxTotalBytes: number;
  fetchImpl?: typeof fetch;
};

type JsonSchema = Record<string, unknown>;

const criteriaSchema: JsonSchema = {
  type: 'OBJECT',
  properties: {
    criteria: {
      type: 'ARRAY',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'OBJECT',
        properties: { content: { type: 'STRING' } },
        required: ['content'],
        additionalProperties: false,
      },
    },
  },
  required: ['criteria'],
  additionalProperties: false,
};

function textFromResponse(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const candidates = (value as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(candidates)) return '';
  return candidates.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const content = (candidate as { content?: unknown }).content;
    if (!content || typeof content !== 'object') return [];
    const parts = (content as { parts?: unknown[] }).parts;
    if (!Array.isArray(parts)) return [];
    return parts.flatMap((part) => {
      if (!part || typeof part !== 'object') return [];
      const text = (part as { text?: unknown }).text;
      return typeof text === 'string' ? [text] : [];
    });
  }).join('').trim();
}

function parseJson(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Not an object');
    return value as Record<string, unknown>;
  } catch {
    throw new AppError('Gemini trả về dữ liệu không hợp lệ.', 502, 'AI_PROVIDER_INVALID_RESPONSE');
  }
}

function safeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function mapCriteria(value: unknown): Array<{ content: string }> {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { criteria?: unknown }).criteria)) {
    throw new AppError('Gemini không trả về danh sách tiêu chí hợp lệ.', 502, 'AI_PROVIDER_INVALID_RESPONSE');
  }

  const rawCriteria = (value as { criteria: unknown[] }).criteria;
  if (rawCriteria.length < 1 || rawCriteria.length > 20) {
    throw new AppError('Gemini trả về số lượng tiêu chí không hợp lệ.', 502, 'AI_PROVIDER_INVALID_RESPONSE');
  }

  const seen = new Set<string>();
  const criteria: Array<{ content: string }> = [];
  for (const item of rawCriteria) {
    if (!item || typeof item !== 'object') {
      throw new AppError('Gemini trả về tiêu chí không hợp lệ.', 502, 'AI_PROVIDER_INVALID_RESPONSE');
    }
    const content = safeText((item as { content?: unknown }).content);
    if (!content || content.length > 500) {
      throw new AppError('Gemini trả về tiêu chí có độ dài không hợp lệ.', 502, 'AI_PROVIDER_INVALID_RESPONSE');
    }
    const normalized = content.toLocaleLowerCase('vi');
    if (!seen.has(normalized)) {
      seen.add(normalized);
      criteria.push({ content });
    }
  }

  if (criteria.length === 0) {
    throw new AppError('Gemini không trả về tiêu chí có nội dung.', 502, 'AI_PROVIDER_INVALID_RESPONSE');
  }
  return criteria;
}

function imagePart(image: { buffer: Buffer; mimeType: string }) {
  return {
    inline_data: {
      mime_type: image.mimeType,
      data: image.buffer.toString('base64'),
    },
  };
}

export function createGeminiNotebookCriteriaProvider(
  options: GeminiNotebookCriteriaProviderOptions
): NotebookCriteriaSuggestionProvider {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const maxRetries = Math.min(3, Math.max(0, options.maxRetries ?? 0));

  async function generate(params: NotebookCriteriaSuggestionParams): Promise<Record<string, unknown>> {
    if (!options.apiKey || typeof fetchImpl !== 'function') {
      throw new AppError('Gemini chưa được cấu hình.', 503, 'AI_PROVIDER_UNAVAILABLE');
    }

    const taskPrompt = [
      `Có ${params.images.length} ảnh vở mẫu.`,
      'Hãy đề xuất các tiêu chí nội dung ngắn, độc lập và có thể kiểm tra riêng.',
    ].join('\n');

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const response = await fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(options.model)}:generateContent?key=${encodeURIComponent(options.apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: NOTEBOOK_CRITERIA_SYSTEM_PROMPT }] },
              contents: [{ role: 'user', parts: [{ text: taskPrompt }, ...params.images.map(imagePart)] }],
              generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: criteriaSchema },
            }),
          }
        );
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          throw new AppError('Gemini không thể xử lý yêu cầu hiện tại.', 502, retryable ? 'AI_PROVIDER_RETRYABLE' : 'AI_PROVIDER_FAILED');
        }
        const text = textFromResponse(await response.json());
        if (!text) throw new AppError('Gemini trả về phản hồi rỗng.', 502, 'AI_PROVIDER_INVALID_RESPONSE');
        return parseJson(text);
      } catch (error) {
        if (error instanceof AppError) {
          if (error.code === 'AI_PROVIDER_RETRYABLE' && attempt < maxRetries) continue;
          if (error.code === 'AI_PROVIDER_RETRYABLE') throw new AppError('Gemini không thể xử lý yêu cầu hiện tại.', 502, 'AI_PROVIDER_FAILED');
          throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
          if (attempt < maxRetries) continue;
          throw new AppError('Gemini xử lý quá thời gian cho phép.', 502, 'AI_PROVIDER_TIMEOUT');
        }
        if (attempt < maxRetries) continue;
        throw new AppError('Không thể kết nối tới Gemini.', 502, 'AI_PROVIDER_FAILED');
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new AppError('Không thể kết nối tới Gemini.', 502, 'AI_PROVIDER_FAILED');
  }

  return {
    async suggestCriteria(params): Promise<NotebookCriteriaSuggestionResult> {
      if (!options.apiKey) return { status: 'UNAVAILABLE', message: 'Gemini chưa được cấu hình; giáo viên có thể nhập tiêu chí thủ công.', criteria: [] };
      if (params.images.length === 0) return { status: 'FAILED', message: 'Cần ít nhất một ảnh vở mẫu.', criteria: [] };
      const totalBytes = params.images.reduce((total, image) => total + image.buffer.byteLength, 0);
      if (totalBytes > options.maxTotalBytes) return { status: 'FAILED', message: 'Tổng dung lượng ảnh vượt quá giới hạn cho phép.', criteria: [] };

      try {
        return { status: 'READY', criteria: mapCriteria(await generate(params)) };
      } catch (error) {
        if (error instanceof AppError && error.code === 'AI_PROVIDER_UNAVAILABLE') {
          return { status: 'UNAVAILABLE', message: error.message, criteria: [] };
        }
        return { status: 'FAILED', message: error instanceof AppError ? error.message : 'Gemini không thể gợi ý tiêu chí.', criteria: [] };
      }
    },
  };
}
