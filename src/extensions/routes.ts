/**
 * Shopify Tracking App - Extensions & Webhooks Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ApiResponse, ShopifyWebhook } from '../types/index.js';

// Shopify webhook request interface
interface WebhookRequest {
  Headers: {
    'x-shopify-topic': string;
    'x-shopify-shop-domain': string;
    'x-shopify-webhook-id': string;
    'x-shopify-hmac-sha256'?: string;
  };
  Body: any;
}

export default async function extensionsRoutes(fastify: FastifyInstance) {
  // Shopify webhook handler
  fastify.post<WebhookRequest>('/shopify', {
    config: {
      rateLimit: {
        max: 1000, // Webhook'lar için daha yüksek limit
        timeWindow: '1 minute',
      },
    },
    schema: {
      headers: {
        type: 'object',
        required: ['x-shopify-topic', 'x-shopify-shop-domain', 'x-shopify-webhook-id'],
        properties: {
          'x-shopify-topic': { type: 'string' },
          'x-shopify-shop-domain': { type: 'string' },
          'x-shopify-webhook-id': { type: 'string' },
          'x-shopify-hmac-sha256': { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<WebhookRequest>, reply: FastifyReply) => {
    try {
      const { headers, body } = request;
      
      // Webhook verilerini işle
      const webhookData: ShopifyWebhook = {
        id: headers['x-shopify-webhook-id'],
        topic: headers['x-shopify-topic'],
        shop_domain: headers['x-shopify-shop-domain'],
        data: body,
        timestamp: new Date(),
      };

      // TODO: HMAC doğrulaması yap
      // TODO: Webhook verilerini veritabanına kaydet
      
      fastify.log.info('Shopify webhook alındı:', {
        topic: webhookData.topic,
        shop: webhookData.shop_domain,
        webhookId: webhookData.id,
      } as any);

      // Webhook türüne göre işlem yap
      await handleWebhookByTopic(webhookData, fastify);

      const response: ApiResponse = {
        success: true,
        message: 'Webhook başarıyla işlendi',
      };

      return reply.code(200).send(response);
    } catch (error) {
      fastify.log.error(error as Error, 'Webhook işleme hatası');
      
      const response: ApiResponse = {
        success: false,
        error: 'Webhook işlenemedi',
      };

      return reply.code(500).send(response);
    }
  });

  // Theme app extension için JavaScript dosyası
  fastify.get('/theme-app-extension.js', {
    schema: {
      response: {
        200: {
          type: 'string',
        },
      },
    },
  }, async (request, reply) => {
    // Shop domain'i query parameter'dan al
    const shop = (request.query as any)?.shop || 'localhost';
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    
    const trackingScript = `
(function() {
  'use strict';
  
  // Shopify Tracking App - Theme Extension (Active Users)
  window.ShopifyTracking = window.ShopifyTracking || {};
  window.ShopifyTracking.config = {
    apiUrl: '${apiUrl}',
    shop: '${shop}',
    enableActiveUsers: true,
    enablePageTracking: false, // Şimdilik sadece active users
    enableEcommerceTracking: false,
    enablePerformanceTracking: false,
  };
  
  // Active Users Tracking
  window.ShopifyTracking.activeUsers = {
    visitorId: null,
    sessionId: null,
    heartbeatInterval: null,
    activityTimeout: null,
    lastActivity: 0,
    
    // Ana başlatma fonksiyonu
    init: function() {
      if (!this.config.enableActiveUsers) return;
      
      this.generateIds();
      this.startHeartbeat();
      this.setupActivityTracking();
      this.setupUnloadHandling();
      
      console.log('Active Users tracking initialized');
    },
    
    // Unique ID'ler oluştur
    generateIds: function() {
      this.visitorId = this.visitorId || 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      this.sessionId = this.sessionId || 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Heartbeat başlat
    startHeartbeat: function() {
      // İlk heartbeat gönder
      this.sendHeartbeat();
      
      // Jitter ile interval hesapla (±2 saniye)
      const jitter = Math.random() * 4000 - 2000;
      const interval = 10000 + jitter; // 10 saniye ± 2 saniye
      
      // Heartbeat interval'ını başlat
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
      }, interval);
      
      console.log('Heartbeat started');
    },
    
    // Heartbeat gönder
    sendHeartbeat: async function() {
      try {
        const payload = {
          visitorId: this.visitorId,
          sessionId: this.sessionId,
          shop: this.config.shop,
          timestamp: Date.now(),
          activity: 'heartbeat',
          userAgent: navigator.userAgent
        };
        
        await fetch(this.config.apiUrl + '/api/tracking/presence/beat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        console.log('Heartbeat sent');
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    },
    
    // Activity tracking kurulumu
    setupActivityTracking: function() {
      const self = this;
      
      // Activity detection events
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, function() {
          self.recordActivity();
        }, true);
      });
    },
    
    // Activity kaydet
    recordActivity: function() {
      this.lastActivity = Date.now();
      
      // Activity timeout'ını sıfırla
      if (this.activityTimeout) {
        clearTimeout(this.activityTimeout);
      }
      
      this.activityTimeout = setTimeout(() => {
        console.log('Activity timeout');
      }, 30000); // 30 saniye
      
      // Activity heartbeat gönder
      this.sendActivityHeartbeat();
    },
    
    // Activity heartbeat gönder
    sendActivityHeartbeat: async function() {
      try {
        const payload = {
          visitorId: this.visitorId,
          sessionId: this.sessionId,
          shop: this.config.shop,
          timestamp: Date.now(),
          activity: 'activity',
          userAgent: navigator.userAgent
        };
        
        await fetch(this.config.apiUrl + '/api/tracking/presence/beat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.error('Activity heartbeat error:', error);
      }
    },
    
    // Unload handling kurulumu
    setupUnloadHandling: function() {
      const self = this;
      
      window.addEventListener('beforeunload', function() {
        self.handleUnload();
      });
      
      window.addEventListener('pagehide', function() {
        self.handleUnload();
      });
    },
    
    // Page unload işlemi
    handleUnload: function() {
      if (navigator.sendBeacon) {
        const payload = {
          visitorId: this.visitorId,
          sessionId: this.sessionId,
          shop: this.config.shop,
          timestamp: Date.now(),
          activity: 'unload',
          userAgent: navigator.userAgent
        };
        
        navigator.sendBeacon(
          this.config.apiUrl + '/api/tracking/presence/bye',
          JSON.stringify(payload)
        );
      }
      
      // Heartbeat'i durdur
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      
      if (this.activityTimeout) {
        clearTimeout(this.activityTimeout);
      }
      
      console.log('Active Users tracking stopped');
    }
  };
  
  // Otomatik başlatma
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.ShopifyTracking.activeUsers.init();
    });
  } else {
    window.ShopifyTracking.activeUsers.init();
  }
})();
    `;

    reply.type('application/javascript');
    return trackingScript;
  });

  // CORS preflight için OPTIONS endpoint'i
  fastify.options('/shopify', async (_request, reply) => {
    reply.code(200).send();
  });
}

// Webhook türüne göre işlem yap
async function handleWebhookByTopic(webhook: ShopifyWebhook, fastify: FastifyInstance): Promise<void> {
  switch (webhook.topic) {
    case 'orders/create':
      await handleOrderCreate(webhook, fastify);
      break;
    case 'orders/updated':
      await handleOrderUpdate(webhook, fastify);
      break;
    case 'orders/paid':
      await handleOrderPaid(webhook, fastify);
      break;
    case 'orders/cancelled':
      await handleOrderCancelled(webhook, fastify);
      break;
    case 'customers/create':
      await handleCustomerCreate(webhook, fastify);
      break;
    case 'products/create':
      await handleProductCreate(webhook, fastify);
      break;
    default:
      fastify.log.info('Bilinmeyen webhook türü:', webhook.topic as any);
  }
}

// Webhook handler'ları
async function handleOrderCreate(webhook: ShopifyWebhook, fastify: FastifyInstance): Promise<void> {
  fastify.log.info('Yeni sipariş oluşturuldu:', webhook.data.id);
  // TODO: Sipariş verilerini analitik sistemine kaydet
}

async function handleOrderUpdate(webhook: ShopifyWebhook, fastify: FastifyInstance): Promise<void> {
  fastify.log.info('Sipariş güncellendi:', webhook.data.id);
  // TODO: Sipariş güncellemesini analitik sistemine kaydet
}

async function handleOrderPaid(webhook: ShopifyWebhook, fastify: FastifyInstance): Promise<void> {
  fastify.log.info('Sipariş ödendi:', webhook.data.id);
  // TODO: Ödeme verilerini analitik sistemine kaydet
}

async function handleOrderCancelled(webhook: ShopifyWebhook, fastify: FastifyInstance): Promise<void> {
  fastify.log.info('Sipariş iptal edildi:', webhook.data.id);
  // TODO: İptal verilerini analitik sistemine kaydet
}

async function handleCustomerCreate(webhook: ShopifyWebhook, fastify: FastifyInstance): Promise<void> {
  fastify.log.info('Yeni müşteri oluşturuldu:', webhook.data.id);
  // TODO: Müşteri verilerini analitik sistemine kaydet
}

async function handleProductCreate(webhook: ShopifyWebhook, fastify: FastifyInstance): Promise<void> {
  fastify.log.info('Yeni ürün oluşturuldu:', webhook.data.id);
  // TODO: Ürün verilerini analitik sistemine kaydet
}
