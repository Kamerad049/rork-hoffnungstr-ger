-- ============================================================
-- KOMPLETTES DATENBANK-SCHEMA
-- Stand: 2026-03-03
-- 
-- ANLEITUNG:
-- 1. Oeffne Supabase Dashboard > SQL Editor > New Query
-- 2. Kopiere ALLES hier rein
-- 3. Klicke "Run"
--
-- Das Script ist IDEMPOTENT:
--   - CREATE TABLE IF NOT EXISTS = ueberspringt wenn Tabelle existiert
--   - ALTER TABLE ADD COLUMN IF NOT EXISTS = ueberspringt wenn Spalte existiert
--   - DROP POLICY IF EXISTS = loescht alte Policy bevor neue erstellt wird
--   - DO $ ... IF NOT EXISTS = prueft vor Constraint-Erstellung
--
-- Du kannst es also MEHRFACH ausfuehren ohne Fehler.
-- ============================================================


-- ############################################################
-- TEIL 0: FIX users.id TYPE (TEXT -> UUID falls noetig)
-- Falls users.id frueher als TEXT angelegt wurde,
-- wird es hier auf UUID korrigiert.
-- ############################################################

DO $
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'id';

  IF col_type IS NOT NULL AND col_type <> 'uuid' THEN
    ALTER TABLE public.users ALTER COLUMN id TYPE UUID USING id::uuid;
    RAISE NOTICE 'users.id wurde von % auf UUID geaendert', col_type;
  END IF;
END$;


-- ############################################################
-- TEIL 1: USERS (Haupttabelle)
-- ############################################################

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT NULL,
  birthplace TEXT DEFAULT '',
  birthplace_plz TEXT DEFAULT '',
  residence TEXT DEFAULT '',
  residence_plz TEXT DEFAULT '',
  bundesland TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  religion TEXT DEFAULT '',
  cross_style TEXT DEFAULT 'none',
  show_gender BOOLEAN DEFAULT false,
  show_religion BOOLEAN DEFAULT false,
  show_sundial BOOLEAN DEFAULT false,
  rank TEXT DEFAULT 'Neuling',
  rank_icon TEXT DEFAULT 'Eye',
  xp INTEGER DEFAULT 0,
  stamp_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  friend_count INTEGER DEFAULT 0,
  flag_hoisted_at TIMESTAMPTZ DEFAULT NULL,
  is_admin BOOLEAN DEFAULT false,
  banned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthplace TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthplace_plz TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS residence TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS residence_plz TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bundesland TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS religion TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS cross_style TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_gender BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_religion BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_sundial BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank TEXT DEFAULT 'Neuling';
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank_icon TEXT DEFAULT 'Eye';
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stamp_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS friend_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS flag_hoisted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;


-- ############################################################
-- TEIL 2: USER_VALUES (Charakter-Werte pro User)
-- ############################################################

CREATE TABLE IF NOT EXISTS user_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_values ADD COLUMN IF NOT EXISTS value TEXT;


-- ############################################################
-- TEIL 3: PRIVACY_SETTINGS
-- ############################################################

CREATE TABLE IF NOT EXISTS privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_posts TEXT DEFAULT 'everyone',
  show_friends TEXT DEFAULT 'everyone',
  show_stamps TEXT DEFAULT 'everyone',
  feed_post_visibility TEXT DEFAULT 'everyone',
  story_visibility TEXT DEFAULT 'everyone',
  show_birthplace TEXT DEFAULT 'friends',
  show_residence TEXT DEFAULT 'friends',
  show_bundesland TEXT DEFAULT 'everyone',
  show_values TEXT DEFAULT 'everyone',
  allow_tagging TEXT DEFAULT 'friends',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE privacy_settings ADD COLUMN IF NOT EXISTS show_birthplace TEXT DEFAULT 'friends';
ALTER TABLE privacy_settings ADD COLUMN IF NOT EXISTS show_residence TEXT DEFAULT 'friends';
ALTER TABLE privacy_settings ADD COLUMN IF NOT EXISTS show_bundesland TEXT DEFAULT 'everyone';
ALTER TABLE privacy_settings ADD COLUMN IF NOT EXISTS show_values TEXT DEFAULT 'everyone';
ALTER TABLE privacy_settings ADD COLUMN IF NOT EXISTS allow_tagging TEXT DEFAULT 'friends';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_privacy_settings_user'
  ) THEN
    ALTER TABLE privacy_settings ADD CONSTRAINT uq_privacy_settings_user UNIQUE (user_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 4: FRIENDSHIPS
-- ############################################################

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 5: FRIEND_REQUESTS
-- ############################################################

CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 6: BLOCKED_USERS
-- ############################################################

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 7: POSTS
-- ############################################################

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] DEFAULT '{}',
  media_type TEXT DEFAULT 'none',
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  location TEXT DEFAULT NULL,
  tagged_user_ids TEXT[] DEFAULT NULL,
  tags TEXT[] DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tagged_user_ids TEXT[] DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT NULL;


-- ############################################################
-- TEIL 8: POST_LIKES
-- ############################################################

CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_post_likes_user_post'
  ) THEN
    ALTER TABLE post_likes ADD CONSTRAINT uq_post_likes_user_post UNIQUE (post_id, user_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 9: POST_COMMENTS
-- ############################################################

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  reply_to_id UUID DEFAULT NULL,
  defend_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 10: STORIES
-- ############################################################

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  bg_color TEXT DEFAULT NULL,
  font_family TEXT DEFAULT NULL,
  image_scale DOUBLE PRECISION DEFAULT NULL,
  image_offset_x DOUBLE PRECISION DEFAULT NULL,
  image_offset_y DOUBLE PRECISION DEFAULT NULL,
  text_x DOUBLE PRECISION DEFAULT NULL,
  text_y DOUBLE PRECISION DEFAULT NULL,
  text_scale DOUBLE PRECISION DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;


-- ############################################################
-- TEIL 11: STORY_VIEWERS
-- ############################################################

CREATE TABLE IF NOT EXISTS story_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_story_viewers_story_viewer'
  ) THEN
    ALTER TABLE story_viewers ADD CONSTRAINT uq_story_viewers_story_viewer UNIQUE (story_id, viewer_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 12: CHAT_MESSAGES
-- ############################################################

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ DEFAULT NULL,
  edited BOOLEAN DEFAULT false,
  recalled BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS recalled BOOLEAN DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;


-- ############################################################
-- TEIL 13: NEWS
-- ############################################################

CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  image TEXT DEFAULT '',
  author TEXT DEFAULT 'Heldentum Redaktion',
  publish_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 14: PLACES
-- ############################################################

CREATE TABLE IF NOT EXISTS places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  plz TEXT DEFAULT '',
  bundesland TEXT NOT NULL DEFAULT '',
  images TEXT[] DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'Historische Stätte',
  latitude DOUBLE PRECISION DEFAULT 0,
  longitude DOUBLE PRECISION DEFAULT 0,
  rating DOUBLE PRECISION DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE places ADD COLUMN IF NOT EXISTS plz TEXT DEFAULT '';


-- ############################################################
-- TEIL 15: RESTAURANTS
-- ############################################################

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  plz TEXT DEFAULT '',
  bundesland TEXT NOT NULL DEFAULT '',
  images TEXT[] DEFAULT '{}',
  cuisine TEXT[] DEFAULT '{}',
  price_range INTEGER DEFAULT 1,
  latitude DOUBLE PRECISION DEFAULT 0,
  longitude DOUBLE PRECISION DEFAULT 0,
  rating DOUBLE PRECISION DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS plz TEXT DEFAULT '';


-- ############################################################
-- TEIL 16: REVIEWS
-- ############################################################

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 0,
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 17: REVIEW_VOTES
-- ############################################################

CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_review_votes_review_user'
  ) THEN
    ALTER TABLE review_votes ADD CONSTRAINT uq_review_votes_review_user UNIQUE (review_id, user_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 18: FAVORITES
-- ############################################################

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'place',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_favorites_user_target'
  ) THEN
    ALTER TABLE favorites ADD CONSTRAINT uq_favorites_user_target UNIQUE (user_id, target_id, target_type);
  END IF;
END$$;


-- ############################################################
-- TEIL 19: COLLECTED_STAMPS
-- ############################################################

CREATE TABLE IF NOT EXISTS collected_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  photo_uri TEXT DEFAULT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_collected_stamps_user_place'
  ) THEN
    ALTER TABLE collected_stamps ADD CONSTRAINT uq_collected_stamps_user_place UNIQUE (user_id, place_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 20: INBOX_NOTIFICATIONS
-- ############################################################

CREATE TABLE IF NOT EXISTS inbox_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  audio_uri TEXT DEFAULT NULL,
  audio_duration INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ DEFAULT NULL
);


-- ############################################################
-- TEIL 21: PUSH_NOTIFICATIONS
-- ############################################################

CREATE TABLE IF NOT EXISTS push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  audio_uri TEXT DEFAULT NULL,
  audio_duration INTEGER DEFAULT 0,
  recipients TEXT DEFAULT 'all',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'sent'
);


-- ############################################################
-- TEIL 22: SUBMISSIONS (Nutzer-Empfehlungen)
-- ############################################################

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'place',
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitter_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  plz TEXT DEFAULT '',
  bundesland TEXT NOT NULL DEFAULT '',
  images TEXT[] DEFAULT '{}',
  place_category TEXT DEFAULT NULL,
  cuisine_types TEXT[] DEFAULT NULL,
  price_range INTEGER DEFAULT NULL,
  address TEXT DEFAULT NULL,
  latitude DOUBLE PRECISION DEFAULT NULL,
  longitude DOUBLE PRECISION DEFAULT NULL,
  why_recommend TEXT DEFAULT '',
  reviewed_at TIMESTAMPTZ DEFAULT NULL,
  reviewed_by TEXT DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS plz TEXT DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT NULL;


-- ############################################################
-- TEIL 23: REEL_BOOKMARKS
-- ############################################################

CREATE TABLE IF NOT EXISTS reel_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_reel_bookmarks_reel_user'
  ) THEN
    ALTER TABLE reel_bookmarks ADD CONSTRAINT uq_reel_bookmarks_reel_user UNIQUE (reel_id, user_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 24: REEL_COMMENTS
-- ############################################################

CREATE TABLE IF NOT EXISTS reel_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 25: REEL_COMMENT_LIKES
-- ############################################################

CREATE TABLE IF NOT EXISTS reel_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_comment_id UUID NOT NULL REFERENCES reel_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_reel_comment_likes_comment_user'
  ) THEN
    ALTER TABLE reel_comment_likes ADD CONSTRAINT uq_reel_comment_likes_comment_user UNIQUE (reel_comment_id, user_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 26: LIVE_LOCATIONS
-- ############################################################

CREATE TABLE IF NOT EXISTS live_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  accuracy DOUBLE PRECISION DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  audience TEXT DEFAULT 'friends',
  specific_user_ids TEXT[] DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_live_locations_user'
  ) THEN
    ALTER TABLE live_locations ADD CONSTRAINT uq_live_locations_user UNIQUE (user_id);
  END IF;
