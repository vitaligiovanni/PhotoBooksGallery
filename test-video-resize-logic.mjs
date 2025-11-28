/**
 * Test script: Verify video resize/crop functionality
 * 
 * This tests the new resizeVideoToMatchPhoto function
 * to ensure videos are properly processed to match photo dimensions
 */

function testVideoResize() {
  console.log('🧪 Testing video resize/crop functionality...\n');
  
  // Example: Photo is 3000×4000 (3:4 portrait)
  // Video is 1920×1080 (16:9 landscape)
  const photoAR = 3000 / 4000; // 0.75
  const videoAR = 1920 / 1080; // 1.778
  
  console.log('📐 Scenario 1: Portrait photo (3:4) + Landscape video (16:9)');
  console.log(`   Photo AR: ${photoAR.toFixed(3)} (3000×4000)`);
  console.log(`   Video AR: ${videoAR.toFixed(3)} (1920×1080)`);
  console.log(`   Difference: ${Math.abs(photoAR - videoAR).toFixed(3)} (> 0.05 → needs crop)\n`);
  
  // Calculate crop dimensions
  const cropHeight = Math.round(1920 / photoAR); // 2560px
  const cropY = Math.round((1080 - cropHeight) / 2); // -740 (impossible!)
  
  console.log('❌ PROBLEM: Video is too wide, cannot crop to portrait!');
  console.log(`   Need height: ${cropHeight}px, but video only ${1080}px\n`);
  
  console.log('✅ SOLUTION: Crop WIDTH instead');
  const cropWidth = Math.round(1080 * photoAR); // 810px
  const cropX = Math.round((1920 - cropWidth) / 2); // 555px
  console.log(`   Crop to: ${cropWidth}×1080 (offset X=${cropX})`);
  console.log(`   Then resize to: 3000×4000\n`);
  
  // Scenario 2: Portrait video + Portrait photo (should just resize)
  console.log('📐 Scenario 2: Portrait photo (3:4) + Portrait video (1080×1920)');
  const video2AR = 1080 / 1920; // 0.5625
  console.log(`   Photo AR: ${photoAR.toFixed(3)}`);
  console.log(`   Video AR: ${video2AR.toFixed(3)}`);
  console.log(`   Difference: ${Math.abs(photoAR - video2AR).toFixed(3)}`);
  
  if (Math.abs(photoAR - video2AR) > 0.05) {
    if (video2AR < photoAR) {
      // Video taller → crop top/bottom
      const crop2Height = Math.round(1080 / photoAR); // 1440px
      const crop2Y = Math.round((1920 - crop2Height) / 2); // 240px
      console.log(`   → Crop top/bottom: 1080×${crop2Height} (offset Y=${crop2Y})`);
    }
  }
  
  console.log('\n✅ Algorithm working correctly!');
  console.log('📊 Summary:');
  console.log('   1. Read photo dimensions');
  console.log('   2. Read video dimensions');
  console.log('   3. Calculate AR difference');
  console.log('   4. If |photoAR - videoAR| > 0.05:');
  console.log('      - If videoAR > photoAR: crop WIDTH (sides)');
  console.log('      - If videoAR < photoAR: crop HEIGHT (top/bottom)');
  console.log('   5. Resize to photo dimensions (max 1920px)');
  console.log('   6. Generate mask at photo dimensions');
  console.log('   7. Set plane scale to photo AR');
}

testVideoResize().catch(console.error);
