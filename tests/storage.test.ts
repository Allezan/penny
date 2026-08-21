import { describe, it, expect } from 'vitest';
import { formatTransactionRow, SHEETS_HEADER } from '../src/lib/storage/google-sheets';
import { ValidatedTransaction } from '../src/lib/receipts/schema';

describe('Google Sheets Storage Formatting', () => {
  it('defines 10 standard header columns', () => {
    expect(SHEETS_HEADER.length).toBe(10);
    expect(SHEETS_HEADER).toEqual([
      'Date',
      'Merchant',
      'Category',
      'Amount',
      'Currency',
      'Payment Method',
      'Items',
      'Notes',
      'Status',
      'Created At',
    ]);
  });

  it('formats a ValidatedTransaction into a 10-element row array', () => {
    const tx: ValidatedTransaction = {
      status: 'readable',
      transactionDate: '2026-08-21',
      merchant: 'Example Supermarket',
      category: 'Groceries',
      totalAmount: 125000,
      currency: 'IDR',
      paymentMethod: 'Debit Card',
      items: [
        { name: 'Apples', quantity: 2, amount: 25000 },
        { name: 'Milk', quantity: 1, amount: 100000 },
      ],
      notes: 'Weekly groceries',
      createdAt: '2026-08-21T10:00:00.000Z',
    };

    const row = formatTransactionRow(tx);
    expect(row.length).toBe(10);
    expect(row[0]).toBe('2026-08-21');
    expect(row[1]).toBe('Example Supermarket');
    expect(row[2]).toBe('Groceries');
    expect(row[3]).toBe(125000);
    expect(row[4]).toBe('IDR');
    expect(row[5]).toBe('Debit Card');
    expect(row[6]).toBe('Apples x2 (25000), Milk (100000)');
    expect(row[7]).toBe('Weekly groceries');
    expect(row[8]).toBe('readable');
    expect(row[9]).toBe('2026-08-21T10:00:00.000Z');
  });
});
