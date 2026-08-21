import { google } from 'googleapis';
import { StorageService } from './types';
import { ValidatedTransaction } from '../receipts/schema';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
}

export const SHEETS_HEADER = [
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
];

export function formatTransactionRow(tx: ValidatedTransaction): (string | number)[] {
  const itemsText =
    tx.items && tx.items.length > 0
      ? tx.items.map((i) => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''} (${i.amount})`).join(', ')
      : '';

  return [
    tx.transactionDate,
    tx.merchant,
    tx.category,
    tx.totalAmount,
    tx.currency,
    tx.paymentMethod || '',
    itemsText,
    tx.notes || '',
    tx.status,
    tx.createdAt || new Date().toISOString(),
  ];
}

export class GoogleSheetsStorage implements StorageService {
  public name = 'google-sheets';
  private spreadsheetId: string;
  private clientEmail: string;
  private privateKey: string;

  constructor(config: GoogleSheetsConfig) {
    this.spreadsheetId = config.spreadsheetId;
    this.clientEmail = config.clientEmail;
    // Normalize newlines in private key
    this.privateKey = config.privateKey.includes('\\n')
      ? config.privateKey.replace(/\\n/g, '\n')
      : config.privateKey;
  }

  private getSheetsClient() {
    const auth = new google.auth.JWT({
      email: this.clientEmail,
      key: this.privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  }

  async ensureHeadersExist(): Promise<void> {
    try {
      const sheets = this.getSheetsClient();
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet2!A1:J1',
      });

      const rows = res.data.values;
      if (!rows || rows.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Sheet2!A1:J1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [SHEETS_HEADER],
          },
        });
        console.log('Successfully initialized Google Sheets header row in Sheet2.');
      }
    } catch (err) {
      console.warn('Could not verify/initialize Google Sheets header row in Sheet2:', err);
    }
  }

  async saveTransaction(transaction: ValidatedTransaction): Promise<void> {
    const sheets = this.getSheetsClient();

    // Ensure header row exists prior to appending data
    await this.ensureHeadersExist();

    const rowData = formatTransactionRow(transaction);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Sheet2!A:J',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData],
      },
    });

    if (response.status !== 200) {
      throw new Error(`Google Sheets API append failed with status code ${response.status}`);
    }
  }
}
