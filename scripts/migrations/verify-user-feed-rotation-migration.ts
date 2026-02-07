/**
 * Verification: Check user_feed_rotation_state table exists and has correct structure
 * 
 * Run with: npx tsx scripts/migrations/verify-user-feed-rotation-migration.ts
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const sql = neon(process.env.DATABASE_URL!)

async function verifyMigration() {
  console.log('🔍 Verifying user_feed_rotation_state migration...\n')

  try {
    // Check if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_feed_rotation_state'
      )
    `

    if (!tableCheck[0].exists) {
      console.log('❌ Table user_feed_rotation_state does not exist')
      return false
    }

    console.log('✅ Table exists')

    // Check columns
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_feed_rotation_state'
      ORDER BY ordinal_position
    `

    const expectedColumns = [
      'id', 'user_id', 'vibe', 'fashion_style',
      'outfit_index', 'location_index', 'accessory_index',
      'last_used_at', 'total_generations',
      'created_at', 'updated_at'
    ]

    console.log('\n📋 Columns:')
    const foundColumns = columns.map((c: any) => c.column_name)
    expectedColumns.forEach(col => {
      const exists = foundColumns.includes(col)
      console.log(`  ${exists ? '✅' : '❌'} ${col}`)
    })

    // Check unique constraint
    const constraints = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'user_feed_rotation_state'
      AND constraint_type = 'UNIQUE'
    `

    const hasUniqueConstraint = constraints.some((c: any) => 
      c.constraint_name.includes('user_id') || 
      c.constraint_name.includes('vibe') ||
      c.constraint_name.includes('fashion_style')
    )

    console.log(`\n🔒 Unique constraint: ${hasUniqueConstraint ? '✅' : '❌'}`)

    // Check index
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'user_feed_rotation_state'
    `

    const hasIndex = indexes.some((i: any) => 
      i.indexname.includes('idx_user_feed_rotation')
    )

    console.log(`📇 Index exists: ${hasIndex ? '✅' : '❌'}`)

    const allGood = foundColumns.length === expectedColumns.length && 
                    hasUniqueConstraint && 
                    hasIndex

    console.log(`\n${allGood ? '✅' : '❌'} Migration verification: ${allGood ? 'PASSED' : 'FAILED'}`)
    return allGood

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

// Run if executed directly
if (require.main === module) {
  verifyMigration()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { verifyMigration }
