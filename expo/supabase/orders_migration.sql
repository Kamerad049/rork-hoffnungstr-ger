-- ============================================================
-- ORDEN SYSTEM: Tables, RLS, Seed Data
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1) Tabelle: orders (Orden-Definitionen)
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Award',
  rarity text NOT NULL DEFAULT 'common',
  category text NOT NULL DEFAULT 'aktivitaet',
  tier text NOT NULL DEFAULT 'bronze',
  requirement text NOT NULL DEFAULT '',
  xp_reward integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Tabelle: user_orders (verdiente Orden)
CREATE TABLE IF NOT EXISTS user_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual_admin',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, order_id)
);

-- 3) Tabelle: user_values (Charakter-Werte)
CREATE TABLE IF NOT EXISTS user_values (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_user_orders_user_id ON user_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_orders_order_id ON user_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_slug ON orders(slug);
CREATE INDEX IF NOT EXISTS idx_orders_category ON orders(category);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_values ENABLE ROW LEVEL SECURITY;

-- orders: alle authentifizierten User dürfen lesen
CREATE POLICY "orders_read_authenticated" ON orders
  FOR SELECT TO authenticated
  USING (true);

-- user_orders: User kann eigene lesen; alle authentifizierten können lesen (für Profil-Ansicht)
CREATE POLICY "user_orders_read_authenticated" ON user_orders
  FOR SELECT TO authenticated
  USING (true);

-- user_orders: nur service_role / admin kann einfügen (später ggf. user self-grant)
CREATE POLICY "user_orders_insert_service" ON user_orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- user_values: User kann eigene lesen
CREATE POLICY "user_values_read_own" ON user_values
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- user_values: User kann eigene schreiben
CREATE POLICY "user_values_upsert_own" ON user_values
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_values_update_own" ON user_values
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- SEED DATA: 10 Standard-Orden
-- ============================================================

INSERT INTO orders (slug, title, description, icon, rarity, category, tier, requirement, xp_reward) VALUES
  ('ord_dauerbrenner_b', 'Dauerbrenner', '7 Tage am Stück aktiv gewesen', 'Flame', 'common', 'aktivitaet', 'bronze', '7 Tage Streak', 100),
  ('ord_dauerbrenner_s', 'Dauerbrenner II', '14 Tage am Stück aktiv gewesen', 'Flame', 'rare', 'aktivitaet', 'silber', '14 Tage Streak', 250),
  ('ord_dauerbrenner_g', 'Dauerbrenner III', '30 Tage am Stück aktiv gewesen', 'Flame', 'epic', 'aktivitaet', 'gold', '30 Tage Streak', 500),
  ('ord_fruehaufsteher', 'Frühaufsteher', '10x vor 6 Uhr morgens aktiv gewesen', 'Sunrise', 'common', 'aktivitaet', 'bronze', '10x vor 06:00 aktiv', 75),
  ('ord_flaggentraeger', 'Fahnenträger', '30x die Flagge gehisst', 'Flag', 'epic', 'aktivitaet', 'gold', '30x Flagge gehisst', 400),
  ('ord_wortfuehrer_b', 'Wortführer', '50 Kommentare geschrieben', 'MessageCircle', 'common', 'gemeinschaft', 'bronze', '50 Kommentare', 100),
  ('ord_bruderschaft', 'Bruderschaft', '25 Freunde gefunden', 'Users', 'rare', 'gemeinschaft', 'silber', '25 Freunde', 200),
  ('ord_wanderer_b', 'Wandersmann', '5 Orte mit Stempel besucht', 'MapPin', 'common', 'entdecker', 'bronze', '5 Stempel', 100),
  ('ord_chronist_b', 'Chronist', '10 Beiträge veröffentlicht', 'Feather', 'common', 'inhalt', 'bronze', '10 Beiträge', 100),
  ('ord_urgestein', 'Urgestein', 'Seit dem ersten Tag dabei – ein Gründungsmitglied', 'Gem', 'legendary', 'selten', 'legendaer', 'Tag-1-User', 5000)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- DEV SEED: Grant 3 Orden to first user (adjust user_id!)
-- Replace 'YOUR_TEST_USER_UUID' with actual user UUID
-- ============================================================
-- INSERT INTO user_orders (user_id, order_id, source) VALUES
--   ('YOUR_TEST_USER_UUID', (SELECT id FROM orders WHERE slug = 'ord_dauerbrenner_b'), 'seed'),
--   ('YOUR_TEST_USER_UUID', (SELECT id FROM orders WHERE slug = 'ord_wanderer_b'), 'seed'),
--   ('YOUR_TEST_USER_UUID', (SELECT id FROM orders WHERE slug = 'ord_urgestein'), 'seed');

-- INSERT INTO user_values (user_id, values) VALUES
--   ('YOUR_TEST_USER_UUID', '{"disziplin": 72, "bestaendigkeit": 85, "gemeinschaft": 60, "entdeckergeist": 55, "wortstaerke": 78, "einfluss": 45}');
