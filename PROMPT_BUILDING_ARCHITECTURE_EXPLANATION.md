# Prompt Building Architecture - Preview Feed vs Paid Blueprint

## 📋 Overview

This document explains how prompts are built for:
1. **Preview Feed (Free Blueprint)** - Single image (9:16 aspect ratio)
2. **Paid Blueprint Feed Planner** - 9-grid (3x3) with individual scenes

---

## 🎯 Preview Feed (Free Blueprint) - Single Image

### Purpose
- **One image** showing what a full feed would look like
- **9:16 aspect ratio** (vertical, Instagram story/post format)
- **Stored in:** `feed_layouts` with `layout_type = 'preview'`
- **Position 1:** Contains the **FULL TEMPLATE** (not a single scene)

### How It's Created
**File:** `app/api/feed/create-free-example/route.ts`

1. **User completes onboarding wizard** → Selects feed style (e.g., "luxury", "minimal", "beige")
2. **System creates preview feed:**
   - `layout_type = 'preview'`
   - Creates **1 post** (position 1)
   - Stores **FULL TEMPLATE** in `feed_posts[0].prompt`

### Template Selection
```typescript
// Gets template based on category + mood
const template = getBlueprintPhotoshootPrompt(category, mood)
// Example: "luxury_dark_moody" template
```

### Dynamic Injection (NEW - After Fix)
**File:** `app/api/feed/create-free-example/route.ts` (if implemented) OR `app/api/feed/[feedId]/generate-single/route.ts`

1. **Get full template** with placeholders:
   ```
   Vibe: Dark luxury editorial aesthetic...
   Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}
   9 frames:
   1. Sitting on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_1}}...
   ```

2. **Inject dynamic content:**
   ```typescript
   const injectedTemplate = await injectDynamicContentWithRotation(
     fullTemplate,
     vibeKey,        // e.g., "luxury_dark_moody"
     fashionStyle,   // e.g., "business"
     userId
   )
   ```

3. **Result:** Placeholders replaced with actual content:
   ```
   Vibe: Dark luxury editorial aesthetic...
   Outfits: Deep blacks, cool grays, concrete tones, warm skin preserved...
   9 frames:
   1. Sitting on Evening city street with warm street lamps - A confident woman wearing black tailored blazer, matching wide-leg trousers, silk cream camisole, pointed-toe ankle boots...
   ```

### What Gets Generated
**For Preview Feed (Position 1):**
- **Stored in DB:** Full injected template (all 9 frames + color grade)
- **Sent to Replicate:** The **ENTIRE TEMPLATE** as-is (for 9:16 single image showing grid preview)
- **NOT extracted:** Position 1 is NOT extracted - it's the full template

### Example Prompt Sent to Replicate (Preview Feed)
```
Create a 3x3 grid showcasing 9 distinct photographic angles...

Vibe: Dark luxury editorial aesthetic. All black outfits with urban edge...

Setting: Urban concrete structures, modern office interiors...

Outfits: Deep blacks, cool grays, concrete tones, warm skin preserved, gold jewelry highlights...

9 frames:
1. Sitting on Evening city street with warm street lamps - A confident woman wearing black tailored blazer, matching wide-leg trousers, silk cream camisole, pointed-toe ankle boots, relaxed pose
2. Coffee and chunky gold chain necklace, brown leather tote bag, gold watch, amber earrings on Modern minimalist office with floor-to-ceiling windows - overhead flatlay, evening street lighting, warm shadows
3. Full-body against Brutalist concrete building facade - A confident woman wearing navy blazer with tailored trousers, gold watch, dynamic pose, urban background
... (frames 4-9)

Color grade: Deep blacks, cool grays, concrete tones, warm skin preserved, gold jewelry highlights, dramatic shadows, iPhone grain, moody candid lighting, high contrast.
```

**Key Point:** The entire template is sent to generate a **single 9:16 image** that shows a preview of what the 9-grid would look like.

---

## 🎯 Paid Blueprint Feed Planner - 9-Grid (3x3)

### Purpose
- **9 individual images** (one per position in 3x3 grid)
- **Each position** gets its own **extracted scene** from the template
- **Stored in:** `feed_layouts` with `layout_type = 'grid_3x3'` (or NULL)
- **Each position (1-9):** Contains **EXTRACTED SCENE** (not full template)

