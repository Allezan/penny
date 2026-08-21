import { describe, it, expect } from 'vitest';
import { validateReceipt } from '../src/lib/validation/validator';
import { AiReceiptExtraction } from '../src/lib/receipts/schema';

describe('Business Validator', () => {
  it('returns success for a completely valid readable receipt extraction', () => {
    const extraction: AiReceiptExtraction = {
      status: 'readable',
      transactionDate: '2026-08-21',
      merchant: 'Tasty Diner',
      category: 'Food & Beverage',
      totalAmount: 75000,
      currency: 'IDR',
      paymentMethod: 'Cash',
      items: [{ name: 'Burger', quantity: 1, amount: 75000 }],
      notes: null,
    };

    const result = validateReceipt(extraction);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transaction.merchant).toBe('Tasty Diner');
      expect(result.transaction.totalAmount).toBe(75000);
      expect(result.transaction.transactionDate).toBe('2026-08-21');
      expect(result.transaction.currency).toBe('IDR');
    }
  });

  it('fails validation when status is unreadable', () => {
    const extraction: AiReceiptExtraction = {
      status: 'unreadable',
      merchant: null,
      totalAmount: null,
    };

    const result = validateReceipt(extraction);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('unreadable');
    }
  });

  it('flags missing totalAmount as requiring user confirmation', () => {
    const extraction: AiReceiptExtraction = {
      status: 'readable',
      merchant: 'Coffee Shop',
      totalAmount: null, // missing total
      currency: 'IDR',
    };

    const result = validateReceipt(extraction);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.requiresUserConfirmation).toBe(true);
      expect(result.error).toContain('total amount');
    }
  });

  it('flags missing merchant name', () => {
    const extraction: AiReceiptExtraction = {
      status: 'readable',
      merchant: '', // empty merchant
      totalAmount: 50000,
      currency: 'IDR',
    };

    const result = validateReceipt(extraction);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.requiresUserConfirmation).toBe(true);
      expect(result.error).toContain('Merchant');
    }
  });

  it('normalizes missing date to current YYYY-MM-DD date with a warning', () => {
    const extraction: AiReceiptExtraction = {
      status: 'readable',
      transactionDate: null, // missing date
      merchant: 'Gas Station',
      totalAmount: 120000,
      currency: 'IDR',
    };

    const result = validateReceipt(extraction);
    expect(result.success).toBe(true);
    if (result.success) {
      const today = new Date().toISOString().split('T')[0];
      expect(result.transaction.transactionDate).toBe(today);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.transaction.status).toBe('partially_readable');
    }
  });

  it('upper-cases currency code and defaults missing category to General', () => {
    const extraction: AiReceiptExtraction = {
      status: 'readable',
      transactionDate: '2026-08-21',
      merchant: 'Bookstore',
      totalAmount: 30,
      currency: 'usd', // lowercase
      category: null,
    };

    const result = validateReceipt(extraction);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transaction.currency).toBe('USD');
      expect(result.transaction.category).toBe('General');
    }
  });
});
