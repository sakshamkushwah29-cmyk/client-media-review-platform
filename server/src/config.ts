import path from 'path';

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 3001,
  CLIENT_PORT: 5173,
  JWT_SECRET: process.env.JWT_SECRET || 'antigravity-media-review-secret-key-2026',
  STORAGE_DIR: process.env.STORAGE_DIR || path.resolve(process.cwd(), '.drive_storage'),
  DEFAULT_QUOTA_BYTES: 161061273600, // 150 GiB (150 * 1024 * 1024 * 1024)
  WARNING_THRESHOLD_PERCENT: 80,
  BLOCKING_THRESHOLD_PERCENT: 95,
  CLOUD_STORAGE_URL: process.env.CLOUD_STORAGE_URL || 'https://www.jioaicloud.com/l/?u=g4hmxUTO-wgVwF-fLP9Bx-cyfJyX-vprhmiygn1LPJ50buo7GG7VSBbwMbOf04FwhIb',
  GOOGLE_DRIVE_API_KEY: process.env.GOOGLE_DRIVE_API_KEY || '',
  GOOGLE_DRIVE_SERVICE_ACCOUNT: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT || '',
  APP_URL: process.env.APP_URL || 'http://localhost:5173',
};
