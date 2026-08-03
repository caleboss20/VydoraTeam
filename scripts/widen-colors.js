const fs = require('fs');
const path = require('path');
const dir = 'src/screens/Editor';

for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.tsx')) continue;
  const f = path.join(dir, name);
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes('useAppPalette') || !s.includes('COLORS = {')) continue;

  // Widen COLORS binding so theme sync can add optional keys.
  if (/let COLORS = \{/.test(s) && !/let COLORS:\s*Record/.test(s)) {
    s = s.replace(/let COLORS = \{/, 'let COLORS: Record<string, string> = {');
    fs.writeFileSync(f, s);
    console.log('widened', name);
  }
}
console.log('done');
