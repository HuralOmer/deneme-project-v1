/**
 * Supabase Database Client
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL ve Service Key environment variables gerekli');
}

// Supabase client oluştur
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database tipleri artık ayrı dosyadan import ediliyor

// Database helper fonksiyonları
export class DatabaseService {
  private supabase = supabase;

  /**
   * Dakikalık active users verisi ekle
   */
  async insertMinutelyData(data: {
    shop: string;
    bucket_ts: Date;
    au_raw: number;
    total_tabs: number;
    au_ema_fast: number;
    au_ema_slow: number;
    window_seconds?: number;
  }) {
    const { data: result, error } = await this.supabase
      .from('active_users_minutely')
      .insert({
        shop: data.shop,
        bucket_ts: data.bucket_ts.toISOString(),
        au_raw: data.au_raw,
        total_tabs: data.total_tabs,
        au_ema_fast: data.au_ema_fast,
        au_ema_slow: data.au_ema_slow,
        window_seconds: data.window_seconds || 60,
      });

    if (error) {
      throw new Error(`Minutely data insert error: ${error.message}`);
    }

    return result;
  }

  /**
   * Günlük active users verisi ekle
   */
  async insertDailyData(data: {
    shop: string;
    day: Date;
    avg_au_raw: number;
    p95_au_raw: number;
    max_au_raw: number;
    max_au_raw_at: Date;
    avg_au_ema: number;
    minutes_observed: number;
  }) {
    const { data: result, error } = await this.supabase
      .from('active_users_daily')
      .insert({
        shop: data.shop,
        day: data.day.toISOString().split('T')[0], // YYYY-MM-DD format
        avg_au_raw: data.avg_au_raw,
        p95_au_raw: data.p95_au_raw,
        max_au_raw: data.max_au_raw,
        max_au_raw_at: data.max_au_raw_at.toISOString(),
        avg_au_ema: data.avg_au_ema,
        minutes_observed: data.minutes_observed,
      });

    if (error) {
      throw new Error(`Daily data insert error: ${error.message}`);
    }

    return result;
  }

  /**
   * Active users state güncelle
   */
  async updateState(data: {
    shop: string;
    last_timestamp: number;
    ema_fast: number;
    ema_slow: number;
    last_raw_count: number;
  }) {
    const { data: result, error } = await this.supabase
      .from('active_users_state')
      .insert({
        shop: data.shop,
        last_timestamp: data.last_timestamp,
        ema_fast: data.ema_fast,
        ema_slow: data.ema_slow,
        last_raw_count: data.last_raw_count,
      });

    if (error) {
      throw new Error(`State update error: ${error.message}`);
    }

    return result;
  }

  /**
   * Active users state al
   */
  async getState(shop: string) {
    const { data, error } = await this.supabase
      .from('active_users_state')
      .select('*')
      .eq('shop', shop)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`State get error: ${error.message}`);
    }

    return data;
  }

  /**
   * Dakikalık veri al (belirli tarih aralığında)
   */
  async getMinutelyData(shop: string, startDate: Date, endDate: Date) {
    const { data, error } = await this.supabase
      .from('active_users_minutely')
      .select('*')
      .eq('shop', shop)
      .gte('bucket_ts', startDate.toISOString())
      .lte('bucket_ts', endDate.toISOString())
      .order('bucket_ts', { ascending: true });

    if (error) {
      throw new Error(`Minutely data get error: ${error.message}`);
    }

    return data;
  }

  /**
   * Günlük veri al (belirli tarih aralığında)
   */
  async getDailyData(shop: string, startDate: Date, endDate: Date) {
    const { data, error } = await this.supabase
      .from('active_users_daily')
      .select('*')
      .eq('shop', shop)
      .gte('day', startDate.toISOString().split('T')[0])
      .lte('day', endDate.toISOString().split('T')[0])
      .order('day', { ascending: true });

    if (error) {
      throw new Error(`Daily data get error: ${error.message}`);
    }

    return data;
  }
}

// Singleton instance
export const dbService = new DatabaseService();