END$$;

ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'friends';
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS specific_user_ids TEXT[] DEFAULT NULL;


-- ############################################################
-- TEIL 27: SPOTIFY_TRACKS
-- ############################################################

CREATE TABLE IF NOT EXISTS spotify_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  artist TEXT DEFAULT '',
  album TEXT DEFAULT '',
  album_art TEXT DEFAULT '',
  spotify_url TEXT DEFAULT '',
  duration_ms INTEGER DEFAULT 0,
  progress_ms INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_spotify_tracks_user'
  ) THEN
    ALTER TABLE spotify_tracks ADD CONSTRAINT uq_spotify_tracks_user UNIQUE (user_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 28: SPONSORS
-- ############################################################

CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  website_url TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 29: PROMOTIONS
-- ############################################################

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


-- ############################################################
-- TEIL 30: PROMOTION_IMPRESSIONS
-- ############################################################

CREATE TABLE IF NOT EXISTS promotion_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_duration_ms INTEGER DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

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


-- ############################################################
-- TEIL 31: PROMOTION_CLICKS
-- ############################################################

CREATE TABLE IF NOT EXISTS promotion_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

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


-- ############################################################
-- TEIL 32: PROMOTION_DAILY_STATS
-- ############################################################

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


-- ############################################################
-- TEIL 33: ORDERS (Orden-Definitionen)
-- ############################################################

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'Award',
  rarity TEXT NOT NULL DEFAULT 'common',
  category TEXT NOT NULL DEFAULT 'aktivitaet',
  tier TEXT NOT NULL DEFAULT 'bronze',
  requirement TEXT NOT NULL DEFAULT '',
  xp_reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 34: USER_ORDERS (verdiente Orden)
-- ############################################################

CREATE TABLE IF NOT EXISTS user_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'manual_admin',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, order_id)
);


-- ############################################################
-- TEIL 35: KADERSCHMIEDE_ACTIVITIES
-- ############################################################

CREATE TABLE IF NOT EXISTS kaderschmiede_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  plz TEXT DEFAULT '',
  bundesland TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION DEFAULT 0,
  longitude DOUBLE PRECISION DEFAULT 0,
  date_time TIMESTAMPTZ NOT NULL,
  level TEXT NOT NULL DEFAULT 'Anfänger',
  max_participants INTEGER DEFAULT 10,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kaderschmiede_activities ADD COLUMN IF NOT EXISTS plz TEXT DEFAULT '';


-- ############################################################
-- TEIL 36: KADERSCHMIEDE_ACTIVITY_PARTICIPANTS
-- ############################################################

CREATE TABLE IF NOT EXISTS kaderschmiede_activity_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES kaderschmiede_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_kader_act_part_activity_user'
  ) THEN
    ALTER TABLE kaderschmiede_activity_participants
      ADD CONSTRAINT uq_kader_act_part_activity_user UNIQUE (activity_id, user_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 37: KADERSCHMIEDE_TRUPPS
-- ############################################################

CREATE TABLE IF NOT EXISTS kaderschmiede_trupps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  motto TEXT DEFAULT '',
  description TEXT DEFAULT '',
  sport TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  plz TEXT DEFAULT '',
  bundesland TEXT NOT NULL DEFAULT '',
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_open BOOLEAN DEFAULT true,
  weekly_goal TEXT DEFAULT '',
  streak INTEGER DEFAULT 0,
  logo_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kaderschmiede_trupps ADD COLUMN IF NOT EXISTS plz TEXT DEFAULT '';
ALTER TABLE kaderschmiede_trupps ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;


-- ############################################################
-- TEIL 38: KADERSCHMIEDE_TRUPP_MEMBERS
-- ############################################################

CREATE TABLE IF NOT EXISTS kaderschmiede_trupp_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trupp_id UUID NOT NULL REFERENCES kaderschmiede_trupps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_kader_trupp_members_trupp_user'
  ) THEN
    ALTER TABLE kaderschmiede_trupp_members
      ADD CONSTRAINT uq_kader_trupp_members_trupp_user UNIQUE (trupp_id, user_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 39: KADERSCHMIEDE_TRUPP_MEETINGS
-- ############################################################

CREATE TABLE IF NOT EXISTS kaderschmiede_trupp_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trupp_id UUID NOT NULL REFERENCES kaderschmiede_trupps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date_time TIMESTAMPTZ NOT NULL,
  location TEXT DEFAULT '',
  city TEXT DEFAULT '',
  plz TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kaderschmiede_trupp_meetings ADD COLUMN IF NOT EXISTS plz TEXT DEFAULT '';


-- ############################################################
-- TEIL 40: KADERSCHMIEDE_MEETING_ATTENDEES
-- ############################################################

CREATE TABLE IF NOT EXISTS kaderschmiede_meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES kaderschmiede_trupp_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_kader_meeting_att_meeting_user'
  ) THEN
    ALTER TABLE kaderschmiede_meeting_attendees
      ADD CONSTRAINT uq_kader_meeting_att_meeting_user UNIQUE (meeting_id, user_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 41: KADERSCHMIEDE_CHALLENGES
-- ############################################################

CREATE TABLE IF NOT EXISTS kaderschmiede_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT '1v1',
  sport TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  goal INTEGER DEFAULT 0,
  unit TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 42: KADERSCHMIEDE_CHALLENGE_PARTICIPANTS
-- ############################################################

CREATE TABLE IF NOT EXISTS kaderschmiede_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES kaderschmiede_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_kader_ch_part_challenge_user'
  ) THEN
    ALTER TABLE kaderschmiede_challenge_participants
      ADD CONSTRAINT uq_kader_ch_part_challenge_user UNIQUE (challenge_id, user_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 43: KADERSCHMIEDE_CHALLENGE_RESULTS
-- ############################################################

CREATE TABLE IF NOT EXISTS kaderschmiede_challenge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES kaderschmiede_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL DEFAULT 0,
  proof_url TEXT DEFAULT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 44: KADERSCHMIEDE_WORKOUT_LOGS
-- ############################################################

CREATE TABLE IF NOT EXISTS kaderschmiede_workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  reps INTEGER DEFAULT NULL,
  sets INTEGER DEFAULT NULL,
  duration INTEGER DEFAULT NULL,
  distance DOUBLE PRECISION DEFAULT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 45: KADERSCHMIEDE_CHECKINS
-- ############################################################

CREATE TABLE IF NOT EXISTS kaderschmiede_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  session_id TEXT NOT NULL,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  host_latitude DOUBLE PRECISION DEFAULT 0,
  host_longitude DOUBLE PRECISION DEFAULT 0,
  host_accuracy DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################
-- TEIL 46: KADERSCHMIEDE_CHECKIN_ENTRIES
-- ############################################################

CREATE TABLE IF NOT EXISTS kaderschmiede_checkin_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES kaderschmiede_checkins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION DEFAULT 0,
  longitude DOUBLE PRECISION DEFAULT 0,
  accuracy DOUBLE PRECISION DEFAULT 0,
  distance_to_host DOUBLE PRECISION DEFAULT 0,
  is_mocked BOOLEAN DEFAULT false,
  token_epoch INTEGER DEFAULT 0,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_kader_checkin_entries_checkin_user'
  ) THEN
    ALTER TABLE kaderschmiede_checkin_entries
      ADD CONSTRAINT uq_kader_checkin_entries_checkin_user UNIQUE (checkin_id, user_id);
  END IF;
