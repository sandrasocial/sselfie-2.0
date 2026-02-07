/**
 * Manual Script to Grant Test Credits for Development Testing
 * 
 * This script manually adds credits to a test user for testing purposes.
 * Use this when testing credit-based features in development without Stripe.
 * 
 * Usage:
 *   npx tsx scripts/grant-test-credits.ts <user_id_or_email> [amount]
 * 
 * Example:
 *   npx tsx scripts/grant-test-credits.ts test@example.com
 *   npx tsx scripts/grant-test-credits.ts test@example.com 10
 *   npx tsx scripts/grant-test-credits.ts c15e91f4-6711-4801-bfe5-7482e6d6703e 10
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { neon } from '@neondatabase/serverless'

config({ path: resolve(process.cwd(), '.env.local') })

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)

async function grantTestCredits(identifier: string, amount: number = 10) {
  console.log(`\n🔍 Looking up user: ${identifier}\n`)
  
  // Try to find user by email or ID
  let userId: string | null = null
  let userEmail: string | null = null
  
  // Check if it's a UUID (user ID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(identifier)) {
    // It's a user ID
    const user = await sql`
      SELECT id, email FROM users WHERE id = ${identifier} LIMIT 1
    `
    if (user.length > 0) {
      userId = user[0].id
      userEmail = user[0].email
      console.log(`✅ Found user by ID: ${userId} (${userEmail})`)
    } else {
      console.error(`❌ User not found with ID: ${identifier}`)
      return
    }
  } else {
    // It's an email - try to find user
    const user = await sql`
      SELECT id, email FROM users WHERE email = ${identifier} LIMIT 1
    `
    if (user.length > 0) {
      userId = user[0].id
      userEmail = user[0].email
      console.log(`✅ Found user by email: ${userId} (${userEmail})`)
    } else {
      console.error(`❌ User not found with email: ${identifier}`)
      console.log(`   Please create the user first or check the email address\n`)
      return
    }
  }
  
  if (!userId) {
    console.error(`❌ Could not identify user from: ${identifier}`)
    return
  }
  
  console.log(`\n📝 Granting ${amount} test credits...\n`)
  
  try {
    // Get current balance
    const currentBalanceResult = await sql`
      SELECT balance FROM user_credits WHERE user_id = ${userId} LIMIT 1
    `
    const currentBalance = currentBalanceResult.length > 0 ? Number(currentBalanceResult[0].balance) : 0
    console.log(`   Current balance: ${currentBalance} credits`)
    
    const newBalance = currentBalance + amount
    
    // Update or create user_credits record
    await sql`
      INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
      VALUES (${userId}, ${newBalance}, ${amount}, 0, NOW(), NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = ${newBalance},
        total_purchased = user_credits.total_purchased + ${amount},
        updated_at = NOW()
    `
    console.log(`✅ Updated user_credits balance`)
    
    // Record transaction
    await sql`
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description, 
        balance_after, is_test_mode, created_at
      )
      VALUES (
        ${userId}, ${amount}, 'bonus', ${`Test credits grant for development testing (${amount} credits)`},
        ${newBalance}, true, NOW()
      )
    `
    console.log(`✅ Recorded transaction (test mode)`)
    
    console.log(`\n✅ Successfully added ${amount} credits!`)
    console.log(`   Previous balance: ${currentBalance} credits`)
    console.log(`   New balance: ${newBalance} credits`)
    console.log(`   Transaction type: bonus (test mode)`)
    console.log(`\n✨ Test credits granted successfully!\n`)
    
    // Verify the credits were added
    const verifyResult = await sql`
      SELECT balance FROM user_credits WHERE user_id = ${userId} LIMIT 1
    `
    const verifyBalance = verifyResult.length > 0 ? Number(verifyResult[0].balance) : 0
    console.log(`🔍 Verification: Current balance = ${verifyBalance} credits`)
    
    if (verifyBalance === newBalance) {
      console.log(`\n✅ SUCCESS: Credits verified! User now has ${verifyBalance} credits.\n`)
    } else {
      console.log(`\n⚠️ WARNING: Balance mismatch. Expected ${newBalance}, got ${verifyBalance}\n`)
    }
    
  } catch (error: any) {
    console.error(`\n❌ Error granting credits:`, error.message)
    if (error.code) {
      console.error(`   Error code: ${error.code}`)
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`)
    }
    throw error
  }
}

// Main execution
const identifier = process.argv[2]
const amountArg = process.argv[3]

if (!identifier) {
  console.error(`
❌ Usage: npx tsx scripts/grant-test-credits.ts <user_id_or_email> [amount]

Examples:
  npx tsx scripts/grant-test-credits.ts test@example.com
  npx tsx scripts/grant-test-credits.ts test@example.com 10
  npx tsx scripts/grant-test-credits.ts c15e91f4-6711-4801-bfe5-7482e6d6703e 10

Default amount: 10 credits
`)
  process.exit(1)
}

const amount = amountArg ? parseInt(amountArg, 10) : 10

if (isNaN(amount) || amount <= 0) {
  console.error(`❌ Invalid amount: ${amountArg}. Must be a positive number.`)
  process.exit(1)
}

grantTestCredits(identifier, amount)
  .then(() => {
    console.log(`\n✅ Script completed successfully!\n`)
    process.exit(0)
  })
  .catch((error) => {
    console.error(`\n❌ Script failed:`, error)
    process.exit(1)
  })
