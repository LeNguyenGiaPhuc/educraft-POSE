import { describe, expect, it, vi } from 'vitest';
import { createGeminiStudentTutorProvider } from '../../../../../backend/src/modules/student/student-tutor-ai.provider.js';

const source = { id: 'segment-1', label: 'Bài học · Tài liệu · Trang 1', content: 'Nước bay hơi khi nhận nhiệt lượng từ môi trường xung quanh.' };

describe('Gemini Student Tutor provider', () => {
  it('returns an answer with a verified citation and sends prior turns', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ answer: 'Nước bay hơi khi nhận nhiệt.', citations: [{ segment_id: source.id, excerpt: 'Nước bay hơi khi nhận nhiệt lượng' }] }) }] } }] }), { status: 200 }));
    const provider = createGeminiStudentTutorProvider({ apiKey: 'test-key', model: 'test-model', timeoutMs: 1000, fetchImpl });

    await expect(provider.answer({ question: 'Khi nào nước bay hơi?', history: [{ role: 'user', content: 'Em đang học bài.' }], sources: [source] })).resolves.toEqual({
      answer: 'Nước bay hơi khi nhận nhiệt.', citations: [{ segmentId: source.id, excerpt: 'Nước bay hơi khi nhận nhiệt lượng' }],
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(JSON.stringify(fetchImpl.mock.calls[0]?.[1]?.body)).toContain('Em đang học bài.');
  });

  it('rejects citations that do not quote the supplied material', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ answer: 'Câu trả lời.', citations: [{ segment_id: source.id, excerpt: 'Đoạn không có trong bài học' }] }) }] } }] }), { status: 200 }));
    const provider = createGeminiStudentTutorProvider({ apiKey: 'test-key', model: 'test-model', timeoutMs: 1000, fetchImpl });

    await expect(provider.answer({ question: 'Câu hỏi', history: [], sources: [source] })).rejects.toMatchObject({ code: 'AI_PROVIDER_INVALID_RESPONSE' });
  });
});