END$$;


-- ############################################################
-- TEIL 47: RLS AKTIVIEREN
-- ############################################################

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE collected_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_orders ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE kaderschmiede_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaderschmiede_checkin_entries ENABLE ROW LEVEL SECURITY;


-- ############################################################
-- TEIL 48: HELPER FUNCTION is_admin()
-- ############################################################

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $
DECLARE
  result boolean;
BEGIN
  SELECT u.is_admin INTO result
  FROM public.users u
  WHERE u.id::text = auth.uid()::text;
  RETURN COALESCE(result, false);
END;
$;


-- ############################################################
-- TEIL 49: RLS POLICIES
-- ############################################################

-- === USERS ===
DROP POLICY IF EXISTS "users_select_authenticated" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

CREATE POLICY "users_select_authenticated" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT TO authenticated WITH CHECK (id::text = auth.uid()::text);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (id::text = auth.uid()::text OR public.is_admin())
  WITH CHECK (id::text = auth.uid()::text OR public.is_admin());

CREATE POLICY "users_delete_admin" ON users
  FOR DELETE TO authenticated USING (public.is_admin());


-- === USER_VALUES ===
DROP POLICY IF EXISTS "user_values_select_authenticated" ON user_values;
DROP POLICY IF EXISTS "user_values_insert_own" ON user_values;
DROP POLICY IF EXISTS "user_values_delete_own" ON user_values;

CREATE POLICY "user_values_select_authenticated" ON user_values
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_values_insert_own" ON user_values
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_values_delete_own" ON user_values
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- === PRIVACY_SETTINGS ===
DROP POLICY IF EXISTS "privacy_select_own" ON privacy_settings;
DROP POLICY IF EXISTS "privacy_insert_own" ON privacy_settings;
DROP POLICY IF EXISTS "privacy_update_own" ON privacy_settings;

CREATE POLICY "privacy_select_own" ON privacy_settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "privacy_insert_own" ON privacy_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "privacy_update_own" ON privacy_settings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- === FRIENDSHIPS ===
DROP POLICY IF EXISTS "friendships_select_own" ON friendships;
DROP POLICY IF EXISTS "friendships_insert_own" ON friendships;
DROP POLICY IF EXISTS "friendships_delete_own" ON friendships;

CREATE POLICY "friendships_select_own" ON friendships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friendships_insert_own" ON friendships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friendships_delete_own" ON friendships
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());


-- === FRIEND_REQUESTS ===
DROP POLICY IF EXISTS "friend_requests_select_own" ON friend_requests;
DROP POLICY IF EXISTS "friend_requests_insert_own" ON friend_requests;
DROP POLICY IF EXISTS "friend_requests_update_own" ON friend_requests;
DROP POLICY IF EXISTS "friend_requests_delete_own" ON friend_requests;

CREATE POLICY "friend_requests_select_own" ON friend_requests
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "friend_requests_insert_own" ON friend_requests
  FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "friend_requests_update_own" ON friend_requests
  FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid()) WITH CHECK (to_user_id = auth.uid());

CREATE POLICY "friend_requests_delete_own" ON friend_requests
  FOR DELETE TO authenticated USING (from_user_id = auth.uid());


