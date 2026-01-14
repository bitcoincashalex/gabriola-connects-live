const fs = require('fs');
const content = fs.readFileSync('app/search/page.tsx', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let parenCount = 0;

console.log('=== Checking structure from line 1 ===\n');

for (let i = 0; i < 600; i++) {
  const line = lines[i];
  
  // Count braces
  const openBraces = (line.match(/{/g) || []).length;
  const closeBraces = (line.match(/}/g) || []).length;
  braceCount += openBraces - closeBraces;
  
  // Count parens
  const openParens = (line.match(/\(/g) || []).length;
  const closeParens = (line.match(/\)/g) || []).length;
  parenCount += openParens - closeParens;
  
  // Show important structural lines
  if (line.includes('function SearchPageContent') || 
      line.includes('export default function') ||
      line.includes('const filterResults') ||
      line.includes('return (') ||
      (openBraces > 0 || closeBraces > 0) && i > 260 && i < 410) {
    console.log(`${i+1}: [${braceCount}] {${parenCount}} ${line.trim().substring(0, 70)}`);
  }
  
  // Stop at return statement
  if (i > 500 && line.trim().startsWith('return (')) {
    console.log(`\n=== RETURN STATEMENT at line ${i+1} ===`);
    console.log(`Brace count: ${braceCount} (should be 1 if inside component)`);
    console.log(`Paren count: ${parenCount} (should be 0)`);
    console.log('\nNext 5 lines:');
    for (let j = i; j < i+5; j++) {
      console.log(`${j+1}: ${lines[j]}`);
    }
    break;
  }
}
