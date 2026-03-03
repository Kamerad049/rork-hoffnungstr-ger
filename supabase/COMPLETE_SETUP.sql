-- ============================================================
-- KOMPLETTES SQL-SETUP: Alle Tabellen, RLS, Funktionen, Indexes
-- Supabase Dashboard > SQL Editor > New Query > Alles einfuegen > Run
-- ============================================================


-- ============================================================
-- 1. USERS (Haupt-Profil-Tabelle)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT NULL,
  rank TEXT NOT NULL DEFAULT 'Neuling',
  rank_icon TEXT NOT NULL DEFAULT 'Eye',
  xp INTEGER NOT NULL DEFAULT 0,
  stamp_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  friend_count INTEGER NOT NULL DEFAULT 0,
  flag_hoisted_at TIMESTAMPTZ DEFAULT NULL,
  birthplace TEXT NOT NULL DEFAULT '',
  birthplace_plz TEXT NOT NULL DEFAULT '',
  residence TEXT NOT NULL DEFAULT '',
  residence_plz TEXT NOT NULL DEFAULT '',
  bundesland TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  religion TEXT NOT NULL DEFAULT '',
  cross_style TEXT NOT NULL DEFAULT 'none',
  show_gender BOOLEAN NOT NULL DEFAULT false,
  show_religion BOOLEAN NOT NULL DEFAULT false,
  show_sundial BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_flag ON users(flag_hoisted_at);


-- ============================================================
-- 2. PRIVACY SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  show_posts TEXT NOT NULL DEFAULT 'everyone',
  show_friends TEXT NOT NULL DEFAULT 'everyone',
  show_stamps TEXT NOT NULL DEFAULT 'everyone',
  feed_post_visibility TEXT NOT NULL DEFAULT 'everyone',
  story_visibility TEXT NOT NULL DEFAULT 'everyone',
  show_birthplace TEXT NOT NULL DEFAULT 'friends',
  show_residence TEXT NOT NULL DEFAULT 'friends',
  show_bundesland TEXT NOT NULL DEFAULT 'everyone',
  show_values TEXT NOT NULL DEFAULT 'everyone',
  allow_tagging TEXT NOT NULL DEFAULT 'friends'
);


-- ============================================================
-- 3. USER VALUES (Persoenliche Werte)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_values_user ON user_values(user_id);


-- ============================================================
-- 4. FRIENDSHIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);


-- ============================================================
-- 5. FRIEND REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);


-- ============================================================
-- 6. BLOCKED USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);


-- ============================================================
-- 7. POSTS
-- ============================================================

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] DEFAULT '{}',
  media_type TEXT NOT NULL DEFAULT 'none',
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  location TEXT DEFAULT NULL,
  tagged_user_ids TEXT[] DEFAULT NULL,
  tags TEXT[] DEFAULT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  comments_disabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location) WHERE location IS NOT NULL;


-- ============================================================
-- 8. POST LIKES
-- ============================================================

CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);


-- ============================================================
-- 9. POST COMMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  reply_to_id UUID DEFAULT NULL REFERENCES post_comments(id) ON DELETE SET NULL,
  defend_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON post_comments(user_id);


-- ============================================================
-- 10. STORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
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

CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);


-- ============================================================
-- 11. STORY VIEWERS
-- ============================================================

CREATE TABLE IF NOT EXISTS story_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_viewers_story ON story_viewers(story_id);
CREATE INDEX IF NOT EXISTS idx_story_viewers_viewer ON story_viewers(viewer_id);


-- ============================================================
-- 12. REEL BOOKMARKS
-- ============================================================

CREATE TABLE IF NOT EXISTS reel_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reel_bookmarks_user ON reel_bookmarks(user_id);


-- ============================================================
-- 13. REEL COMMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS reel_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reel_comments_reel ON reel_comments(reel_id);


-- ============================================================
-- 14. REEL COMMENT LIKES
-- ============================================================

CREATE TABLE IF NOT EXISTS reel_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_comment_id UUID NOT NULL REFERENCES reel_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reel_comment_id, user_id)
);


-- ============================================================
-- 15. NEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  image TEXT DEFAULT '',
  author TEXT NOT NULL DEFAULT 'Heldentum Redaktion',
  publish_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_publish ON news(publish_date DESC);


-- ============================================================
-- 16. PLACES (Orte / Sehenswuerdigkeiten)
-- ============================================================

CREATE TABLE IF NOT EXISTS places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  plz TEXT NOT NULL DEFAULT '',
  bundesland TEXT NOT NULL DEFAULT '',
  images TEXT[] DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'Denkmal',
  latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  rating DOUBLE PRECISION NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_places_bundesland ON places(bundesland);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);


-- ============================================================
-- 17. RESTAURANTS
-- ============================================================

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  plz TEXT NOT NULL DEFAULT '',
  bundesland TEXT NOT NULL DEFAULT '',
  images TEXT[] DEFAULT '{}',
  cuisine TEXT[] DEFAULT '{}',
  price_range INTEGER NOT NULL DEFAULT 1,
  latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  rating DOUBLE PRECISION NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_bundesland ON restaurants(bundesland);


