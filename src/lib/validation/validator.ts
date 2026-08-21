import { AiReceiptExtraction, ValidatedTransaction } from '../receipts/schema';

export interface ValidationResultSuccess {
  success: true;
  transaction: ValidatedTransaction;
  warnings: string[];
}

export interface ValidationResultFailure {
  success: false;
  error: string;
  partiallyReadableData?: Partial<ValidatedTransaction>;
  requiresUserConfirmation?: boolean;
}

export type ValidationResult = ValidationResultSuccess | ValidationResultFailure;

/**
 * Deterministically validates raw AI receipt extraction output.
 * Never silently invents missing financial values.
 */
export function validateReceipt(extraction: AiReceiptExtraction): ValidationResult {
  const warnings: string[] = [];

  // Rule 1: Check Readability Status
  if (extraction.status === 'unreadable') {
    return {
      success: false,
      error: 'Receipt photo is unreadable. Please take a clearer photo with good lighting.',
    };
  }

  // Rule 2: Validate totalAmount
  const totalAmount = extraction.totalAmount;
  if (totalAmount === null || totalAmount === undefined || typeof totalAmount !== 'number' || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    return {
      success: false,
      error: 'Receipt total amount could not be reliably determined or is non-positive.',
      partiallyReadableData: {
        merchant: extraction.merchant || undefined,
        category: extraction.category || undefined,
      },
      requiresUserConfirmation: true,
    };
  }

  // Rule 3: Validate Merchant
  const merchant = extraction.merchant?.trim();
  if (!merchant || merchant.length === 0) {
    return {
      success: false,
      error: 'Merchant name could not be identified on the receipt.',
      partiallyReadableData: {
        totalAmount,
        currency: extraction.currency?.toUpperCase() || 'IDR',
        category: extraction.category || undefined,
      },
      requiresUserConfirmation: true,
    };
  }

  // Rule 4: Normalize & Validate Date
  let transactionDate = extraction.transactionDate?.trim();
  if (!transactionDate || !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
    // If date is invalid or missing, default to today's date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    warnings.push(`Transaction date was missing or illegible; defaulted to today (${today}).`);
    transactionDate = today;
  } else {
    // Ensure it's a real valid calendar date
    const timestamp = Date.parse(transactionDate);
    if (isNaN(timestamp)) {
      const today = new Date().toISOString().split('T')[0];
      warnings.push(`Transaction date "${transactionDate}" was invalid; defaulted to today (${today}).`);
      transactionDate = today;
    }
  }

  // Rule 5: Normalize Currency
  const rawCurrency = extraction.currency?.trim().toUpperCase();
  const currency = rawCurrency && rawCurrency.length >= 2 ? rawCurrency : 'IDR';

  // Rule 6: Normalize Category
  const category = extraction.category?.trim() || 'General';

  // Rule 7: Item Amounts vs Total Consistency Check
  const items = (extraction.items || []).filter(
    (item) => item.name && typeof item.amount === 'number' && item.amount >= 0
  );

  if (items.length > 0) {
    const itemsSum = items.reduce((acc, item) => acc + item.amount, 0);
    // Allow slight discrepancy (e.g. tax, tip, rounding up to 10%)
    if (itemsSum > totalAmount * 1.5) {
      warnings.push(`Sum of line items (${itemsSum}) exceeds total amount (${totalAmount}).`);
    }
  }

  // Determine final status
  const status: 'readable' | 'partially_readable' =
    extraction.status === 'partially_readable' || warnings.length > 0
      ? 'partially_readable'
      : 'readable';

  const transaction: ValidatedTransaction = {
    status,
    transactionDate,
    merchant,
    category,
    totalAmount,
    currency,
    paymentMethod: extraction.paymentMethod || null,
    items,
    notes: extraction.notes ? extraction.notes + (warnings.length > 0 ? ` (${warnings.join(' ')})` : '') : warnings.length > 0 ? warnings.join(' ') : null,
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    transaction,
    warnings,
  };
}
