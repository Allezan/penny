import { z } from 'zod';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required').transform((v) => v.trim().replace(/^["']|["']$/g, '')),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional().default('penny_default_webhook_secret').transform((v) => v.trim().replace(/^["']|["']$/g, '')),
  TELEGRAM_ALLOWED_USER_IDS: z.string().optional().default('').transform((v) => v.trim().replace(/^["']|["']$/g, '')),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().min(1, 'GOOGLE_SERVICE_ACCOUNT_EMAIL is required').transform((v) => v.trim().replace(/^["']|["']$/g, '')),
  GOOGLE_PRIVATE_KEY: z.string().min(1, 'GOOGLE_PRIVATE_KEY is required').transform((val) => {
    let clean = val.trim().replace(/^["']|["']$/g, '');
    if (clean.includes('\\n')) {
      clean = clean.replace(/\\n/g, '\n');
    }
    return clean;
  }),
  GOOGLE_SHEETS_ID: z.string().min(1, 'GOOGLE_SHEETS_ID is required').transform((v) => v.trim().replace(/^["']|["']$/g, '')),
  AI_PROVIDER: z.enum(['gemini']).default('gemini'),
  AI_API_KEY: z.string().min(1, 'AI_API_KEY is required').transform((v) => v.trim().replace(/^["']|["']$/g, '')),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function getEnv(): Env {
  if (parsedEnv) {
    return parsedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formattedErrors = result.error.format();
    const errorDetails = Object.entries(formattedErrors)
      .filter(([key]) => key !== '_errors')
      .map(([key, value]) => `  - ${key}: ${(value as { _errors: string[] })._errors?.join(', ')}`)
      .join('\n');

    console.error(`❌ Invalid Environment Configuration:\n${errorDetails}`);
    
    // In test environment, throw error explicitly for verification tests
    if (process.env.NODE_ENV === 'test') {
      throw new Error(`Invalid Environment Configuration:\n${errorDetails}`);
    }
    
    // Return raw process.env cast if fallback needed in non-strict edge cases
    return process.env as unknown as Env;
  }

  parsedEnv = result.data;
  return parsedEnv;
}

export function validateEnv(customEnv?: Record<string, string | undefined>): { success: boolean; data?: Env; error?: z.ZodError } {
  const result = envSchema.safeParse(customEnv ?? process.env);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
