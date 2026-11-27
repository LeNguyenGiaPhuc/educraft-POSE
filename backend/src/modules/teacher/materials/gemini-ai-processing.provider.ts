import { AppError } from '../../../shared/errors/app-error.js';
import type {
  AiProcessingProvider,
  ProcessedMaterialResult,
  ProcessedSegment,
} from './ai-processing.provider.js';
import { MATERIAL_SYSTEM_PROMPT } from './material-system-prompt.js';
import { extractOoxmlText } from './ooxml-text.js';

type GeminiMaterialProviderOptions = {
  apiKey?: string;
  model: string;
  timeoutMs: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
};

type JsonSchema = Record<string, unknown>;

const materialSchema: JsonSchema = {
  type: 'OBJECT',
  properties: {
    segments: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          position_type: {
            type: 'STRING',
            enum: ['PAGE', 'SLIDE', 'PARAGRAPH', 'IMAGE'],
          },
          position_index: { type: 'INTEGER', minimum: 1 },
          position_label: { type: 'STRING' },
          ordinal: { type: 'INTEGER', minimum: 1 },
          content: { type: 'STRING' },
        },
        required: ['position_type', 'position_index', 'position_label', 'ordinal', 'content'],
      },
    },
  },
  required: ['segments'],
};

function textFromResponse(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const candidates = (value as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(candidates)) return '';

  return candidates
    .flatMap((candidate) => {
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
    })
    .join('')
    .trim();
}

function parseJson(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Response is not an object');
    }
    return value as Record<string, unknown>;
  } catch {
    throw new AppError(
      'Gemini trả về dữ liệu không hợp lệ.',
      502,
      'AI_PROVIDER_INVALID_RESPONSE'
    );
  }
}

function safeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function safeNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : 0;
}

function safePositionType(value: unknown): ProcessedSegment['positionType'] | null {
  if (value === 'PAGE' || value === 'SLIDE' || value === 'PARAGRAPH' || value === 'IMAGE') {
    return value;
  }
  return null;
}

function mapSegments(value: unknown): ProcessedSegment[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) {
    throw new AppError(
      'Gemini không trả về các phân đoạn học liệu hợp lệ.',
      502,
      'AI_PROVIDER_INVALID_RESPONSE'
    );
  }

  const segments = value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new AppError(
        'Gemini không trả về các phân đoạn học liệu hợp lệ.',
        502,
        'AI_PROVIDER_INVALID_RESPONSE'
      );
    }

    const raw = item as Record<string, unknown>;
    const positionType = safePositionType(raw.position_type ?? raw.positionType);
    const positionIndex = safeNumber(raw.position_index ?? raw.positionIndex);
    const positionLabel = safeText(raw.position_label ?? raw.positionLabel);
    const content = safeText(raw.content);

    if (!positionType || positionIndex < 1 || !positionLabel || !content || content.length > 200_000) {
      throw new AppError(
        'Gemini không trả về các phân đoạn học liệu hợp lệ.',
        502,
        'AI_PROVIDER_INVALID_RESPONSE'
      );
    }

    return {
      positionType,
      positionIndex,
      positionLabel,
      // The server owns ordering. This avoids duplicate ordinals from model output.
      ordinal: index + 1,
      content,
    } satisfies ProcessedSegment;
  });

  return segments;
}

function materialPart(mimeType: string, buffer: Buffer) {
  return {
    inline_data: {
      mime_type: mimeType,
      data: buffer.toString('base64'),
    },
  };
}

function materialContentPart(mimeType: string, buffer: Buffer) {
  const extractedText = extractOoxmlText(buffer, mimeType);
  if (extractedText !== null) {
    return {
      text: `Text extracted locally from the Office document:\n\n${extractedText}`,
    };
  }
  return materialPart(mimeType, buffer);
}

function buildMaterialTaskPrompt(fileName: string, mimeType: string): string {
  return [
    `Extract the readable teaching content from the file "${fileName}" (${mimeType}).`,
    'Use PAGE for PDF pages, SLIDE for presentation slides, IMAGE for a standalone image, and PARAGRAPH for document text.',
    'If a part is unreadable, omit it instead of guessing.',
  ].join('\n');
}

function failedResult(error: unknown): ProcessedMaterialResult {
  return {
    status: 'FAILED',
    error: error instanceof AppError ? error.message : 'Gemini không thể xử lý học liệu.',
  };
}

export function createGeminiAiProcessingProvider(
  options: GeminiMaterialProviderOptions
): AiProcessingProvider {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const maxRetries = Math.min(3, Math.max(0, options.maxRetries ?? 0));

  async function generate(fileName: string, mimeType: string, buffer: Buffer): Promise<Record<string, unknown>> {
    if (!options.apiKey || typeof fetchImpl !== 'function') {
      throw new AppError('Gemini chưa được cấu hình.', 503, 'AI_PROVIDER_UNAVAILABLE');
    }

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
              systemInstruction: {
                parts: [{ text: MATERIAL_SYSTEM_PROMPT }],
              },
              contents: [{
                role: 'user',
                parts: [
                  { text: buildMaterialTaskPrompt(fileName, mimeType) },
                  materialContentPart(mimeType, buffer),
                ],
              }],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
                responseSchema: materialSchema,
              },
            }),
          }
        );

        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          throw new AppError(
            'Gemini không thể xử lý yêu cầu hiện tại.',
            502,
            retryable ? 'AI_PROVIDER_RETRYABLE' : 'AI_PROVIDER_FAILED'
          );
        }

        const body: unknown = await response.json();
        const text = textFromResponse(body);
        if (!text) {
          throw new AppError('Gemini trả về phản hồi rỗng.', 502, 'AI_PROVIDER_INVALID_RESPONSE');
        }
        return parseJson(text);
      } catch (error) {
        if (error instanceof AppError) {
          if (error.code === 'AI_PROVIDER_RETRYABLE' && attempt < maxRetries) continue;
          if (error.code === 'AI_PROVIDER_RETRYABLE') {
            throw new AppError('Gemini không thể xử lý yêu cầu hiện tại.', 502, 'AI_PROVIDER_FAILED');
          }
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
    async process(params): Promise<ProcessedMaterialResult> {
      if (!options.apiKey) {
        return {
          status: 'PENDING',
          error: 'Gemini chưa được cấu hình; học liệu đang chờ xử lý.',
        };
      }

      try {
        const response = await generate(params.fileName, params.mimeType, params.buffer);
        return {
          status: 'PROCESSED',
          segments: mapSegments(response.segments),
        };
      } catch (error) {
        return failedResult(error);
      }
    },
  };
}
