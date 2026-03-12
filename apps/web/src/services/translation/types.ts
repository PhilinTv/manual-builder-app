export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  glossary?: GlossaryEntry[];
  context?: string;
}

export interface GlossaryEntry {
  source: string;
  target: string;
}

export interface TranslationProvider {
  translate(request: TranslationRequest): AsyncIterable<string>;
  estimateTokens(text: string): number;
}
