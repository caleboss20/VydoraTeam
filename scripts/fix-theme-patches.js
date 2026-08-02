/**
 * Fix orphaned `styles = __makeStyles();` left at module scope by wire-theme-screens.js
 * and ensure each component recreates styles after assigning COLORS.
 */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'src', 'screens', 'Editor');

for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.tsx')) continue;
  const full = path.join(dir, file);
  let src = fs.readFileSync(full, 'utf8');
  if (!src.includes('__makeStyles')) continue;

  const before = src;

  // Remove orphaned module-level styles assign right after COLORS block
  src = src.replace(
    /(let COLORS = \{[\s\S]*?\};)\s*\n\s*styles = __makeStyles\(\);\s*\n/,
    '$1\n\n'
  );

  // Fix broken split imports like:
  // import {\nimport { useAppPalette } from '...'
  //   REST,\n} from '...'
  src = src.replace(
    /import \{\s*\nimport \{ useAppPalette \} from '([^']+)';\s*\n([\s\S]*?)\} from '([^']+)';/g,
    (m, themePath, body, fromPath) => {
      return `import { useAppPalette } from '${themePath}';\nimport {\n${body}} from '${fromPath}';`;
    }
  );

  // If component assigns COLORS from palette but never recreates styles, add it
  if (
    src.includes('const __palette = useAppPalette()') &&
    src.includes('COLORS = {') &&
    src.includes('__makeStyles')
  ) {
    // After each COLORS = { ... }; block that follows useAppPalette, ensure styles recreate
    src = src.replace(
      /(const __palette = useAppPalette\(\);\s*\n\s*COLORS = \{[\s\S]*?\};)(\s*\n)(?!\s*styles = __makeStyles)/g,
      '$1\n  styles = __makeStyles();$2'
    );
  }

  if (src !== before) {
    fs.writeFileSync(full, src);
    console.log('fixed', file);
  } else {
    console.log('ok', file);
  }
}
console.log('done');
