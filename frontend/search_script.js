const fs = require('fs');
const path = require('path');

function searchFiles(dir, searchString) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        searchFiles(filePath, searchString);
      }
    } else {
      if (['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'].includes(path.extname(file))) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(searchString)) {
          console.log(`Found in: ${filePath}`);
          // Print context
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes(searchString)) {
              console.log(`Line ${index + 1}: ${line.trim().substring(0, 100)}`);
            }
          });
        }
      }
    }
  }
}

console.log('Searching for "first-child" in src...');
searchFiles('src', 'first-child');
console.log('Search complete.');
