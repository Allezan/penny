import crypto from 'crypto';

interface DedupeEntry {
  key: string;
  timestamp: number;
}

export class DuplicateProtection {
  private cache: Map<string, DedupeEntry> = new Map();
  private ttlMs: number;

  constructor(ttlMinutes = 60) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Generates a unique fingerprint for a receipt image / Telegram message
   */
  generateKey(chatId: number | string, messageId: number | string, imageBuffer?: Buffer): string {
    if (imageBuffer) {
      const hash = crypto.createHash('md5').update(imageBuffer).digest('hex');
      return `img:${hash}`;
    }
    return `msg:${chatId}:${messageId}`;
  }

  /**
   * Checks if the key has been processed recently. Returns true if duplicate.
   */
  isDuplicate(key: string): boolean {
    this.cleanup();
    const entry = this.cache.get(key);
    if (entry) {
      if (Date.now() - entry.timestamp < this.ttlMs) {
        return true;
      }
      this.cache.delete(key);
    }
    return false;
  }

  /**
   * Registers a key as processed
   */
  register(key: string): void {
    this.cache.set(key, { key, timestamp: Date.now() });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}

export const globalDedupe = new DuplicateProtection(60);
