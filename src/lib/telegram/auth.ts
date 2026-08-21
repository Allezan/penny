import { Context, MiddlewareFn } from 'telegraf';
import { getEnv } from '../config/env';

/**
 * Safely parses comma-separated Telegram User IDs from raw string.
 * Ignores malformed/non-numeric strings and returns empty Set if empty/missing (fail-closed).
 */
export function parseAllowedUserIds(raw?: string): Set<number> {
  const allowedSet = new Set<number>();
  if (!raw || typeof raw !== 'string') {
    return allowedSet;
  }

  const cleanedRaw = raw.trim().replace(/^["']|["']$/g, '');
  if (!cleanedRaw) {
    return allowedSet;
  }

  const parts = cleanedRaw.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    // Validate purely numeric positive user IDs
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (Number.isFinite(num) && num > 0) {
        allowedSet.add(num);
      }
    }
  }

  return allowedSet;
}

/**
 * Checks if a given Telegram User ID is explicitly authorized.
 * Fail-Closed: If allowlist is missing, empty, or contains no valid IDs, returns false for everyone.
 */
export function isUserAuthorized(userId?: number, rawAllowlist?: string): boolean {
  if (userId === undefined || userId === null || typeof userId !== 'number' || !Number.isFinite(userId) || userId <= 0) {
    return false;
  }

  const rawEnv = rawAllowlist !== undefined ? rawAllowlist : (process.env.TELEGRAM_ALLOWED_USER_IDS || '');
  const allowedSet = parseAllowedUserIds(rawEnv);

  // Fail-closed default: if set is empty, nobody is authorized
  if (allowedSet.size === 0) {
    return false;
  }

  return allowedSet.has(userId);
}

/**
 * Telegraf middleware enforcing early user authorization.
 * Stops execution before downloading images, calling AI providers, or writing to storage.
 */
export const telegramAuthMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  const userId = ctx.from?.id;

  if (!isUserAuthorized(userId)) {
    console.warn('Unauthorized Telegram user rejected');
    await ctx.reply('🔒 Penny is currently private.');
    return;
  }

  await next();
};
