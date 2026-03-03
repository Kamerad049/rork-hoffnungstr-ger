-- ============================================================
-- SCHRITT 3: FUNKTIONEN
-- Kleine Datei, nur 2 Funktionen.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result boolean;
BEGIN
  SELECT u.is_admin INTO result
  FROM public.users u
  WHERE u.id = auth.uid();
  RETURN COALESCE(result, false);
END;
$$;


CREATE OR REPLACE FUNCTION public.aggregate_promotion_daily_stats(target_date date DEFAULT (CURRENT_DATE - INTERVAL '1 day')::date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO promotion_daily_stats (
    promotion_id, date,
    total_impressions, unique_impressions,
    total_clicks, unique_clicks,
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
-- FERTIG SCHRITT 3! Beide Funktionen erstellt.
-- Weiter mit SCHRITT_4_RLS_POLICIES.sql
-- ============================================================
