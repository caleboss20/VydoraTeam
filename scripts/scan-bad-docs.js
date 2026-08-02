const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

for (const f of walk('src/screens')) {
  const s = fs.readFileSync(f, 'utf8');
  if (!s.trimStart().startsWith('/**')) continue;
  const end = s.indexOf('*/');
  if (end < 0) continue;
  const block = s.slice(0, end);
  if (block.includes('import ')) {
    console.log('BAD_DOC', f);
  }
}
console.log('scan done');
