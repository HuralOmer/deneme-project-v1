-- Active Users Analytics - Fonksiyonlar
-- Migration: 003_create_functions.sql

-- 1. Günlük özet hesaplama fonksiyonu
CREATE OR REPLACE FUNCTION calculate_daily_summary(
    p_shop TEXT,
    p_day DATE
) RETURNS TABLE (
    shop TEXT,
    day DATE,
    avg_au_raw DECIMAL(10,2),
    p95_au_raw DECIMAL(10,2),
    max_au_raw INTEGER,
    max_au_raw_at TIMESTAMPTZ,
    avg_au_ema DECIMAL(10,2),
    minutes_observed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_shop,
        p_day,
        ROUND(AVG(au_raw), 2) as avg_au_raw,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY au_raw), 2) as p95_au_raw,
        MAX(au_raw) as max_au_raw,
        MAX(CASE WHEN au_raw = (SELECT MAX(au_raw) FROM active_users_minutely WHERE shop = p_shop AND DATE(bucket_ts) = p_day) THEN bucket_ts END) as max_au_raw_at,
        ROUND(AVG(au_ema_slow), 2) as avg_au_ema,
        COUNT(*) as minutes_observed
    FROM active_users_minutely
    WHERE shop = p_shop 
        AND DATE(bucket_ts) = p_day;
END;
$$ LANGUAGE plpgsql;

-- 2. Trend hesaplama fonksiyonu
CREATE OR REPLACE FUNCTION calculate_trend(
    p_shop TEXT,
    p_current_period INTERVAL DEFAULT '1 hour'
) RETURNS TABLE (
    trend TEXT,
    change_percentage DECIMAL(5,2),
    current_avg DECIMAL(10,2),
    previous_avg DECIMAL(10,2)
) AS $$
DECLARE
    current_avg DECIMAL(10,2);
    previous_avg DECIMAL(10,2);
    change_pct DECIMAL(5,2);
    trend_type TEXT;
BEGIN
    -- Mevcut dönem ortalaması
    SELECT AVG(au_raw) INTO current_avg
    FROM active_users_minutely
    WHERE shop = p_shop 
        AND bucket_ts >= NOW() - p_current_period;
    
    -- Önceki dönem ortalaması
    SELECT AVG(au_raw) INTO previous_avg
    FROM active_users_minutely
    WHERE shop = p_shop 
        AND bucket_ts >= NOW() - (p_current_period * 2)
        AND bucket_ts < NOW() - p_current_period;
    
    -- Değişim yüzdesi hesapla
    IF previous_avg > 0 THEN
        change_pct := ROUND(((current_avg - previous_avg) / previous_avg) * 100, 2);
    ELSE
        change_pct := 0;
    END IF;
    
    -- Trend belirle
    IF change_pct > 5 THEN
        trend_type := 'increasing';
    ELSIF change_pct < -5 THEN
        trend_type := 'decreasing';
    ELSE
        trend_type := 'stable';
    END IF;
    
    RETURN QUERY SELECT trend_type, change_pct, current_avg, previous_avg;
END;
$$ LANGUAGE plpgsql;

-- 3. Anomali tespit fonksiyonu
CREATE OR REPLACE FUNCTION detect_anomalies(
    p_shop TEXT,
    p_threshold DECIMAL DEFAULT 2.0
) RETURNS TABLE (
    bucket_ts TIMESTAMPTZ,
    au_raw INTEGER,
    z_score DECIMAL(5,2),
    anomaly_level TEXT
) AS $$
DECLARE
    mean_val DECIMAL(10,2);
    std_val DECIMAL(10,2);
BEGIN
    -- Son 7 günün istatistiklerini hesapla
    SELECT AVG(au_raw), STDDEV(au_raw) INTO mean_val, std_val
    FROM active_users_minutely
    WHERE shop = p_shop 
        AND bucket_ts >= NOW() - INTERVAL '7 days';
    
    -- Anomalileri tespit et
    RETURN QUERY
    SELECT 
        m.bucket_ts,
        m.au_raw,
        ROUND(ABS(m.au_raw - mean_val) / NULLIF(std_val, 0), 2) as z_score,
        CASE 
            WHEN ABS(m.au_raw - mean_val) > std_val * p_threshold THEN 'high_anomaly'
            WHEN ABS(m.au_raw - mean_val) > std_val * (p_threshold * 0.75) THEN 'medium_anomaly'
            ELSE 'normal'
        END as anomaly_level
    FROM active_users_minutely m
    WHERE m.shop = p_shop 
        AND m.bucket_ts >= NOW() - INTERVAL '24 hours'
        AND ABS(m.au_raw - mean_val) > std_val * (p_threshold * 0.75)
    ORDER BY ABS(m.au_raw - mean_val) DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Saatlik pattern analizi fonksiyonu
