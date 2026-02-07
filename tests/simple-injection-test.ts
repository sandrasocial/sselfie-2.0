/**
 * Simple Injection Test (No Database Required)
 * 
 * Tests the injection system without requiring database connection.
 * Run with: npx tsx tests/simple-injection-test.ts
 */

async function testInjectionFlow() {
  console.log('🧪 Testing dynamic injection flow (no database)...\n')
  
  try {
    const { BLUEPRINT_PHOTOSHOOT_TEMPLATES } = await import('../lib/maya/blueprint-photoshoot-templates')
    const { injectDynamicContent } = await import('../lib/feed-planner/dynamic-template-injector')
    const { buildSingleImagePrompt } = await import('../lib/feed-planner/build-single-image-prompt')
    const { mapFashionStyleToVibeLibrary } = await import('../lib/feed-planner/fashion-style-mapper')
    
    // Test fashion style mapping
    console.log('📋 Testing fashion style mapping:')
    const testStyles = ['casual', 'business', 'trendy', 'timeless', 'Business Professional']
    testStyles.forEach(style => {
      const mapped = mapFashionStyleToVibeLibrary(style)
      console.log(`   "${style}" → "${mapped}"`)
    })
    console.log()
    
    // Test injection with different styles (using sync version, no database)
    const template = BLUEPRINT_PHOTOSHOOT_TEMPLATES.luxury_dark_moody
    const vibe = 'luxury_dark_moody'
    const testUserId = 'test-user'
    
    console.log('🔄 Testing injection with different fashion styles:')
    const styles = ['business', 'casual', 'trendy']
    
    for (const style of styles) {
      const context = {
        vibe,
        fashionStyle: style,
        userId: testUserId,
        outfitIndex: 0,
        locationIndex: 0,
        accessoryIndex: 0
      }
      
      // Use sync version (no database required)
      const { injectDynamicContent } = await import('../lib/feed-planner/dynamic-template-injector')
      const injected = injectDynamicContent(template, context)
      const frame1 = buildSingleImagePrompt(injected, 1)
      
      const hasPlaceholders = frame1.includes('{{')
      const hasOutfit = frame1.toLowerCase().includes('blazer') || 
                       frame1.toLowerCase().includes('outfit') ||
                       frame1.toLowerCase().includes('wearing')
      
      console.log(`   ${style}:`)
      console.log(`      Placeholders replaced: ${hasPlaceholders ? '❌' : '✅'}`)
      console.log(`      Has outfit description: ${hasOutfit ? '✅' : '❌'}`)
      console.log(`      Length: ${frame1.length} chars`)
      console.log(`      Sample: ${frame1.substring(0, 120)}...`)
      console.log()
    }
    
    console.log('\n✅ Injection test completed!')
    return true
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
    return false
  }
}

// Run test
if (require.main === module) {
  testInjectionFlow()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { testInjectionFlow }
