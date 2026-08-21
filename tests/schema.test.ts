import { describe, it, expect } from 'vitest';
import { AiReceiptExtractionSchema, ValidatedTransactionSchema } from '../src/lib/receipts/schema';

describe('Zod Receipt Schemas', () => {
  it('validates a correct AI receipt extraction payload', () => {
    const validRaw = {
      status: 'readable',
      transactionDate: '2026-08-21',
      merchant: 'Example Cafe',
      category: 'Food & Beverage',
      totalAmount: 50000,
      currency: 'IDR',
      paymentMethod: 'QRIS',
      items: [{ name: 'Latte', quantity: 1, amount: 50000 }],
      notes: 'All items legible',
    };

    const parsed = AiReceiptExtractionSchema.safeParse(validRaw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.merchant).toBe('Example Cafe');
      expect(parsed.data.totalAmount).toBe(50000);
    }
  });

  it('rejects an invalid readability status in AI extraction', () => {
    const invalidStatus = {
      status: 'super_clear', // invalid enum
      totalAmount: 1000,
    };

    const parsed = AiReceiptExtractionSchema.safeParse(invalidStatus);
    expect(parsed.success).toBe(false);
  });

  it('validates a complete ValidatedTransaction', () => {
    const validTx = {
      status: 'readable' as const,
      transactionDate: '2026-08-21',
      merchant: 'Supermarket XYZ',
      category: 'Groceries',
      totalAmount: 150000,
      currency: 'IDR',
      paymentMethod: 'Debit Card',
      items: [{ name: 'Milk', quantity: 2, amount: 40000 }],
      notes: null,
    };

    const parsed = ValidatedTransactionSchema.safeParse(validTx);
    expect(parsed.success).toBe(true);
  });

  it('rejects a non-positive total amount in ValidatedTransaction', () => {
    const invalidTx = {
      status: 'readable' as const,
      transactionDate: '2026-08-21',
      merchant: 'Supermarket XYZ',
      category: 'Groceries',
      totalAmount: -500, // Invalid
      currency: 'IDR',
    };

    const parsed = ValidatedTransactionSchema.safeParse(invalidTx);
    expect(parsed.success).toBe(false);
  });

  it('rejects an invalid transaction date format', () => {
    const invalidDateTx = {
      status: 'readable' as const,
      transactionDate: '21/08/2026', // Not YYYY-MM-DD
      merchant: 'Store',
      totalAmount: 100,
      currency: 'USD',
    };

    const parsed = ValidatedTransactionSchema.safeParse(invalidDateTx);
    expect(parsed.success).toBe(false);
  });
});
