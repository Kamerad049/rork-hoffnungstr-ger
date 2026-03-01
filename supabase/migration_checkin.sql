-- Check-In Sessions table
CREATE TABLE IF NOT EXISTS kaderschmiede_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('activity', 'meeting')),
  session_id TEXT NOT NULL,
  host_user_id UUID NOT NULL REFERENCES auth.users(id),
  code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  host_latitude DOUBLE PRECISION,
  host_longitude DOUBLE PRECISION,
  host_accuracy DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Check-In Entries table
CREATE TABLE IF NOT EXISTS kaderschmiede_checkin_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES kaderschmiede_checkins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  distance_to_host DOUBLE PRECISION,
  is_mocked BOOLEAN DEFAULT false,
  token_epoch INTEGER,
  checked_in_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(checkin_id, user_id)
);

-- Index for fast code lookup
CREATE INDEX IF NOT EXISTS idx_checkins_code_active ON kaderschmiede_checkins(code, is_active);
CREATE INDEX IF NOT EXISTS idx_checkin_entries_checkin_id ON kaderschmiede_checkin_entries(checkin_id);

-- RLS policies
ALTER TABLE kaderschmiede_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaderschmiede_checkin_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read active checkins" ON kaderschmiede_checkins
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create checkins" ON kaderschmiede_checkins
  FOR INSERT WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update their checkins" ON kaderschmiede_checkins
  FOR UPDATE USING (auth.uid() = host_user_id);

CREATE POLICY "Users can read checkin entries" ON kaderschmiede_checkin_entries
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert checkin entries" ON kaderschmiede_checkin_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
