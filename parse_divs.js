const fs = require('fs');
const content = fs.readFileSync('h:/kotab/Website/src/app/features/groups/group-details/group-details.component.html', 'utf-8');
const lines = content.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div\b[^>]*>/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  depth += opens - closes;
  if (opens !== closes || opens > 0) {
    console.log(`Line ${i+1}: +${opens} -${closes} -> depth: ${depth}`);
  }
}