-- === BLOCKED_USERS ===
DROP POLICY IF EXISTS "blocked_select_own" ON blocked_users;
DROP POLICY IF EXISTS "blocked_insert_own" ON blocked_users;
DROP POLICY IF EXISTS "blocked_delete_own" ON blocked_users;

CREATE POLICY "blocked_select_own" ON blocked_users
  FOR SELECT TO authenticated USING (blocker_id = auth.uid());

CREATE POLICY "blocked_insert_own" ON blocked_users
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocked_delete_own" ON blocked_users
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());


-- === POSTS ===
DROP POLICY IF EXISTS "posts_select_authenticated" ON posts;
DROP POLICY IF EXISTS "posts_insert_own" ON posts;
DROP POLICY IF EXISTS "posts_update_own" ON posts;
DROP POLICY IF EXISTS "posts_delete_own" ON posts;

CREATE POLICY "posts_select_authenticated" ON posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "posts_insert_own" ON posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "posts_delete_own" ON posts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());


-- === POST_LIKES ===
DROP POLICY IF EXISTS "post_likes_select_authenticated" ON post_likes;
DROP POLICY IF EXISTS "post_likes_insert_own" ON post_likes;
DROP POLICY IF EXISTS "post_likes_delete_own" ON post_likes;

CREATE POLICY "post_likes_select_authenticated" ON post_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "post_likes_insert_own" ON post_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "post_likes_delete_own" ON post_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- === POST_COMMENTS ===
DROP POLICY IF EXISTS "post_comments_select_authenticated" ON post_comments;
DROP POLICY IF EXISTS "post_comments_insert_own" ON post_comments;
DROP POLICY IF EXISTS "post_comments_delete_own" ON post_comments;

CREATE POLICY "post_comments_select_authenticated" ON post_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "post_comments_insert_own" ON post_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "post_comments_delete_own" ON post_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());


-- === STORIES ===
DROP POLICY IF EXISTS "stories_select_authenticated" ON stories;
DROP POLICY IF EXISTS "stories_insert_own" ON stories;
DROP POLICY IF EXISTS "stories_delete_own" ON stories;

CREATE POLICY "stories_select_authenticated" ON stories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stories_insert_own" ON stories
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "stories_delete_own" ON stories
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- === STORY_VIEWERS ===
DROP POLICY IF EXISTS "story_viewers_select_authenticated" ON story_viewers;
DROP POLICY IF EXISTS "story_viewers_insert_own" ON story_viewers;

CREATE POLICY "story_viewers_select_authenticated" ON story_viewers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "story_viewers_insert_own" ON story_viewers
  FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());


-- === CHAT_MESSAGES ===
DROP POLICY IF EXISTS "chat_select_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_insert_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_update_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_delete_own" ON chat_messages;

CREATE POLICY "chat_select_own" ON chat_messages
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "chat_insert_own" ON chat_messages
  FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "chat_update_own" ON chat_messages
  FOR UPDATE TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "chat_delete_own" ON chat_messages
  FOR DELETE TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());


-- === NEWS ===
DROP POLICY IF EXISTS "news_select_authenticated" ON news;
DROP POLICY IF EXISTS "news_admin_insert" ON news;
DROP POLICY IF EXISTS "news_admin_update" ON news;
DROP POLICY IF EXISTS "news_admin_delete" ON news;

CREATE POLICY "news_select_authenticated" ON news
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "news_admin_insert" ON news
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "news_admin_update" ON news
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "news_admin_delete" ON news
  FOR DELETE TO authenticated USING (public.is_admin());


-- === PLACES ===
DROP POLICY IF EXISTS "places_select_authenticated" ON places;
DROP POLICY IF EXISTS "places_admin_insert" ON places;
DROP POLICY IF EXISTS "places_admin_update" ON places;
DROP POLICY IF EXISTS "places_admin_delete" ON places;

CREATE POLICY "places_select_authenticated" ON places
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "places_admin_insert" ON places
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "places_admin_update" ON places
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "places_admin_delete" ON places
  FOR DELETE TO authenticated USING (public.is_admin());


-- === RESTAURANTS ===
DROP POLICY IF EXISTS "restaurants_select_authenticated" ON restaurants;
DROP POLICY IF EXISTS "restaurants_admin_insert" ON restaurants;
DROP POLICY IF EXISTS "restaurants_admin_update" ON restaurants;
DROP POLICY IF EXISTS "restaurants_admin_delete" ON restaurants;

CREATE POLICY "restaurants_select_authenticated" ON restaurants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "restaurants_admin_insert" ON restaurants
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "restaurants_admin_update" ON restaurants
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "restaurants_admin_delete" ON restaurants
  FOR DELETE TO authenticated USING (public.is_admin());


-- === REVIEWS ===
DROP POLICY IF EXISTS "reviews_select_authenticated" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;

CREATE POLICY "reviews_select_authenticated" ON reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());


-- === REVIEW_VOTES ===
DROP POLICY IF EXISTS "review_votes_select_authenticated" ON review_votes;
DROP POLICY IF EXISTS "review_votes_insert_own" ON review_votes;
DROP POLICY IF EXISTS "review_votes_delete_own" ON review_votes;

CREATE POLICY "review_votes_select_authenticated" ON review_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "review_votes_insert_own" ON review_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "review_votes_delete_own" ON review_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- === FAVORITES ===
DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;

