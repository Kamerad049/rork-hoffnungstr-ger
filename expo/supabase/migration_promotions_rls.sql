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
DROP POLICY IF EXISTS "sponsors_select_via_active_promotions" ON sponsors;
DROP POLICY IF EXISTS "sponsors_admin_insert" ON sponsors;
DROP POLICY IF EXISTS "sponsors_admin_update" ON sponsors;
DROP POLICY IF EXISTS "sponsors_admin_delete" ON sponsors;

-- Users can only see sponsors that have at least one active promotion right now.
-- Admins can see all sponsors (needed for admin panel CRUD).
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
-- L) OPTIONAL: sponsor_private table for contract/internal data
-- If you later store contract details, billing info, or internal
-- notes per sponsor, create a separate table:
--
--   CREATE TABLE sponsor_private (
--     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--     sponsor_id uuid REFERENCES sponsors(id) ON DELETE CASCADE,
--     contract_start date,
--     contract_end date,
--     monthly_fee numeric(10,2),
--     notes text,
--     created_at timestamptz DEFAULT now()
--   );
--   ALTER TABLE sponsor_private ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY "sponsor_private_admin_only"
--     ON sponsor_private FOR ALL TO authenticated
--     USING (public.is_admin()) WITH CHECK (public.is_admin());
--
-- This keeps public sponsor data (name, logo) separate from
-- sensitive business data. Normal users never see contract info.
-- ============================================================

-- ============================================================
-- CRON SETUP (Supabase Dashboard > Database > Extensions > pg_cron)
-- ============================================================
--
-- 1) Daily aggregation (yesterday) — run at 00:10 UTC:
--    SELECT cron.schedule(
--      'aggregate-promo-daily',
--      '10 0 * * *',
--      $SELECT public.aggregate_promotion_daily_stats(current_date - 1);$
--    );
--
-- 2) Optional: hourly live-ish aggregation (today) for dashboard:
--    SELECT cron.schedule(
--      'aggregate-promo-hourly',
--      '5 * * * *',
--      $SELECT public.aggregate_promotion_daily_stats(current_date);$
--    );
--
-- Manual run for a specific day:
--    SELECT public.aggregate_promotion_daily_stats('2026-03-02'::date);
-- ============================================================
