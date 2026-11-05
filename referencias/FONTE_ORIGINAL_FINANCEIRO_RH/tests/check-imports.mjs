import fs from 'fs';
import path from 'path';

function checkImports(dir) {
  let errors = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      errors += checkImports(fullPath);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/from\s+['"](.*?)['"]/) || line.match(/import\s+['"](.*?)['"]/);
        if (match) {
          const importPath = match[1];
          if (importPath.startsWith('.')) {
            const resolved = path.resolve(path.dirname(fullPath), importPath);
            if (!fs.existsSync(resolved)) {
              console.error(`INVALID IMPORT in ${fullPath} line ${i + 1}: '${importPath}' -> does not exist (${resolved})`);
              errors++;
            }
          }
        }
      }
    }
  }
  return errors;
}

console.log('Checking all imports in js/...');
const errCount = checkImports('./js');
if (errCount === 0) {
  console.log('✓ All imports in js/ are 100% valid!');
} else {
  console.error(`✗ Found ${errCount} invalid imports!`);
  process.exit(1);
}
