/**
 * Database Types for Supabase
 */

export interface Database {
  public: {
    Tables: {
      active_users_minutely: {
        Row: {
          id: number;
          shop: string;
          bucket_ts: string;
          au_raw: number;
          total_tabs: number;
          au_ema_fast: number;
          au_ema_slow: number;
          window_seconds: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop: string;
          bucket_ts: string;
          au_raw?: number;
          total_tabs?: number;
          au_ema_fast?: number;
          au_ema_slow?: number;
          window_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop?: string;
          bucket_ts?: string;
          au_raw?: number;
          total_tabs?: number;
          au_ema_fast?: number;
          au_ema_slow?: number;
          window_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      active_users_daily: {
        Row: {
          id: number;
          shop: string;
          day: string;
          avg_au_raw: number;
          p95_au_raw: number;
          max_au_raw: number;
          max_au_raw_at: string | null;
          avg_au_ema: number;
          minutes_observed: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop: string;
          day: string;
          avg_au_raw?: number;
          p95_au_raw?: number;
          max_au_raw?: number;
          max_au_raw_at?: string | null;
          avg_au_ema?: number;
          minutes_observed?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop?: string;
          day?: string;
          avg_au_raw?: number;
          p95_au_raw?: number;
          max_au_raw?: number;
          max_au_raw_at?: string | null;
          avg_au_ema?: number;
          minutes_observed?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      active_users_state: {
        Row: {
          id: number;
          shop: string;
          last_timestamp: number;
          ema_fast: number;
          ema_slow: number;
          last_raw_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          shop: string;
          last_timestamp: number;
          ema_fast?: number;
          ema_slow?: number;
          last_raw_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop?: string;
          last_timestamp?: number;
          ema_fast?: number;
          ema_slow?: number;
          last_raw_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
