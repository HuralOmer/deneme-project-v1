/**
 * Active Users Tracking - Heartbeat Mechanism
 */

import { HeartbeatPayload, PresenceData } from './types.js';
import { HEARTBEAT_MS, JITTER_MS, ACTIVITY_TIMEOUT_MS } from './constants.js';

/**
 * Heartbeat manager sınıfı
 */
export class HeartbeatManager {
  private presenceTracker: any; // PresenceTracker instance
  private lastActivity: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activityTimeout: NodeJS.Timeout | null = null;
  
  constructor(presenceTracker: any) {
    this.presenceTracker = presenceTracker;
  }
  
  /**
   * Heartbeat başlat
   * @param payload Heartbeat payload
   */
  async startHeartbeat(payload: HeartbeatPayload): Promise<void> {
    // Mevcut heartbeat'i durdur
    this.stopHeartbeat();
    
    // İlk presence'i ekle
    await this.updatePresence(payload);
    
    // Jitter ile heartbeat interval'ı hesapla
    const jitter = Math.random() * JITTER_MS * 2 - JITTER_MS; // ±JITTER_MS
    const interval = HEARTBEAT_MS + jitter;
    
    // Heartbeat interval'ını başlat
    this.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat(payload);
    }, interval);
    
    // Activity timeout'ını başlat
    this.resetActivityTimeout();
    
    console.log(`Heartbeat started for ${payload.visitorId} (${payload.shop})`);
  }
  
  /**
   * Heartbeat durdur
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
      this.activityTimeout = null;
    }
  }
  
  /**
   * Activity kaydet (mouse, keyboard, scroll)
   * @param payload Heartbeat payload
   */
  async recordActivity(payload: HeartbeatPayload): Promise<void> {
    this.lastActivity = Date.now();
    
    // Activity timeout'ını sıfırla
    this.resetActivityTimeout();
    
    // Presence'i güncelle
    await this.updatePresence({
      ...payload,
      activity: 'activity',
    });
  }
  
  /**
   * Page unload işlemi
   * @param payload Heartbeat payload
   */
  async handleUnload(payload: HeartbeatPayload): Promise<void> {
    // Heartbeat'i durdur
    this.stopHeartbeat();
    
    // Visitor'ı presence'den çıkar
    await this.presenceTracker.removeVisitor(
      payload.shop,
      payload.visitorId,
      payload.sessionId
    );
    
    console.log(`Visitor ${payload.visitorId} unloaded from ${payload.shop}`);
  }
  
  /**
   * Heartbeat gönder
   * @param payload Heartbeat payload
   */
  private async sendHeartbeat(payload: HeartbeatPayload): Promise<void> {
    try {
      await this.updatePresence(payload);
      console.log(`Heartbeat sent for ${payload.visitorId}`);
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }
  
  /**
   * Presence'i güncelle
   * @param payload Heartbeat payload
   */
  private async updatePresence(payload: HeartbeatPayload): Promise<void> {
    const presenceData: PresenceData = {
      visitorId: payload.visitorId,
      sessionId: payload.sessionId,
      shop: payload.shop,
      timestamp: payload.timestamp,
      userAgent: payload.userAgent,
      lastActivity: this.lastActivity || payload.timestamp,
    };
    
    await this.presenceTracker.addVisitor(presenceData);
  }
  
  /**
   * Activity timeout'ını sıfırla
   */
  private resetActivityTimeout(): void {
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }
    
    this.activityTimeout = setTimeout(() => {
      console.log('Activity timeout - marking as inactive');
      // İsteğe bağlı: inactivity durumunu işle
    }, ACTIVITY_TIMEOUT_MS);
  }
}

/**
 * Client-side heartbeat script generator
 */
export function generateHeartbeatScript(apiUrl: string, shop: string): string {
  return `
(function() {
  'use strict';
  
  // Heartbeat configuration
  const HEARTBEAT_MS = ${HEARTBEAT_MS};
  const JITTER_MS = ${JITTER_MS};
  const ACTIVITY_TIMEOUT_MS = ${ACTIVITY_TIMEOUT_MS};
  
  // Visitor and session IDs
  const visitorId = window.ShopifyTracking?.visitorId || generateVisitorId();
  const sessionId = window.ShopifyTracking?.sessionId || generateSessionId();
  
  let lastActivity = Date.now();
  let heartbeatInterval = null;
  let activityTimeout = null;
  
  // Generate unique IDs
  function generateVisitorId() {
    return 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Send heartbeat
  async function sendHeartbeat() {
    try {
      const payload = {
        visitorId: visitorId,
        sessionId: sessionId,
        shop: '${shop}',
        timestamp: Date.now(),
        activity: 'heartbeat',
        userAgent: navigator.userAgent
      };
      
      await fetch('${apiUrl}/api/tracking/presence/beat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }
  
  // Record activity
  async function recordActivity() {
    lastActivity = Date.now();
    
    try {
      const payload = {
        visitorId: visitorId,
        sessionId: sessionId,
        shop: '${shop}',
        timestamp: Date.now(),
        activity: 'activity',
        userAgent: navigator.userAgent
      };
      
      await fetch('${apiUrl}/api/tracking/presence/beat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Activity recording error:', error);
    }
  }
  
  // Start heartbeat
  function startHeartbeat() {
    // Initial heartbeat
    sendHeartbeat();
    
    // Calculate jitter
    const jitter = Math.random() * JITTER_MS * 2 - JITTER_MS;
    const interval = HEARTBEAT_MS + jitter;
    
    // Set up interval
    heartbeatInterval = setInterval(sendHeartbeat, interval);
    
    // Activity timeout
    resetActivityTimeout();
    
    console.log('Active Users heartbeat started');
  }
  
  // Reset activity timeout
  function resetActivityTimeout() {
    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }
    
    activityTimeout = setTimeout(() => {
      console.log('Activity timeout');
    }, ACTIVITY_TIMEOUT_MS);
  }
  
  // Handle page unload
  function handleUnload() {
    if (navigator.sendBeacon) {
      const payload = {
        visitorId: visitorId,
        sessionId: sessionId,
        shop: '${shop}',
        timestamp: Date.now(),
        activity: 'unload',
        userAgent: navigator.userAgent
      };
      
      navigator.sendBeacon(
        '${apiUrl}/api/tracking/presence/bye',
        JSON.stringify(payload)
      );
    }
  }
  
  // Event listeners
  document.addEventListener('DOMContentLoaded', function() {
    startHeartbeat();
    
    // Activity detection
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, recordActivity, true);
    });
    
    // Page unload
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
  });
  
  // Export for global access
  window.ShopifyTracking = window.ShopifyTracking || {};
  window.ShopifyTracking.visitorId = visitorId;
  window.ShopifyTracking.sessionId = sessionId;
  window.ShopifyTracking.activeUsers = {
    startHeartbeat: startHeartbeat,
    stopHeartbeat: function() {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (activityTimeout) clearTimeout(activityTimeout);
    }
  };
})();
`;
}
