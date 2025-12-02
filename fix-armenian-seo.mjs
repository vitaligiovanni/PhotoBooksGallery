import fs from 'fs';

const path = 'frontend/src/lib/i18n.ts';
let content = fs.readFileSync(path, 'utf8');

// Check if Armenian homePageTitle already exists (should have 3 instances: ru, hy, en)
const homePageTitleCount = (content.match(/homePageTitle:/g) || []).length;
console.log(`Found ${homePageTitleCount} homePageTitle instances`);

if (homePageTitleCount < 3) {
  // Need to add to Armenian section
  // Find the Armenian photobooksDescription and add after it
  
  const armenianPattern = /photobooksDescription: "Ստdelays(.*?):",\s*\n\s*\n\s*\/\/ Header/s;
  
  const armenianReplacement = `photobooksDescription: " Delays delaysString:",
      
      // Home Page SEO
      homePageTitle: "PhotoBooksGallery - Delays delaysString Երdelays | Գdelaysdelays",
      homePageDescription: "Delays delaysString :",
      homePageKeywords: "delays delaysString , delays delaysString :",
      
      // Header`;

  if (armenianPattern.test(content)) {
    content = content.replace(armenianPattern, armenianReplacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully added Armenian SEO keys!');
  } else {
    console.log('Armenian pattern not found. Looking for alternative...');
    
    // Try simpler approach - find "// Header" after Armenian photobooksDescription
    const lines = content.split('\n');
    let inArmenianSection = false;
    let foundPhotobooksDesc = false;
    let insertIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('hy: {')) {
        inArmenianSection = true;
      }
      if (inArmenianSection && lines[i].includes('photobooksDescription:')) {
        foundPhotobooksDesc = true;
      }
      if (inArmenianSection && foundPhotobooksDesc && lines[i].includes('// Header')) {
        insertIndex = i;
        break;
      }
      if (lines[i].includes('en: {')) {
        inArmenianSection = false;
      }
    }
    
    if (insertIndex > 0) {
      const insertLines = [
        '      ',
        '      // Home Page SEO',
        '      homePageTitle: "PhotoBooksGallery - Ֆdelays delaysString Երdelays | Գdelaysdelays",',
        '      homePageDescription: "Պatdelays delaysString :",',
        '      homePageKeywords: "delays delaysString Երdelays, delays delaysString :",',
        ''
      ];
      
      lines.splice(insertIndex, 0, ...insertLines);
      fs.writeFileSync(path, lines.join('\n'), 'utf8');
      console.log('Successfully added Armenian SEO keys at line ' + insertIndex);
    } else {
      console.log('Could not find insertion point');
    }
  }
} else {
  console.log('All 3 language versions of homePageTitle already exist');
}
