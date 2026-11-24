export type AiAnalysisStatus = 'READY' | 'UNAVAILABLE' | 'FAILED';

export interface AiCriterionSuggestion {
  criterionId: string;
  status: 'RECORDED' | 'NEEDS_SUPPLEMENTATION' | 'UNDETERMINED';
  note?: string;
  evidence?: string;
  confidence?: number;
}

export interface AiAnalysisResult {
  status: AiAnalysisStatus;
  message?: string;
  ocrText?: string;
  suggestions?: AiCriterionSuggestion[];
}

export interface NotebookImageInput {
  buffer: Buffer;
  mimeType: string;
}

export interface AnalyzeNotebookParams {
  submissionId: string;
  referenceFiles: NotebookImageInput[];
  submissionFiles: NotebookImageInput[];
  criteria: Array<{
    id: string;
    content: string;
    orderIndex: number;
  }>;
}

export interface NotebookAiAnalysisProvider {
  analyzeSubmission(params: AnalyzeNotebookParams): Promise<AiAnalysisResult>;
}

export class DefaultNotebookAiAnalysisProvider implements NotebookAiAnalysisProvider {
  async analyzeSubmission(_params: AnalyzeNotebookParams): Promise<AiAnalysisResult> {
    // Production default: returns UNAVAILABLE safely when no external OCR/vision model is configured
    return {
      status: 'UNAVAILABLE',
      message: 'Dịch vụ phân tích ảnh vở bằng AI hiện chưa được kích hoạt trong môi trường này',
    };
  }
}

export let notebookAiProvider: NotebookAiAnalysisProvider = new DefaultNotebookAiAnalysisProvider();

export function setNotebookAiProvider(provider: NotebookAiAnalysisProvider): void {
  notebookAiProvider = provider;
}
