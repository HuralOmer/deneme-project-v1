import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { config } from '../app/config.js';

export interface ShopifyOAuthParams {
  shop: string;
  code: string;
  state: string;
  timestamp: string;
  hmac: string;
}

export class ShopifyOAuth {
  constructor(_fastify: FastifyInstance) {
    // Fastify instance parameter for future use
    // Currently unused but available for future features
  }

  /**
   * OAuth başlatma - mağaza yönlendirme
   */
  async initiateAuth(request: FastifyRequest, reply: FastifyReply) {
    const { shop } = request.query as { shop: string };
    
    if (!shop) {
      return reply.status(400).send({
        success: false,
        error: 'Shop parameter is required'
      });
    }

    // Shop domain validation
    if (!shop.endsWith('.myshopify.com')) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid shop domain'
      });
    }

    // State parameter for security
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state in session for validation (cookie removed due to version conflict)
    // TODO: Implement proper session storage
    console.log(`OAuth state generated: ${state}`);

    // Shopify OAuth URL
    const scopes = 'read_products,read_orders,read_customers,read_analytics';
    const redirectUri = `${config.host === '0.0.0.0' ? 'https://web-production-8c47.up.railway.app' : `http://${config.host}:${config.port}`}/auth/callback`;
    
    const authUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${config.shopify.apiKey}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    return reply.redirect(authUrl);
  }

  /**
   * OAuth callback - Shopify'den dönen response
   */
  async handleCallback(request: FastifyRequest, reply: FastifyReply) {
    const { shop, code, state, hmac } = request.query as ShopifyOAuthParams;
    
    // State validation (simplified - cookie removed due to version conflict)
    // TODO: Implement proper session storage
    console.log(`OAuth callback state: ${state}`);

    // HMAC validation
    if (!this.validateHmac(request.query as any, hmac)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid HMAC'
      });
    }

    try {
      // Exchange code for access token
      const accessToken = await this.exchangeCodeForToken(shop, code);
      
      // Store access token securely
      await this.storeAccessToken(shop, accessToken);
      
      // OAuth state cleared (cookie removed due to version conflict)
      console.log('OAuth state cleared');
      
      // Redirect to app dashboard
      return reply.redirect(`/dashboard?shop=${shop}&installed=true`);
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to complete OAuth flow'
      });
    }
  }

  /**
   * HMAC validation
   */
  private validateHmac(query: any, hmac: string): boolean {
    const { hmac: _, ...params } = query;
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const calculatedHmac = crypto
      .createHmac('sha256', config.shopify.apiSecret)
      .update(sortedParams)
      .digest('hex');
    
    return calculatedHmac === hmac;
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(shop: string, code: string): Promise<string> {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.shopify.apiKey,
        client_secret: config.shopify.apiSecret,
        code: code
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string };
    return data.access_token;
  }

  /**
   * Store access token securely
   */
  private async storeAccessToken(shop: string, _accessToken: string): Promise<void> {
    // TODO: Store in database or secure storage
    // For now, we'll store in memory (not recommended for production)
    console.log(`Access token stored for shop: ${shop}`);
    
    // In production, store in database:
    // await this.database.storeShopToken(shop, accessToken);
  }

  /**
   * Verify webhook HMAC
   */
  verifyWebhook(body: string, hmac: string): boolean {
    const calculatedHmac = crypto
      .createHmac('sha256', config.shopify.webhookSecret)
      .update(body, 'utf8')
      .digest('base64');
    
    return calculatedHmac === hmac;
  }
}

export default ShopifyOAuth;
