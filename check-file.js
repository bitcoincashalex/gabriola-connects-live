const fs = require('fs');
const file = process.argv[2];
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);
console.log('\n=== Lines 568-582 ===');
for (let i = 567; i < 582; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

// Check for CRLF
if (content.includes('\r\n')) {
  console.log('\n❌ File still has CRLF!');
} else {
  console.log('\n✅ File has LF only');
}

// Check bracket balance around that area
let braceCount = 0;
for (let i = 0; i < 570; i++) {
  const line = lines[i];
  braceCount += (line.match(/{/g) || []).length;
  braceCount -= (line.match(/}/g) || []).length;
}
console.log(`\nBrace balance up to line 570: ${braceCount}`);
