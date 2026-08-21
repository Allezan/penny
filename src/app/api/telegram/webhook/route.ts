import { NextRequest, NextResponse } from 'next/server';
import { getBot } from '@/lib/telegram/bot';
import { getEnv } from '@/lib/config/env';

export async function POST(req: NextRequest) {
  try {
    const env = getEnv();

    // Verify Telegram Secret Token Header if configured
    if (env.TELEGRAM_WEBHOOK_SECRET && env.TELEGRAM_WEBHOOK_SECRET !== 'penny_default_webhook_secret') {
      const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token')?.trim();
      // Strip any surrounding double or single quotes that may have been pasted into Vercel UI
      const expectedSecret = env.TELEGRAM_WEBHOOK_SECRET.trim().replace(/^["']|["']$/g, '');
      
      if (incomingSecret !== expectedSecret) {
        console.warn(`Unauthorized webhook request: secret token mismatch. Got "${incomingSecret}", expected "${expectedSecret}"`);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    }

    // Process update through Telegraf bot instance asynchronously
    // Returning 200 OK immediately prevents Telegram webhook timeouts and duplicate retries
    const bot = getBot();
    bot.handleUpdate(body).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error in background update processing:', message);
    });

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