CREATE OR REPLACE FUNCTION analyze_hourly_pattern(
    p_shop TEXT,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    hour_of_day INTEGER,
    avg_active_users DECIMAL(10,2),
    max_active_users INTEGER,
    data_points BIGINT,
    std_deviation DECIMAL(10,2),
    confidence_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(hour FROM bucket_ts)::INTEGER as hour_of_day,
        ROUND(AVG(au_raw), 2) as avg_active_users,
        MAX(au_raw) as max_active_users,
        COUNT(*) as data_points,
        ROUND(STDDEV(au_raw), 2) as std_deviation,
        CASE 
            WHEN COUNT(*) >= 20 THEN 'high'
            WHEN COUNT(*) >= 10 THEN 'medium'
            ELSE 'low'
        END as confidence_level
    FROM active_users_minutely
    WHERE shop = p_shop 
        AND bucket_ts >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY EXTRACT(hour FROM bucket_ts)
    ORDER BY hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- 5. Performance metrics fonksiyonu
CREATE OR REPLACE FUNCTION get_performance_metrics(
    p_shop TEXT,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    metric_name TEXT,
    metric_value DECIMAL(10,2),
    metric_unit TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH metrics AS (
        SELECT 
            COUNT(DISTINCT DATE(bucket_ts)) as days_tracked,
            COUNT(*) as total_minutes,
            AVG(au_raw) as avg_active_users,
            MAX(au_raw) as peak_active_users,
            MIN(au_raw) as min_active_users,
            ROUND(AVG(au_ema_fast), 2) as avg_ema_fast,
            ROUND(AVG(au_ema_slow), 2) as avg_ema_slow,
            ROUND(
                AVG(CASE 
                    WHEN au_ema_fast > au_ema_slow * 1.05 THEN 1
                    WHEN au_ema_fast < au_ema_slow * 0.95 THEN -1
                    ELSE 0
                END), 2
            ) as trend_direction
        FROM active_users_minutely
        WHERE shop = p_shop 
            AND bucket_ts >= NOW() - (p_days || ' days')::INTERVAL
    )
    SELECT 'Days Tracked'::TEXT, days_tracked::DECIMAL(10,2), 'days'::TEXT FROM metrics
    UNION ALL
    SELECT 'Total Minutes'::TEXT, total_minutes::DECIMAL(10,2), 'minutes'::TEXT FROM metrics
    UNION ALL
    SELECT 'Average Active Users'::TEXT, avg_active_users, 'users'::TEXT FROM metrics
    UNION ALL
    SELECT 'Peak Active Users'::TEXT, peak_active_users::DECIMAL(10,2), 'users'::TEXT FROM metrics
    UNION ALL
    SELECT 'Min Active Users'::TEXT, min_active_users::DECIMAL(10,2), 'users'::TEXT FROM metrics
    UNION ALL
    SELECT 'Average EMA Fast'::TEXT, avg_ema_fast, 'users'::TEXT FROM metrics
    UNION ALL
    SELECT 'Average EMA Slow'::TEXT, avg_ema_slow, 'users'::TEXT FROM metrics
    UNION ALL
    SELECT 'Trend Direction'::TEXT, trend_direction, 'score'::TEXT FROM metrics;
END;
$$ LANGUAGE plpgsql;

-- 6. Cleanup fonksiyonu (eski verileri temizle)
CREATE OR REPLACE FUNCTION cleanup_old_data(
    p_shop TEXT,
    p_retention_days INTEGER DEFAULT 90
) RETURNS TABLE (
    table_name TEXT,
    deleted_rows BIGINT
) AS $$
DECLARE
    minutely_deleted BIGINT;
    daily_deleted BIGINT;
    state_deleted BIGINT;
BEGIN
    -- Eski dakikalık verileri sil
    DELETE FROM active_users_minutely 
    WHERE shop = p_shop 
        AND bucket_ts < NOW() - (p_retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS minutely_deleted = ROW_COUNT;
    
    -- Eski günlük verileri sil
    DELETE FROM active_users_daily 
    WHERE shop = p_shop 
        AND day < (NOW() - (p_retention_days || ' days')::INTERVAL)::DATE;
    GET DIAGNOSTICS daily_deleted = ROW_COUNT;
    
    -- State tablosundan eski verileri sil (eğer 30 günden eskiyse)
    DELETE FROM active_users_state 
    WHERE shop = p_shop 
        AND updated_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS state_deleted = ROW_COUNT;
    
    RETURN QUERY
    SELECT 'active_users_minutely'::TEXT, minutely_deleted
    UNION ALL
    SELECT 'active_users_daily'::TEXT, daily_deleted
    UNION ALL
    SELECT 'active_users_state'::TEXT, state_deleted;
END;
$$ LANGUAGE plpgsql;

-- 7. Real-time active users fonksiyonu
CREATE OR REPLACE FUNCTION get_realtime_active_users(
    p_shop TEXT
) RETURNS TABLE (
    active_users INTEGER,
    trend TEXT,
    last_updated TIMESTAMPTZ,
    confidence_level TEXT
) AS $$
DECLARE
    latest_data RECORD;
    trend_result RECORD;
BEGIN
    -- En son veriyi al
    SELECT au_raw, au_ema_fast, au_ema_slow, bucket_ts
    INTO latest_data
    FROM active_users_minutely
    WHERE shop = p_shop
    ORDER BY bucket_ts DESC
    LIMIT 1;
    
    IF latest_data IS NULL THEN
        RETURN QUERY SELECT 0, 'no_data'::TEXT, NOW(), 'low'::TEXT;
        RETURN;
    END IF;
    
    -- Trend hesapla
    SELECT * INTO trend_result
    FROM calculate_trend(p_shop, '5 minutes'::INTERVAL);
    
    -- Confidence level belirle
    DECLARE
        minutes_ago INTEGER;
    BEGIN
        minutes_ago := EXTRACT(EPOCH FROM (NOW() - latest_data.bucket_ts)) / 60;
        
        RETURN QUERY
        SELECT 
            latest_data.au_raw,
            COALESCE(trend_result.trend, 'stable'),
            latest_data.bucket_ts,
            CASE 
                WHEN minutes_ago <= 2 THEN 'high'
                WHEN minutes_ago <= 5 THEN 'medium'
                ELSE 'low'
            END;
    END;
END;
$$ LANGUAGE plpgsql;
