export type CriteriaSuggestionStatus = 'READY' | 'UNAVAILABLE' | 'FAILED';

export type NotebookCriteriaSuggestionResult = {
  status: CriteriaSuggestionStatus;
  message?: string;
  criteria: Array<{ content: string }>;
};

export type NotebookCriteriaSuggestionParams = {
  images: Array<{ buffer: Buffer; mimeType: string }>;
};

export interface NotebookCriteriaSuggestionProvider {
  suggestCriteria(params: NotebookCriteriaSuggestionParams): Promise<NotebookCriteriaSuggestionResult>;
}

export class DefaultNotebookCriteriaSuggestionProvider implements NotebookCriteriaSuggestionProvider {
  async suggestCriteria(_params: NotebookCriteriaSuggestionParams): Promise<NotebookCriteriaSuggestionResult> {
    return {
      status: 'UNAVAILABLE',
      message: 'Dịch vụ AI gợi ý tiêu chí hiện chưa được kích hoạt trong môi trường này',
      criteria: [],
    };
  }
}

export let notebookCriteriaSuggestionProvider: NotebookCriteriaSuggestionProvider =
  new DefaultNotebookCriteriaSuggestionProvider();

export function setNotebookCriteriaSuggestionProvider(provider: NotebookCriteriaSuggestionProvider): void {
  notebookCriteriaSuggestionProvider = provider;
}
