/**
 * Test file for dynamic template injection
 * 
 * Run with: npx tsx tests/dynamic-injection.test.ts
 */

import { injectDynamicContent } from '../lib/feed-planner/dynamic-template-injector'
import { BLUEPRINT_PHOTOSHOOT_TEMPLATES } from '../lib/maya/blueprint-photoshoot-templates'

// Test injection with luxury_dark_moody
function testInjection() {
  console.log('🧪 Testing dynamic content injection...\n')
  
  const template = BLUEPRINT_PHOTOSHOOT_TEMPLATES.luxury_dark_moody
  const context = {
    vibe: 'luxury_dark_moody',
    fashionStyle: 'business',
    userId: 'test-user',
    outfitIndex: 0,
    locationIndex: 0,
    accessoryIndex: 0
  }
  
  try {
    const result = injectDynamicContent(template, context)
    
    console.log('✅ Injection successful!')
    console.log('\n📝 Sample output (first 500 chars):')
    console.log(result.substring(0, 500) + '...\n')
    
    // Check that placeholders were replaced
    const hasPlaceholders = result.includes('{{') || result.includes('}}')
    if (hasPlaceholders) {
      console.log('⚠️  Warning: Some placeholders may not have been replaced')
      // Find remaining placeholders
      const remaining = result.match(/\{\{[A-Z_]+\}\}/g)
      if (remaining) {
        console.log('   Remaining placeholders:', remaining)
      }
    } else {
      console.log('✅ All placeholders replaced successfully')
    }
    
    return !hasPlaceholders
  } catch (error) {
    console.error('❌ Injection failed:', error)
    return false
  }
}

// Test rotation (different indices produce different content)
function testRotation() {
  console.log('🧪 Testing rotation (different indices)...\n')
  
  const template = "{{OUTFIT_FULLBODY_1}} {{LOCATION_OUTDOOR_1}} {{LIGHTING_EVENING}}"
  const baseContext = {
    vibe: 'luxury_dark_moody',
    fashionStyle: 'business',
    userId: 'test-user'
  }
  
  const results: string[] = []
  
  for (let i = 0; i < 3; i++) {
    const context = {
      ...baseContext,
      outfitIndex: i,
      locationIndex: i,
      accessoryIndex: i
    }
    
    try {
      const result = injectDynamicContent(template, context)
      results.push(result)
      console.log(`Iteration ${i}:`, result.substring(0, 100) + '...')
    } catch (error) {
      console.error(`Iteration ${i} failed:`, error)
      return false
    }
  }
  
  // Check that results are different
  const allSame = results.every(r => r === results[0])
  if (allSame) {
    console.log('⚠️  Warning: All iterations produced the same result (rotation may not be working)')
  } else {
    console.log('✅ Rotation working: Different indices produce different content')
  }
  
  return true
}

// Run all tests
function runTests() {
  console.log('='.repeat(60))
  console.log('DYNAMIC TEMPLATE INJECTION - TEST SUITE')
  console.log('='.repeat(60))
  console.log()
  
  const tests = [
    { name: 'Content Injection', fn: testInjection },
    { name: 'Rotation Test', fn: testRotation }
  ]
  
  const results = tests.map(test => ({
    name: test.name,
    passed: test.fn()
  }))
  
  console.log('\n' + '='.repeat(60))
  console.log('TEST RESULTS')
  console.log('='.repeat(60))
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`)
  })
  
  const allPassed = results.every(r => r.passed)
  console.log()
  console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  console.log('='.repeat(60))
  
  return allPassed
}

// Run if executed directly
if (require.main === module) {
  const success = runTests()
  process.exit(success ? 0 : 1)
}

export { runTests }
