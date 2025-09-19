/**
 * Active Users Tracking - TypeScript Types
 */

// Presence tracking verileri
export interface PresenceData {
  visitorId: string;
  sessionId: string;
  shop: string;
  timestamp: number;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
  lastActivity: number;
}

// EMA hesaplama sonucu
export interface EMAResult {
  emaFast: number;
  emaSlow: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  rawCount: number;
  timestamp: number;
}

// Heartbeat payload
export interface HeartbeatPayload {
  visitorId: string;
  sessionId: string;
  shop: string;
  timestamp: number;
  activity: 'heartbeat' | 'activity' | 'unload';
  userAgent?: string;
}

// Active users state (Redis'te saklanan)
export interface ActiveUsersState {
  shop: string;
  lastTimestamp: number;
  emaFast: number;
  emaSlow: number;
  lastRawCount: number;
}

// Dakikalık active users verisi
export interface ActiveUsersMinutely {
  shop: string;
  bucketTs: Date;
  auRaw: number;
  totalTabs: number;
  auEmaFast: number;
  auEmaSlow: number;
  windowSeconds: number;
}

// Günlük active users özeti
export interface ActiveUsersDaily {
  shop: string;
  day: Date;
  avgAuRaw: number;
  p95AuRaw: number;
  maxAuRaw: number;
  maxAuRawAt: Date;
  avgAuEma: number;
  minutesObserved: number;
}

// Redis ZSET operations için
export interface ZSetMember {
  score: number;
  member: string;
}

// SSE stream için
export interface PresenceStreamData {
  shop: string;
  activeUsers: number;
  timestamp: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// API response tipleri
export interface PresenceResponse {
  success: boolean;
  data?: {
    activeUsers: number;
    timestamp: number;
    trend: string;
  };
  error?: string;
}

export interface HeartbeatResponse {
  success: boolean;
  data?: {
    visitorId: string;
    timestamp: number;
  };
  error?: string;
}