CREATE POLICY "favorites_select_own" ON favorites
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- === COLLECTED_STAMPS ===
DROP POLICY IF EXISTS "stamps_select_authenticated" ON collected_stamps;
DROP POLICY IF EXISTS "stamps_insert_own" ON collected_stamps;

CREATE POLICY "stamps_select_authenticated" ON collected_stamps
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stamps_insert_own" ON collected_stamps
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());


-- === INBOX_NOTIFICATIONS ===
DROP POLICY IF EXISTS "inbox_select_own" ON inbox_notifications;
DROP POLICY IF EXISTS "inbox_insert_own" ON inbox_notifications;
DROP POLICY IF EXISTS "inbox_update_own" ON inbox_notifications;
DROP POLICY IF EXISTS "inbox_delete_own" ON inbox_notifications;

CREATE POLICY "inbox_select_own" ON inbox_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "inbox_insert_own" ON inbox_notifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "inbox_update_own" ON inbox_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "inbox_delete_own" ON inbox_notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- === PUSH_NOTIFICATIONS ===
DROP POLICY IF EXISTS "push_select_admin" ON push_notifications;
DROP POLICY IF EXISTS "push_insert_admin" ON push_notifications;

CREATE POLICY "push_select_admin" ON push_notifications
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "push_insert_admin" ON push_notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());


-- === SUBMISSIONS ===
DROP POLICY IF EXISTS "submissions_select_authenticated" ON submissions;
DROP POLICY IF EXISTS "submissions_insert_own" ON submissions;
DROP POLICY IF EXISTS "submissions_update_admin" ON submissions;
DROP POLICY IF EXISTS "submissions_delete_admin" ON submissions;

CREATE POLICY "submissions_select_authenticated" ON submissions
  FOR SELECT TO authenticated USING (submitted_by = auth.uid() OR public.is_admin());

CREATE POLICY "submissions_insert_own" ON submissions
  FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "submissions_update_admin" ON submissions
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "submissions_delete_admin" ON submissions
  FOR DELETE TO authenticated USING (public.is_admin());


-- === REEL_BOOKMARKS ===
DROP POLICY IF EXISTS "reel_bookmarks_select_own" ON reel_bookmarks;
DROP POLICY IF EXISTS "reel_bookmarks_insert_own" ON reel_bookmarks;
DROP POLICY IF EXISTS "reel_bookmarks_delete_own" ON reel_bookmarks;

CREATE POLICY "reel_bookmarks_select_own" ON reel_bookmarks
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "reel_bookmarks_insert_own" ON reel_bookmarks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "reel_bookmarks_delete_own" ON reel_bookmarks
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- === REEL_COMMENTS ===
DROP POLICY IF EXISTS "reel_comments_select_authenticated" ON reel_comments;
DROP POLICY IF EXISTS "reel_comments_insert_own" ON reel_comments;

CREATE POLICY "reel_comments_select_authenticated" ON reel_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reel_comments_insert_own" ON reel_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());


-- === REEL_COMMENT_LIKES ===
DROP POLICY IF EXISTS "reel_comment_likes_select_own" ON reel_comment_likes;
DROP POLICY IF EXISTS "reel_comment_likes_insert_own" ON reel_comment_likes;
DROP POLICY IF EXISTS "reel_comment_likes_delete_own" ON reel_comment_likes;

CREATE POLICY "reel_comment_likes_select_own" ON reel_comment_likes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "reel_comment_likes_insert_own" ON reel_comment_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "reel_comment_likes_delete_own" ON reel_comment_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- === LIVE_LOCATIONS ===
DROP POLICY IF EXISTS "live_locations_select_authenticated" ON live_locations;
DROP POLICY IF EXISTS "live_locations_insert_own" ON live_locations;
DROP POLICY IF EXISTS "live_locations_update_own" ON live_locations;
DROP POLICY IF EXISTS "live_locations_delete_own" ON live_locations;

CREATE POLICY "live_locations_select_authenticated" ON live_locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "live_locations_insert_own" ON live_locations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "live_locations_update_own" ON live_locations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "live_locations_delete_own" ON live_locations
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- === SPOTIFY_TRACKS ===
DROP POLICY IF EXISTS "spotify_select_authenticated" ON spotify_tracks;
DROP POLICY IF EXISTS "spotify_insert_own" ON spotify_tracks;
DROP POLICY IF EXISTS "spotify_update_own" ON spotify_tracks;

CREATE POLICY "spotify_select_authenticated" ON spotify_tracks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "spotify_insert_own" ON spotify_tracks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "spotify_update_own" ON spotify_tracks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- === SPONSORS ===
DROP POLICY IF EXISTS "sponsors_select_public" ON sponsors;
DROP POLICY IF EXISTS "sponsors_select_via_active_promotions" ON sponsors;
DROP POLICY IF EXISTS "sponsors_admin_insert" ON sponsors;
DROP POLICY IF EXISTS "sponsors_admin_update" ON sponsors;
DROP POLICY IF EXISTS "sponsors_admin_delete" ON sponsors;

CREATE POLICY "sponsors_select_via_active_promotions" ON sponsors
  FOR SELECT TO authenticated
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

CREATE POLICY "sponsors_admin_insert" ON sponsors
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "sponsors_admin_update" ON sponsors
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "sponsors_admin_delete" ON sponsors
  FOR DELETE TO authenticated USING (public.is_admin());


-- === PROMOTIONS ===
DROP POLICY IF EXISTS "promotions_select_active" ON promotions;
DROP POLICY IF EXISTS "promotions_select_admin" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_insert" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_update" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_delete" ON promotions;