-- ============================================================
-- 18. REVIEWS (fuer Places + Restaurants)
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('place', 'restaurant')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);


-- ============================================================
-- 19. REVIEW VOTES (Thumbs Up / Down)
-- ============================================================

CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id);


-- ============================================================
-- 20. FAVORITES
-- ============================================================

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_id, target_type)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);


-- ============================================================
-- 21. COLLECTED STAMPS (Stempelpass)
-- ============================================================

CREATE TABLE IF NOT EXISTS collected_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  photo_uri TEXT DEFAULT NULL,
  latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_collected_stamps_user ON collected_stamps(user_id);


-- ============================================================
-- 22. INBOX NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS inbox_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'like_post',
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id TEXT DEFAULT NULL,
  target_preview TEXT DEFAULT NULL,
  media_url TEXT DEFAULT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_notifications_user ON inbox_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_notifications_read ON inbox_notifications(user_id, read);


-- ============================================================
-- 23. PUSH NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  audio_uri TEXT DEFAULT NULL,
  audio_duration DOUBLE PRECISION DEFAULT 0,
  recipients JSONB NOT NULL DEFAULT '"all"',
  status TEXT NOT NULL DEFAULT 'sent',
  receipts JSONB NOT NULL DEFAULT '[]',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_notifications_sent ON push_notifications(sent_at DESC);


-- ============================================================
-- 24. SUBMISSIONS (Vorschlaege fuer neue Orte/Restaurants)
-- ============================================================

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('place', 'restaurant')),
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitter_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  plz TEXT NOT NULL DEFAULT '',
  bundesland TEXT NOT NULL DEFAULT '',
  images TEXT[] DEFAULT '{}',
  place_category TEXT DEFAULT NULL,
  cuisine_types TEXT[] DEFAULT NULL,
  price_range INTEGER DEFAULT NULL,
  address TEXT DEFAULT NULL,
  latitude DOUBLE PRECISION DEFAULT NULL,
  longitude DOUBLE PRECISION DEFAULT NULL,
  why_recommend TEXT NOT NULL DEFAULT '',
  rejection_reason TEXT DEFAULT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NULL,
  reviewed_by UUID DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(submitted_by);


-- ============================================================
-- 25. LIVE LOCATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS live_locations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION NOT NULL DEFAULT 10,
  expires_at TIMESTAMPTZ NOT NULL,
  audience TEXT NOT NULL DEFAULT 'friends',
  specific_user_ids UUID[] DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_locations_expires ON live_locations(expires_at);


-- ============================================================
-- 26. SPOTIFY TRACKS
-- ============================================================

CREATE TABLE IF NOT EXISTS spotify_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  artist TEXT NOT NULL DEFAULT '',
  album TEXT NOT NULL DEFAULT '',
  album_art TEXT DEFAULT '',
  spotify_url TEXT DEFAULT '',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  progress_ms INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 27. REPORTS (Meldungen)
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_preview TEXT DEFAULT '',
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  resolved_by UUID DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);


-- ============================================================
-- 28. MODERATORS
-- ============================================================

CREATE TABLE IF NOT EXISTS moderators (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'moderator',
  can_view_reports BOOLEAN NOT NULL DEFAULT true,
  can_resolve_reports BOOLEAN NOT NULL DEFAULT false,
  can_edit_posts BOOLEAN NOT NULL DEFAULT false,
  can_delete_posts BOOLEAN NOT NULL DEFAULT false,
  can_delete_stories BOOLEAN NOT NULL DEFAULT false,
  can_ban_users BOOLEAN NOT NULL DEFAULT false,
  appointed_by TEXT DEFAULT '',
  appointed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 29. USER RESTRICTIONS (Sperren / Bans)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reason TEXT DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  issued_by TEXT DEFAULT 'system',
  violation_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_user_restrictions_user ON user_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restrictions_expires ON user_restrictions(expires_at);


-- ============================================================
-- 30. SPONSORS
-- ============================================================

CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  website_url TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 31. PROMOTIONS
-- ============================================================

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

CREATE INDEX IF NOT EXISTS idx_promotions_status_dates ON promotions(status, start_date, end_date);


-- ============================================================
-- 32. PROMOTION IMPRESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS promotion_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_duration_ms INTEGER DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_promotion_impressions_promo_date ON promotion_impressions(promotion_id, date);


-- ============================================================
-- 33. PROMOTION CLICKS
-- ============================================================

CREATE TABLE IF NOT EXISTS promotion_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_promotion_clicks_promo_date ON promotion_clicks(promotion_id, date);


-- ============================================================
-- 34. PROMOTION DAILY STATS
-- ============================================================

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

CREATE INDEX IF NOT EXISTS idx_promotion_daily_stats_promo_date ON promotion_daily_stats(promotion_id, date);


-- ============================================================
-- 35. KADERSCHMIEDE: Activities
-- ============================================================

CREATE TABLE IF NOT EXISTS kaderschmiede_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  plz TEXT NOT NULL DEFAULT '',
  bundesland TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  date_time TIMESTAMPTZ NOT NULL,
  level TEXT NOT NULL DEFAULT 'Anfaenger',
  max_participants INT NOT NULL DEFAULT 10,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ka_activities_user ON kaderschmiede_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_ka_activities_date ON kaderschmiede_activities(date_time);
CREATE INDEX IF NOT EXISTS idx_ka_activities_bundesland ON kaderschmiede_activities(bundesland);


-- ============================================================
-- 36. KADERSCHMIEDE: Activity Participants
-- ============================================================

CREATE TABLE IF NOT EXISTS kaderschmiede_activity_participants (
  activity_id UUID NOT NULL REFERENCES kaderschmiede_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_id, user_id)
);


