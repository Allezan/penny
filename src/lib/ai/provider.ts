import { AiVisionProvider } from './types';
import { GeminiVisionProvider } from './gemini-provider';

export function getAiVisionProvider(providerName: string, apiKey: string): AiVisionProvider {
  switch (providerName.toLowerCase()) {
    case 'gemini':
      return new GeminiVisionProvider(apiKey);
    default:
      console.warn(`Unknown AI provider "${providerName}", defaulting to Gemini.`);
      return new GeminiVisionProvider(apiKey);
  }
}