CREATE POLICY "promotions_select_active" ON promotions
  FOR SELECT TO authenticated
  USING (
    (status = 'active' AND now() >= start_date AND now() <= end_date)
    OR public.is_admin()
  );

CREATE POLICY "promotions_admin_insert" ON promotions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "promotions_admin_update" ON promotions
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "promotions_admin_delete" ON promotions
  FOR DELETE TO authenticated USING (public.is_admin());


-- === PROMOTION_IMPRESSIONS ===
DROP POLICY IF EXISTS "impressions_insert_own" ON promotion_impressions;
DROP POLICY IF EXISTS "impressions_select_admin" ON promotion_impressions;

CREATE POLICY "impressions_insert_own" ON promotion_impressions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "impressions_select_admin" ON promotion_impressions
  FOR SELECT TO authenticated USING (public.is_admin());


-- === PROMOTION_CLICKS ===
DROP POLICY IF EXISTS "clicks_insert_own" ON promotion_clicks;
DROP POLICY IF EXISTS "clicks_select_admin" ON promotion_clicks;

CREATE POLICY "clicks_insert_own" ON promotion_clicks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "clicks_select_admin" ON promotion_clicks
  FOR SELECT TO authenticated USING (public.is_admin());


-- === PROMOTION_DAILY_STATS ===
DROP POLICY IF EXISTS "daily_stats_select_admin" ON promotion_daily_stats;
DROP POLICY IF EXISTS "daily_stats_insert_admin" ON promotion_daily_stats;
DROP POLICY IF EXISTS "daily_stats_update_admin" ON promotion_daily_stats;

CREATE POLICY "daily_stats_select_admin" ON promotion_daily_stats
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "daily_stats_insert_admin" ON promotion_daily_stats
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "daily_stats_update_admin" ON promotion_daily_stats
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- === ORDERS ===
DROP POLICY IF EXISTS "orders_read_authenticated" ON orders;

CREATE POLICY "orders_read_authenticated" ON orders
  FOR SELECT TO authenticated USING (true);


-- === USER_ORDERS ===
DROP POLICY IF EXISTS "user_orders_read_authenticated" ON user_orders;
DROP POLICY IF EXISTS "user_orders_insert_service" ON user_orders;

CREATE POLICY "user_orders_read_authenticated" ON user_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_orders_insert_service" ON user_orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());


-- === KADERSCHMIEDE (alle Tabellen) ===
DROP POLICY IF EXISTS "kader_activities_select" ON kaderschmiede_activities;
DROP POLICY IF EXISTS "kader_activities_insert" ON kaderschmiede_activities;

CREATE POLICY "kader_activities_select" ON kaderschmiede_activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kader_activities_insert" ON kaderschmiede_activities
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "kader_act_part_select" ON kaderschmiede_activity_participants;
DROP POLICY IF EXISTS "kader_act_part_insert" ON kaderschmiede_activity_participants;
DROP POLICY IF EXISTS "kader_act_part_delete" ON kaderschmiede_activity_participants;

CREATE POLICY "kader_act_part_select" ON kaderschmiede_activity_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kader_act_part_insert" ON kaderschmiede_activity_participants
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "kader_act_part_delete" ON kaderschmiede_activity_participants
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "kader_trupps_select" ON kaderschmiede_trupps;
DROP POLICY IF EXISTS "kader_trupps_insert" ON kaderschmiede_trupps;

CREATE POLICY "kader_trupps_select" ON kaderschmiede_trupps
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kader_trupps_insert" ON kaderschmiede_trupps
  FOR INSERT TO authenticated WITH CHECK (leader_id = auth.uid());

DROP POLICY IF EXISTS "kader_trupp_members_select" ON kaderschmiede_trupp_members;
DROP POLICY IF EXISTS "kader_trupp_members_insert" ON kaderschmiede_trupp_members;
DROP POLICY IF EXISTS "kader_trupp_members_delete" ON kaderschmiede_trupp_members;

CREATE POLICY "kader_trupp_members_select" ON kaderschmiede_trupp_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kader_trupp_members_insert" ON kaderschmiede_trupp_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "kader_trupp_members_delete" ON kaderschmiede_trupp_members
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "kader_meetings_select" ON kaderschmiede_trupp_meetings;
DROP POLICY IF EXISTS "kader_meetings_insert" ON kaderschmiede_trupp_meetings;

CREATE POLICY "kader_meetings_select" ON kaderschmiede_trupp_meetings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kader_meetings_insert" ON kaderschmiede_trupp_meetings
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "kader_meeting_att_select" ON kaderschmiede_meeting_attendees;
DROP POLICY IF EXISTS "kader_meeting_att_insert" ON kaderschmiede_meeting_attendees;
DROP POLICY IF EXISTS "kader_meeting_att_delete" ON kaderschmiede_meeting_attendees;

CREATE POLICY "kader_meeting_att_select" ON kaderschmiede_meeting_attendees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kader_meeting_att_insert" ON kaderschmiede_meeting_attendees
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "kader_meeting_att_delete" ON kaderschmiede_meeting_attendees
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "kader_challenges_select" ON kaderschmiede_challenges;
DROP POLICY IF EXISTS "kader_challenges_insert" ON kaderschmiede_challenges;

CREATE POLICY "kader_challenges_select" ON kaderschmiede_challenges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kader_challenges_insert" ON kaderschmiede_challenges
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "kader_ch_part_select" ON kaderschmiede_challenge_participants;
DROP POLICY IF EXISTS "kader_ch_part_insert" ON kaderschmiede_challenge_participants;