-- ============================================================
-- 37. KADERSCHMIEDE: Trupps (Squads)
-- ============================================================

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


-- ============================================================
-- 38. KADERSCHMIEDE: Trupp Members
-- ============================================================

CREATE TABLE IF NOT EXISTS kaderschmiede_trupp_members (
  trupp_id UUID NOT NULL REFERENCES kaderschmiede_trupps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (trupp_id, user_id)
);


-- ============================================================
-- 39. KADERSCHMIEDE: Trupp Meetings
-- ============================================================

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


-- ============================================================
-- 40. KADERSCHMIEDE: Meeting Attendees
-- ============================================================

CREATE TABLE IF NOT EXISTS kaderschmiede_meeting_attendees (
  meeting_id UUID NOT NULL REFERENCES kaderschmiede_trupp_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ,
  PRIMARY KEY (meeting_id, user_id)
);


-- ============================================================
-- 41. KADERSCHMIEDE: Challenges
-- ============================================================

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


-- ============================================================
-- 42. KADERSCHMIEDE: Challenge Participants
-- ============================================================

CREATE TABLE IF NOT EXISTS kaderschmiede_challenge_participants (
  challenge_id UUID NOT NULL REFERENCES kaderschmiede_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id)
);


-- ============================================================
-- 43. KADERSCHMIEDE: Challenge Results
-- ============================================================

CREATE TABLE IF NOT EXISTS kaderschmiede_challenge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES kaderschmiede_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL DEFAULT 0,
  proof_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ka_challenge_results ON kaderschmiede_challenge_results(challenge_id);


-- ============================================================
-- 44. KADERSCHMIEDE: Workout Logs
-- ============================================================

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
-- 45. KADERSCHMIEDE: Check-In Sessions
-- ============================================================

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

CREATE INDEX IF NOT EXISTS idx_checkins_code_active ON kaderschmiede_checkins(code, is_active);


-- ============================================================
-- 46. KADERSCHMIEDE: Check-In Entries
-- ============================================================

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

CREATE INDEX IF NOT EXISTS idx_checkin_entries_checkin_id ON kaderschmiede_checkin_entries(checkin_id);


-- ============================================================
-- 47. ORDEN (Auszeichnungen / Badges)
-- ============================================================

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

CREATE INDEX IF NOT EXISTS idx_orders_slug ON orders(slug);
CREATE INDEX IF NOT EXISTS idx_orders_category ON orders(category);


-- ============================================================
-- 48. USER ORDERS (verdiente Orden)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'manual_admin',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_user_orders_user_id ON user_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_orders_order_id ON user_orders(order_id);


-- ============================================================
-- UNIQUE CONSTRAINTS (Promotion-System)
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
-- ROW LEVEL SECURITY: Alle Tabellen aktivieren
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comment_likes ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_daily_stats ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_orders ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- HELPER FUNCTION: is_admin
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
-- RLS POLICIES: users
-- ============================================================

DROP POLICY IF EXISTS "users_select_authenticated" ON users;
CREATE POLICY "users_select_authenticated" ON users
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "users_delete_admin" ON users;
CREATE POLICY "users_delete_admin" ON users
  FOR DELETE TO authenticated USING (public.is_admin());


-- ============================================================
-- RLS POLICIES: privacy_settings
-- ============================================================

DROP POLICY IF EXISTS "privacy_select_own" ON privacy_settings;
CREATE POLICY "privacy_select_own" ON privacy_settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "privacy_insert_own" ON privacy_settings;
CREATE POLICY "privacy_insert_own" ON privacy_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "privacy_update_own" ON privacy_settings;
CREATE POLICY "privacy_update_own" ON privacy_settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: user_values
-- ============================================================

DROP POLICY IF EXISTS "user_values_select" ON user_values;
CREATE POLICY "user_values_select" ON user_values
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_values_insert_own" ON user_values;
CREATE POLICY "user_values_insert_own" ON user_values
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_values_delete_own" ON user_values;
CREATE POLICY "user_values_delete_own" ON user_values
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: friendships
-- ============================================================

