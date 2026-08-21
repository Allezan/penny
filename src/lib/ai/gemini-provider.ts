import { AiVisionProvider, ImageInput } from './types';
import { AiReceiptExtraction, AiReceiptExtractionSchema } from '../receipts/schema';

const IMAGE_SYSTEM_PROMPT = `You are Penny's receipt analysis engine. Analyze the receipt photo provided and extract transaction information into structured JSON.

Readability classification rules:
- "readable": The receipt is clear, merchant name and total amount are easily legible.
- "partially_readable": Some fields are readable (e.g. merchant or line items), but key information like total amount or merchant is blurry or cut off.
- "unreadable": The image is too blurry, dark, cut off, or is not a receipt.

Field Extraction rules:
- status: "readable" | "partially_readable" | "unreadable"
- transactionDate: "YYYY-MM-DD" if legible, else null.
- merchant: Business/Store name if legible, else null.
- category: Standard expense category (e.g., "Food & Beverage", "Groceries", "Transport", "Shopping", "Bills & Utilities", "Health & Beauty", "Entertainment", "General").
- totalAmount: Final total amount as a positive number without currency symbols (e.g. 50000), else null.
- currency: ISO currency code if present or inferrable (e.g. "IDR", "USD", "EUR", "SGD"), else null.
- paymentMethod: e.g., "Credit Card", "Debit Card", "Cash", "QRIS", "E-Wallet", else null.
- items: Array of purchased items [{ name: string, quantity: number, amount: number }]. If line items cannot be read, return empty array [].
- notes: Any observations or user notes, else null.

IMPORTANT USER CAPTION INSTRUCTIONS:
If the user provided a caption with the image (e.g., "gua cuman spen hanya di mie goreng 1 biji" or "split bill I paid 20k"), respect the user's caption as context! Calculate totalAmount and items based on the user's specific expense indicated in the caption.

Return ONLY a valid JSON object matching this schema. Do not include markdown codeblocks or extra text.`;

const TEXT_SYSTEM_PROMPT = `You are Penny's expense extraction engine. The user sends a informal text message describing a personal expense (e.g. "kiw bensin 10rb", "makan siang nasi padang 25k", "kopi starbucks 50rb kemarin").

Extract transaction details into structured JSON:
- status: "readable" if amount and merchant/expense description are understandable, else "unreadable".
- transactionDate: "YYYY-MM-DD". Infer relative dates if mentioned (e.g., "kemarin" / "yesterday" -> subtract 1 day from today). Default to today's date if unspecified.
- merchant: The store, service, or expense item name (e.g., "Bensin", "Nasi Padang", "Starbucks").
- category: Standard expense category ("Food & Beverage", "Groceries", "Transport", "Shopping", "Bills & Utilities", "Health & Beauty", "Entertainment", "General").
- totalAmount: Positive number without currency symbols (e.g., "10rb" or "10k" -> 10000, "50rb" -> 50000).
- currency: ISO currency code (default "IDR" for Indonesian informal slang like "rb"/"k").
- paymentMethod: e.g. "Cash", "E-Wallet", "QRIS", or null.
- items: Array of items if specified, else [].
- notes: Original text note or additional context.

Return ONLY a valid JSON object matching this schema. Do not include markdown codeblocks or extra text.`;

const CANDIDATE_MODELS = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-1.5-pro',
];

export class GeminiVisionProvider implements AiVisionProvider {
  public name = 'gemini';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractReceipt(image: ImageInput): Promise<AiReceiptExtraction> {
    const base64Image = image.buffer.toString('base64');
    let promptText = IMAGE_SYSTEM_PROMPT;
    if (image.caption) {
      promptText += `\n\nUSER CAPTION CONTEXT: "${image.caption}"`;
    }

    let lastError: Error | null = null;

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.apiKey);

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
            },
          });

          const response = await model.generateContent([
            promptText,
            {
              inlineData: {
                data: base64Image,
                mimeType: image.mimeType,
              },
            },
          ]);

          const text = response.response.text();
          if (text) {
            return this.parseAndValidateJson(text);
          }
        } catch (modelErr: unknown) {
          lastError = modelErr instanceof Error ? modelErr : new Error(String(modelErr));
          console.warn(`Model ${modelName} failed or limit reached, trying next model candidate...`);
        }
      }
    } catch (err: unknown) {
      console.warn('Gemini SDK import failed, trying REST API fallback:', err);
    }

    for (const modelName of CANDIDATE_MODELS) {
      try {
        return await this.extractViaRestApi(base64Image, image.mimeType, promptText, modelName);
      } catch (restErr: unknown) {
        lastError = restErr instanceof Error ? restErr : new Error(String(restErr));
      }
    }

    throw lastError || new Error('All Gemini model candidates failed');
  }

  async extractReceiptFromText(userText: string): Promise<AiReceiptExtraction> {
    const todayISO = new Date().toISOString().split('T')[0];
    const fullPrompt = `${TEXT_SYSTEM_PROMPT}\n\nToday's Date: ${todayISO}\nUser Text Input: "${userText}"`;

    let lastError: Error | null = null;

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.apiKey);

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
            },
          });

          const response = await model.generateContent(fullPrompt);
          const text = response.response.text();
          if (text) {
            return this.parseAndValidateJson(text);
          }
        } catch (modelErr: unknown) {
          lastError = modelErr instanceof Error ? modelErr : new Error(String(modelErr));
        }
      }
    } catch (err: unknown) {
      console.warn('Gemini SDK text extraction failed, trying REST API fallback:', err);
    }

    for (const modelName of CANDIDATE_MODELS) {
      try {
        return await this.extractViaRestApiText(fullPrompt, modelName);
      } catch (restErr: unknown) {
        lastError = restErr instanceof Error ? restErr : new Error(String(restErr));
      }
    }

    throw lastError || new Error('All Gemini model candidates failed for text extraction');
  }

  private async extractViaRestApi(
    base64Image: string,
    mimeType: string,
    promptText: string,
    modelName: string
  ): Promise<AiReceiptExtraction> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini REST API error (${res.status}) for ${modelName}: ${errorText}`);
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error(`Gemini REST API returned no content for ${modelName}`);
    }

    return this.parseAndValidateJson(candidateText);
  }

  private async extractViaRestApiText(promptText: string, modelName: string): Promise<AiReceiptExtraction> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
    
    const requestBody = {
      contents: [
        {
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini REST API text error (${res.status}) for ${modelName}: ${errorText}`);
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error(`Gemini REST API returned no content for ${modelName}`);
    }

    return this.parseAndValidateJson(candidateText);
  }

  private parseAndValidateJson(rawJsonText: string): AiReceiptExtraction {
    let cleanJsonText = rawJsonText.trim();
    if (cleanJsonText.startsWith('```json')) {
      cleanJsonText = cleanJsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanJsonText.startsWith('```')) {
      cleanJsonText = cleanJsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleanJsonText);
    const validated = AiReceiptExtractionSchema.safeParse(parsed);

    if (!validated.success) {
      console.error('Failed to validate AI extraction against schema:', validated.error);
      throw new Error(`AI response invalid format: ${validated.error.message}`);
    }

    return validated.data;
  }
}
