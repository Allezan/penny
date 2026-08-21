import { ValidatedTransaction } from '../receipts/schema';

export function formatCurrencyAmount(amount: number, currency = 'IDR'): string {
  const rounded = Math.round(amount * 100) / 100;
  if (currency.toUpperCase() === 'IDR') {
    return `Rp${rounded.toLocaleString('id-ID')}`;
  }
  if (currency.toUpperCase() === 'USD') {
    return `$${rounded.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
  return `${currency.toUpperCase()} ${rounded.toLocaleString()}`;
}

export function formatDateString(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getUTCDate();
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

export function formatStartMessage(): string {
  return `👋 Hi! I'm Penny.

Send me a photo of your receipt and I'll extract the transaction and record it for you.

Just:
📸 Take a photo
📤 Send it here
💰 I'll handle the rest.`;
}

export function formatSuccessConfirmation(tx: ValidatedTransaction): string {
  const formattedAmount = formatCurrencyAmount(tx.totalAmount, tx.currency);
  const formattedDate = formatDateString(tx.transactionDate);

  let msg = `✅ Transaction recorded\n\n`;
  msg += `☕ ${tx.merchant}\n`;
  msg += `💰 ${formattedAmount}\n`;
  msg += `📂 ${tx.category}\n`;
  msg += `📅 ${formattedDate}`;

  if (tx.notes) {
    msg += `\n📝 ${tx.notes}`;
  }

  return msg;
}

export function formatUnreadableMessage(reason?: string): string {
  let msg = `⚠️ I couldn't read the receipt reliably.`;
  if (reason) {
    msg += ` (${reason})`;
  }
  msg += `\n\nPlease take another photo with:\n`;
  msg += `• better lighting\n`;
  msg += `• the full receipt visible\n`;
  msg += `• text in focus\n\n`;
  msg += `Send the photo again.`;
  return msg;
}

export function formatPartiallyReadableMessage(details: { merchant?: string; totalAmount?: number; currency?: string; reason?: string }): string {
  let msg = `⚠️ Some information on the receipt was unclear.\n\n`;
  if (details.merchant) {
    msg += `Merchant: ${details.merchant}\n`;
  }
  if (details.totalAmount) {
    msg += `Amount: ${formatCurrencyAmount(details.totalAmount, details.currency || 'IDR')}\n`;
  }
  if (details.reason) {
    msg += `Issue: ${details.reason}\n`;
  }
  msg += `\nPlease send a clearer photo of the receipt to record this transaction accurately.`;
  return msg;
}

export function formatDuplicateMessage(): string {
  return `ℹ️ This receipt photo was already processed.`;
}

export function formatUnsupportedMessage(): string {
  return `ℹ️ Penny accepts receipt photos. Please send a photo of your receipt!`;
}

export function formatErrorMessage(errMessage?: string): string {
  console.error('Penny error detail:', errMessage);
  return `⚠️ An error occurred while processing your receipt. Please try again in a moment.`;
}