DROP POLICY IF EXISTS "friendships_select" ON friendships;
CREATE POLICY "friendships_select" ON friendships
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "friendships_insert_own" ON friendships;
CREATE POLICY "friendships_insert_own" ON friendships
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "friendships_delete_own" ON friendships;
CREATE POLICY "friendships_delete_own" ON friendships
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR friend_id = auth.uid());


-- ============================================================
-- RLS POLICIES: friend_requests
-- ============================================================

DROP POLICY IF EXISTS "friend_requests_select" ON friend_requests;
CREATE POLICY "friend_requests_select" ON friend_requests
  FOR SELECT TO authenticated USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS "friend_requests_insert_own" ON friend_requests;
CREATE POLICY "friend_requests_insert_own" ON friend_requests
  FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());

DROP POLICY IF EXISTS "friend_requests_update_own" ON friend_requests;
CREATE POLICY "friend_requests_update_own" ON friend_requests
  FOR UPDATE TO authenticated USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

DROP POLICY IF EXISTS "friend_requests_delete_own" ON friend_requests;
CREATE POLICY "friend_requests_delete_own" ON friend_requests
  FOR DELETE TO authenticated USING (from_user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: blocked_users
-- ============================================================

DROP POLICY IF EXISTS "blocked_select_own" ON blocked_users;
CREATE POLICY "blocked_select_own" ON blocked_users
  FOR SELECT TO authenticated USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "blocked_insert_own" ON blocked_users;
CREATE POLICY "blocked_insert_own" ON blocked_users
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "blocked_delete_own" ON blocked_users;
CREATE POLICY "blocked_delete_own" ON blocked_users
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());


-- ============================================================
-- RLS POLICIES: posts
-- ============================================================

DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own" ON posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own" ON posts
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());


-- ============================================================
-- RLS POLICIES: post_likes
-- ============================================================

DROP POLICY IF EXISTS "post_likes_select" ON post_likes;
CREATE POLICY "post_likes_select" ON post_likes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "post_likes_insert_own" ON post_likes;
CREATE POLICY "post_likes_insert_own" ON post_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "post_likes_delete_own" ON post_likes;
CREATE POLICY "post_likes_delete_own" ON post_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: post_comments
-- ============================================================

DROP POLICY IF EXISTS "post_comments_select" ON post_comments;
CREATE POLICY "post_comments_select" ON post_comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "post_comments_insert_own" ON post_comments;
CREATE POLICY "post_comments_insert_own" ON post_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "post_comments_delete_own" ON post_comments;
CREATE POLICY "post_comments_delete_own" ON post_comments
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());


-- ============================================================
-- RLS POLICIES: stories
-- ============================================================

DROP POLICY IF EXISTS "stories_select" ON stories;
CREATE POLICY "stories_select" ON stories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "stories_insert_own" ON stories;
CREATE POLICY "stories_insert_own" ON stories
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "stories_delete_own" ON stories;
CREATE POLICY "stories_delete_own" ON stories
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());


-- ============================================================
-- RLS POLICIES: story_viewers
-- ============================================================

DROP POLICY IF EXISTS "story_viewers_select" ON story_viewers;
CREATE POLICY "story_viewers_select" ON story_viewers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "story_viewers_insert_own" ON story_viewers;
CREATE POLICY "story_viewers_insert_own" ON story_viewers
  FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());


-- ============================================================
-- RLS POLICIES: reel_bookmarks
-- ============================================================

DROP POLICY IF EXISTS "reel_bookmarks_select_own" ON reel_bookmarks;
CREATE POLICY "reel_bookmarks_select_own" ON reel_bookmarks
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "reel_bookmarks_insert_own" ON reel_bookmarks;
CREATE POLICY "reel_bookmarks_insert_own" ON reel_bookmarks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reel_bookmarks_delete_own" ON reel_bookmarks;
CREATE POLICY "reel_bookmarks_delete_own" ON reel_bookmarks
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: reel_comments
-- ============================================================

DROP POLICY IF EXISTS "reel_comments_select" ON reel_comments;
CREATE POLICY "reel_comments_select" ON reel_comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reel_comments_insert_own" ON reel_comments;
CREATE POLICY "reel_comments_insert_own" ON reel_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: reel_comment_likes
-- ============================================================

DROP POLICY IF EXISTS "reel_comment_likes_select" ON reel_comment_likes;
CREATE POLICY "reel_comment_likes_select" ON reel_comment_likes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reel_comment_likes_insert_own" ON reel_comment_likes;
CREATE POLICY "reel_comment_likes_insert_own" ON reel_comment_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reel_comment_likes_delete_own" ON reel_comment_likes;
CREATE POLICY "reel_comment_likes_delete_own" ON reel_comment_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: news
-- ============================================================

DROP POLICY IF EXISTS "news_select" ON news;
CREATE POLICY "news_select" ON news
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "news_insert_admin" ON news;
CREATE POLICY "news_insert_admin" ON news
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "news_update_admin" ON news;
CREATE POLICY "news_update_admin" ON news
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "news_delete_admin" ON news;
CREATE POLICY "news_delete_admin" ON news
  FOR DELETE TO authenticated USING (public.is_admin());