### How It's Created
**File:** `app/api/feed/create-manual/route.ts`

1. **User clicks "Create New Feed"** → Selects feed style (e.g., "luxury")
2. **System creates 9-grid feed:**
   - `layout_type = 'grid_3x3'`
   - Creates **9 posts** (positions 1-9)
   - **Each position** gets an **extracted scene** from the template

### Template Selection & Injection
**File:** `app/api/feed/create-manual/route.ts` (lines 176-291)

1. **Get full template** with placeholders:
   ```typescript
   const fullTemplate = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]
   // Example: "luxury_dark_moody" template with {{OUTFIT_FULLBODY_1}} placeholders
   ```

2. **Inject dynamic content:**
   ```typescript
   const injectedTemplate = await injectDynamicContentWithRotation(
     fullTemplate,
     vibe,           // e.g., "luxury_dark_moody"
     fashionStyle,   // e.g., "business"
     userId
   )
   ```

3. **Extract each scene (1-9) and store in respective positions:**
   ```typescript
   for (let position = 1; position <= 9; position++) {
     const extractedScene = buildSingleImagePrompt(injectedTemplate, position)
     // Store in feed_posts[position-1].prompt
   }
   ```

### What Gets Generated
**For Paid Blueprint (Each Position):**
- **Stored in DB:** Extracted scene for that position (frame description + color grade)
- **Sent to Replicate:** **Single scene** extracted from template
- **Extracted:** Each position gets its own scene (1-9)

### Example Prompt Sent to Replicate (Paid Blueprint - Position 1)
```
Influencer/pinterest style of a woman maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

Sitting on Evening city street with warm street lamps - A confident woman wearing black tailored blazer, matching wide-leg trousers, silk cream camisole, pointed-toe ankle boots, relaxed pose

Deep blacks, cool grays, concrete tones, warm skin preserved, gold jewelry highlights, dramatic shadows, iPhone grain, moody candid lighting, high contrast.
```

**Key Point:** Only the **frame description for position 1** is sent, not the full template.

### Example Prompt Sent to Replicate (Paid Blueprint - Position 2)
```
Influencer/pinterest style of a woman maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

Coffee and chunky gold chain necklace, brown leather tote bag, gold watch, amber earrings on Modern minimalist office with floor-to-ceiling windows - overhead flatlay, evening street lighting, warm shadows

Deep blacks, cool grays, concrete tones, warm skin preserved, gold jewelry highlights, dramatic shadows, iPhone grain, moody candid lighting, high contrast.
```

**Key Point:** Each position gets a **different scene** extracted from the same template.

---

## 🔄 Dynamic Injection Flow

### Both Use Same Injection System

**Function:** `injectDynamicContentWithRotation()`
**File:** `lib/feed-planner/dynamic-template-injector.ts`

**Process:**
1. **Get vibe library** (e.g., `luxury_dark_moody`)
2. **Get user's fashion style** (e.g., "business")
3. **Get rotation indices** from `user_feed_rotation_state` table
4. **Select outfits/locations/accessories** based on rotation
5. **Replace placeholders:**
   - `{{OUTFIT_FULLBODY_1}}` → "A confident woman wearing black tailored blazer..."
   - `{{LOCATION_OUTDOOR_1}}` → "Evening city street with warm street lamps"
   - `{{ACCESSORY_FLATLAY_1}}` → "chunky gold chain necklace, brown leather tote bag..."
6. **Return injected template** (all placeholders replaced)

---

## 📊 Comparison Table

| Aspect | Preview Feed (Free) | Paid Blueprint (9-Grid) |
|--------|---------------------|-------------------------|
| **Layout Type** | `layout_type = 'preview'` | `layout_type = 'grid_3x3'` or NULL |
| **Number of Posts** | 1 post (position 1) | 9 posts (positions 1-9) |
| **What's Stored in Position 1** | **Full template** (all 9 frames) | **Extracted scene 1** (frame 1 only) |
| **What's Stored in Positions 2-9** | N/A (only 1 post) | **Extracted scenes 2-9** (one per position) |
| **What Gets Sent to Replicate** | **Full template** (for 9:16 preview image) | **Single scene** (one per position) |
| **Dynamic Injection** | ✅ Yes (after fix) | ✅ Yes |
| **Rotation** | ✅ Yes (tracks per user+vibe+style) | ✅ Yes (tracks per user+vibe+style) |
| **Extraction** | ❌ No (uses full template) | ✅ Yes (extracts frame per position) |

