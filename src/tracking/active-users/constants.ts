/**
 * Active Users Tracking - Constants
 */

// Heartbeat ve TTL ayarları
export const HEARTBEAT_MS = 10_000; // 10 saniye
export const TTL_MS = 30_000; // 30 saniye (presence TTL)
export const TICK_MS = 5_000; // 5 saniye (cleanup tick)

// EMA algoritması sabitleri
export const EMA_TAU_FAST = 10; // 10 saniye (hızlı EMA)
export const EMA_TAU_SLOW = 60; // 60 saniye (yavaş EMA)

// Redis key patterns
export const REDIS_KEYS = {
  VISITOR_PRESENCE: (shop: string) => `presence:v:${shop}`,
  SESSION_PRESENCE: (shop: string) => `presence:s:${shop}`,
  EMA_STATE: (shop: string) => `presence:ema:${shop}`,
  PUBSUB_CHANNEL: (shop: string) => `channel:presence:${shop}`,
} as const;

// Veritabanı tablo isimleri
export const DB_TABLES = {
  ACTIVE_USERS_MINUTELY: 'active_users_minutely',
  ACTIVE_USERS_DAILY: 'active_users_daily',
  ACTIVE_USERS_STATE: 'active_users_state',
} as const;

// Trend hesaplama eşikleri
export const TREND_THRESHOLDS = {
  INCREASING: 0.05, // %5 artış
  DECREASING: -0.05, // %5 azalış
} as const;

// Jitter ayarları (heartbeat randomization)
export const JITTER_MS = 2000; // ±2 saniye

// Activity detection ayarları
export const ACTIVITY_TIMEOUT_MS = 30000; // 30 saniye inactivity timeout

// Supabase batch insert ayarları
export const BATCH_SIZE = 100; // Dakikalık veri batch boyutu

// Cleanup ayarları
export const CLEANUP_INTERVAL_MS = 60000; // 1 dakika cleanup interval
export const MAX_AGE_MS = 300000; // 5 dakika max age for cleanup
