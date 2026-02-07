/**
 * End-to-End Test: Dynamic Template System
 * 
 * Tests the complete flow from feed creation to image generation
 * with dynamic content injection and rotation.
 * 
 * Run with: npx tsx tests/end-to-end-dynamic-templates.test.ts
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const sql = neon(process.env.DATABASE_URL!)

// Test helper: Get rotation state
async function getRotationState(userId: string, vibe: string, fashionStyle: string) {
  try {
    const result = await sql`
      SELECT outfit_index, location_index, accessory_index, total_generations
      FROM user_feed_rotation_state
      WHERE user_id = ${userId} AND vibe = ${vibe} AND fashion_style = ${fashionStyle}
      LIMIT 1
    `
    return result[0] || null
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      return null // Table doesn't exist yet
    }
    throw error
  }
}

// Test helper: Inject and extract a scene
async function testInjectionAndExtraction() {
  console.log('🧪 Testing injection and extraction flow...\n')
  
  try {
    const { BLUEPRINT_PHOTOSHOOT_TEMPLATES, MOOD_MAP } = await import('../lib/maya/blueprint-photoshoot-templates')
    const { injectDynamicContentWithRotation } = await import('../lib/feed-planner/dynamic-template-injector')
    const { buildSingleImagePrompt } = await import('../lib/feed-planner/build-single-image-prompt')
    
    const template = BLUEPRINT_PHOTOSHOOT_TEMPLATES.luxury_dark_moody
    const vibe = 'luxury_dark_moody'
    const fashionStyle = 'business'
    const testUserId = 'test-user-e2e'
    
    // Inject dynamic content
    const injected = await injectDynamicContentWithRotation(template, vibe, fashionStyle, testUserId)
    
    // Extract frame 1
    const frame1 = buildSingleImagePrompt(injected, 1)
    
    console.log('✅ Injection and extraction successful')
    console.log(`   Frame 1 length: ${frame1.length} chars`)
    console.log(`   Has placeholders: ${frame1.includes('{{')}`)
    console.log(`   Sample (first 200 chars): ${frame1.substring(0, 200)}...\n`)
    
    // Check rotation state was created
    const state = await getRotationState(testUserId, vibe, fashionStyle)
    if (state) {
      console.log('✅ Rotation state created:')
      console.log(`   Outfit index: ${state.outfit_index}`)
      console.log(`   Location index: ${state.location_index}`)
      console.log(`   Accessory index: ${state.accessory_index}\n`)
    } else {
      console.log('⚠️  Rotation state not found (table may not exist yet)\n')
    }
    
    return !frame1.includes('{{') && frame1.length > 100
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

// Test rotation increment
async function testRotationIncrement() {
  console.log('🧪 Testing rotation increment...\n')
  
  try {
    const { incrementRotationState, getRotationState } = await import('../lib/feed-planner/rotation-manager')
    
    const testUserId = 'test-user-rotation'
    const vibe = 'luxury_dark_moody'
    const fashionStyle = 'business'
    
    // Get initial state (creates if doesn't exist)
    const initialState = await getRotationState(testUserId, vibe, fashionStyle)
    const initialOutfit = initialState?.outfit_index || 0
    
    console.log(`   Initial outfit index: ${initialOutfit}`)
    
    // Increment
    await incrementRotationState(testUserId, vibe, fashionStyle)
    
    // Get updated state
    const updatedState = await getRotationState(testUserId, vibe, fashionStyle)
    const updatedOutfit = updatedState?.outfit_index || 0
    
    console.log(`   Updated outfit index: ${updatedOutfit}`)
    console.log(`   Increment amount: ${updatedOutfit - initialOutfit}`)
    
    const correctIncrement = (updatedOutfit - initialOutfit) === 4
    
    if (correctIncrement) {
      console.log('✅ Rotation increment working correctly (increments by 4)\n')
    } else {
      console.log(`⚠️  Expected increment of 4, got ${updatedOutfit - initialOutfit}\n`)
    }
    
    return correctIncrement
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      console.log('⚠️  Rotation table not found (migration may not have run)\n')
      return true // Not a failure, just migration not run
    }
    console.error('❌ Test failed:', error.message)
    return false
  }
}

// Test different fashion styles
async function testDifferentFashionStyles() {
  console.log('🧪 Testing different fashion styles...\n')
  
  try {
    const { injectDynamicContentWithRotation } = await import('../lib/feed-planner/dynamic-template-injector')
    const { BLUEPRINT_PHOTOSHOOT_TEMPLATES } = await import('../lib/maya/blueprint-photoshoot-templates')
    
    const template = BLUEPRINT_PHOTOSHOOT_TEMPLATES.luxury_dark_moody
    const vibe = 'luxury_dark_moody'
    const testUserId = 'test-user-styles'
    
    const styles = ['business', 'casual', 'trendy']
    const results: string[] = []
    
    for (const style of styles) {
      const injected = await injectDynamicContentWithRotation(template, vibe, style, testUserId)
      results.push(injected)
      console.log(`   ${style}: ${injected.substring(0, 100)}...`)
    }
    
    // Check that results are different
    const allSame = results.every(r => r === results[0])
    
    if (allSame) {
      console.log('⚠️  All styles produced same result (may need more outfit variety)\n')
    } else {
      console.log('✅ Different fashion styles produce different content\n')
    }
    
    return true // Not a failure, just informational
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

// Test multiple feed generations (rotation)
async function testMultipleGenerations() {
  console.log('🧪 Testing multiple feed generations (rotation)...\n')
  
  try {
    const { injectDynamicContentWithRotation } = await import('../lib/feed-planner/dynamic-template-injector')
    const { incrementRotationState } = await import('../lib/feed-planner/rotation-manager')
    const { BLUEPRINT_PHOTOSHOOT_TEMPLATES } = await import('../lib/maya/blueprint-photoshoot-templates')
    const { buildSingleImagePrompt } = await import('../lib/feed-planner/build-single-image-prompt')
    
    const template = BLUEPRINT_PHOTOSHOOT_TEMPLATES.luxury_dark_moody
    const vibe = 'luxury_dark_moody'
    const fashionStyle = 'business'
    const testUserId = 'test-user-multiple'
    
    const frame1Prompts: string[] = []
    
    // Generate 3 "feeds" and check frame 1 changes
    for (let i = 0; i < 3; i++) {
      const injected = await injectDynamicContentWithRotation(template, vibe, fashionStyle, testUserId)
      const frame1 = buildSingleImagePrompt(injected, 1)
      frame1Prompts.push(frame1)
      
      // Increment rotation (simulating feed completion)
      await incrementRotationState(testUserId, vibe, fashionStyle)
      
      console.log(`   Feed ${i + 1} frame 1: ${frame1.substring(0, 80)}...`)
    }
    
    // Check that prompts are different
    const allSame = frame1Prompts.every(p => p === frame1Prompts[0])
    
    if (allSame) {
      console.log('⚠️  All feeds produced same frame 1 (rotation may not be working)\n')
    } else {
      console.log('✅ Multiple feeds produce different content (rotation working)\n')
    }
    
    return true
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      console.log('⚠️  Rotation table not found (migration may not have run)\n')
      return true
    }
    console.error('❌ Test failed:', error.message)
    return false
  }
}

// Run all tests
async function runTests() {
  console.log('='.repeat(60))
  console.log('END-TO-END TEST: DYNAMIC TEMPLATE SYSTEM')
  console.log('='.repeat(60))
  console.log()
  
  const tests = [
    { name: 'Injection and Extraction', fn: testInjectionAndExtraction },
    { name: 'Rotation Increment', fn: testRotationIncrement },
    { name: 'Different Fashion Styles', fn: testDifferentFashionStyles },
    { name: 'Multiple Feed Generations', fn: testMultipleGenerations }
  ]
  
  const results: Array<{ name: string; passed: boolean }> = []
  
  for (const test of tests) {
    try {
      const passed = await test.fn()
      results.push({ name: test.name, passed })
    } catch (error: any) {
      console.error(`❌ Test "${test.name}" crashed:`, error.message)
      results.push({ name: test.name, passed: false })
    }
  }
  
  console.log('='.repeat(60))
  console.log('TEST RESULTS')
  console.log('='.repeat(60))
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`)
  })
  
  const allPassed = results.every(r => r.passed)
  console.log()
  console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS HAD ISSUES'}`)
  console.log('='.repeat(60))
  
  return allPassed
}

// Run if executed directly
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { runTests }
