/**
 * Shopify Tracking App - Entry Point
 * Railway deployment için
 */

const { createRequire } = require('module');
const path = require('path');

// ES modules için require polyfill
const require = createRequire(import.meta.url);

// Environment variables yükle
require('dotenv').config();

// TypeScript build edilmiş dosyayı import et
const { default: ShopifyTrackingServer } = require('./dist/app/server.js');

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
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
