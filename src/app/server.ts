/**
 * Shopify Tracking App - Fastify Server
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config, validateConfig } from './config';
import { ApiResponse } from '../types';

class ShopifyTrackingServer {
  private fastify: FastifyInstance;
  private isRunning = false;

  constructor() {
    this.fastify = Fastify({
      logger: {
        level: config.nodeEnv === 'development' ? 'info' : 'warn',
      },
      trustProxy: true,
    });
  }

  /**
   * Server'ı başlat
   */
  async start(): Promise<void> {
    try {
      // Konfigürasyonu doğrula
      validateConfig();

      // Plugin'leri kaydet
      await this.registerPlugins();

      // Route'ları kaydet
      await this.registerRoutes();

      // Server'ı dinlemeye başla
      await this.fastify.listen({
        port: config.port,
        host: config.host,
      });

      this.isRunning = true;
      this.fastify.log.info(`🚀 Shopify Tracking App server başlatıldı: http://${config.host}:${config.port}`);
    } catch (error) {
      this.fastify.log.error(error as Error, 'Server başlatılamadı');
      throw error;
    }
  }

  /**
   * Server'ı durdur
   */
  async stop(): Promise<void> {
    if (this.isRunning) {
      await this.fastify.close();
      this.isRunning = false;
      this.fastify.log.info('🛑 Server durduruldu');
    }
  }

  /**
   * Plugin'leri kaydet
   */
  private async registerPlugins(): Promise<void> {
    // CORS
    await this.fastify.register(cors, config.cors);

    // Helmet (Güvenlik)
    await this.fastify.register(helmet, {
      contentSecurityPolicy: false, // Shopify iframe'leri için
    });

    // Rate limiting
    await this.fastify.register(rateLimit, {
      global: true,
      max: config.rateLimit.max,
      timeWindow: config.rateLimit.windowMs,
      errorResponseBuilder: (_request, context) => ({
        success: false,
        error: 'Çok fazla istek gönderildi',
        message: `Limit: ${context.max} istek`,
      }),
    });
  }

  /**
   * Route'ları kaydet
   */
  private async registerRoutes(): Promise<void> {
    // Health check
    this.fastify.get('/health', {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  timestamp: { type: 'string' },
                  uptime: { type: 'number' },
                },
              },
            },
          },
        },
      },
    }, async (_request, _reply) => {
      const response: ApiResponse = {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
      };
      return response;
    });

    // Ana sayfa
    this.fastify.get('/', async (_request, _reply) => {
      const response: ApiResponse = {
        success: true,
        data: {
          name: 'Shopify Tracking App',
          version: '1.0.0',
          description: 'Advanced Shopify Analytics & Tracking App',
          endpoints: {
            health: '/health',
            tracking: '/api/tracking',
            webhooks: '/api/webhooks',
          },
        },
      };
      return response;
    });

    // Extensions routes (theme app extension)
    const extensionsRoutes = await import('../extensions/routes');
    this.fastify.register(extensionsRoutes.default, { prefix: '/extensions' });

    // API routes
    this.fastify.register(async (fastify) => {
      // Active Users endpoints
      const activeUsersRoutes = await import('../tracking/active-users/routes');
      fastify.register(activeUsersRoutes.default, { prefix: '/tracking' });
      
      // Tracking endpoints (legacy)
      const trackingRoutes = await import('../tracking/routes');
      fastify.register(trackingRoutes.default, { prefix: '/tracking' });
      
      // Webhook endpoints
      const webhookRoutes = await import('../extensions/routes');
      fastify.register(webhookRoutes.default, { prefix: '/webhooks' });
    }, { prefix: '/api' });
  }

  /**
   * Fastify instance'ını döndür
   */
  getInstance(): FastifyInstance {
    return this.fastify;
  }

  /**
   * Server çalışıyor mu?
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
}

export default ShopifyTrackingServer;
