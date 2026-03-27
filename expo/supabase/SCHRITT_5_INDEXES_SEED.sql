-- ============================================================
-- SCHRITT 5: INDEXES + SEED DATA + REALTIME
-- Kein Dollar-Quoting noetig (ausser Realtime, aber winzig).
-- Kann mehrfach ausgefuehrt werden.
-- ============================================================


-- === PERFORMANCE INDEXES ===
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


-- === ORDEN SEED DATA ===
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


-- === REALTIME fuer Chat ===
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;


-- ============================================================
-- FERTIG SCHRITT 5! Indexes, Seed-Data und Realtime aktiv.
--
-- ALLE 5 SCHRITTE ABGESCHLOSSEN!
-- Deine Datenbank ist komplett eingerichtet.
-- ============================================================
