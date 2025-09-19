/**
 * Shopify Tracking App - Konfigürasyon
 */

import { TrackingConfig } from '../types';

// Environment variables
export const config = {
  // Server ayarları
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Shopify ayarları
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || '',
    shopDomain: process.env.SHOPIFY_SHOP_DOMAIN || '',
  },
  
  // Veritabanı ayarları
  database: {
    url: process.env.DATABASE_URL || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_ANON_KEY || '',
  },
  
  // Redis ayarları
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || '',
  },
  
  // Tracking ayarları
  tracking: {
    enablePageTracking: process.env.ENABLE_PAGE_TRACKING !== 'false',
    enableEcommerceTracking: process.env.ENABLE_ECOMMERCE_TRACKING !== 'false',
    enablePerformanceTracking: process.env.ENABLE_PERFORMANCE_TRACKING !== 'false',
    enableUserBehaviorTracking: process.env.ENABLE_USER_BEHAVIOR_TRACKING !== 'false',
    enableGeoTracking: process.env.ENABLE_GEO_TRACKING !== 'false',
    consentRequired: process.env.CONSENT_REQUIRED === 'true',
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '365', 10),
  } as TrackingConfig,
  
  // CORS ayarları
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 dakika
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 istek
  },
};

// Konfigürasyon doğrulama
export function validateConfig(): void {
  // Development modunda zorunlu değil, sadece uyarı ver
  if (config.nodeEnv === 'development') {
    const recommended = [
      'SHOPIFY_API_KEY',
      'SHOPIFY_API_SECRET',
      'DATABASE_URL',
    ];
    
    const missing = recommended.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`⚠️  Önerilen environment variables eksik: ${missing.join(', ')}`);
      console.warn('   Development modunda çalışıyor, production için gerekli!');
    }
    return;
  }
  
  // Production modunda zorunlu
  const required = [
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'DATABASE_URL',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Eksik environment variables: ${missing.join(', ')}`);
  }
}

export default config;
