/**
 * Shopify Tracking App - Tracking API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ApiResponse, PageAnalytics, EcommerceEvent, UserSession } from '../types';

// Sayfa analitik verisi gönderme
interface PageAnalyticsRequest {
  Body: {
    pageId: string;
    url: string;
    title: string;
    referrer?: string;
    loadTime: number;
    viewTime: number;
    scrollDepth: number;
    sessionId: string;
  };
}

// E-ticaret olayı gönderme
interface EcommerceEventRequest {
  Body: {
    eventType: 'view_item' | 'add_to_cart' | 'remove_from_cart' | 'purchase' | 'begin_checkout';
    productId?: string;
    productName?: string;
    category?: string;
    price?: number;
    quantity?: number;
    currency?: string;
    orderId?: string;
    sessionId: string;
  };
}

// Session başlatma
interface SessionRequest {
  Body: {
    userId?: string;
    deviceInfo: {
      userAgent: string;
      platform: string;
      browser: string;
      browserVersion: string;
      os: string;
      osVersion: string;
      screenResolution: string;
      timezone: string;
      language: string;
    };
    geoInfo?: {
      country?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      ipAddress?: string;
    };
  };
}

export default async function trackingRoutes(fastify: FastifyInstance) {
  // Session başlatma endpoint'i
  fastify.post<SessionRequest>('/session/start', {
    schema: {
      body: {
        type: 'object',
        required: ['deviceInfo'],
        properties: {
          userId: { type: 'string' },
          deviceInfo: {
            type: 'object',
            required: ['userAgent', 'platform', 'browser', 'os', 'timezone', 'language'],
            properties: {
              userAgent: { type: 'string' },
              platform: { type: 'string' },
              browser: { type: 'string' },
              browserVersion: { type: 'string' },
              os: { type: 'string' },
              osVersion: { type: 'string' },
              screenResolution: { type: 'string' },
              timezone: { type: 'string' },
              language: { type: 'string' },
            },
          },
          geoInfo: {
            type: 'object',
            properties: {
              country: { type: 'string' },
              region: { type: 'string' },
              city: { type: 'string' },
              latitude: { type: 'number' },
              longitude: { type: 'number' },
              ipAddress: { type: 'string' },
            },
          },
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
                sessionId: { type: 'string' },
                timestamp: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<SessionRequest>, reply: FastifyReply) => {
    try {
      const { userId, deviceInfo, geoInfo } = request.body;
      
      // Session ID oluştur
      const sessionId = generateSessionId();
      const timestamp = new Date();

      // Session verisini işle (burada veritabanına kaydedilecek)
      const sessionData: UserSession = {
        id: sessionId,
        userId: userId || undefined,
        sessionId,
        startTime: timestamp,
        lastActivity: timestamp,
        isActive: true,
        deviceInfo,
        geoInfo: geoInfo || {},
      };
      
      // TODO: sessionData'yı veritabanına kaydet
      console.log('Session data:', sessionData);

      fastify.log.info('Yeni session başlatıldı:', { sessionId, userId } as any);

      const response: ApiResponse = {
        success: true,
        data: {
          sessionId,
          timestamp: timestamp.toISOString(),
        },
        message: 'Session başarıyla oluşturuldu',
      };

      return reply.code(200).send(response);
    } catch (error) {
      fastify.log.error(error as Error, 'Session başlatma hatası');
      
      const response: ApiResponse = {
        success: false,
        error: 'Session başlatılamadı',
      };

      return reply.code(500).send(response);
    }
  });

  // Sayfa analitik verisi gönderme endpoint'i
  fastify.post<PageAnalyticsRequest>('/page', {
    schema: {
      body: {
        type: 'object',
        required: ['pageId', 'url', 'title', 'loadTime', 'viewTime', 'scrollDepth', 'sessionId'],
        properties: {
          pageId: { type: 'string' },
          url: { type: 'string' },
          title: { type: 'string' },
          referrer: { type: 'string' },
          loadTime: { type: 'number' },
          viewTime: { type: 'number' },
          scrollDepth: { type: 'number' },
          sessionId: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<PageAnalyticsRequest>, reply: FastifyReply) => {
    try {
      const pageData = request.body;
      
      const analyticsData: PageAnalytics = {
        ...pageData,
        timestamp: new Date(),
      };

      // TODO: Veritabanına kaydet
      fastify.log.info('Sayfa analitik verisi alındı:', { 
        pageId: analyticsData.pageId, 
        sessionId: analyticsData.sessionId 
      } as any);

      const response: ApiResponse = {
        success: true,
        message: 'Sayfa analitik verisi başarıyla kaydedildi',
      };

      return reply.code(200).send(response);
    } catch (error) {
      fastify.log.error(error as Error, 'Sayfa analitik verisi kaydetme hatası');
      
      const response: ApiResponse = {
        success: false,
        error: 'Sayfa analitik verisi kaydedilemedi',
      };

      return reply.code(500).send(response);
    }
  });

  // E-ticaret olayı gönderme endpoint'i
  fastify.post<EcommerceEventRequest>('/ecommerce', {
    schema: {
      body: {
        type: 'object',
        required: ['eventType', 'sessionId'],
        properties: {
          eventType: { 
            type: 'string',
            enum: ['view_item', 'add_to_cart', 'remove_from_cart', 'purchase', 'begin_checkout']
          },
          productId: { type: 'string' },
          productName: { type: 'string' },
          category: { type: 'string' },
          price: { type: 'number' },
          quantity: { type: 'number' },
          currency: { type: 'string' },
          orderId: { type: 'string' },
          sessionId: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<EcommerceEventRequest>, reply: FastifyReply) => {
    try {
      const eventData = request.body;
      
      const ecommerceEvent: EcommerceEvent = {
        ...eventData,
        timestamp: new Date(),
      };

      // TODO: Veritabanına kaydet
      fastify.log.info('E-ticaret olayı alındı:', { 
        eventType: ecommerceEvent.eventType,
        productId: ecommerceEvent.productId,
        sessionId: ecommerceEvent.sessionId 
      } as any);

      const response: ApiResponse = {
        success: true,
        message: 'E-ticaret olayı başarıyla kaydedildi',
      };

      return reply.code(200).send(response);
    } catch (error) {
      fastify.log.error(error as Error, 'E-ticaret olayı kaydetme hatası');
      
      const response: ApiResponse = {
        success: false,
        error: 'E-ticaret olayı kaydedilemedi',
      };

      return reply.code(500).send(response);
    }
  });

  // Session sonlandırma endpoint'i
  fastify.post<{ Body: { sessionId: string } }>('/session/end', {
    schema: {
      body: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { sessionId } = request.body;
      
      // TODO: Session'ı veritabanında sonlandır
      fastify.log.info('Session sonlandırıldı:', { sessionId } as any);

      const response: ApiResponse = {
        success: true,
        message: 'Session başarıyla sonlandırıldı',
      };

      return reply.code(200).send(response);
    } catch (error) {
      fastify.log.error(error as Error, 'Session sonlandırma hatası');
      
      const response: ApiResponse = {
        success: false,
        error: 'Session sonlandırılamadı',
      };

      return reply.code(500).send(response);
    }
  });
}

// Yardımcı fonksiyonlar
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
