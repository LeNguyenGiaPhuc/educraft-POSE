export interface ProcessedSegment {
  positionType: 'PAGE' | 'SLIDE' | 'PARAGRAPH' | 'IMAGE';
  positionIndex: number;
  positionLabel: string;
  ordinal: number;
  content: string;
}

export interface ProcessedMaterialResult {
  status: 'PROCESSED' | 'FAILED' | 'PENDING';
  segments?: ProcessedSegment[];
  error?: string;
}

export interface AiProcessingProvider {
  process(params: {
    materialVersionId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<ProcessedMaterialResult>;
}

export class DefaultAiProcessingProvider implements AiProcessingProvider {
  async process(_params: {
    materialVersionId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<ProcessedMaterialResult> {
    // In production without external AI keys, returns explicit PENDING state.
    // Deterministic fake processing is only enabled in specific test harnesses.
    return {
      status: 'PENDING',
    };
  }
}

let activeAiProcessingProvider: AiProcessingProvider = new DefaultAiProcessingProvider();

// Keep one stable object so existing services and tests can use the same provider contract.
// The app swaps the implementation at startup when AI_PROVIDER=gemini.
export const defaultAiProcessingProvider: AiProcessingProvider = {
  process(params) {
    return activeAiProcessingProvider.process(params);
  },
};

export function setAiProcessingProvider(provider: AiProcessingProvider): void {
  activeAiProcessingProvider = provider;
}
