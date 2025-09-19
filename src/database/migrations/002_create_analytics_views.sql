-- Active Users Analytics - View'lar
-- Migration: 002_create_analytics_views.sql

-- 1. Real-time active users view (son 5 dakika)
CREATE OR REPLACE VIEW active_users_realtime AS
SELECT 
    shop,
    bucket_ts,
    au_raw as active_users,
    au_ema_fast as ema_fast,
    au_ema_slow as ema_slow,
    CASE 
        WHEN au_ema_fast > au_ema_slow * 1.05 THEN 'increasing'
        WHEN au_ema_fast < au_ema_slow * 0.95 THEN 'decreasing'
        ELSE 'stable'
    END as trend,
    total_tabs,
    window_seconds
FROM active_users_minutely
WHERE bucket_ts >= NOW() - INTERVAL '5 minutes'
ORDER BY shop, bucket_ts DESC;

-- 2. Günlük özet view
CREATE OR REPLACE VIEW active_users_daily_summary AS
SELECT 
    shop,
    day,
    avg_au_raw as avg_active_users,
    max_au_raw as peak_active_users,
    max_au_raw_at as peak_time,
    avg_au_ema as avg_ema,
    minutes_observed,
    ROUND((avg_au_raw / NULLIF(avg_au_ema, 0) - 1) * 100, 2) as accuracy_percentage
FROM active_users_daily
ORDER BY shop, day DESC;

-- 3. Haftalık trend view
CREATE OR REPLACE VIEW active_users_weekly_trend AS
SELECT 
    shop,
    DATE_TRUNC('week', day) as week_start,
    AVG(avg_au_raw) as weekly_avg_active_users,
    MAX(max_au_raw) as weekly_peak_active_users,
    COUNT(*) as days_observed,
    ROUND(
        (AVG(avg_au_raw) - LAG(AVG(avg_au_raw)) OVER (PARTITION BY shop ORDER BY DATE_TRUNC('week', day))) / 
        NULLIF(LAG(AVG(avg_au_raw)) OVER (PARTITION BY shop ORDER BY DATE_TRUNC('week', day)), 0) * 100, 
        2
    ) as week_over_week_change
FROM active_users_daily
GROUP BY shop, DATE_TRUNC('week', day)
ORDER BY shop, week_start DESC;

-- 4. Aylık trend view
CREATE OR REPLACE VIEW active_users_monthly_trend AS
SELECT 
    shop,
    DATE_TRUNC('month', day) as month_start,
    AVG(avg_au_raw) as monthly_avg_active_users,
    MAX(max_au_raw) as monthly_peak_active_users,
    COUNT(*) as days_observed,
    ROUND(
        (AVG(avg_au_raw) - LAG(AVG(avg_au_raw)) OVER (PARTITION BY shop ORDER BY DATE_TRUNC('month', day))) / 
        NULLIF(LAG(AVG(avg_au_raw)) OVER (PARTITION BY shop ORDER BY DATE_TRUNC('month', day)), 0) * 100, 
        2
    ) as month_over_month_change
FROM active_users_daily
GROUP BY shop, DATE_TRUNC('month', day)
ORDER BY shop, month_start DESC;

-- 5. Saatlik dağılım view (günlük pattern)
CREATE OR REPLACE VIEW active_users_hourly_pattern AS
SELECT 
    shop,
    EXTRACT(hour FROM bucket_ts) as hour_of_day,
    AVG(au_raw) as avg_active_users,
    MAX(au_raw) as max_active_users,
    COUNT(*) as data_points,
    ROUND(STDDEV(au_raw), 2) as std_deviation
FROM active_users_minutely
WHERE bucket_ts >= NOW() - INTERVAL '30 days'
GROUP BY shop, EXTRACT(hour FROM bucket_ts)
ORDER BY shop, hour_of_day;

-- 6. Performance metrics view
CREATE OR REPLACE VIEW active_users_performance AS
SELECT 
    shop,
    COUNT(DISTINCT DATE(bucket_ts)) as days_tracked,
    COUNT(*) as total_minutes_tracked,
    AVG(au_raw) as overall_avg_active_users,
    MAX(au_raw) as all_time_peak,
    MIN(au_raw) as all_time_low,
    ROUND(AVG(au_ema_fast), 2) as avg_ema_fast,
    ROUND(AVG(au_ema_slow), 2) as avg_ema_slow,
    ROUND(
        AVG(CASE 
            WHEN au_ema_fast > au_ema_slow * 1.05 THEN 1
            WHEN au_ema_fast < au_ema_slow * 0.95 THEN -1
            ELSE 0
        END), 2
    ) as avg_trend_direction
FROM active_users_minutely
GROUP BY shop
ORDER BY overall_avg_active_users DESC;

-- 7. Anomali detection view (normalden sapma)
CREATE OR REPLACE VIEW active_users_anomalies AS
WITH stats AS (
    SELECT 
        shop,
        AVG(au_raw) as mean_active_users,
        STDDEV(au_raw) as std_active_users
    FROM active_users_minutely
    WHERE bucket_ts >= NOW() - INTERVAL '7 days'
    GROUP BY shop
)
SELECT 
    m.shop,
    m.bucket_ts,
    m.au_raw as active_users,
    s.mean_active_users,
    s.std_active_users,
    ROUND(
        ABS(m.au_raw - s.mean_active_users) / NULLIF(s.std_active_users, 0), 
        2
    ) as z_score,
    CASE 
        WHEN ABS(m.au_raw - s.mean_active_users) > s.std_active_users * 2 THEN 'high_anomaly'
        WHEN ABS(m.au_raw - s.mean_active_users) > s.std_active_users * 1.5 THEN 'medium_anomaly'
        ELSE 'normal'
    END as anomaly_level
FROM active_users_minutely m
JOIN stats s ON m.shop = s.shop
WHERE m.bucket_ts >= NOW() - INTERVAL '24 hours'
    AND ABS(m.au_raw - s.mean_active_users) > s.std_active_users * 1.5
ORDER BY m.shop, ABS(m.au_raw - s.mean_active_users) DESC;

-- Index'ler view'lar için optimize et
CREATE INDEX IF NOT EXISTS idx_active_users_minutely_shop_ts ON active_users_minutely(shop, bucket_ts);
CREATE INDEX IF NOT EXISTS idx_active_users_daily_shop_day ON active_users_daily(shop, day);

-- RLS politikaları view'lar için
CREATE POLICY "Users can access their own analytics data" ON active_users_minutely
    FOR SELECT USING (shop = current_setting('app.current_shop', true));

CREATE POLICY "Users can access their own analytics data" ON active_users_daily
    FOR SELECT USING (shop = current_setting('app.current_shop', true));
