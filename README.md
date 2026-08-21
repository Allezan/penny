# Penny — Personal Finance Receipt-Tracking Assistant

Penny is a personal finance receipt-tracking assistant built with Next.js, TypeScript, Telegram Bot API, Google Sheets API, and AI Vision (Gemini).

Penny minimizes the friction of recording personal expenses:

> **Take a receipt photo → Send it to Telegram → Penny reads it → Validates it → Records it → Confirms it.**

---

## 🌟 Product Mission & Architecture

Penny prioritizes **financial accuracy, reliability, security, simplicity, and maintainability** over feature bloat.

### Processing Pipeline

```text
User sends photo / text note to Telegram Bot
        ↓
Webhook Secret Header Verification (401 Unauthorized if invalid)
        ↓
Telegram User ID Allowlist Check (Fail-closed: private lock if unauthorized)
        ↓
Penny retrieves receipt image / processes expense note
        ↓
AI Vision extracts structured JSON
        ↓
Deterministic Business Validation
        ↓
Google Sheets receives transaction
        ↓
Telegram sends confirmation message
```

---

## 🔒 Security Hardening

Penny enforces two layers of defense:

1. **Telegram Webhook Secret Verification**: Strictly validates the `x-telegram-bot-api-secret-token` header against `TELEGRAM_WEBHOOK_SECRET`. Invalid or missing secret tokens return `401 Unauthorized`.
2. **Telegram User ID Allowlist**: Enforces numeric User ID check via Telegraf middleware at the top of the update pipeline. If unauthorized, requests are rejected with `🔒 Penny is currently private.` **before** downloading images, invoking AI, or writing to storage.
3. **Fail-Closed Security**: If `TELEGRAM_ALLOWED_USER_IDS` is missing, empty, or contains no valid numeric IDs, **nobody is authorized**.

### How to Find Your Telegram User ID
1. Open Telegram and search for [@userinfobot](https://t.me/userinfobot) or [@raw_data_bot](https://t.me/raw_data_bot).
2. Send any message to the bot.
3. Copy the numeric `Id` returned (e.g., `123456789`).

### Configuring Allowed Users
In your `.env` (or cloud host environment variables):
```env
# Single user
TELEGRAM_ALLOWED_USER_IDS="123456789"

# Multiple users (comma-separated numeric IDs)
TELEGRAM_ALLOWED_USER_IDS="123456789,987654321"
```

---

## 🏗 Architecture Overview

```text
src/
├── app/
│   ├── api/
│   │   └── telegram/
│   │       └── webhook/
│   │           └── route.ts         # Telegram Webhook API endpoint with secret verification
│   ├── layout.tsx                   # Main layout
│   └── page.tsx                     # System status landing page
├── lib/
│   ├── ai/
│   │   ├── gemini-provider.ts       # Google Gemini Vision provider
│   │   ├── provider.ts              # Provider factory
│   │   └── types.ts                 # AI Vision interfaces
│   ├── config/
│   │   └── env.ts                   # Centralized validated environment config (Zod)
│   ├── receipts/
│   │   ├── processor.ts             # Receipt processing orchestrator
│   │   └── schema.ts                # Zod schemas (AI extraction & Transaction)
│   ├── storage/
│   │   ├── google-sheets.ts         # Google Sheets API integration & row formatting
│   │   └── types.ts                 # Storage service interface
│   ├── telegram/
│   │   ├── auth.ts                  # Security allowlist & Telegraf auth middleware
│   │   ├── bot.ts                   # Telegraf bot handlers (/start, photo, text notes)
│   │   ├── dedupe.ts                # Lightweight duplicate submission protection
│   │   └── formatter.ts             # Message formatting helpers
│   └── validation/
│       └── validator.ts             # Business rules & financial validation logic
└── types/
```

---

## 🚀 Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Telegram Account**: To create and interact with the Telegram bot
- **Google Cloud Console Account**: To set up Google Sheets API with a Service Account
- **Google Gemini API Key**: For AI vision receipt extraction

---

## ⚙️ Environment Variables Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in the required configuration parameters:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
TELEGRAM_WEBHOOK_SECRET="your_custom_webhook_secret_token"
TELEGRAM_ALLOWED_USER_IDS="123456789,987654321"

# Google Sheets Persistence
GOOGLE_SERVICE_ACCOUNT_EMAIL="penny-bot@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

# AI Vision Configuration
AI_PROVIDER="gemini"
AI_API_KEY="AIzaSyYourGeminiApiKeyHere"
```

---

## 🤖 1. Telegram Bot & Webhook Setup

1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts to create your bot.
3. Copy the HTTP API token provided by BotFather into `TELEGRAM_BOT_TOKEN`.
4. Generate a random secret string for `TELEGRAM_WEBHOOK_SECRET`.
5. Get your Telegram numeric user ID from [@userinfobot](https://t.me/userinfobot) and set `TELEGRAM_ALLOWED_USER_IDS`.
6. Register Webhook with Telegram API:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://<YOUR_DOMAIN>/api/telegram/webhook",
       "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"
     }'
   ```

---

## 📊 2. Google Sheets Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one) and enable the **Google Sheets API**.
3. Create a **Service Account** under **IAM & Admin -> Service Accounts**.
4. Generate and download a Service Account JSON Key.
5. Copy `client_email` to `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
6. Copy `private_key` to `GOOGLE_PRIVATE_KEY` (ensure `\n` line breaks are preserved).
7. Create a new Google Spreadsheet.
8. Copy the Spreadsheet ID from the URL (`https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`) to `GOOGLE_SHEETS_ID`.
9. **Share the spreadsheet** with your Service Account email (`GOOGLE_SERVICE_ACCOUNT_EMAIL`) with **Editor** permissions.

---

## 🧠 3. AI Provider Setup (Gemini)

1. Obtain a Gemini API Key from [Google AI Studio](https://aistudio.google.com/).
2. Set `AI_API_KEY` in your `.env` file.

---

## 🛠 Local Development & Testing

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run local development server:
   ```bash
   npm run dev
   ```

3. Run unit test suite:
   ```bash
   npm test
   ```

4. Run type check:
   ```bash
   npm run typecheck
   ```

5. Run linting:
   ```bash
   npm run lint
   ```

---

## 🧪 Verification & Production Build

To test and build Penny for production deployment:

```bash
# Run unit tests
npm test

# Type check
npm run typecheck

# Lint check
npm run lint

# Production build
npm run build
```

---

## ❓ Troubleshooting

- **Telegram bot replies `🔒 Penny is currently private.`**: Ensure your numeric Telegram User ID is included in `TELEGRAM_ALLOWED_USER_IDS`.
- **Webhook returns 401 Unauthorized**: Verify `x-telegram-bot-api-secret-token` matches `TELEGRAM_WEBHOOK_SECRET`.
- **Google Sheets 403 Forbidden**: Ensure the Google Sheet is shared with the Service Account email address as **Editor**.
- **AI extraction errors**: Verify `AI_API_KEY` is valid and has access to Gemini 1.5/2.5 Flash models.

---

## 📄 License

MIT
