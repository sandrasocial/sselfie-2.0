/**
 * Migration: Create user_feed_rotation_state table
 * 
 * Creates table to track rotation indices for outfit/location/accessory selection.
 * Ensures users get different content each time they generate a feed.
 * 
 * Run with: npx tsx scripts/migrations/run-user-feed-rotation-migration.ts
 */

import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  console.log('🔄 Running user_feed_rotation_state migration...\n')

  try {
    // Create table using tagged template (proper Neon syntax)
    await sql`
      CREATE TABLE IF NOT EXISTS user_feed_rotation_state (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vibe TEXT NOT NULL,
        fashion_style TEXT NOT NULL,
        outfit_index INT NOT NULL DEFAULT 0,
        location_index INT NOT NULL DEFAULT 0,
        accessory_index INT NOT NULL DEFAULT 0,
        last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        total_generations INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, vibe, fashion_style)
      )
    `

    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_feed_rotation_user_vibe 
      ON user_feed_rotation_state(user_id, vibe, fashion_style)
    `

    console.log('✅ Migration completed successfully!')
    console.log('\n📊 Created:')
    console.log('  - user_feed_rotation_state table')
    console.log('  - Index: idx_user_feed_rotation_user_vibe')
    console.log('\n✨ Users will now get different outfits/locations/accessories on each feed generation!')

    return true
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Table already exists - migration may have already been run.')
      console.log('   This is safe to ignore if the table structure is correct.')
    }
    return false
  }
}

// Run if executed directly
if (require.main === module) {
  runMigration()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { runMigration }
