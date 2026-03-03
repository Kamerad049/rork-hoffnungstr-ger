-- ============================================================
-- KOMPLETT-SCRIPT: Alles in einem
-- Oeffne Supabase Dashboard > SQL Editor > New Query
-- Kopiere ALLES hier rein > klicke "Run"
-- ============================================================


-- ============================================================
-- TEIL 1: TABELLEN ERSTELLEN
-- ============================================================

CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  website_url TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS promotion_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_duration_ms INTEGER DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS promotion_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

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


-- ============================================================
-- TEIL 2: UNIQUE CONSTRAINTS (Dedupe auf DB-Ebene)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_promotion_impressions_user_day'
  ) THEN
    ALTER TABLE promotion_impressions
      ADD CONSTRAINT uq_promotion_impressions_user_day
      UNIQUE (promotion_id, user_id, date);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_promotion_clicks_user_day'
  ) THEN
    ALTER TABLE promotion_clicks
      ADD CONSTRAINT uq_promotion_clicks_user_day
      UNIQUE (promotion_id, user_id, date);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_promotion_daily_stats_promo_day'
  ) THEN
    ALTER TABLE promotion_daily_stats
      ADD CONSTRAINT uq_promotion_daily_stats_promo_day
      UNIQUE (promotion_id, date);
  END IF;
END$$;


-- ============================================================
-- TEIL 3: RLS AKTIVIEREN
-- ============================================================

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_daily_stats ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- TEIL 4: ADMIN-ERKENNUNG (is_admin Funktion)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM users WHERE id = auth.uid()),
    false
  );
$$;


-- ============================================================
-- TEIL 5: RLS POLICIES - SPONSORS
-- ============================================================

DROP POLICY IF EXISTS "sponsors_select_public" ON sponsors;
DROP POLICY IF EXISTS "sponsors_select_via_active_promotions" ON sponsors;
DROP POLICY IF EXISTS "sponsors_admin_insert" ON sponsors;
DROP POLICY IF EXISTS "sponsors_admin_update" ON sponsors;
DROP POLICY IF EXISTS "sponsors_admin_delete" ON sponsors;

CREATE POLICY "sponsors_select_via_active_promotions"
  ON sponsors FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM promotions pr
      WHERE pr.sponsor_id = sponsors.id
        AND pr.status = 'active'
        AND now() >= pr.start_date
        AND now() <= pr.end_date
    )
  );

CREATE POLICY "sponsors_admin_insert"
  ON sponsors FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "sponsors_admin_update"
  ON sponsors FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "sponsors_admin_delete"
  ON sponsors FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ============================================================
-- TEIL 6: RLS POLICIES - PROMOTIONS
-- ============================================================

DROP POLICY IF EXISTS "promotions_select_active" ON promotions;
DROP POLICY IF EXISTS "promotions_select_admin" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_insert" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_update" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_delete" ON promotions;

CREATE POLICY "promotions_select_active"
  ON promotions FOR SELECT
  TO authenticated
  USING (
    (status = 'active' AND now() >= start_date AND now() <= end_date)
    OR public.is_admin()
  );

CREATE POLICY "promotions_admin_insert"
  ON promotions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "promotions_admin_update"
  ON promotions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "promotions_admin_delete"
  ON promotions FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ============================================================
-- TEIL 7: RLS POLICIES - IMPRESSIONS
-- ============================================================

DROP POLICY IF EXISTS "impressions_insert_own" ON promotion_impressions;
DROP POLICY IF EXISTS "impressions_select_admin" ON promotion_impressions;

CREATE POLICY "impressions_insert_own"
  ON promotion_impressions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "impressions_select_admin"
  ON promotion_impressions FOR SELECT
  TO authenticated
  USING (public.is_admin());


-- ============================================================
-- TEIL 8: RLS POLICIES - CLICKS
-- ============================================================

DROP POLICY IF EXISTS "clicks_insert_own" ON promotion_clicks;
DROP POLICY IF EXISTS "clicks_select_admin" ON promotion_clicks;

CREATE POLICY "clicks_insert_own"
  ON promotion_clicks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "clicks_select_admin"
  ON promotion_clicks FOR SELECT
  TO authenticated
  USING (public.is_admin());


-- ============================================================
-- TEIL 9: RLS POLICIES - DAILY STATS
-- ============================================================

DROP POLICY IF EXISTS "daily_stats_select_admin" ON promotion_daily_stats;
DROP POLICY IF EXISTS "daily_stats_insert_admin" ON promotion_daily_stats;
DROP POLICY IF EXISTS "daily_stats_update_admin" ON promotion_daily_stats;

CREATE POLICY "daily_stats_select_admin"
  ON promotion_daily_stats FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "daily_stats_insert_admin"
  ON promotion_daily_stats FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "daily_stats_update_admin"
  ON promotion_daily_stats FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ============================================================
-- TEIL 10: AGGREGATION FUNKTION (fuer Cron oder manuell)
-- ============================================================

CREATE OR REPLACE FUNCTION public.aggregate_promotion_daily_stats(target_date date DEFAULT (CURRENT_DATE - INTERVAL '1 day')::date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO promotion_daily_stats (
    promotion_id,
    date,
    total_impressions,
    unique_impressions,
    total_clicks,
    unique_clicks,
    qualified_impressions
  )
  SELECT
    p.id AS promotion_id,
    target_date AS date,
    COALESCE(imp.total_impressions, 0),
    COALESCE(imp.unique_impressions, 0),
    COALESCE(clk.total_clicks, 0),
    COALESCE(clk.unique_clicks, 0),
    COALESCE(imp.qualified_impressions, 0)
  FROM promotions p
  LEFT JOIN (
    SELECT
      promotion_id,
      COUNT(*) AS total_impressions,
      COUNT(DISTINCT user_id) AS unique_impressions,
      COUNT(*) FILTER (WHERE view_duration_ms >= 1000) AS qualified_impressions
    FROM promotion_impressions
    WHERE date = target_date
    GROUP BY promotion_id
  ) imp ON imp.promotion_id = p.id
  LEFT JOIN (
    SELECT
      promotion_id,
      COUNT(*) AS total_clicks,
      COUNT(DISTINCT user_id) AS unique_clicks
    FROM promotion_clicks
    WHERE date = target_date
    GROUP BY promotion_id
  ) clk ON clk.promotion_id = p.id
  WHERE p.status IN ('active', 'paused', 'ended')
    AND (imp.total_impressions > 0 OR clk.total_clicks > 0)
  ON CONFLICT ON CONSTRAINT uq_promotion_daily_stats_promo_day
  DO UPDATE SET
    total_impressions = EXCLUDED.total_impressions,
    unique_impressions = EXCLUDED.unique_impressions,
    total_clicks = EXCLUDED.total_clicks,
    unique_clicks = EXCLUDED.unique_clicks,
    qualified_impressions = EXCLUDED.qualified_impressions;
END;
$$;


-- ============================================================
-- TEIL 11: PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_promotion_impressions_promo_date
  ON promotion_impressions (promotion_id, date);

CREATE INDEX IF NOT EXISTS idx_promotion_clicks_promo_date
  ON promotion_clicks (promotion_id, date);

CREATE INDEX IF NOT EXISTS idx_promotion_daily_stats_promo_date
  ON promotion_daily_stats (promotion_id, date);

CREATE INDEX IF NOT EXISTS idx_promotions_status_dates
  ON promotions (status, start_date, end_date);


-- ============================================================
-- FERTIG!
-- Wenn alles "Success" zeigt, bist du durch.
-- ============================================================
