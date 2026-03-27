-- ============================================================
-- SCHRITT 4: RLS AKTIVIEREN + ALLE POLICIES
-- Kein Dollar-Quoting, keine DO-Bloecke.
-- Kann mehrfach ausgefuehrt werden (DROP IF EXISTS).
-- ============================================================


-- RLS aktivieren (idempotent)
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


-- === USERS ===
DROP POLICY IF EXISTS "users_select_authenticated" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

CREATE POLICY "users_select_authenticated" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

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


-- === KADERSCHMIEDE ===
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


-- ============================================================
-- FERTIG SCHRITT 4! RLS aktiv + alle Policies gesetzt.
-- Weiter mit SCHRITT_5_INDEXES_SEED.sql
-- ============================================================
