const fs = require('fs');
const content = fs.readFileSync('app/search/page.tsx', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let inFunction = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Track when we enter filterResults
  if (line.includes('const filterResults = () => {')) {
    inFunction = true;
    console.log(`\n=== filterResults starts at line ${i+1} ===`);
  }
  
  if (inFunction) {
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    braceCount += openBraces - closeBraces;
    
    if (openBraces > 0 || closeBraces > 0) {
      console.log(`${i+1}: [${braceCount}] ${line.substring(0, 80)}`);
    }
    
    // When we close filterResults completely
    if (braceCount === 0 && i > 250) {
      console.log(`\n=== filterResults ends at line ${i+1} ===`);
      break;
    }
  }
}

console.log(`\nFinal brace count: ${braceCount}`);
