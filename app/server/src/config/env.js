const { z } = require('zod');
const path = require('path');
const dotenv = require('dotenv');

// Load environment from app/server/.env or current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  // ONLY JWT_SECRET (>=32 chars) is required
  JWT_SECRET: z
    .string({
      required_error: 'JWT_SECRET is required and must be defined in the environment.',
      invalid_type_error: 'JWT_SECRET must be a string.',
    })
    .min(32, 'JWT_SECRET must be at least 32 characters long.'),

  PORT: z.string().optional().default('3000'),
  NODE_ENV: z.string().optional().default('development'),
  DB_PATH: z.string().optional(),

  // Feature Flags (default false)
  FILES_ENABLED: z.string().optional().default('false'),
  TERMINAL_ENABLED: z.string().optional().default('false'),

  // Host SSH
  SSH_HOST: z.string().optional(),
  SSH_PORT: z.string().optional(),
  SSH_USERNAME: z.string().optional(),
  OWNER_PASSWORD: z.string().optional(),

  // Optional integration credentials and configuration
  QBIT_URL: z.string().optional(),
  QBIT_USER: z.string().optional(),
  QBIT_PASS: z.string().optional(),

  PIHOLE_URL: z.string().optional(),
  PIHOLE_API_TOKEN: z.string().optional(),

  WG_SSH_HOST: z.string().optional(),
  WG_SSH_PORT: z.string().optional(),
  WG_SSH_USER: z.string().optional(),
  WG_SSH_KEY: z.string().optional(),
  WG_SSH_KEY_PATH: z.string().optional(),

  JELLYFIN_URL: z.string().optional(),
  JELLYFIN_API_KEY: z.string().optional(),

  JELLYSEERR_URL: z.string().optional(),
  JELLYSEERR_API_KEY: z.string().optional(),

  // Hardware & System Telemetry
  PIRONMAN_API_URL: z.string().optional(),
  MEDIA_POOL_TOTAL: z.string().optional(),
  MEDIA_POOL_FREE: z.string().optional(),
  MEDIA_POOL_USED: z.string().optional(),
  MEDIA_POOL_PERCENT: z.string().optional(),
  NEXTCLOUD_NET_DOWN: z.string().optional(),
  NEXTCLOUD_NET_UP: z.string().optional(),
  SPEEDTEST_INTERVAL_HOURS: z.string().optional(),
}).passthrough();

function validateEnv(envVars = process.env) {
  const result = envSchema.safeParse(envVars);
  if (!result.success) {
    console.error('\n[FATAL] Environment validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.') || 'env'}: ${issue.message}`);
    });
    console.error('');
    process.exit(1);
  }
  return result.data;
}

const env = validateEnv(process.env);

module.exports = {
  envSchema,
  validateEnv,
  env,
};
