import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SYSTEM_MAINTENANCE_MODE: z.enum(['on', 'off']).default('off'),
  SYSTEM_LOGIN: z.enum(['on', 'off']).default('off'),
  SYSTEM_OWNER_EMAILS: z.string().default(''),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ALLOWED_ORIGINS: z.string().default(''),
  LOCAL_AI_BASE_URL: z.string().url().default('http://127.0.0.1:11434'),
  LOCAL_AI_MODEL: z.string().default('qwen2.5:7b'),
  LOCAL_AI_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>
