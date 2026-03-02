-- Add location and tagged_user_ids columns to posts table
-- Run this in Supabase SQL Editor

ALTER TABLE posts ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tagged_user_ids TEXT[] DEFAULT NULL;

-- Index for faster queries on posts with location
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location) WHERE location IS NOT NULL;