-- ============================================================
-- RLS POLICIES: places
-- ============================================================

DROP POLICY IF EXISTS "places_select" ON places;
CREATE POLICY "places_select" ON places
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "places_insert_admin" ON places;
CREATE POLICY "places_insert_admin" ON places
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "places_update_admin" ON places;
CREATE POLICY "places_update_admin" ON places
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "places_delete_admin" ON places;
CREATE POLICY "places_delete_admin" ON places
  FOR DELETE TO authenticated USING (public.is_admin());


-- ============================================================
-- RLS POLICIES: restaurants
-- ============================================================

DROP POLICY IF EXISTS "restaurants_select" ON restaurants;
CREATE POLICY "restaurants_select" ON restaurants
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "restaurants_insert_admin" ON restaurants;
CREATE POLICY "restaurants_insert_admin" ON restaurants
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "restaurants_update_admin" ON restaurants;
CREATE POLICY "restaurants_update_admin" ON restaurants
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "restaurants_delete_admin" ON restaurants;
CREATE POLICY "restaurants_delete_admin" ON restaurants
  FOR DELETE TO authenticated USING (public.is_admin());


-- ============================================================
-- RLS POLICIES: reviews
-- ============================================================

DROP POLICY IF EXISTS "reviews_select" ON reviews;
CREATE POLICY "reviews_select" ON reviews
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_delete_own" ON reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());


-- ============================================================
-- RLS POLICIES: review_votes
-- ============================================================

DROP POLICY IF EXISTS "review_votes_select" ON review_votes;
CREATE POLICY "review_votes_select" ON review_votes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "review_votes_insert_own" ON review_votes;
CREATE POLICY "review_votes_insert_own" ON review_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "review_votes_delete_own" ON review_votes;
CREATE POLICY "review_votes_delete_own" ON review_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: favorites
-- ============================================================

DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own" ON favorites
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: collected_stamps
-- ============================================================

DROP POLICY IF EXISTS "stamps_select" ON collected_stamps;
CREATE POLICY "stamps_select" ON collected_stamps
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "stamps_insert_own" ON collected_stamps;
CREATE POLICY "stamps_insert_own" ON collected_stamps
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: inbox_notifications
-- ============================================================

DROP POLICY IF EXISTS "inbox_select_own" ON inbox_notifications;
CREATE POLICY "inbox_select_own" ON inbox_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "inbox_insert" ON inbox_notifications;
CREATE POLICY "inbox_insert" ON inbox_notifications
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inbox_update_own" ON inbox_notifications;
CREATE POLICY "inbox_update_own" ON inbox_notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "inbox_delete_own" ON inbox_notifications;
CREATE POLICY "inbox_delete_own" ON inbox_notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: push_notifications
-- ============================================================

DROP POLICY IF EXISTS "push_select_admin" ON push_notifications;
CREATE POLICY "push_select_admin" ON push_notifications
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "push_insert_admin" ON push_notifications;
CREATE POLICY "push_insert_admin" ON push_notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());


-- ============================================================
-- RLS POLICIES: submissions
-- ============================================================

