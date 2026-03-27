-- ============================================================
-- SCHRITT 1: ALLE TABELLEN + SPALTEN
-- Einfach kopieren und im SQL Editor ausfuehren.
-- Kann mehrfach ausgefuehrt werden (IF NOT EXISTS).
-- KEIN Dollar-Quoting, keine DO-Bloecke.
-- ============================================================


-- === USERS ===
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


-- === USER_VALUES ===
CREATE TABLE IF NOT EXISTS user_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_values ADD COLUMN IF NOT EXISTS value TEXT;


-- === PRIVACY_SETTINGS ===
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


-- === FRIENDSHIPS ===
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === FRIEND_REQUESTS ===
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === BLOCKED_USERS ===
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === POSTS ===
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


-- === POST_LIKES ===
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === POST_COMMENTS ===
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  reply_to_id UUID DEFAULT NULL,
  defend_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === STORIES ===
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


-- === STORY_VIEWERS ===
CREATE TABLE IF NOT EXISTS story_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === CHAT_MESSAGES ===
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


-- === NEWS ===
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  image TEXT DEFAULT '',
  author TEXT DEFAULT 'Heldentum Redaktion',
  publish_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === PLACES ===
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


-- === RESTAURANTS ===
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


-- === REVIEWS ===
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 0,
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === REVIEW_VOTES ===
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === FAVORITES ===
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'place',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === COLLECTED_STAMPS ===
CREATE TABLE IF NOT EXISTS collected_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  photo_uri TEXT DEFAULT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === INBOX_NOTIFICATIONS ===
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


-- === PUSH_NOTIFICATIONS ===
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


-- === SUBMISSIONS ===
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


-- === REEL_BOOKMARKS ===
CREATE TABLE IF NOT EXISTS reel_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === REEL_COMMENTS ===
CREATE TABLE IF NOT EXISTS reel_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === REEL_COMMENT_LIKES ===
CREATE TABLE IF NOT EXISTS reel_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_comment_id UUID NOT NULL REFERENCES reel_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === LIVE_LOCATIONS ===
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

ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'friends';
ALTER TABLE live_locations ADD COLUMN IF NOT EXISTS specific_user_ids TEXT[] DEFAULT NULL;


-- === SPOTIFY_TRACKS ===
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


-- === SPONSORS ===
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  website_url TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === PROMOTIONS ===
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


-- === PROMOTION_IMPRESSIONS ===
CREATE TABLE IF NOT EXISTS promotion_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_duration_ms INTEGER DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);


-- === PROMOTION_CLICKS ===
CREATE TABLE IF NOT EXISTS promotion_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE
);


-- === PROMOTION_DAILY_STATS ===
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


-- === ORDERS ===
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


-- === USER_ORDERS ===
CREATE TABLE IF NOT EXISTS user_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'manual_admin',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, order_id)
);


-- === KADERSCHMIEDE_ACTIVITIES ===
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


-- === KADERSCHMIEDE_ACTIVITY_PARTICIPANTS ===
CREATE TABLE IF NOT EXISTS kaderschmiede_activity_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES kaderschmiede_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === KADERSCHMIEDE_TRUPPS ===
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


-- === KADERSCHMIEDE_TRUPP_MEMBERS ===
CREATE TABLE IF NOT EXISTS kaderschmiede_trupp_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trupp_id UUID NOT NULL REFERENCES kaderschmiede_trupps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === KADERSCHMIEDE_TRUPP_MEETINGS ===
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


-- === KADERSCHMIEDE_MEETING_ATTENDEES ===
CREATE TABLE IF NOT EXISTS kaderschmiede_meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES kaderschmiede_trupp_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === KADERSCHMIEDE_CHALLENGES ===
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


-- === KADERSCHMIEDE_CHALLENGE_PARTICIPANTS ===
CREATE TABLE IF NOT EXISTS kaderschmiede_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES kaderschmiede_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === KADERSCHMIEDE_CHALLENGE_RESULTS ===
CREATE TABLE IF NOT EXISTS kaderschmiede_challenge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES kaderschmiede_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL DEFAULT 0,
  proof_url TEXT DEFAULT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === KADERSCHMIEDE_WORKOUT_LOGS ===
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


-- === KADERSCHMIEDE_CHECKINS ===
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


-- === KADERSCHMIEDE_CHECKIN_ENTRIES ===
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


-- ============================================================
-- FERTIG SCHRITT 1! Alle 46 Tabellen angelegt.
-- Weiter mit SCHRITT_2_CONSTRAINTS.sql
-- ============================================================
