/**
 * Shopify Tracking App - Entry Point
 * Railway deployment için
 */

import { createRequire } from 'module';
import path from 'path';
import dotenv from 'dotenv';

// ES modules için require polyfill
const require = createRequire(import.meta.url);

// Environment variables yükle
dotenv.config();

// TypeScript build edilmiş dosyayı import et
const { default: ShopifyTrackingServer } = await import('./dist/app/server.js');

// Server instance oluştur
const server = new ShopifyTrackingServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

// Unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Server'ı başlat
console.log('🚀 Starting Shopify Tracking App...');
console.log('Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('- REDIS_URL:', process.env.REDIS_URL ? 'Set' : 'Not set');

server.start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  console.error('Error details:', error.stack);
  process.exit(1);
});