DROP POLICY IF EXISTS "submissions_select" ON submissions;
CREATE POLICY "submissions_select" ON submissions
  FOR SELECT TO authenticated USING (submitted_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "submissions_insert_own" ON submissions;
CREATE POLICY "submissions_insert_own" ON submissions
  FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS "submissions_update_admin" ON submissions;
CREATE POLICY "submissions_update_admin" ON submissions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "submissions_delete_admin" ON submissions;
CREATE POLICY "submissions_delete_admin" ON submissions
  FOR DELETE TO authenticated USING (public.is_admin());


-- ============================================================
-- RLS POLICIES: live_locations
-- ============================================================

DROP POLICY IF EXISTS "live_locations_select" ON live_locations;
CREATE POLICY "live_locations_select" ON live_locations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "live_locations_insert_own" ON live_locations;
CREATE POLICY "live_locations_insert_own" ON live_locations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "live_locations_update_own" ON live_locations;
CREATE POLICY "live_locations_update_own" ON live_locations
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "live_locations_delete_own" ON live_locations;
CREATE POLICY "live_locations_delete_own" ON live_locations
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: spotify_tracks
-- ============================================================

DROP POLICY IF EXISTS "spotify_select" ON spotify_tracks;
CREATE POLICY "spotify_select" ON spotify_tracks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "spotify_insert_own" ON spotify_tracks;
CREATE POLICY "spotify_insert_own" ON spotify_tracks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "spotify_update_own" ON spotify_tracks;
CREATE POLICY "spotify_update_own" ON spotify_tracks
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "spotify_delete_own" ON spotify_tracks;
CREATE POLICY "spotify_delete_own" ON spotify_tracks
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- ============================================================
-- RLS POLICIES: reports
-- ============================================================

DROP POLICY IF EXISTS "reports_select" ON reports;
CREATE POLICY "reports_select" ON reports
  FOR SELECT TO authenticated USING (reporter_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports
  FOR INSERT TO authenticated WITH CHECK (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_admin" ON reports
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "reports_delete_admin" ON reports;
CREATE POLICY "reports_delete_admin" ON reports
  FOR DELETE TO authenticated USING (public.is_admin());


-- ============================================================
-- RLS POLICIES: moderators
-- ============================================================

DROP POLICY IF EXISTS "moderators_select" ON moderators;
CREATE POLICY "moderators_select" ON moderators
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "moderators_insert_admin" ON moderators;
CREATE POLICY "moderators_insert_admin" ON moderators
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "moderators_update_admin" ON moderators;
CREATE POLICY "moderators_update_admin" ON moderators
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "moderators_delete_admin" ON moderators;
CREATE POLICY "moderators_delete_admin" ON moderators
  FOR DELETE TO authenticated USING (public.is_admin());


-- ============================================================
-- RLS POLICIES: user_restrictions
-- ============================================================

DROP POLICY IF EXISTS "restrictions_select" ON user_restrictions;
CREATE POLICY "restrictions_select" ON user_restrictions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "restrictions_insert_admin" ON user_restrictions;
CREATE POLICY "restrictions_insert_admin" ON user_restrictions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "restrictions_delete_admin" ON user_restrictions;
CREATE POLICY "restrictions_delete_admin" ON user_restrictions
  FOR DELETE TO authenticated USING (public.is_admin());


-- ============================================================
-- RLS POLICIES: sponsors
-- ============================================================

DROP POLICY IF EXISTS "sponsors_select_via_active_promotions" ON sponsors;
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

DROP POLICY IF EXISTS "sponsors_admin_insert" ON sponsors;
CREATE POLICY "sponsors_admin_insert" ON sponsors
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "sponsors_admin_update" ON sponsors;
CREATE POLICY "sponsors_admin_update" ON sponsors
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "sponsors_admin_delete" ON sponsors;
CREATE POLICY "sponsors_admin_delete" ON sponsors
  FOR DELETE TO authenticated USING (public.is_admin());


-- ============================================================
-- RLS POLICIES: promotions
-- ============================================================

DROP POLICY IF EXISTS "promotions_select_active" ON promotions;
CREATE POLICY "promotions_select_active" ON promotions
  FOR SELECT TO authenticated
  USING (
    (status = 'active' AND now() >= start_date AND now() <= end_date)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "promotions_admin_insert" ON promotions;
CREATE POLICY "promotions_admin_insert" ON promotions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "promotions_admin_update" ON promotions;
CREATE POLICY "promotions_admin_update" ON promotions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "promotions_admin_delete" ON promotions;
CREATE POLICY "promotions_admin_delete" ON promotions
  FOR DELETE TO authenticated USING (public.is_admin());


-- ============================================================
-- RLS POLICIES: promotion_impressions
-- ============================================================

DROP POLICY IF EXISTS "impressions_insert_own" ON promotion_impressions;
CREATE POLICY "impressions_insert_own" ON promotion_impressions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "impressions_select_admin" ON promotion_impressions;
CREATE POLICY "impressions_select_admin" ON promotion_impressions
  FOR SELECT TO authenticated USING (public.is_admin());


-- ============================================================
-- RLS POLICIES: promotion_clicks
-- ============================================================

DROP POLICY IF EXISTS "clicks_insert_own" ON promotion_clicks;
CREATE POLICY "clicks_insert_own" ON promotion_clicks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "clicks_select_admin" ON promotion_clicks;
CREATE POLICY "clicks_select_admin" ON promotion_clicks
  FOR SELECT TO authenticated USING (public.is_admin());


-- ============================================================
-- RLS POLICIES: promotion_daily_stats
-- ============================================================

DROP POLICY IF EXISTS "daily_stats_select_admin" ON promotion_daily_stats;
CREATE POLICY "daily_stats_select_admin" ON promotion_daily_stats
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "daily_stats_insert_admin" ON promotion_daily_stats;
CREATE POLICY "daily_stats_insert_admin" ON promotion_daily_stats
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "daily_stats_update_admin" ON promotion_daily_stats;
CREATE POLICY "daily_stats_update_admin" ON promotion_daily_stats
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- RLS POLICIES: kaderschmiede_activities
-- ============================================================

DROP POLICY IF EXISTS "ka_activities_select" ON kaderschmiede_activities;
CREATE POLICY "ka_activities_select" ON kaderschmiede_activities FOR SELECT USING (true);

DROP POLICY IF EXISTS "ka_activities_insert" ON kaderschmiede_activities;
CREATE POLICY "ka_activities_insert" ON kaderschmiede_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ka_activities_update" ON kaderschmiede_activities;
CREATE POLICY "ka_activities_update" ON kaderschmiede_activities FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ka_activities_delete" ON kaderschmiede_activities;
CREATE POLICY "ka_activities_delete" ON kaderschmiede_activities FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: kaderschmiede_activity_participants
-- ============================================================

DROP POLICY IF EXISTS "ka_act_part_select" ON kaderschmiede_activity_participants;
CREATE POLICY "ka_act_part_select" ON kaderschmiede_activity_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "ka_act_part_insert" ON kaderschmiede_activity_participants;
CREATE POLICY "ka_act_part_insert" ON kaderschmiede_activity_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ka_act_part_delete" ON kaderschmiede_activity_participants;
CREATE POLICY "ka_act_part_delete" ON kaderschmiede_activity_participants FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: kaderschmiede_trupps
-- ============================================================

DROP POLICY IF EXISTS "ka_trupps_select" ON kaderschmiede_trupps;
CREATE POLICY "ka_trupps_select" ON kaderschmiede_trupps FOR SELECT USING (true);

DROP POLICY IF EXISTS "ka_trupps_insert" ON kaderschmiede_trupps;
CREATE POLICY "ka_trupps_insert" ON kaderschmiede_trupps FOR INSERT WITH CHECK (auth.uid() = leader_id);

DROP POLICY IF EXISTS "ka_trupps_update" ON kaderschmiede_trupps;
CREATE POLICY "ka_trupps_update" ON kaderschmiede_trupps FOR UPDATE USING (auth.uid() = leader_id);

DROP POLICY IF EXISTS "ka_trupps_delete" ON kaderschmiede_trupps;
CREATE POLICY "ka_trupps_delete" ON kaderschmiede_trupps FOR DELETE USING (auth.uid() = leader_id);


-- ============================================================
-- RLS POLICIES: kaderschmiede_trupp_members
-- ============================================================

DROP POLICY IF EXISTS "ka_trupp_members_select" ON kaderschmiede_trupp_members;
CREATE POLICY "ka_trupp_members_select" ON kaderschmiede_trupp_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "ka_trupp_members_insert" ON kaderschmiede_trupp_members;
CREATE POLICY "ka_trupp_members_insert" ON kaderschmiede_trupp_members FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ka_trupp_members_delete" ON kaderschmiede_trupp_members;
CREATE POLICY "ka_trupp_members_delete" ON kaderschmiede_trupp_members FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: kaderschmiede_trupp_meetings
-- ============================================================

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


-- ============================================================
-- RLS POLICIES: kaderschmiede_meeting_attendees
-- ============================================================

DROP POLICY IF EXISTS "ka_attendees_select" ON kaderschmiede_meeting_attendees;
CREATE POLICY "ka_attendees_select" ON kaderschmiede_meeting_attendees FOR SELECT USING (true);

DROP POLICY IF EXISTS "ka_attendees_insert" ON kaderschmiede_meeting_attendees;
CREATE POLICY "ka_attendees_insert" ON kaderschmiede_meeting_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ka_attendees_delete" ON kaderschmiede_meeting_attendees;
CREATE POLICY "ka_attendees_delete" ON kaderschmiede_meeting_attendees FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: kaderschmiede_challenges
-- ============================================================

DROP POLICY IF EXISTS "ka_challenges_select" ON kaderschmiede_challenges;
CREATE POLICY "ka_challenges_select" ON kaderschmiede_challenges FOR SELECT USING (true);

DROP POLICY IF EXISTS "ka_challenges_insert" ON kaderschmiede_challenges;
CREATE POLICY "ka_challenges_insert" ON kaderschmiede_challenges FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "ka_challenges_update" ON kaderschmiede_challenges;
CREATE POLICY "ka_challenges_update" ON kaderschmiede_challenges FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "ka_challenges_delete" ON kaderschmiede_challenges;
CREATE POLICY "ka_challenges_delete" ON kaderschmiede_challenges FOR DELETE USING (auth.uid() = creator_id);


-- ============================================================
-- RLS POLICIES: kaderschmiede_challenge_participants
-- ============================================================

DROP POLICY IF EXISTS "ka_ch_part_select" ON kaderschmiede_challenge_participants;
CREATE POLICY "ka_ch_part_select" ON kaderschmiede_challenge_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "ka_ch_part_insert" ON kaderschmiede_challenge_participants;
CREATE POLICY "ka_ch_part_insert" ON kaderschmiede_challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ka_ch_part_delete" ON kaderschmiede_challenge_participants;
CREATE POLICY "ka_ch_part_delete" ON kaderschmiede_challenge_participants FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: kaderschmiede_challenge_results
-- ============================================================

DROP POLICY IF EXISTS "ka_results_select" ON kaderschmiede_challenge_results;
CREATE POLICY "ka_results_select" ON kaderschmiede_challenge_results FOR SELECT USING (true);

DROP POLICY IF EXISTS "ka_results_insert" ON kaderschmiede_challenge_results;
CREATE POLICY "ka_results_insert" ON kaderschmiede_challenge_results FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ka_results_update" ON kaderschmiede_challenge_results;
CREATE POLICY "ka_results_update" ON kaderschmiede_challenge_results FOR UPDATE USING (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: kaderschmiede_workout_logs
-- ============================================================

DROP POLICY IF EXISTS "ka_logs_select" ON kaderschmiede_workout_logs;
CREATE POLICY "ka_logs_select" ON kaderschmiede_workout_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ka_logs_insert" ON kaderschmiede_workout_logs;
CREATE POLICY "ka_logs_insert" ON kaderschmiede_workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ka_logs_update" ON kaderschmiede_workout_logs;
CREATE POLICY "ka_logs_update" ON kaderschmiede_workout_logs FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ka_logs_delete" ON kaderschmiede_workout_logs;
CREATE POLICY "ka_logs_delete" ON kaderschmiede_workout_logs FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: kaderschmiede_checkins
-- ============================================================

DROP POLICY IF EXISTS "checkins_select" ON kaderschmiede_checkins;
CREATE POLICY "checkins_select" ON kaderschmiede_checkins FOR SELECT USING (true);

DROP POLICY IF EXISTS "checkins_insert_own" ON kaderschmiede_checkins;
CREATE POLICY "checkins_insert_own" ON kaderschmiede_checkins FOR INSERT WITH CHECK (auth.uid() = host_user_id);

DROP POLICY IF EXISTS "checkins_update_own" ON kaderschmiede_checkins;
CREATE POLICY "checkins_update_own" ON kaderschmiede_checkins FOR UPDATE USING (auth.uid() = host_user_id);


-- ============================================================
-- RLS POLICIES: kaderschmiede_checkin_entries
-- ============================================================

DROP POLICY IF EXISTS "checkin_entries_select" ON kaderschmiede_checkin_entries;
CREATE POLICY "checkin_entries_select" ON kaderschmiede_checkin_entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "checkin_entries_insert_own" ON kaderschmiede_checkin_entries;
CREATE POLICY "checkin_entries_insert_own" ON kaderschmiede_checkin_entries FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: orders (Orden)
-- ============================================================

DROP POLICY IF EXISTS "orders_read_authenticated" ON orders;
CREATE POLICY "orders_read_authenticated" ON orders
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "orders_admin_insert" ON orders;
CREATE POLICY "orders_admin_insert" ON orders
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "orders_admin_update" ON orders;
CREATE POLICY "orders_admin_update" ON orders
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- RLS POLICIES: user_orders
-- ============================================================

DROP POLICY IF EXISTS "user_orders_read_authenticated" ON user_orders;
CREATE POLICY "user_orders_read_authenticated" ON user_orders
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_orders_insert_service" ON user_orders;
CREATE POLICY "user_orders_insert_service" ON user_orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());


-- ============================================================
-- FUNKTION: Promotion Daily Stats Aggregation
-- ============================================================

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
-- SEED DATA: Standard-Orden
-- ============================================================

INSERT INTO orders (slug, title, description, icon, rarity, category, tier, requirement, xp_reward) VALUES
  ('ord_dauerbrenner_b', 'Dauerbrenner', '7 Tage am Stueck aktiv gewesen', 'Flame', 'common', 'aktivitaet', 'bronze', '7 Tage Streak', 100),
  ('ord_dauerbrenner_s', 'Dauerbrenner II', '14 Tage am Stueck aktiv gewesen', 'Flame', 'rare', 'aktivitaet', 'silber', '14 Tage Streak', 250),
  ('ord_dauerbrenner_g', 'Dauerbrenner III', '30 Tage am Stueck aktiv gewesen', 'Flame', 'epic', 'aktivitaet', 'gold', '30 Tage Streak', 500),
  ('ord_fruehaufsteher', 'Fruehaufsteher', '10x vor 6 Uhr morgens aktiv gewesen', 'Sunrise', 'common', 'aktivitaet', 'bronze', '10x vor 06:00 aktiv', 75),
  ('ord_flaggentraeger', 'Fahnentraeger', '30x die Flagge gehisst', 'Flag', 'epic', 'aktivitaet', 'gold', '30x Flagge gehisst', 400),
  ('ord_wortfuehrer_b', 'Wortfuehrer', '50 Kommentare geschrieben', 'MessageCircle', 'common', 'gemeinschaft', 'bronze', '50 Kommentare', 100),
  ('ord_bruderschaft', 'Bruderschaft', '25 Freunde gefunden', 'Users', 'rare', 'gemeinschaft', 'silber', '25 Freunde', 200),
  ('ord_wanderer_b', 'Wandersmann', '5 Orte mit Stempel besucht', 'MapPin', 'common', 'entdecker', 'bronze', '5 Stempel', 100),
  ('ord_chronist_b', 'Chronist', '10 Beitraege veroeffentlicht', 'Feather', 'common', 'inhalt', 'bronze', '10 Beitraege', 100),
  ('ord_urgestein', 'Urgestein', 'Seit dem ersten Tag dabei – ein Gruendungsmitglied', 'Gem', 'legendary', 'selten', 'legendaer', 'Tag-1-User', 5000)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- STORAGE BUCKET: admin-uploads (fuer Bilder etc.)
-- Muss manuell im Supabase Dashboard erstellt werden:
-- Storage > New Bucket > Name: "admin-uploads" > Public: true
-- ============================================================


-- ============================================================
-- FERTIG! Wenn alles "Success" zeigt, ist die DB bereit.
-- ============================================================
