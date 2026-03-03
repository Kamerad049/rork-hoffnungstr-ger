-- ============================================================
-- PROMOTION SYSTEM: Tabellen erstellen
-- Run this FIRST in Supabase SQL Editor, BEFORE the RLS migration
-- ============================================================

-- 1) Sponsors (Firmen/Partner)
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  website_url TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Promotions (Werbung/Sponsored Content)
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES sponsors(id) ON DELETE SET NULL,
  promotion_type TEXT NOT NULL DEFAULT 'sponsor',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  media_url TEXT DEFAULT '',
  cta_label TEXT DEFAULT '',
  cta_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  feed_position INTEGER NOT NULL DEFAULT 5,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Promotion Impressions (Wer hat was gesehen)
CREATE TABLE IF NOT EXISTS promotion_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_duration_ms INTEGER DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 4) Promotion Clicks (Wer hat wohin geklickt)
CREATE TABLE IF NOT EXISTS promotion_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 5) Promotion Daily Stats (Tagesstatistiken, aggregiert)
CREATE TABLE IF NOT EXISTS promotion_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  unique_impressions INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,
  qualified_impressions INTEGER NOT NULL DEFAULT 0
);
