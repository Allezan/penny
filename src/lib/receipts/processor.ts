import { getEnv } from '../config/env';
import { getAiVisionProvider } from '../ai/provider';
import { AiVisionProvider } from '../ai/types';
import { validateReceipt } from '../validation/validator';
import { StorageService } from '../storage/types';
import { GoogleSheetsStorage } from '../storage/google-sheets';
import { globalDedupe, DuplicateProtection } from '../telegram/dedupe';
import {
  formatSuccessConfirmation,
  formatUnreadableMessage,
  formatPartiallyReadableMessage,
  formatDuplicateMessage,
  formatErrorMessage,
} from '../telegram/formatter';
import { ValidatedTransaction } from './schema';

export interface ProcessReceiptOptions {
  aiProvider?: AiVisionProvider;
  storageService?: StorageService;
  dedupe?: DuplicateProtection;
  caption?: string;
}

export type ProcessReceiptResult =
  | { status: 'success'; message: string; transaction: ValidatedTransaction }
  | { status: 'partially_readable'; message: string; transaction?: Partial<ValidatedTransaction> }
  | { status: 'unreadable'; message: string }
  | { status: 'duplicate'; message: string }
  | { status: 'error'; message: string };

export async function processReceiptImage(
  imageBuffer: Buffer,
  mimeType: string,
  chatId: number,
  messageId: number,
  options?: ProcessReceiptOptions
): Promise<ProcessReceiptResult> {
  const dedupe = options?.dedupe || globalDedupe;
  const dedupeKey = dedupe.generateKey(chatId, messageId, imageBuffer);

  // Step 1: Duplicate check
  if (dedupe.isDuplicate(dedupeKey)) {
    return {
      status: 'duplicate',
      message: formatDuplicateMessage(),
    };
  }

  try {
    const env = getEnv();

    // Step 2: Initialize Services
    const aiProvider =
      options?.aiProvider || getAiVisionProvider(env.AI_PROVIDER, env.AI_API_KEY);

    const storageService =
      options?.storageService ||
      new GoogleSheetsStorage({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        clientEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: env.GOOGLE_PRIVATE_KEY,
      });

    // Step 3: Run AI Extraction with optional caption context
    const rawExtraction = await aiProvider.extractReceipt({
      buffer: imageBuffer,
      mimeType,
      caption: options?.caption,
    });

    // Step 4: Deterministic Business Validation
    const validation = validateReceipt(rawExtraction);

    if (!validation.success) {
      if (validation.requiresUserConfirmation) {
        return {
          status: 'partially_readable',
          message: formatPartiallyReadableMessage({
            merchant: validation.partiallyReadableData?.merchant,
            totalAmount: validation.partiallyReadableData?.totalAmount,
            currency: validation.partiallyReadableData?.currency,
            reason: validation.error,
          }),
          transaction: validation.partiallyReadableData,
        };
      }

      return {
        status: 'unreadable',
        message: formatUnreadableMessage(validation.error),
      };
    }

    const transaction = validation.transaction;
    transaction.telegramChatId = chatId;
    transaction.telegramMessageId = messageId;
    if (options?.caption && !transaction.notes) {
      transaction.notes = `Note: ${options.caption}`;
    }

    // Handle partially_readable status if flagged by validator
    if (transaction.status === 'partially_readable') {
      return {
        status: 'partially_readable',
        message: formatPartiallyReadableMessage({
          merchant: transaction.merchant,
          totalAmount: transaction.totalAmount,
          currency: transaction.currency,
          reason: 'Some details (e.g. date or line items) were uncertain.',
        }),
        transaction,
      };
    }

    // Step 5: Persist to Google Sheets
    await storageService.saveTransaction(transaction);

    // Register successful processing in dedupe cache
    dedupe.register(dedupeKey);

    // Step 6: Confirmation Message
    return {
      status: 'success',
      message: formatSuccessConfirmation(transaction),
      transaction,
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('Error processing receipt image:', errMessage);
    return {
      status: 'error',
      message: formatErrorMessage(errMessage),
    };
  }
}

export async function processReceiptText(
  userText: string,
  chatId: number,
  messageId: number,
  options?: ProcessReceiptOptions
): Promise<ProcessReceiptResult> {
  const dedupe = options?.dedupe || globalDedupe;
  const dedupeKey = dedupe.generateKey(chatId, messageId);

  if (dedupe.isDuplicate(dedupeKey)) {
    return {
      status: 'duplicate',
      message: formatDuplicateMessage(),
    };
  }

  try {
    const env = getEnv();

    const aiProvider =
      options?.aiProvider || getAiVisionProvider(env.AI_PROVIDER, env.AI_API_KEY);

    const storageService =
      options?.storageService ||
      new GoogleSheetsStorage({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        clientEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: env.GOOGLE_PRIVATE_KEY,
      });

    // Step 1: Run AI Text Extraction
    const rawExtraction = await aiProvider.extractReceiptFromText(userText);

    // Step 2: Deterministic Business Validation
    const validation = validateReceipt(rawExtraction);

    if (!validation.success) {
      if (validation.requiresUserConfirmation) {
        return {
          status: 'partially_readable',
          message: formatPartiallyReadableMessage({
            merchant: validation.partiallyReadableData?.merchant,
            totalAmount: validation.partiallyReadableData?.totalAmount,
            currency: validation.partiallyReadableData?.currency,
            reason: validation.error,
          }),
          transaction: validation.partiallyReadableData,
        };
      }

      return {
        status: 'unreadable',
        message: formatUnreadableMessage('Could not extract expense details from text'),
      };
    }

    const transaction = validation.transaction;
    transaction.telegramChatId = chatId;
    transaction.telegramMessageId = messageId;
    if (!transaction.notes) {
      transaction.notes = `Text input: "${userText}"`;
    }

    // Step 3: Persist to Google Sheets
    await storageService.saveTransaction(transaction);

    // Register dedupe key
    dedupe.register(dedupeKey);

    return {
      status: 'success',
      message: formatSuccessConfirmation(transaction),
      transaction,
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('Error processing receipt text:', errMessage);
    return {
      status: 'error',
      message: formatErrorMessage(errMessage),
    };
  }
}
