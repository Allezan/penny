import { ValidatedTransaction } from '../receipts/schema';

export interface StorageService {
  name: string;
  saveTransaction(transaction: ValidatedTransaction): Promise<void>;
}
