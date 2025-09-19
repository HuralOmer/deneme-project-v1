# Database Schema - Active Users Tracking

Bu klasör, Active Users Tracking sistemi için Supabase veritabanı şemasını içerir.

## Migration Dosyaları

### 001_create_active_users_tables.sql
Ana tabloları oluşturur:
- `active_users_minutely` - Dakikalık active users verisi
- `active_users_daily` - Günlük özet veriler
- `active_users_state` - EMA state bilgileri

### 002_create_analytics_views.sql
Analytics view'larını oluşturur:
- `active_users_realtime` - Real-time active users
- `active_users_daily_summary` - Günlük özet
- `active_users_weekly_trend` - Haftalık trend
- `active_users_monthly_trend` - Aylık trend
- `active_users_hourly_pattern` - Saatlik pattern
- `active_users_performance` - Performance metrikleri
- `active_users_anomalies` - Anomali tespiti

### 003_create_functions.sql
Analytics fonksiyonlarını oluşturur:
- `calculate_daily_summary()` - Günlük özet hesaplama
- `calculate_trend()` - Trend hesaplama
- `detect_anomalies()` - Anomali tespiti
- `analyze_hourly_pattern()` - Saatlik pattern analizi
- `get_performance_metrics()` - Performance metrikleri
- `cleanup_old_data()` - Eski veri temizleme
- `get_realtime_active_users()` - Real-time active users

## Tablo Yapıları

### active_users_minutely
```sql
- id: BIGSERIAL PRIMARY KEY
- shop: TEXT NOT NULL
- bucket_ts: TIMESTAMPTZ NOT NULL
- au_raw: INTEGER (raw active users count)
- total_tabs: INTEGER (total browser tabs)
- au_ema_fast: DECIMAL(10,2) (fast EMA)
- au_ema_slow: DECIMAL(10,2) (slow EMA)
- window_seconds: INTEGER (time window)
- created_at, updated_at: TIMESTAMPTZ
```

### active_users_daily
```sql
- id: BIGSERIAL PRIMARY KEY
- shop: TEXT NOT NULL
- day: DATE NOT NULL
- avg_au_raw: DECIMAL(10,2) (average raw count)
- p95_au_raw: DECIMAL(10,2) (95th percentile)
- max_au_raw: INTEGER (peak count)
- max_au_raw_at: TIMESTAMPTZ (peak time)
- avg_au_ema: DECIMAL(10,2) (average EMA)
- minutes_observed: INTEGER
- created_at, updated_at: TIMESTAMPTZ
```

### active_users_state
```sql
- id: BIGSERIAL PRIMARY KEY
- shop: TEXT NOT NULL UNIQUE
- last_timestamp: BIGINT (last update timestamp)
- ema_fast: DECIMAL(10,2) (current fast EMA)
- ema_slow: DECIMAL(10,2) (current slow EMA)
- last_raw_count: INTEGER (last raw count)
- created_at, updated_at: TIMESTAMPTZ
```

## Kullanım

### Migration'ları Çalıştırma
```bash
# Supabase CLI ile
supabase db reset

# Veya SQL dosyalarını manuel olarak çalıştır
psql -h your-supabase-host -U postgres -d postgres -f 001_create_active_users_tables.sql
psql -h your-supabase-host -U postgres -d postgres -f 002_create_analytics_views.sql
psql -h your-supabase-host -U postgres -d postgres -f 003_create_functions.sql
```

### TypeScript Client
```typescript
import { dbService } from './database/supabase';

// Dakikalık veri ekle
await dbService.insertMinutelyData({
  shop: 'example-shop',
  bucket_ts: new Date(),
  au_raw: 150,
  total_tabs: 200,
  au_ema_fast: 145.5,
  au_ema_slow: 140.2,
  window_seconds: 60
});

// Real-time active users al
const realtime = await supabase
  .from('active_users_realtime')
  .select('*')
  .eq('shop', 'example-shop')
  .order('bucket_ts', { ascending: false })
  .limit(1);
```

## Güvenlik

- Tüm tablolar RLS (Row Level Security) ile korunmuştur
- Shop bazında veri erişimi kontrol edilir
- `app.current_shop` setting'i ile shop context'i belirlenir

## Performance

- Tüm kritik alanlar için index'ler oluşturulmuştur
- View'lar optimize edilmiştir
- Cleanup fonksiyonları ile eski veriler otomatik temizlenir

## Monitoring

- Anomali tespiti için `detect_anomalies()` fonksiyonu
- Performance metrikleri için `get_performance_metrics()` fonksiyonu
- Real-time monitoring için `get_realtime_active_users()` fonksiyonu
