-- ============================================================
-- KADERSCHMIEDE TABLES – Supabase Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Training Activities
CREATE TABLE IF NOT EXISTS kaderschmiede_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  bundesland TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  date_time TIMESTAMPTZ NOT NULL,
  level TEXT NOT NULL DEFAULT 'Anfänger',
  max_participants INT NOT NULL DEFAULT 10,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ka_activities_user ON kaderschmiede_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_ka_activities_date ON kaderschmiede_activities(date_time);
CREATE INDEX IF NOT EXISTS idx_ka_activities_bundesland ON kaderschmiede_activities(bundesland);

-- 2. Activity Participants (many-to-many)
CREATE TABLE IF NOT EXISTS kaderschmiede_activity_participants (
  activity_id UUID NOT NULL REFERENCES kaderschmiede_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_id, user_id)
);

-- 3. Trupps (Squads)
CREATE TABLE IF NOT EXISTS kaderschmiede_trupps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  motto TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sport TEXT NOT NULL,
  city TEXT NOT NULL,
  bundesland TEXT NOT NULL,
  leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_open BOOLEAN NOT NULL DEFAULT true,
  weekly_goal TEXT NOT NULL DEFAULT '',
  streak INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ka_trupps_leader ON kaderschmiede_trupps(leader_id);
CREATE INDEX IF NOT EXISTS idx_ka_trupps_city ON kaderschmiede_trupps(city);

-- 4. Trupp Members
CREATE TABLE IF NOT EXISTS kaderschmiede_trupp_members (
  trupp_id UUID NOT NULL REFERENCES kaderschmiede_trupps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (trupp_id, user_id)
);

-- 5. Trupp Meetings
CREATE TABLE IF NOT EXISTS kaderschmiede_trupp_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trupp_id UUID NOT NULL REFERENCES kaderschmiede_trupps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  date_time TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ka_meetings_trupp ON kaderschmiede_trupp_meetings(trupp_id);
CREATE INDEX IF NOT EXISTS idx_ka_meetings_date ON kaderschmiede_trupp_meetings(date_time);

-- 6. Meeting Attendees
CREATE TABLE IF NOT EXISTS kaderschmiede_meeting_attendees (
  meeting_id UUID NOT NULL REFERENCES kaderschmiede_trupp_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ,
  PRIMARY KEY (meeting_id, user_id)
);

-- 7. Challenges
CREATE TABLE IF NOT EXISTS kaderschmiede_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'Gruppe',
  sport TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  goal DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ka_challenges_creator ON kaderschmiede_challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_ka_challenges_active ON kaderschmiede_challenges(is_active);

-- 8. Challenge Participants
CREATE TABLE IF NOT EXISTS kaderschmiede_challenge_participants (
  challenge_id UUID NOT NULL REFERENCES kaderschmiede_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id)
);

-- 9. Challenge Results
CREATE TABLE IF NOT EXISTS kaderschmiede_challenge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES kaderschmiede_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL DEFAULT 0,
  proof_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ka_challenge_results ON kaderschmiede_challenge_results(challenge_id);

-- 10. Workout Logs
CREATE TABLE IF NOT EXISTS kaderschmiede_workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  reps INT,
  sets INT,
  duration INT,
  distance DOUBLE PRECISION,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ka_workout_logs_user ON kaderschmiede_workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ka_workout_logs_date ON kaderschmiede_workout_logs(created_at);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE kaderschmiede_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaderschmiede_activity_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaderschmiede_trupps ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaderschmiede_trupp_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaderschmiede_trupp_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaderschmiede_meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaderschmiede_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaderschmiede_challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaderschmiede_challenge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaderschmiede_workout_logs ENABLE ROW LEVEL SECURITY;

-- Activities
DROP POLICY IF EXISTS "ka_activities_select" ON kaderschmiede_activities;
CREATE POLICY "ka_activities_select" ON kaderschmiede_activities FOR SELECT USING (true);
DROP POLICY IF EXISTS "ka_activities_insert" ON kaderschmiede_activities;
CREATE POLICY "ka_activities_insert" ON kaderschmiede_activities FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ka_activities_update" ON kaderschmiede_activities;
CREATE POLICY "ka_activities_update" ON kaderschmiede_activities FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ka_activities_delete" ON kaderschmiede_activities;
CREATE POLICY "ka_activities_delete" ON kaderschmiede_activities FOR DELETE USING (auth.uid() = user_id);

-- Activity Participants
DROP POLICY IF EXISTS "ka_act_part_select" ON kaderschmiede_activity_participants;
CREATE POLICY "ka_act_part_select" ON kaderschmiede_activity_participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "ka_act_part_insert" ON kaderschmiede_activity_participants;
CREATE POLICY "ka_act_part_insert" ON kaderschmiede_activity_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ka_act_part_delete" ON kaderschmiede_activity_participants;
CREATE POLICY "ka_act_part_delete" ON kaderschmiede_activity_participants FOR DELETE USING (auth.uid() = user_id);

-- Trupps
DROP POLICY IF EXISTS "ka_trupps_select" ON kaderschmiede_trupps;
CREATE POLICY "ka_trupps_select" ON kaderschmiede_trupps FOR SELECT USING (true);
DROP POLICY IF EXISTS "ka_trupps_insert" ON kaderschmiede_trupps;
CREATE POLICY "ka_trupps_insert" ON kaderschmiede_trupps FOR INSERT WITH CHECK (auth.uid() = leader_id);
DROP POLICY IF EXISTS "ka_trupps_update" ON kaderschmiede_trupps;
CREATE POLICY "ka_trupps_update" ON kaderschmiede_trupps FOR UPDATE USING (auth.uid() = leader_id);
DROP POLICY IF EXISTS "ka_trupps_delete" ON kaderschmiede_trupps;
CREATE POLICY "ka_trupps_delete" ON kaderschmiede_trupps FOR DELETE USING (auth.uid() = leader_id);

