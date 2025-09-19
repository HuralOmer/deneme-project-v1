import { createRequire } from 'module';
import dotenv from 'dotenv';

// ES modules için require polyfill
const require = createRequire(import.meta.url);

// Environment variables yükle
dotenv.config();

console.log('🚀 Starting Test Server...');
console.log('Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- REDIS_URL:', process.env.REDIS_URL ? 'Set' : 'Not set');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');

// Basit HTTP server
import http from 'http';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Test Server is running!',
      timestamp: new Date().toISOString()
    }));
  }
});

const port = process.env.PORT || 3000;
const host = '0.0.0.0';

server.listen(port, host, () => {
  console.log(`✅ Test server başlatıldı: http://${host}:${port}`);
  console.log(`✅ Health check: http://${host}:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM sinyali alındı, server kapatılıyor...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT sinyali alındı, server kapatılıyor...');
  server.close(() => {
    process.exit(0);
  });
});
