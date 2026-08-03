const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

for (const f of walk('src/screens')) {
  const s = fs.readFileSync(f, 'utf8');
  const re = /\b(color|backgroundColor|placeholderTextColor|borderColor|selectionColor|tintColor)=c\.(\w+)/g;
  let m;
  while ((m = re.exec(s))) {
    console.log(f, m[0]);
  }
  // also }}); after makeStyles patterns that might be wrong - hard to detect
}
console.log('done');
