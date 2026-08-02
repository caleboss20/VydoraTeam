const fs = require('fs');

function fixMakeStylesHex(file) {
  let s = fs.readFileSync(file, 'utf8');
  const i = s.indexOf('function makeStyles');
  if (i < 0) {
    console.log('no makeStyles', file);
    return;
  }
  let before = s.slice(0, i);
  let after = s.slice(i);
  const map = [
    ['"#fff"', 'c.text'],
    ['"#FFF"', 'c.text'],
    ['"#ffffff"', 'c.text'],
    ['"#FFFFFF"', 'c.text'],
    ['"#555"', 'c.textMuted'],
    ['"#666"', 'c.textMuted'],
    ['"#CCC"', 'c.textMuted'],
    ['"#ccc"', 'c.textMuted'],
    ['"#111"', 'c.accentOn'],
    ['"#000"', 'c.accentOn'],
    ['"#000000"', 'c.accentOn'],
  ];
  for (const [a, b] of map) after = after.split(a).join(b);
  fs.writeFileSync(file, before + after);
  console.log('hex', file);
}

fixMakeStylesHex('src/screens/Dashboard/VersionHistory.tsx');
fixMakeStylesHex('src/screens/Dashboard/TeamMembers.tsx');
fixMakeStylesHex('src/screens/Dashboard/UploadVideo.tsx');
fixMakeStylesHex('src/screens/Editor/ReviewExport.tsx');
fixMakeStylesHex('src/screens/ProVersion/ProVersion.tsx');

/**
 * Convert `const COLORS = {...} as const` + `const styles = StyleSheet.create`
 * into mutable palette + remake-on-theme pattern.
 */
function convertColorsConstScreen(file, importPath, componentFinder) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('styles = makeStyles()') || s.includes('function makeStyles()')) {
    console.log('skip convert', file);
    return;
  }
  if (!s.includes('ThemeContext')) {
    s = `import { useTheme } from "${importPath}";\n` + s;
  }

  s = s.replace(/const COLORS = \{/, 'let COLORS = {');
  s = s.replace(/\} as const;/, '};');
  s = s.replace(/const C = \{/, 'let C = {');

  if (!s.includes('const styles = StyleSheet.create')) {
    console.log('no styles', file);
    fs.writeFileSync(file, s);
    return;
  }

  s = s.replace(
    'const styles = StyleSheet.create({',
    'function makeStyles() {\n  return StyleSheet.create({'
  );
  const last = s.lastIndexOf('});');
  s = s.slice(0, last) + '});\n}\nlet styles = makeStyles();\n';

  // Inject theme sync into main component
  const re = componentFinder;
  if (!re.test(s)) {
    console.log('no component match', file);
    fs.writeFileSync(file, s);
    return;
  }
  s = s.replace(re, (m) => {
    if (m.includes('Draggable') || m.includes('makeStyles')) return m;
    return `${m}
  const { colors, isDark } = useTheme();
  COLORS = {
    ...COLORS,
    bg: colors.background,
    surface: colors.surface,
    text: colors.text,
    textPrimary: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    textDim: colors.textMuted,
    textTertiary: colors.textMuted,
    border: colors.border,
    trackBg: colors.surface,
    btnBg: colors.iconBg,
    sheet: colors.surface,
    compareBg: colors.surface,
    yellow: colors.accent,
    accent: colors.accent,
    accentYellow: colors.accent,
    pillBg: colors.iconBg,
    trackEmpty: colors.border,
  };
  styles = makeStyles();
`;
  });

  fs.writeFileSync(file, s);
  console.log('converted', file);
}

convertColorsConstScreen(
  'src/screens/Tabbar/TimelineScreen.tsx',
  '../Contexts/ThemeContext',
  /export default function \w+\([^)]*\)\s*\{|function Timeline\w*\([^)]*\)\s*\{/
);
convertColorsConstScreen(
  'src/screens/Tabbar/FilterScreen.tsx',
  '../Contexts/ThemeContext',
  /export default function \w+\([^)]*\)\s*\{/
);
convertColorsConstScreen(
  'src/screens/Tabbar/AddTextScreen.tsx',
  '../Contexts/ThemeContext',
  /export default function \w+\([^)]*\)\s*\{/
);
convertColorsConstScreen(
  'src/screens/Tabbar/MoreScreen.tsx',
  '../Contexts/ThemeContext',
  /export default function \w+\([^)]*\)\s*\{/
);
convertColorsConstScreen(
  'src/screens/Editor/TimeLine.tsx',
  '../Contexts/ThemeContext',
  /export default function \w+\([^)]*\)\s*\{/
);

console.log('all done');
