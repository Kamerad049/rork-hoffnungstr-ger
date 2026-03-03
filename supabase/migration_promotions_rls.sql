-- ============================================================
-- PROMOTION SYSTEM: RLS + Unique Constraints + Aggregation
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- A) UNIQUE CONSTRAINTS (DB-Level Dedupe)
-- ============================================================

-- Impression: max 1 row per user per promotion per day
-- Use ON CONFLICT to handle gracefully if constraint already exists
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

-- Click: max 1 row per user per promotion per day
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

-- Daily stats: max 1 row per promotion per day
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
-- B) Add qualified_impressions column to daily_stats (>=1000ms)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promotion_daily_stats' AND column_name = 'qualified_impressions'
  ) THEN
    ALTER TABLE promotion_daily_stats ADD COLUMN qualified_impressions integer DEFAULT 0;
  END IF;
END$$;

-- ============================================================
-- C) ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_daily_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- D) HELPER: is_admin function
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
-- E) RLS POLICIES: sponsors
-- ============================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "sponsors_select_public" ON sponsors;
DROP POLICY IF EXISTS "sponsors_admin_insert" ON sponsors;
DROP POLICY IF EXISTS "sponsors_admin_update" ON sponsors;
DROP POLICY IF EXISTS "sponsors_admin_delete" ON sponsors;

-- Anyone authenticated can read sponsors (needed for logo/name in feed)
CREATE POLICY "sponsors_select_public"
  ON sponsors FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create/update/delete sponsors
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
-- F) RLS POLICIES: promotions
-- ============================================================

DROP POLICY IF EXISTS "promotions_select_active" ON promotions;
DROP POLICY IF EXISTS "promotions_select_admin" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_insert" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_update" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_delete" ON promotions;

-- Regular users: only see active promotions within valid date range
CREATE POLICY "promotions_select_active"
  ON promotions FOR SELECT
  TO authenticated
  USING (
    (status = 'active' AND now() >= start_date AND now() <= end_date)
    OR public.is_admin()
  );

-- Admin: full CRUD
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
-- G) RLS POLICIES: promotion_impressions
-- ============================================================

DROP POLICY IF EXISTS "impressions_insert_own" ON promotion_impressions;
DROP POLICY IF EXISTS "impressions_select_admin" ON promotion_impressions;

-- Users can only INSERT their own impressions
CREATE POLICY "impressions_insert_own"
  ON promotion_impressions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only admins can SELECT (for analytics / aggregation)
CREATE POLICY "impressions_select_admin"
  ON promotion_impressions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- H) RLS POLICIES: promotion_clicks
-- ============================================================

DROP POLICY IF EXISTS "clicks_insert_own" ON promotion_clicks;
DROP POLICY IF EXISTS "clicks_select_admin" ON promotion_clicks;

-- Users can only INSERT their own clicks
CREATE POLICY "clicks_insert_own"
  ON promotion_clicks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only admins can SELECT
CREATE POLICY "clicks_select_admin"
  ON promotion_clicks FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- I) RLS POLICIES: promotion_daily_stats
-- ============================================================

DROP POLICY IF EXISTS "daily_stats_select_admin" ON promotion_daily_stats;
DROP POLICY IF EXISTS "daily_stats_insert_admin" ON promotion_daily_stats;
DROP POLICY IF EXISTS "daily_stats_update_admin" ON promotion_daily_stats;

-- Only admins can read daily stats
CREATE POLICY "daily_stats_select_admin"
  ON promotion_daily_stats FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Only admins (or service role via aggregation) can insert/update
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
-- J) AGGREGATION FUNCTION (called by admin or cron)
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
-- K) INDEX for performance
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
-- DONE
-- Run: SELECT public.aggregate_promotion_daily_stats('2025-03-02');
-- to manually aggregate a specific day.
-- Set up a Supabase cron job to call daily:
--   SELECT public.aggregate_promotion_daily_stats();
-- (defaults to yesterday)
-- ============================================================
