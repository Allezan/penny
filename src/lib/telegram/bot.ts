import { Telegraf } from 'telegraf';
import { getEnv } from '../config/env';
import { processReceiptImage, processReceiptText } from '../receipts/processor';
import { telegramAuthMiddleware } from './auth';
import {
  formatStartMessage,
  formatErrorMessage,
} from './formatter';

export function createTelegramBot(token?: string): Telegraf {
  const botToken = token || getEnv().TELEGRAM_BOT_TOKEN;
  const bot = new Telegraf(botToken);

  // Centralized Security Middleware: Authorize all updates early
  bot.use(telegramAuthMiddleware);

  // Command /start
  bot.start(async (ctx) => {
    await ctx.reply(formatStartMessage());
  });

  // Handle Receipt Photo Submissions (with optional captions)
  bot.on('photo', async (ctx) => {
    try {
      const photos = ctx.message.photo;
      if (!photos || photos.length === 0) {
        await ctx.reply('ℹ️ Please send a photo of your receipt.');
        return;
      }

      // Identify highest resolution photo (last element in array)
      const highestResPhoto = photos[photos.length - 1];
      const fileId = highestResPhoto.file_id;
      const chatId = ctx.chat.id;
      const messageId = ctx.message.message_id;
      const caption = ctx.message.caption?.trim();

      // Send initial processing status message
      await ctx.reply('⏳ Reading receipt photo...');

      // Retrieve file download link from Telegram API
      const fileUrl = await ctx.telegram.getFileLink(fileId);

      // Download photo bytes
      const response = await fetch(fileUrl.href);
      if (!response.ok) {
        throw new Error(`Failed to download image from Telegram: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Determine MIME type (default to image/jpeg)
      const mimeType = fileUrl.pathname.endsWith('.png') ? 'image/png' : 'image/jpeg';

      // Process receipt image through processor orchestrator
      const result = await processReceiptImage(
        imageBuffer,
        mimeType,
        chatId,
        messageId,
        { caption }
      );

      // Send result back to user
      await ctx.reply(result.message);
    } catch (err: unknown) {
      const errDetail = err instanceof Error ? err.message : String(err);
      console.error('Error in Telegram photo handler:', errDetail);
      await ctx.reply(formatErrorMessage(errDetail));
    }
  });

  // Handle Text Messages (e.g. "kiw bensin 10rb" or "nasi padang 25k")
  bot.on('text', async (ctx) => {
    const text = ctx.message.text?.trim();

    // Ignore commands (starts with /)
    if (!text || text.startsWith('/')) {
      return;
    }

    try {
      const chatId = ctx.chat.id;
      const messageId = ctx.message.message_id;

      await ctx.reply('⏳ Processing expense note...');

      const result = await processReceiptText(text, chatId, messageId);

      await ctx.reply(result.message);
    } catch (err: unknown) {
      const errDetail = err instanceof Error ? err.message : String(err);
      console.error('Error in Telegram text handler:', errDetail);
      await ctx.reply(formatErrorMessage(errDetail));
    }
  });

  // Handle other unsupported content (stickers, audio, documents, etc.)
  bot.on('message', async (ctx) => {
    await ctx.reply('ℹ️ Penny accepts receipt photos or text expense notes (e.g. "bensin 10rb").');
  });

  return bot;
}

let cachedBot: Telegraf | null = null;

export function getBot(): Telegraf {
  if (!cachedBot) {
    cachedBot = createTelegramBot();
  }
  return cachedBot;
}
