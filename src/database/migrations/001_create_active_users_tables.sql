-- Active Users Tracking - Supabase Tabloları
-- Migration: 001_create_active_users_tables.sql

-- 1. Dakikalık active users verisi tablosu
CREATE TABLE IF NOT EXISTS active_users_minutely (
    id BIGSERIAL PRIMARY KEY,
    shop TEXT NOT NULL,
    bucket_ts TIMESTAMPTZ NOT NULL,
    au_raw INTEGER NOT NULL DEFAULT 0,
    total_tabs INTEGER NOT NULL DEFAULT 0,
    au_ema_fast DECIMAL(10,2) NOT NULL DEFAULT 0,
    au_ema_slow DECIMAL(10,2) NOT NULL DEFAULT 0,
    window_seconds INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    UNIQUE(shop, bucket_ts)
);

-- 2. Günlük active users özeti tablosu
CREATE TABLE IF NOT EXISTS active_users_daily (
    id BIGSERIAL PRIMARY KEY,
    shop TEXT NOT NULL,
    day DATE NOT NULL,
    avg_au_raw DECIMAL(10,2) NOT NULL DEFAULT 0,
    p95_au_raw DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_au_raw INTEGER NOT NULL DEFAULT 0,
    max_au_raw_at TIMESTAMPTZ,
    avg_au_ema DECIMAL(10,2) NOT NULL DEFAULT 0,
    minutes_observed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    UNIQUE(shop, day)
);

-- 3. Active users state tablosu (EMA state için)
CREATE TABLE IF NOT EXISTS active_users_state (
    id BIGSERIAL PRIMARY KEY,
    shop TEXT NOT NULL UNIQUE,
    last_timestamp BIGINT NOT NULL,
    ema_fast DECIMAL(10,2) NOT NULL DEFAULT 0,
    ema_slow DECIMAL(10,2) NOT NULL DEFAULT 0,
    last_raw_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes oluştur
CREATE INDEX IF NOT EXISTS idx_active_users_minutely_shop ON active_users_minutely(shop);
CREATE INDEX IF NOT EXISTS idx_active_users_minutely_bucket_ts ON active_users_minutely(bucket_ts);
CREATE INDEX IF NOT EXISTS idx_active_users_minutely_shop_bucket ON active_users_minutely(shop, bucket_ts);

CREATE INDEX IF NOT EXISTS idx_active_users_daily_shop ON active_users_daily(shop);
CREATE INDEX IF NOT EXISTS idx_active_users_daily_day ON active_users_daily(day);
CREATE INDEX IF NOT EXISTS idx_active_users_daily_shop_day ON active_users_daily(shop, day);

CREATE INDEX IF NOT EXISTS idx_active_users_state_shop ON active_users_state(shop);

-- RLS (Row Level Security) politikaları
ALTER TABLE active_users_minutely ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_users_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_users_state ENABLE ROW LEVEL SECURITY;

-- RLS politikaları (shop bazında erişim)
CREATE POLICY "Users can access their own shop data" ON active_users_minutely
    FOR ALL USING (shop = current_setting('app.current_shop', true));

CREATE POLICY "Users can access their own shop data" ON active_users_daily
    FOR ALL USING (shop = current_setting('app.current_shop', true));

CREATE POLICY "Users can access their own shop data" ON active_users_state
    FOR ALL USING (shop = current_setting('app.current_shop', true));

-- Updated_at trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated_at trigger'ları
CREATE TRIGGER update_active_users_minutely_updated_at 
    BEFORE UPDATE ON active_users_minutely 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_active_users_daily_updated_at 
    BEFORE UPDATE ON active_users_daily 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_active_users_state_updated_at 
    BEFORE UPDATE ON active_users_state 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
