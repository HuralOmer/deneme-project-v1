/**
 * Active Users Tracking - Ana Export Dosyası
 */

export { PresenceTracker } from './presence';
export { HeartbeatManager, generateHeartbeatScript } from './heartbeat';
export { 
  calculateEMA, 
  emaStep, 
  alpha, 
  updateState, 
  resetState 
} from './ema';

export type {
  PresenceData,
  EMAResult,
  HeartbeatPayload,
  ActiveUsersState,
  ActiveUsersMinutely,
  ActiveUsersDaily,
  ZSetMember,
  PresenceStreamData,
  PresenceResponse,
  HeartbeatResponse,
} from './types';

export {
  HEARTBEAT_MS,
  TTL_MS,
  TICK_MS,
  EMA_TAU_FAST,
  EMA_TAU_SLOW,
  REDIS_KEYS,
  DB_TABLES,
  TREND_THRESHOLDS,
  JITTER_MS,
  ACTIVITY_TIMEOUT_MS,
  BATCH_SIZE,
  CLEANUP_INTERVAL_MS,
  MAX_AGE_MS,
} from './constants';
