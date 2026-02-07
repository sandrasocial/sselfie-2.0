-- Create user_feed_rotation_state table for tracking outfit/location/accessory rotation
-- This ensures users get different content each time they generate a feed with the same vibe + style

BEGIN;

CREATE TABLE IF NOT EXISTS user_feed_rotation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vibe TEXT NOT NULL,
  fashion_style TEXT NOT NULL,
  
  -- Rotation indices
  outfit_index INT NOT NULL DEFAULT 0,
  location_index INT NOT NULL DEFAULT 0,
  accessory_index INT NOT NULL DEFAULT 0,
  
  -- Metadata
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_generations INT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Composite unique constraint (one state per user+vibe+style combo)
  UNIQUE(user_id, vibe, fashion_style)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_feed_rotation_user_vibe 
ON user_feed_rotation_state(user_id, vibe, fashion_style);

-- Add comment
COMMENT ON TABLE user_feed_rotation_state IS 
'Tracks rotation indices for outfit/location/accessory selection per user+vibe+style combination. Ensures users get different content on each feed generation.';

COMMENT ON COLUMN user_feed_rotation_state.outfit_index IS 
'Current outfit rotation index. Increments by 4 after each feed (uses 4 outfits per feed).';

COMMENT ON COLUMN user_feed_rotation_state.location_index IS 
'Current location rotation index. Increments by 3 after each feed (uses 3 locations per feed).';

COMMENT ON COLUMN user_feed_rotation_state.accessory_index IS 
'Current accessory rotation index. Increments by 2 after each feed (uses 2 accessories per feed).';

COMMIT;
