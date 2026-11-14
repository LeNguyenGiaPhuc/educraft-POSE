export interface AiDraftQuestion {
  prompt: string;
  options?: string[];
  answerKey?: string;
  markingCriteria?: string;
  explanation: string;
  maxPoints: number;
  lessonId: string;
  citations: Array<{ segmentId: string; excerpt?: string }>;
}

export interface GenerateAiDraftParams {
  exerciseType: 'QUIZ' | 'WRITTEN';
  difficulty: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  questionCount: number;
  lessonIds: string[];
  segments: Array<{
    id: string;
    content: string;
    lessonId: string;
    materialTitle: string;
  }>;
}

export type AiDraftStatus = 'READY' | 'UNAVAILABLE' | 'FAILED';

export interface AiDraftResult {
  status: AiDraftStatus;
  message?: string;
  questions: AiDraftQuestion[];
}

export interface ActivityAiDraftProvider {
  generateDraft(params: GenerateAiDraftParams): Promise<AiDraftResult>;
}

export class DefaultActivityAiDraftProvider implements ActivityAiDraftProvider {
  async generateDraft(params: GenerateAiDraftParams): Promise<AiDraftResult> {
    if (params.segments.length === 0) {
      return {
        status: 'FAILED',
        message: 'Không tìm thấy học liệu đã xử lý (PROCESSED) để làm cơ sở trích dẫn cho câu hỏi',
        questions: [],
      };
    }

    // Default provider when no external LLM integration is active
    return {
      status: 'UNAVAILABLE',
      message: 'Dịch vụ AI tạo câu hỏi hiện chưa được kích hoạt trong môi trường này',
      questions: [],
    };
  }
}

export let aiDraftProvider: ActivityAiDraftProvider = new DefaultActivityAiDraftProvider();

export function setAiDraftProvider(provider: ActivityAiDraftProvider): void {
  aiDraftProvider = provider;
}
