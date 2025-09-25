/**
 * Redis Client - Upstash Redis için gerçek implementasyon
 */

import { Redis } from '@upstash/redis';

class RedisClient {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const redisUrl = process.env.REDIS_URL;
      const redisToken = process.env.REDIS_TOKEN;

      if (!redisUrl || !redisToken) {
        console.warn('⚠️ Redis credentials not found. Using mock data.');
        return;
      }

      this.client = new Redis({
        url: redisUrl,
        token: redisToken,
      });

      this.isConnected = true;
      console.log('✅ Redis client initialized');
    } catch (error) {
      console.error('❌ Redis initialization failed:', error);
      this.isConnected = false;
    }
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, using mock data');
      return 1;
    }

    try {
      const result = await this.client.zadd(key, { score, member });
      return result || 0;
    } catch (error) {
      console.error('Redis zadd error:', error);
      return 0;
    }
  }

  async zrem(key: string, member: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, using mock data');
      return 1;
    }

    try {
      return await this.client.zrem(key, member);
    } catch (error) {
      console.error('Redis zrem error:', error);
      return 0;
    }
  }

  async zcount(key: string, min: number, max: number): Promise<number> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, using mock data');
      return Math.floor(Math.random() * 50) + 10; // Mock data
    }

    try {
      return await this.client.zcount(key, min, max);
    } catch (error) {
      console.error('Redis zcount error:', error);
      return 0;
    }
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, using mock data');
      return 0;
    }

    try {
      return await this.client.zremrangebyscore(key, min, max);
    } catch (error) {
      console.error('Redis zremrangebyscore error:', error);
      return 0;
    }
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, using mock data');
      return 1;
    }

    try {
      return await this.client.hset(key, { [field]: value });
    } catch (error) {
      console.error('Redis hset error:', error);
      return 0;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, using mock data');
      return null;
    }

    try {
      return await this.client.hget(key, field);
    } catch (error) {
      console.error('Redis hget error:', error);
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, using mock data');
      return {};
    }

    try {
      const result = await this.client.hgetall(key);
      return (result as Record<string, string>) || {};
    } catch (error) {
      console.error('Redis hgetall error:', error);
      return {};
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis not connected, using mock data');
      return 1;
    }

    try {
      return await this.client.publish(channel, message);
    } catch (error) {
      console.error('Redis publish error:', error);
      return 0;
    }
  }

  isRedisConnected(): boolean {
    return this.isConnected;
  }
}

export const redisClient = new RedisClient();
