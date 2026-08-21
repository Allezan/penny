import { describe, it, expect } from 'vitest';
import {
  formatCurrencyAmount,
  formatDateString,
  formatSuccessConfirmation,
  formatUnreadableMessage,
  formatStartMessage,
} from '../src/lib/telegram/formatter';
import { ValidatedTransaction } from '../src/lib/receipts/schema';

describe('Telegram Formatters', () => {
  it('formats IDR currency amounts correctly', () => {
    const formatted = formatCurrencyAmount(50000, 'IDR');
    expect(formatted).toContain('50.000');
    expect(formatted).toContain('Rp');
  });

  it('formats USD currency amounts correctly', () => {
    const formatted = formatCurrencyAmount(12.5, 'USD');
    expect(formatted).toBe('$12.50');
  });

  it('formats YYYY-MM-DD date strings into human-readable format', () => {
    const formatted = formatDateString('2026-08-21');
    expect(formatted).toBe('21 Aug 2026');
  });

  it('formats start message containing intro text', () => {
    const startMsg = formatStartMessage();
    expect(startMsg).toContain("Hi! I'm Penny");
    expect(startMsg).toContain('Take a photo');
  });

  it('formats success confirmation message with transaction details', () => {
    const tx: ValidatedTransaction = {
      status: 'readable',
      transactionDate: '2026-08-21',
      merchant: 'Example Cafe',
      category: 'Food & Beverage',
      totalAmount: 50000,
      currency: 'IDR',
      paymentMethod: 'Cash',
      items: [],
      notes: null,
    };

    const msg = formatSuccessConfirmation(tx);
    expect(msg).toContain('✅ Transaction recorded');
    expect(msg).toContain('☕ Example Cafe');
    expect(msg).toContain('Rp50.000');
    expect(msg).toContain('📂 Food & Beverage');
    expect(msg).toContain('📅 21 Aug 2026');
  });

  it('formats unreadable warning message with retry guidelines', () => {
    const msg = formatUnreadableMessage('Image blurry');
    expect(msg).toContain("couldn't read the receipt");
    expect(msg).toContain('better lighting');
    expect(msg).toContain('full receipt visible');
  });
});