-- Trupp Members
DROP POLICY IF EXISTS "ka_trupp_members_select" ON kaderschmiede_trupp_members;
CREATE POLICY "ka_trupp_members_select" ON kaderschmiede_trupp_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "ka_trupp_members_insert" ON kaderschmiede_trupp_members;
CREATE POLICY "ka_trupp_members_insert" ON kaderschmiede_trupp_members FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ka_trupp_members_delete" ON kaderschmiede_trupp_members;
CREATE POLICY "ka_trupp_members_delete" ON kaderschmiede_trupp_members FOR DELETE USING (auth.uid() = user_id);

-- Trupp Meetings
DROP POLICY IF EXISTS "ka_meetings_select" ON kaderschmiede_trupp_meetings;
CREATE POLICY "ka_meetings_select" ON kaderschmiede_trupp_meetings FOR SELECT USING (true);
DROP POLICY IF EXISTS "ka_meetings_insert" ON kaderschmiede_trupp_meetings;
CREATE POLICY "ka_meetings_insert" ON kaderschmiede_trupp_meetings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM kaderschmiede_trupps WHERE id = trupp_id AND leader_id = auth.uid())
);
DROP POLICY IF EXISTS "ka_meetings_update" ON kaderschmiede_trupp_meetings;
CREATE POLICY "ka_meetings_update" ON kaderschmiede_trupp_meetings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM kaderschmiede_trupps WHERE id = trupp_id AND leader_id = auth.uid())
);
DROP POLICY IF EXISTS "ka_meetings_delete" ON kaderschmiede_trupp_meetings;
CREATE POLICY "ka_meetings_delete" ON kaderschmiede_trupp_meetings FOR DELETE USING (
  EXISTS (SELECT 1 FROM kaderschmiede_trupps WHERE id = trupp_id AND leader_id = auth.uid())
);

-- Meeting Attendees
DROP POLICY IF EXISTS "ka_attendees_select" ON kaderschmiede_meeting_attendees;
CREATE POLICY "ka_attendees_select" ON kaderschmiede_meeting_attendees FOR SELECT USING (true);
DROP POLICY IF EXISTS "ka_attendees_insert" ON kaderschmiede_meeting_attendees;
CREATE POLICY "ka_attendees_insert" ON kaderschmiede_meeting_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ka_attendees_delete" ON kaderschmiede_meeting_attendees;
CREATE POLICY "ka_attendees_delete" ON kaderschmiede_meeting_attendees FOR DELETE USING (auth.uid() = user_id);

-- Challenges
DROP POLICY IF EXISTS "ka_challenges_select" ON kaderschmiede_challenges;
CREATE POLICY "ka_challenges_select" ON kaderschmiede_challenges FOR SELECT USING (true);
DROP POLICY IF EXISTS "ka_challenges_insert" ON kaderschmiede_challenges;
CREATE POLICY "ka_challenges_insert" ON kaderschmiede_challenges FOR INSERT WITH CHECK (auth.uid() = creator_id);
DROP POLICY IF EXISTS "ka_challenges_update" ON kaderschmiede_challenges;
CREATE POLICY "ka_challenges_update" ON kaderschmiede_challenges FOR UPDATE USING (auth.uid() = creator_id);
DROP POLICY IF EXISTS "ka_challenges_delete" ON kaderschmiede_challenges;
CREATE POLICY "ka_challenges_delete" ON kaderschmiede_challenges FOR DELETE USING (auth.uid() = creator_id);

-- Challenge Participants
DROP POLICY IF EXISTS "ka_ch_part_select" ON kaderschmiede_challenge_participants;
CREATE POLICY "ka_ch_part_select" ON kaderschmiede_challenge_participants FOR SELECT USING (true);
DROP POLICY IF EXISTS "ka_ch_part_insert" ON kaderschmiede_challenge_participants;
CREATE POLICY "ka_ch_part_insert" ON kaderschmiede_challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ka_ch_part_delete" ON kaderschmiede_challenge_participants;
CREATE POLICY "ka_ch_part_delete" ON kaderschmiede_challenge_participants FOR DELETE USING (auth.uid() = user_id);

-- Challenge Results
DROP POLICY IF EXISTS "ka_results_select" ON kaderschmiede_challenge_results;
CREATE POLICY "ka_results_select" ON kaderschmiede_challenge_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "ka_results_insert" ON kaderschmiede_challenge_results;
CREATE POLICY "ka_results_insert" ON kaderschmiede_challenge_results FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ka_results_update" ON kaderschmiede_challenge_results;
CREATE POLICY "ka_results_update" ON kaderschmiede_challenge_results FOR UPDATE USING (auth.uid() = user_id);

-- Workout Logs (private)
DROP POLICY IF EXISTS "ka_logs_select" ON kaderschmiede_workout_logs;
CREATE POLICY "ka_logs_select" ON kaderschmiede_workout_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ka_logs_insert" ON kaderschmiede_workout_logs;
CREATE POLICY "ka_logs_insert" ON kaderschmiede_workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ka_logs_update" ON kaderschmiede_workout_logs;
CREATE POLICY "ka_logs_update" ON kaderschmiede_workout_logs FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ka_logs_delete" ON kaderschmiede_workout_logs;
CREATE POLICY "ka_logs_delete" ON kaderschmiede_workout_logs FOR DELETE USING (auth.uid() = user_id);
