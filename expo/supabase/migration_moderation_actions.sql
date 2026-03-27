-- Migration: Moderation Actions & Appeals System
-- Run this in Supabase SQL Editor

-- 1. Moderation Actions table (soft-delete with reason)
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  target_user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'remove_post',
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  post_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restored_at TIMESTAMPTZ,
  permanently_deleted_at TIMESTAMPTZ
);

-- 2. Moderation Appeals table (Widerspruch)
CREATE TABLE IF NOT EXISTS moderation_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES moderation_actions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  appeal_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id TEXT,
  reviewer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_mod_actions_target_user ON moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_status ON moderation_actions(status);
CREATE INDEX IF NOT EXISTS idx_mod_actions_post ON moderation_actions(post_id);
CREATE INDEX IF NOT EXISTS idx_mod_appeals_action ON moderation_appeals(action_id);
CREATE INDEX IF NOT EXISTS idx_mod_appeals_user ON moderation_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_mod_appeals_status ON moderation_appeals(status);

-- 4. RLS
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moderation_actions_select" ON moderation_actions
  FOR SELECT USING (true);

CREATE POLICY "moderation_actions_insert" ON moderation_actions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "moderation_actions_update" ON moderation_actions
  FOR UPDATE USING (true);

CREATE POLICY "moderation_appeals_select" ON moderation_appeals
  FOR SELECT USING (true);

CREATE POLICY "moderation_appeals_insert" ON moderation_appeals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "moderation_appeals_update" ON moderation_appeals
  FOR UPDATE USING (true);
