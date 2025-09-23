import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import ShopifyOAuth from './shopify-oauth.js';
import { ApiResponse } from '../types/index.js';

export default async function authRoutes(fastify: FastifyInstance) {
  const shopifyOAuth = new ShopifyOAuth(fastify);

  // OAuth başlatma endpoint
  fastify.get('/auth', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          shop: { type: 'string' }
        },
        required: ['shop']
      },
      response: {
        302: {
          type: 'string',
          description: 'Redirect to Shopify OAuth'
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return shopifyOAuth.initiateAuth(request, reply);
  });

  // OAuth callback endpoint
  fastify.get('/auth/callback', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          shop: { type: 'string' },
          code: { type: 'string' },
          state: { type: 'string' },
          hmac: { type: 'string' }
        },
        required: ['shop', 'code', 'state', 'hmac']
      },
      response: {
        302: {
          type: 'string',
          description: 'Redirect to dashboard'
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return shopifyOAuth.handleCallback(request, reply);
  });

  // Dashboard endpoint
  fastify.get('/dashboard', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          shop: { type: 'string' },
          installed: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                shop: { type: 'string' },
                installed: { type: 'boolean' },
                features: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const { shop, installed } = request.query as { shop?: string; installed?: string };
    
    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Advanced Analytics & Tracking Dashboard',
        shop: shop || 'Unknown',
        installed: installed === 'true',
        features: [
          'Real-time Active Users Tracking',
          'Advanced Analytics Dashboard',
          'Performance Monitoring',
          'Customer Behavior Analysis',
          'Sales Analytics',
          'Custom Reports'
        ]
      }
    };

    return response;
  });

  // Webhook endpoint
  fastify.post('/webhooks/:topic', {
    schema: {
      params: {
        type: 'object',
        properties: {
          topic: { type: 'string' }
        },
        required: ['topic']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { topic } = request.params as { topic: string };
    const hmac = request.headers['x-shopify-hmac-sha256'] as string;
    
    if (!hmac) {
      return reply.status(400).send({
        success: false,
        error: 'Missing HMAC header'
      });
    }

    const body = JSON.stringify(request.body);
    
    if (!shopifyOAuth.verifyWebhook(body, hmac)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid webhook HMAC'
      });
    }

    // Process webhook based on topic
    console.log(`Webhook received: ${topic}`, request.body);
    
    // TODO: Process different webhook types
    // - app/uninstalled
    // - orders/create
    // - customers/create
    // - products/create
    // etc.

    return {
      success: true,
      message: `Webhook ${topic} processed successfully`
    };
  });
}