---

## 🔍 Code Flow Comparison

### Preview Feed Flow
```
1. User completes onboarding → Selects feed style
2. create-free-example/route.ts creates preview feed
3. Gets template: getBlueprintPhotoshootPrompt(category, mood)
4. [NEW] Injects dynamic content: injectDynamicContentWithRotation()
5. Stores FULL INJECTED TEMPLATE in feed_posts[0].prompt
6. When generating:
   - Reads full template from feed_posts[0].prompt
   - Sends ENTIRE TEMPLATE to Replicate
   - Generates 9:16 image showing grid preview
```

### Paid Blueprint Flow
```
1. User clicks "Create New Feed" → Selects feed style
2. create-manual/route.ts creates 9-grid feed
3. Gets template: BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]
4. Injects dynamic content: injectDynamicContentWithRotation()
5. Extracts each scene (1-9): buildSingleImagePrompt(injectedTemplate, position)
6. Stores EXTRACTED SCENES in feed_posts[0-8].prompt (one per position)
7. When generating position 1:
   - Reads extracted scene from feed_posts[0].prompt
   - Sends SINGLE SCENE to Replicate
   - Generates 1:1 image for position 1
8. When generating position 2:
   - Reads extracted scene from feed_posts[1].prompt
   - Sends SINGLE SCENE to Replicate
   - Generates 1:1 image for position 2
   ... (and so on for positions 3-9)
```

---

## 🎯 Key Differences

### 1. **What's Stored in Database**

**Preview Feed:**
- Position 1: **Full template** (all 9 frames + color grade)
- Example: `"Create a 3x3 grid... 9 frames: 1. ... 2. ... 3. ... Color grade: ..."`

**Paid Blueprint:**
- Position 1: **Frame 1 only** (extracted scene)
- Position 2: **Frame 2 only** (extracted scene)
- ... (and so on)
- Example Position 1: `"Influencer/pinterest style... Sitting on Evening city street... Color grade: ..."`

### 2. **What Gets Sent to Replicate**

**Preview Feed:**
- **Full template** → Generates 9:16 image showing grid preview

**Paid Blueprint:**
- **Single scene** per position → Generates 1:1 image for that position

### 3. **When Injection Happens**

**Preview Feed:**
- **During feed creation** (if implemented) OR
- **During image generation** (in `generate-single/route.ts`)

**Paid Blueprint:**
- **During feed creation** (`create-manual/route.ts`)
- All 9 scenes extracted and stored immediately
- When generating, uses pre-extracted scene (no re-extraction needed)

---

## ✅ Current Implementation Status

### Preview Feed (Free Blueprint)
- ✅ **Template selection:** Working
- ✅ **Dynamic injection:** **FIXED** (now uses `injectDynamicContentWithRotation`)
- ✅ **Full template storage:** Working
- ⚠️ **Note:** Preview feed might need injection during creation, not just generation

### Paid Blueprint (9-Grid)
- ✅ **Template selection:** Working
- ✅ **Dynamic injection:** Working (during feed creation)
- ✅ **Scene extraction:** Working (extracts all 9 scenes during creation)
- ✅ **Individual generation:** Working (uses pre-extracted scenes)

---

## 🔧 Potential Issues to Check

1. **Preview Feed Injection:**
   - Is injection happening during preview feed creation?
   - Or only during image generation?
   - Should injection happen in `create-free-example/route.ts`?

2. **Free Blueprint Single Image Generation:**
   - When free user generates position 1, does it use full template or extract frame 1?
   - Based on code, it should extract frame 1 (after injection)

3. **Template Storage:**
   - Preview feed: Position 1 should have full template
   - Paid blueprint: Each position should have extracted scene
   - Verify this is correct in database

---

## 📝 Summary

**Preview Feed:**
- Stores **full template** in position 1
- Sends **full template** to Replicate
- Generates **9:16 preview image** showing grid

**Paid Blueprint:**
- Stores **extracted scenes** in positions 1-9
- Sends **single scene** per position to Replicate
- Generates **1:1 images** for each position

**Both:**
- Use same dynamic injection system
- Use same rotation tracking
- Replace placeholders with actual content
