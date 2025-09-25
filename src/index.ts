/**
 * Shopify Tracking App - Ana giriş noktası
 */

import ShopifyTrackingServer from './app/server';
import { config } from './app/config';

class ShopifyTrackingApp {
  private server: ShopifyTrackingServer;
  private isShuttingDown = false;

  constructor() {
    this.server = new ShopifyTrackingServer();
    this.setupGracefulShutdown();
  }

  /**
   * Uygulamayı başlat
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Shopify Tracking App başlatılıyor...');
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🔧 Port: ${config.port}`);
      
      await this.server.start();
      
      console.log('✅ Uygulama başarıyla başlatıldı!');
    } catch (error) {
      console.error('❌ Uygulama başlatılamadı:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown kurulumu
   */
  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach((signal) => {
      process.on(signal, async () => {
        if (this.isShuttingDown) {
          console.log('⚠️ Zorla kapatılıyor...');
          process.exit(1);
        }
        
        this.isShuttingDown = true;
        console.log(`\n🛑 ${signal} sinyali alındı. Güvenli şekilde kapatılıyor...`);
        
        try {
          await this.server.stop();
          console.log('✅ Uygulama güvenli şekilde kapatıldı');
          process.exit(0);
        } catch (error) {
          console.error('❌ Kapatma sırasında hata:', error);
          process.exit(1);
        }
      });
    });

    // Unhandled promise rejection
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Promise Rejection:', reason);
      console.error('Promise:', promise);
    });

    // Uncaught exception
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });
  }

  /**
   * Server instance'ını döndür
   */
  getServer(): ShopifyTrackingServer {
    return this.server;
  }
}

// Uygulamayı başlat
const app = new ShopifyTrackingApp();
app.start();

export default ShopifyTrackingApp;
