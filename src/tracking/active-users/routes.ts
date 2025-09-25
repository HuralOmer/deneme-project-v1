/**
 * Active Users Tracking - API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PresenceTracker } from './presence.js';
import { calculateEMA, updateState } from './ema.js';
import { redisClient } from '../../database/redis.js';
import { memoryStore } from './memory-store.js';
import { 
  HeartbeatPayload, 
  PresenceResponse, 
  HeartbeatResponse,
  PresenceStreamData 
} from './types';
// import { REDIS_KEYS } from './constants';

// Heartbeat request interface
interface HeartbeatRequest {
  Body: HeartbeatPayload;
}

// Presence stream request interface
interface StreamRequest {
  Querystring: {
    shop: string;
  };
}

export default async function activeUsersRoutes(fastify: FastifyInstance) {
  // Gerçek Redis client kullan
  const presenceTracker = new PresenceTracker(memoryStore);

  // Heartbeat endpoint
  fastify.post<HeartbeatRequest>('/presence/beat', {
    schema: {
      body: {
        type: 'object',
        required: ['visitorId', 'sessionId', 'shop', 'timestamp', 'activity'],
        properties: {
          visitorId: { type: 'string' },
          sessionId: { type: 'string' },
          shop: { type: 'string' },
          timestamp: { type: 'number' },
          activity: { 
            type: 'string',
            enum: ['heartbeat', 'activity', 'unload']
          },
          userAgent: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                visitorId: { type: 'string' },
                timestamp: { type: 'number' },
                activeUsers: { type: 'number' },
                trend: { type: 'string' },
              },
            },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<HeartbeatRequest>, reply: FastifyReply) => {
    try {
      const payload = request.body;
      
      // Presence'i güncelle - hem presenceTracker hem de memory store'a
      await presenceTracker.addVisitor({
        visitorId: payload.visitorId,
        sessionId: payload.sessionId,
        shop: payload.shop,
        timestamp: payload.timestamp,
        userAgent: payload.userAgent,
        lastActivity: payload.timestamp,
      });

      // Memory store'a da ekle
      memoryStore.addUser(payload.visitorId, payload.sessionId, payload.shop);

      // Aktif kullanıcı sayısını al
      const activeUsers = await presenceTracker.getActiveVisitorCount(payload.shop);
      
      // EMA state'i al
      const currentState = await presenceTracker.getEMAState(payload.shop);
      
      // EMA hesapla
      const emaResult = calculateEMA(currentState, activeUsers, payload.timestamp);
      
      // State'i güncelle
      const newState = updateState(currentState, emaResult, payload.shop);
      await presenceTracker.setEMAState(newState);
      
      // Presence değişikliğini publish et
      await presenceTracker.publishPresenceUpdate(
        payload.shop,
        activeUsers,
        emaResult.trend
      );

      const response: HeartbeatResponse = {
        success: true,
        data: {
          visitorId: payload.visitorId,
          timestamp: payload.timestamp,
        },
      };

      // SSE stream için ek bilgi ekle
      (response.data as any).activeUsers = activeUsers;
      (response.data as any).trend = emaResult.trend;

      return reply.code(200).send(response);
    } catch (error) {
      fastify.log.error(error as Error, 'Heartbeat processing error');
      
      const response: HeartbeatResponse = {
        success: false,
        error: 'Heartbeat işlenemedi',
      };

      return reply.code(500).send(response);
    }
  });

  // Page unload endpoint
  fastify.post<HeartbeatRequest>('/presence/bye', {
    schema: {
      body: {
        type: 'object',
        required: ['visitorId', 'sessionId', 'shop', 'timestamp', 'activity'],
        properties: {
          visitorId: { type: 'string' },
          sessionId: { type: 'string' },
          shop: { type: 'string' },
          timestamp: { type: 'number' },
          activity: { type: 'string' },
          userAgent: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<HeartbeatRequest>, reply: FastifyReply) => {
    try {
      const payload = request.body;
      
      // Visitor'ı presence'den çıkar
      await presenceTracker.removeVisitor(
        payload.shop,
        payload.visitorId,
        payload.sessionId
      );

      // Güncel aktif kullanıcı sayısını al
      const activeUsers = await presenceTracker.getActiveVisitorCount(payload.shop);
      
      // EMA state'i güncelle
      const currentState = await presenceTracker.getEMAState(payload.shop);
      const emaResult = calculateEMA(currentState, activeUsers, payload.timestamp);
      const newState = updateState(currentState, emaResult, payload.shop);
      await presenceTracker.setEMAState(newState);
      
      // Presence değişikliğini publish et
      await presenceTracker.publishPresenceUpdate(
        payload.shop,
        activeUsers,
        emaResult.trend
      );

      const response: HeartbeatResponse = {
        success: true,
        data: {
          visitorId: payload.visitorId,
          timestamp: payload.timestamp,
        },
      };

      return reply.code(200).send(response);
    } catch (error) {
      fastify.log.error(error as Error, 'Unload processing error');
      
      const response: HeartbeatResponse = {
        success: false,
        error: 'Unload işlenemedi',
      };

      return reply.code(500).send(response);
    }
  });

  // Real-time presence stream (SSE)
  fastify.get<StreamRequest>('/presence/stream', {
    schema: {
      querystring: {
        type: 'object',
        required: ['shop'],
        properties: {
          shop: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<StreamRequest>, reply: FastifyReply) => {
    try {
      const { shop } = request.query;
      
      // SSE headers
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('Access-Control-Allow-Origin', '*');
      reply.raw.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      // İlk veriyi gönder
      const activeUsers = await presenceTracker.getActiveVisitorCount(shop);
      const currentState = await presenceTracker.getEMAState(shop);
      const emaResult = calculateEMA(currentState, activeUsers, Date.now());

      const initialData: PresenceStreamData = {
        shop,
        activeUsers,
        timestamp: Date.now(),
        trend: emaResult.trend,
      };

      reply.raw.write(`data: ${JSON.stringify(initialData)}\n\n`);

      // Redis PUBSUB dinleme (mock - gerçek implementasyon gerekli)
      const mockInterval = setInterval(async () => {
        try {
          const currentActiveUsers = await presenceTracker.getActiveVisitorCount(shop);
          const currentState = await presenceTracker.getEMAState(shop);
          const emaResult = calculateEMA(currentState, currentActiveUsers, Date.now());

          const streamData: PresenceStreamData = {
            shop,
            activeUsers: currentActiveUsers,
            timestamp: Date.now(),
            trend: emaResult.trend,
          };

          reply.raw.write(`data: ${JSON.stringify(streamData)}\n\n`);
        } catch (error) {
          fastify.log.error(error as Error, 'SSE stream error');
          clearInterval(mockInterval);
          reply.raw.end();
        }
      }, 5000); // 5 saniye interval

      // Connection kapandığında cleanup
      request.raw.on('close', () => {
        clearInterval(mockInterval);
      });

    } catch (error) {
      fastify.log.error(error as Error, 'SSE stream setup error');
      return reply.code(500).send({
        success: false,
        error: 'Stream başlatılamadı',
      });
    }
  });

  // Active users count endpoint (legacy)
  fastify.get<StreamRequest>('/count', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          shop: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            count: { type: 'number' },
            timestamp: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<StreamRequest>, reply: FastifyReply) => {
    try {
      const { shop = 'default-shop' } = request.query;
      
      // Memory store'dan gerçek aktif kullanıcı sayısını al
      const activeUsers = memoryStore.getActiveUsersCount(shop);
      
      return reply.code(200).send({
        count: activeUsers,
        timestamp: Date.now(),
      });
    } catch (error) {
      fastify.log.error(error as Error, 'Active users count error');
      
      return reply.code(500).send({
        count: 0,
        timestamp: Date.now(),
      });
    }
  });

  // Active users count endpoint
  fastify.get<StreamRequest>('/presence/count', {
    schema: {
      querystring: {
        type: 'object',
        required: ['shop'],
        properties: {
          shop: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                activeUsers: { type: 'number' },
                timestamp: { type: 'number' },
                trend: { type: 'string' },
              },
            },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<StreamRequest>, reply: FastifyReply) => {
    try {
      const { shop } = request.query;
      
      // Memory store'dan gerçek aktif kullanıcı sayısını al
      const activeUsers = memoryStore.getActiveUsersCount(shop);

      const response: PresenceResponse = {
        success: true,
        data: {
          activeUsers,
          timestamp: Date.now(),
          trend: 'stable', // Basit trend hesaplama
        },
      };

      return reply.code(200).send(response);
    } catch (error) {
      fastify.log.error(error as Error, 'Active users count error');
      
      const response: PresenceResponse = {
        success: false,
        error: 'Aktif kullanıcı sayısı alınamadı',
      };

      return reply.code(500).send(response);
    }
  });
}
