import { z } from 'zod';

export const ReceiptReadabilityStatusSchema = z.enum([
  'readable',
  'partially_readable',
  'unreadable',
]);

export type ReceiptReadabilityStatus = z.infer<typeof ReceiptReadabilityStatusSchema>;

export const ReceiptItemSchema = z.object({
  name: z.string().min(1, 'Item name must not be empty'),
  quantity: z.number().positive('Quantity must be positive').default(1),
  amount: z.number().nonnegative('Item amount must be non-negative'),
});

export type ReceiptItem = z.infer<typeof ReceiptItemSchema>;

export const AiReceiptExtractionSchema = z.object({
  status: ReceiptReadabilityStatusSchema,
  transactionDate: z.string().nullable().optional(),
  merchant: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  totalAmount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  items: z.array(ReceiptItemSchema).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type AiReceiptExtraction = z.infer<typeof AiReceiptExtractionSchema>;

export const ValidatedTransactionSchema = z.object({
  status: z.enum(['readable', 'partially_readable']),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  merchant: z.string().min(1, 'Merchant is required'),
  category: z.string().min(1, 'Category is required').default('General'),
  totalAmount: z.number().positive('Total amount must be greater than 0'),
  currency: z.string().min(1, 'Currency is required').default('IDR'),
  paymentMethod: z.string().nullable().optional(),
  items: z.array(ReceiptItemSchema).default([]),
  notes: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  telegramMessageId: z.number().optional(),
  telegramChatId: z.number().optional(),
  receiptHash: z.string().optional(),
});

export type ValidatedTransaction = z.infer<typeof ValidatedTransactionSchema>;
