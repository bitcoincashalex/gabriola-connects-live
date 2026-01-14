const fs = require('fs');
const path = require('path');

const files = [
  'app/search/page.tsx',
  'app/community/search/page.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = content.replace(/\r\n/g, '\n');
    fs.writeFileSync(filePath, fixed, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`❌ Not found: ${file}`);
  }
});

console.log('\n✅ All files fixed! Run: npm run build');