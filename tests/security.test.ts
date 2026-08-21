import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseAllowedUserIds, isUserAuthorized, telegramAuthMiddleware } from '../src/lib/telegram/auth';
import { POST } from '../src/app/api/telegram/webhook/route';
import { NextRequest } from 'next/server';
import * as botModule from '../src/lib/telegram/bot';

describe('Penny Security Suite', () => {
  const validSecret = 'secure_secret_token_98765';

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'mock_bot_token';
    process.env.TELEGRAM_WEBHOOK_SECRET = validSecret;
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'mock@email.com';
    process.env.GOOGLE_PRIVATE_KEY = 'mock_key';
    process.env.GOOGLE_SHEETS_ID = 'mock_sheet_id';
    process.env.AI_API_KEY = 'mock_ai_key';
    process.env.TELEGRAM_ALLOWED_USER_IDS = '123456789';

    // Mock bot.handleUpdate to resolve cleanly without actual Telegram API calls
    const mockBot = {
      handleUpdate: vi.fn().mockResolvedValue(undefined),
    } as any;

    vi.spyOn(botModule, 'getBot').mockReturnValue(mockBot);
  });

  describe('User ID Allowlist Authorization', () => {
    it('Test 1 — Authorized user (ID 123456789 with TELEGRAM_ALLOWED_USER_IDS=123456789)', () => {
      const isAuth = isUserAuthorized(123456789, '123456789');
      expect(isAuth).toBe(true);
    });

    it('Test 2 — Unauthorized user (ID 999999999 with TELEGRAM_ALLOWED_USER_IDS=123456789)', async () => {
      const isAuth = isUserAuthorized(999999999, '123456789');
      expect(isAuth).toBe(false);

      // Verify Middleware Rejection
      const replyMock = vi.fn();
      const nextMock = vi.fn();
      const mockCtx = {
        from: { id: 999999999 },
        reply: replyMock,
      } as any;

      process.env.TELEGRAM_ALLOWED_USER_IDS = '123456789';
      await telegramAuthMiddleware(mockCtx, nextMock);

      expect(replyMock).toHaveBeenCalledWith('🔒 Penny is currently private.');
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('Test 3 — Multiple authorized users (TELEGRAM_ALLOWED_USER_IDS=123456789,987654321)', () => {
      const allowlist = '123456789,987654321';
      expect(isUserAuthorized(123456789, allowlist)).toBe(true);
      expect(isUserAuthorized(987654321, allowlist)).toBe(true);
      expect(isUserAuthorized(555555555, allowlist)).toBe(false);
    });

    it('Test 4 — Missing allowlist (TELEGRAM_ALLOWED_USER_IDS="") -> Fail Closed', () => {
      const isAuth = isUserAuthorized(123456789, '');
      expect(isAuth).toBe(false);
    });

    it('Test 5 — Missing allowlist variable (TELEGRAM_ALLOWED_USER_IDS=undefined) -> Fail Closed', () => {
      delete process.env.TELEGRAM_ALLOWED_USER_IDS;
      const isAuth = isUserAuthorized(123456789, undefined);
      expect(isAuth).toBe(false);
    });

    it('Test 6 — Invalid Telegram User ID (TELEGRAM_ALLOWED_USER_IDS=hello,abc,123456789)', () => {
      const allowlist = 'hello,abc,123456789';
      const set = parseAllowedUserIds(allowlist);

      expect(set.size).toBe(1);
      expect(set.has(123456789)).toBe(true);
      expect(isUserAuthorized(123456789, allowlist)).toBe(true);
      expect(isUserAuthorized(123, allowlist)).toBe(false);
    });
  });

  describe('Telegram Webhook Secret Verification', () => {
    it('Test 7 — Valid webhook secret -> Request accepted (200 OK)', async () => {
      const req = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-telegram-bot-api-secret-token': validSecret,
        },
        body: JSON.stringify({ update_id: 100 }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it('Test 8 — Invalid webhook secret -> Request rejected (401 Unauthorized)', async () => {
      const req = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-telegram-bot-api-secret-token': 'wrong_secret_123',
        },
        body: JSON.stringify({ update_id: 100 }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('Test 9 — Missing webhook secret -> Request rejected (401 Unauthorized)', async () => {
      const req = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ update_id: 100 }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });
  });
});