CREATE POLICY "kader_ch_part_select" ON kaderschmiede_challenge_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kader_ch_part_insert" ON kaderschmiede_challenge_participants
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "kader_ch_results_select" ON kaderschmiede_challenge_results;
DROP POLICY IF EXISTS "kader_ch_results_insert" ON kaderschmiede_challenge_results;

CREATE POLICY "kader_ch_results_select" ON kaderschmiede_challenge_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kader_ch_results_insert" ON kaderschmiede_challenge_results
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "kader_workout_select" ON kaderschmiede_workout_logs;
DROP POLICY IF EXISTS "kader_workout_insert" ON kaderschmiede_workout_logs;

CREATE POLICY "kader_workout_select" ON kaderschmiede_workout_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "kader_workout_insert" ON kaderschmiede_workout_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "kader_checkins_select" ON kaderschmiede_checkins;
DROP POLICY IF EXISTS "kader_checkins_insert" ON kaderschmiede_checkins;
DROP POLICY IF EXISTS "kader_checkins_update" ON kaderschmiede_checkins;

CREATE POLICY "kader_checkins_select" ON kaderschmiede_checkins
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kader_checkins_insert" ON kaderschmiede_checkins
  FOR INSERT TO authenticated WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "kader_checkins_update" ON kaderschmiede_checkins
  FOR UPDATE TO authenticated
  USING (host_user_id = auth.uid()) WITH CHECK (host_user_id = auth.uid());

DROP POLICY IF EXISTS "kader_checkin_entries_select" ON kaderschmiede_checkin_entries;
DROP POLICY IF EXISTS "kader_checkin_entries_insert" ON kaderschmiede_checkin_entries;

CREATE POLICY "kader_checkin_entries_select" ON kaderschmiede_checkin_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kader_checkin_entries_insert" ON kaderschmiede_checkin_entries
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());


-- ############################################################
-- TEIL 50: AGGREGATION FUNCTION (Promotion Stats)
-- ############################################################

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


-- ############################################################
-- TEIL 51: PERFORMANCE INDEXES
-- ############################################################

CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_flag_hoisted ON users(flag_hoisted_at) WHERE flag_hoisted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location) WHERE location IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_from ON chat_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_to ON chat_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_id, target_type);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_collected_stamps_user ON collected_stamps(user_id);

CREATE INDEX IF NOT EXISTS idx_inbox_notifications_user ON inbox_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

CREATE INDEX IF NOT EXISTS idx_reel_bookmarks_user ON reel_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_reel ON reel_comments(reel_id);

CREATE INDEX IF NOT EXISTS idx_live_locations_expires ON live_locations(expires_at);

CREATE INDEX IF NOT EXISTS idx_promotion_impressions_promo_date ON promotion_impressions(promotion_id, date);
CREATE INDEX IF NOT EXISTS idx_promotion_clicks_promo_date ON promotion_clicks(promotion_id, date);
CREATE INDEX IF NOT EXISTS idx_promotion_daily_stats_promo_date ON promotion_daily_stats(promotion_id, date);
CREATE INDEX IF NOT EXISTS idx_promotions_status_dates ON promotions(status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_orders_slug ON orders(slug);
CREATE INDEX IF NOT EXISTS idx_orders_category ON orders(category);
CREATE INDEX IF NOT EXISTS idx_user_orders_user ON user_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_orders_order ON user_orders(order_id);

CREATE INDEX IF NOT EXISTS idx_kader_activities_datetime ON kaderschmiede_activities(date_time);
CREATE INDEX IF NOT EXISTS idx_kader_act_part_activity ON kaderschmiede_activity_participants(activity_id);
CREATE INDEX IF NOT EXISTS idx_kader_trupps_created ON kaderschmiede_trupps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kader_trupp_members_trupp ON kaderschmiede_trupp_members(trupp_id);
CREATE INDEX IF NOT EXISTS idx_kader_meetings_trupp ON kaderschmiede_trupp_meetings(trupp_id);
CREATE INDEX IF NOT EXISTS idx_kader_meetings_datetime ON kaderschmiede_trupp_meetings(date_time);
CREATE INDEX IF NOT EXISTS idx_kader_meeting_att_meeting ON kaderschmiede_meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_kader_challenges_created ON kaderschmiede_challenges(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kader_ch_part_challenge ON kaderschmiede_challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_kader_ch_results_challenge ON kaderschmiede_challenge_results(challenge_id);
CREATE INDEX IF NOT EXISTS idx_kader_workout_user ON kaderschmiede_workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_kader_checkins_active ON kaderschmiede_checkins(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_kader_checkin_entries_checkin ON kaderschmiede_checkin_entries(checkin_id);


-- ############################################################
-- TEIL 52: REALTIME fuer Chat aktivieren
-- ############################################################

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;


-- ############################################################
-- TEIL 53: ORDEN SEED DATA (nur wenn noch nicht vorhanden)
-- ############################################################

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
  ('ord_urgestein', 'Urgestein', 'Seit dem ersten Tag dabei', 'Gem', 'legendary', 'selten', 'legendaer', 'Tag-1-User', 5000)
ON CONFLICT (slug) DO NOTHING;


-- ############################################################
-- FERTIG!
-- 46 Tabellen, alle RLS Policies, alle Indexes, alle Functions.
-- Wenn alles "Success" zeigt, ist deine DB auf dem neusten Stand.
-- ############################################################
