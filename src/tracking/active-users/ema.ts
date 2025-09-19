/**
 * Active Users Tracking - EMA (Exponential Moving Average) Algorithm
 */

import { EMAResult, ActiveUsersState } from './types.js';
import { EMA_TAU_FAST, EMA_TAU_SLOW, TREND_THRESHOLDS } from './constants.js';

/**
 * Sürekli zaman katsayısı hesaplama
 * @param tau Time constant (saniye)
 * @param dt Time delta (saniye)
 * @returns Alpha coefficient
 */
export function alpha(tau: number, dt: number = 1): number {
  return 1 - Math.exp(-dt / tau);
}

/**
 * EMA güncelleme adımı
 * @param currentValue Mevcut EMA değeri
 * @param newValue Yeni gelen değer
 * @param alpha Alpha katsayısı
 * @returns Güncellenmiş EMA değeri
 */
export function emaStep(currentValue: number, newValue: number, alpha: number): number {
  return alpha * newValue + (1 - alpha) * currentValue;
}

/**
 * Active users için EMA hesaplama
 * @param state Mevcut state
 * @param rawCount Yeni raw count
 * @param timestamp Timestamp
 * @returns EMA sonuçları
 */
export function calculateEMA(
  state: ActiveUsersState | null,
  rawCount: number,
  timestamp: number
): EMAResult {
  const dt = state ? (timestamp - state.lastTimestamp) / 1000 : 1; // saniye cinsinden
  
  // Alpha katsayılarını hesapla
  const alphaFast = alpha(EMA_TAU_FAST, dt);
  const alphaSlow = alpha(EMA_TAU_SLOW, dt);
  
  // EMA değerlerini güncelle
  const emaFast = state 
    ? emaStep(state.emaFast, rawCount, alphaFast)
    : rawCount; // İlk değer
    
  const emaSlow = state 
    ? emaStep(state.emaSlow, rawCount, alphaSlow)
    : rawCount; // İlk değer
  
  // Trend hesapla (fast vs slow EMA)
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  
  if (state) {
    const trendRatio = (emaFast - emaSlow) / emaSlow;
    
    if (trendRatio > TREND_THRESHOLDS.INCREASING) {
      trend = 'increasing';
    } else if (trendRatio < TREND_THRESHOLDS.DECREASING) {
      trend = 'decreasing';
    }
  }
  
  return {
    emaFast,
    emaSlow,
    trend,
    rawCount,
    timestamp,
  };
}

/**
 * State'i güncelle
 * @param state Mevcut state
 * @param emaResult EMA hesaplama sonucu
 * @param shop Shop ID
 * @returns Güncellenmiş state
 */
export function updateState(
  _state: ActiveUsersState | null,
  emaResult: EMAResult,
  shop: string
): ActiveUsersState {
  return {
    shop,
    lastTimestamp: emaResult.timestamp,
    emaFast: emaResult.emaFast,
    emaSlow: emaResult.emaSlow,
    lastRawCount: emaResult.rawCount,
  };
}

/**
 * EMA değerlerini sıfırla (shop değiştiğinde)
 * @param shop Shop ID
 * @param timestamp Timestamp
 * @returns Yeni state
 */
export function resetState(shop: string, timestamp: number): ActiveUsersState {
  return {
    shop,
    lastTimestamp: timestamp,
    emaFast: 0,
    emaSlow: 0,
    lastRawCount: 0,
  };
}
