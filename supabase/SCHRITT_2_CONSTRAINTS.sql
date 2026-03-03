-- ============================================================
-- SCHRITT 2: ALLE CONSTRAINTS (UNIQUE)
-- Kein Dollar-Quoting, keine DO-Bloecke.
-- Nutzt DROP IF EXISTS + ADD = sicher wiederholbar.
-- ============================================================

ALTER TABLE privacy_settings DROP CONSTRAINT IF EXISTS uq_privacy_settings_user;
ALTER TABLE privacy_settings ADD CONSTRAINT uq_privacy_settings_user UNIQUE (user_id);

ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS uq_post_likes_user_post;
ALTER TABLE post_likes ADD CONSTRAINT uq_post_likes_user_post UNIQUE (post_id, user_id);

ALTER TABLE story_viewers DROP CONSTRAINT IF EXISTS uq_story_viewers_story_viewer;
ALTER TABLE story_viewers ADD CONSTRAINT uq_story_viewers_story_viewer UNIQUE (story_id, viewer_id);

ALTER TABLE review_votes DROP CONSTRAINT IF EXISTS uq_review_votes_review_user;
ALTER TABLE review_votes ADD CONSTRAINT uq_review_votes_review_user UNIQUE (review_id, user_id);

ALTER TABLE favorites DROP CONSTRAINT IF EXISTS uq_favorites_user_target;
ALTER TABLE favorites ADD CONSTRAINT uq_favorites_user_target UNIQUE (user_id, target_id, target_type);

ALTER TABLE collected_stamps DROP CONSTRAINT IF EXISTS uq_collected_stamps_user_place;
ALTER TABLE collected_stamps ADD CONSTRAINT uq_collected_stamps_user_place UNIQUE (user_id, place_id);

ALTER TABLE reel_bookmarks DROP CONSTRAINT IF EXISTS uq_reel_bookmarks_reel_user;
ALTER TABLE reel_bookmarks ADD CONSTRAINT uq_reel_bookmarks_reel_user UNIQUE (reel_id, user_id);

ALTER TABLE reel_comment_likes DROP CONSTRAINT IF EXISTS uq_reel_comment_likes_comment_user;
ALTER TABLE reel_comment_likes ADD CONSTRAINT uq_reel_comment_likes_comment_user UNIQUE (reel_comment_id, user_id);

ALTER TABLE live_locations DROP CONSTRAINT IF EXISTS uq_live_locations_user;
ALTER TABLE live_locations ADD CONSTRAINT uq_live_locations_user UNIQUE (user_id);

ALTER TABLE spotify_tracks DROP CONSTRAINT IF EXISTS uq_spotify_tracks_user;
ALTER TABLE spotify_tracks ADD CONSTRAINT uq_spotify_tracks_user UNIQUE (user_id);

ALTER TABLE promotion_impressions DROP CONSTRAINT IF EXISTS uq_promotion_impressions_user_day;
ALTER TABLE promotion_impressions ADD CONSTRAINT uq_promotion_impressions_user_day UNIQUE (promotion_id, user_id, date);

ALTER TABLE promotion_clicks DROP CONSTRAINT IF EXISTS uq_promotion_clicks_user_day;
ALTER TABLE promotion_clicks ADD CONSTRAINT uq_promotion_clicks_user_day UNIQUE (promotion_id, user_id, date);

ALTER TABLE promotion_daily_stats DROP CONSTRAINT IF EXISTS uq_promotion_daily_stats_promo_day;
ALTER TABLE promotion_daily_stats ADD CONSTRAINT uq_promotion_daily_stats_promo_day UNIQUE (promotion_id, date);

ALTER TABLE kaderschmiede_activity_participants DROP CONSTRAINT IF EXISTS uq_kader_act_part_activity_user;
ALTER TABLE kaderschmiede_activity_participants ADD CONSTRAINT uq_kader_act_part_activity_user UNIQUE (activity_id, user_id);

ALTER TABLE kaderschmiede_trupp_members DROP CONSTRAINT IF EXISTS uq_kader_trupp_members_trupp_user;
ALTER TABLE kaderschmiede_trupp_members ADD CONSTRAINT uq_kader_trupp_members_trupp_user UNIQUE (trupp_id, user_id);

ALTER TABLE kaderschmiede_meeting_attendees DROP CONSTRAINT IF EXISTS uq_kader_meeting_att_meeting_user;
ALTER TABLE kaderschmiede_meeting_attendees ADD CONSTRAINT uq_kader_meeting_att_meeting_user UNIQUE (meeting_id, user_id);

ALTER TABLE kaderschmiede_challenge_participants DROP CONSTRAINT IF EXISTS uq_kader_ch_part_challenge_user;
ALTER TABLE kaderschmiede_challenge_participants ADD CONSTRAINT uq_kader_ch_part_challenge_user UNIQUE (challenge_id, user_id);

ALTER TABLE kaderschmiede_checkin_entries DROP CONSTRAINT IF EXISTS uq_kader_checkin_entries_checkin_user;
ALTER TABLE kaderschmiede_checkin_entries ADD CONSTRAINT uq_kader_checkin_entries_checkin_user UNIQUE (checkin_id, user_id);


-- ============================================================
-- FERTIG SCHRITT 2! Alle Constraints gesetzt.
-- Weiter mit SCHRITT_3_FUNKTIONEN.sql
-- ============================================================
