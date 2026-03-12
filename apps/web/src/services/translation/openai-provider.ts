import OpenAI from "openai";
import type { TranslationProvider, TranslationRequest } from "./types";

export class OpenAITranslationProvider implements TranslationProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async *translate(request: TranslationRequest): AsyncIterable<string> {
    const glossaryText =
      request.glossary && request.glossary.length > 0
        ? `\n\nGlossary (use these translations consistently):\n${request.glossary
            .map((g) => `- "${g.source}" → "${g.target}"`)
            .join("\n")}`
        : "";

    const contextText = request.context
      ? `\nThis is a ${request.context} section of a product manual.`
      : "";

    const systemPrompt = `You are a professional translator. Translate the following text from ${request.sourceLanguage} to ${request.targetLanguage}.
Preserve all formatting, structure, and meaning. Only output the translated text, nothing else.${contextText}${glossaryText}`;

    const stream = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.text },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  estimateTokens(text: string): number {
    // Character-based heuristic: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
