/**
 * Active Users Tracking - Presence Tracking Logic
 */

import { PresenceData, ActiveUsersState } from './types.js';
import { REDIS_KEYS, TTL_MS, MAX_AGE_MS } from './constants.js';

/**
 * Redis client interface (Upstash Redis için)
 */
interface RedisClient {
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, member: string): Promise<number>;
  zcount(key: string, min: number, max: number): Promise<number>;
  zremrangebyscore(key: string, min: number, max: number): Promise<number>;
  hset(key: string, field: string, value: string): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, string>>;
  publish(channel: string, message: string): Promise<number>;
}

/**
 * Presence tracking sınıfı
 */
export class PresenceTracker {
  private redis: RedisClient;
  
  constructor(redisClient: RedisClient) {
    this.redis = redisClient;
  }
  
  /**
   * Visitor'ı presence set'ine ekle
   * @param data Presence data
   */
  async addVisitor(data: PresenceData): Promise<void> {
    const timestamp = Date.now();
    const expiry = timestamp + TTL_MS;
    
    // Visitor presence set'ine ekle
    await this.redis.zadd(
      REDIS_KEYS.VISITOR_PRESENCE(data.shop),
      expiry,
      data.visitorId
    );
    
    // Session presence set'ine ekle
    await this.redis.zadd(
      REDIS_KEYS.SESSION_PRESENCE(data.shop),
      expiry,
      data.sessionId
    );
  }
  
  /**
   * Visitor'ı presence set'inden çıkar
   * @param shop Shop ID
   * @param visitorId Visitor ID
   * @param sessionId Session ID
   */
  async removeVisitor(shop: string, visitorId: string, sessionId: string): Promise<void> {
    // Visitor'ı çıkar
    await this.redis.zrem(REDIS_KEYS.VISITOR_PRESENCE(shop), visitorId);
    
    // Session'ı çıkar
    await this.redis.zrem(REDIS_KEYS.SESSION_PRESENCE(shop), sessionId);
  }
  
  /**
   * Aktif visitor sayısını hesapla
   * @param shop Shop ID
   * @returns Aktif visitor sayısı
   */
  async getActiveVisitorCount(shop: string): Promise<number> {
    const now = Date.now();
    
    // Expired olanları temizle
    await this.cleanupExpired(shop, now);
    
    // Aktif visitor sayısını al
    return await this.redis.zcount(
      REDIS_KEYS.VISITOR_PRESENCE(shop),
      now,
      Infinity
    );
  }
  
  /**
   * Aktif session sayısını hesapla
   * @param shop Shop ID
   * @returns Aktif session sayısı
   */
  async getActiveSessionCount(shop: string): Promise<number> {
    const now = Date.now();
    
    // Aktif session sayısını al
    return await this.redis.zcount(
      REDIS_KEYS.SESSION_PRESENCE(shop),
      now,
      Infinity
    );
  }
  
  /**
   * Expired presence'ları temizle
   * @param shop Shop ID
   * @param timestamp Timestamp
   */
  async cleanupExpired(shop: string, timestamp: number): Promise<void> {
    // Maksimum yaş sınırını hesapla
    const maxAgeThreshold = timestamp - MAX_AGE_MS;
    
    // Visitor presence'ları temizle
    await this.redis.zremrangebyscore(
      REDIS_KEYS.VISITOR_PRESENCE(shop),
      0,
      maxAgeThreshold
    );
    
    // Session presence'ları temizle
    await this.redis.zremrangebyscore(
      REDIS_KEYS.SESSION_PRESENCE(shop),
      0,
      maxAgeThreshold
    );
  }
  
  /**
   * EMA state'i Redis'ten al
   * @param shop Shop ID
   * @returns EMA state veya null
   */
  async getEMAState(shop: string): Promise<ActiveUsersState | null> {
    const stateData = await this.redis.hgetall(REDIS_KEYS.EMA_STATE(shop));
    
    if (!stateData || Object.keys(stateData).length === 0) {
      return null;
    }
    
    return {
      shop,
      lastTimestamp: parseInt(stateData.lastTimestamp),
      emaFast: parseFloat(stateData.emaFast),
      emaSlow: parseFloat(stateData.emaSlow),
      lastRawCount: parseInt(stateData.lastRawCount),
    };
  }
  
  /**
   * EMA state'i Redis'e kaydet
   * @param state EMA state
   */
  async setEMAState(state: ActiveUsersState): Promise<void> {
    await this.redis.hset(
      REDIS_KEYS.EMA_STATE(state.shop),
      'lastTimestamp',
      state.lastTimestamp.toString()
    );
    await this.redis.hset(
      REDIS_KEYS.EMA_STATE(state.shop),
      'emaFast',
      state.emaFast.toString()
    );
    await this.redis.hset(
      REDIS_KEYS.EMA_STATE(state.shop),
      'emaSlow',
      state.emaSlow.toString()
    );
    await this.redis.hset(
      REDIS_KEYS.EMA_STATE(state.shop),
      'lastRawCount',
      state.lastRawCount.toString()
    );
  }
  
  /**
   * Presence değişikliğini publish et
   * @param shop Shop ID
   * @param activeUsers Aktif kullanıcı sayısı
   * @param trend Trend bilgisi
   */
  async publishPresenceUpdate(
    shop: string,
    activeUsers: number,
    trend: string
  ): Promise<void> {
    const message = JSON.stringify({
      shop,
      activeUsers,
      timestamp: Date.now(),
      trend,
    });
    
    await this.redis.publish(
      REDIS_KEYS.PUBSUB_CHANNEL(shop),
      message
    );
  }
}
