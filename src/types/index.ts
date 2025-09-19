/**
 * Shopify Tracking App - Temel Tip Tanımları
 */

// Kullanıcı oturum bilgileri
export interface UserSession {
  id: string;
  userId?: string | undefined;
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  isActive: boolean;
  deviceInfo: DeviceInfo;
  geoInfo: GeoInfo;
}

// Cihaz bilgileri
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  screenResolution: string;
  timezone: string;
  language: string;
}

// Coğrafi bilgiler
export interface GeoInfo {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
}

// Sayfa analitik verileri
export interface PageAnalytics {
  pageId: string;
  url: string;
  title: string;
  referrer?: string;
  loadTime: number;
  viewTime: number;
  scrollDepth: number;
  timestamp: Date;
  sessionId: string;
}

// E-ticaret olayları
export interface EcommerceEvent {
  eventType: 'view_item' | 'add_to_cart' | 'remove_from_cart' | 'purchase' | 'begin_checkout';
  productId?: string;
  productName?: string;
  category?: string;
  price?: number;
  quantity?: number;
  currency?: string;
  orderId?: string;
  timestamp: Date;
  sessionId: string;
}

// Performans metrikleri
export interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timestamp: Date;
  pageId: string;
}

// API yanıt tipleri
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Shopify webhook verisi
export interface ShopifyWebhook {
  id: string;
  topic: string;
  shop_domain: string;
  data: any;
  timestamp: Date;
}

// Tracking ayarları
export interface TrackingConfig {
  enablePageTracking: boolean;
  enableEcommerceTracking: boolean;
  enablePerformanceTracking: boolean;
  enableUserBehaviorTracking: boolean;
  enableGeoTracking: boolean;
  consentRequired: boolean;
  dataRetentionDays: number;
}

// All types are already exported above
