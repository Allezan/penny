import { AiReceiptExtraction } from '../receipts/schema';

export interface ImageInput {
  buffer: Buffer;
  mimeType: string;
  caption?: string;
}

export interface AiVisionProvider {
  name: string;
  extractReceipt(image: ImageInput): Promise<AiReceiptExtraction>;
  extractReceiptFromText(text: string): Promise<AiReceiptExtraction>;
}
