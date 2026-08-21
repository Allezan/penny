import { NextRequest, NextResponse } from 'next/server';
import { getBot } from '@/lib/telegram/bot';
import { getEnv } from '@/lib/config/env';

export async function POST(req: NextRequest) {
  try {
    const env = getEnv();

    // Verify Telegram Secret Token Header (Strict Security Layer)
    const configuredSecret = env.TELEGRAM_WEBHOOK_SECRET?.trim().replace(/^["']|["']$/g, '');
    const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token')?.trim();

    if (
      !configuredSecret ||
      configuredSecret === 'penny_default_webhook_secret' ||
      !incomingSecret ||
      incomingSecret !== configuredSecret
    ) {
      console.warn('Unauthorized webhook request: secret token missing or mismatch.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    }

    // Process update through Telegraf bot instance (awaited for serverless compatibility)
    const bot = getBot();
    await bot.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error handling Telegram webhook payload:', message);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Penny Telegram Webhook Active',
    timestamp: new Date().toISOString(),
  });
}
