/**
 * Wire ThemeContext into remaining dark-hardcoded screens.
 * Run: node scripts/finish-light-mode.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'screens');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function write(rel, s) {
  fs.writeFileSync(path.join(ROOT, rel), s);
  console.log('✓', rel);
}

function ensureImport(src, importLine) {
  if (src.includes(importLine.split(' from ')[0].replace('import ', '').slice(0, 40)) && src.includes('ThemeContext')) {
    // already has some ThemeContext import — check exact
  }
  if (src.includes("from '../Contexts/ThemeContext'") || src.includes('from "./Contexts/ThemeContext"') || src.includes("from '../Contexts/ThemeContext'") || src.includes("from './Contexts/ThemeContext'")) {
    if (!src.includes(importLine.match(/\{([^}]+)\}/)?.[1]?.split(',')[0]?.trim() || 'useTheme')) {
      // add named import to existing
      src = src.replace(
        /import\s*\{([^}]+)\}\s*from\s*['"](\.\.?\/Contexts\/ThemeContext)['"]/,
        (m, names, p) => {
          const want = importLine.match(/\{([^}]+)\}/)[1].split(',').map((x) => x.trim());
          const have = names.split(',').map((x) => x.trim()).filter(Boolean);
          const merged = [...new Set([...have, ...want])].join(', ');
          return `import { ${merged} } from '${p}'`;
        }
      );
    }
    return src;
  }
  // insert after first import block line that looks like react
  const idx = src.indexOf("from 'react'");
  const idx2 = src.indexOf('from "react"');
  const i = idx >= 0 ? idx : idx2;
  if (i < 0) {
    return importLine + '\n' + src;
  }
  const lineEnd = src.indexOf('\n', i);
  return src.slice(0, lineEnd + 1) + importLine + '\n' + src.slice(lineEnd + 1);
}

/** Map common hex literals → theme color property */
function replaceStyleColors(body, prefix = 'c') {
  const pairs = [
    [/#13151[cC]/g, `${prefix}.background`],
    [/#13151[Aa]/g, `${prefix}.background`],
    [/#0[Dd]0[Dd]0[Dd]/g, `${prefix}.background`],
    [/#111111/g, `${prefix}.background`],
    [/#141414/g, `${prefix}.background`],
    [/#0E0E10/g, `${prefix}.background`],
    [/#1[Ee]1[Ee]1[Ee]/g, `${prefix}.surface`],
    [/#1[Cc]1[Cc]1[Cc]/g, `${prefix}.card`],
    [/#1[Aa]1[Aa]1[Aa]/g, `${prefix}.card`],
    [/#262626/g, `${prefix}.surface`],
    [/#2[Aa]2[Aa]2[Aa]/g, `${prefix}.border`],
    [/#2[Ee]2[Ee]2[Ee]/g, `${prefix}.border`],
    [/#3[Aa]3[Aa]3[Aa]/g, `${prefix}.border`],
    [/#FFFFFF/g, `${prefix}.text`],
    [/#ffffff/g, `${prefix}.text`],
    [/#AAAAAA/g, `${prefix}.textSecondary`],
    [/#888888/g, `${prefix}.textMuted`],
    [/#666666/g, `${prefix}.textMuted`],
    [/#9A9A9A/g, `${prefix}.textSecondary`],
    [/#8A8A8A/g, `${prefix}.textSecondary`],
    [/#ccc(?![0-9a-fA-F])/g, `${prefix}.textMuted`],
    [/#cccccc/g, `${prefix}.textMuted`],
    [/#F5C518/g, `${prefix}.accent`],
    [/#F5A623/g, `${prefix}.accent`],
    [/#F2C200/g, `${prefix}.accent`],
    [/#E5B800/g, `${prefix}.accent`],
    [/#1A0E00/g, `${prefix}.accentOn`],
    [/#FF4D4D/g, `${prefix}.danger`],
    [/#FF6B6B/g, `${prefix}.danger`],
    [/#E05C5C/g, `${prefix}.danger`],
    [/#eb4343/g, `${prefix}.danger`],
  ];
  let out = body;
  for (const [re, rep] of pairs) {
    out = out.replace(re, (m) => {
      // only replace inside quoted strings typically '"#xxx"'
      return m;
    });
  }
  // More careful: replace '"#xxx"' and "'#xxx'" forms
  const quoted = [
    ['"#13151c"', `${prefix}.background`],
    ['"#13151C"', `${prefix}.background`],
    ['"#13151A"', `${prefix}.background`],
    ['"#13151a"', `${prefix}.background`],
    ['"#0D0D0D"', `${prefix}.background`],
    ['"#111111"', `${prefix}.background`],
    ['"#141414"', `${prefix}.background`],
    ['"#0E0E10"', `${prefix}.background`],
    ['"#1e1e1e"', `${prefix}.surface`],
    ['"#1E1E1E"', `${prefix}.surface`],
    ['"#1C1C1C"', `${prefix}.card`],
    ['"#1A1A1A"', `${prefix}.card`],
    ['"#262626"', `${prefix}.surface`],
    ['"#2A2A2A"', `${prefix}.border`],
    ['"#2E2E2E"', `${prefix}.border`],
    ['"#3A3A3A"', `${prefix}.border`],
    ['"#FFFFFF"', `${prefix}.text`],
    ['"#ffffff"', `${prefix}.text`],
    ['"#AAAAAA"', `${prefix}.textSecondary`],
    ['"#888888"', `${prefix}.textMuted`],
    ['"#666666"', `${prefix}.textMuted`],
    ['"#9A9A9A"', `${prefix}.textSecondary`],
    ['"#8A8A8A"', `${prefix}.textSecondary`],
    ['"#ccc"', `${prefix}.textMuted`],
    ['"#cccccc"', `${prefix}.textMuted`],
    ['"#F5C518"', `${prefix}.accent`],
    ['"#F5A623"', `${prefix}.accent`],
    ['"#F2C200"', `${prefix}.accent`],
    ['"#E5B800"', `${prefix}.accent`],
    ['"#1A0E00"', `${prefix}.accentOn`],
    ['"#FF4D4D"', `${prefix}.danger`],
    ['"#FF6B6B"', `${prefix}.danger`],
    ['"#E05C5C"', `${prefix}.danger`],
    ['"#eb4343"', `${prefix}.danger`],
  ];
  for (const [from, to] of quoted) {
    out = out.split(from).join(to);
  }
  return out;
}

function convertAuthScreen(rel, importPath) {
  let src = read(rel);
  if (src.includes('useTheme') && src.includes('makeStyles')) {
    console.log('skip (already)', rel);
    return;
  }

  src = ensureImport(
    src,
    `import { useMemo } from "react";\nimport { useTheme, ThemeColors } from "${importPath}";`
  );
  // fix duplicate useMemo/useState from react — merge if needed later

  // Convert StyleSheet.create at bottom
  if (!src.includes('const styles = StyleSheet.create')) {
    console.log('!! no styles factory pattern', rel);
    return;
  }

  src = src.replace(
    'const styles = StyleSheet.create({',
    'function makeStyles(c: ThemeColors) {\n  return StyleSheet.create({'
  );
  // close StyleSheet + add closing brace for makeStyles
  // Find last `});` that closes StyleSheet
  const lastClose = src.lastIndexOf('});');
  if (lastClose < 0) throw new Error('no close ' + rel);
  src = src.slice(0, lastClose) + '});\n}\n';

  src = replaceStyleColors(src);

  // Inject hook at start of default export function
  src = src.replace(
    /(export default function \w+\([^)]*\)\s*\{)/,
    `$1\n  const { colors, isDark } = useTheme();\n  const styles = useMemo(() => makeStyles(colors), [colors]);`
  );
  src = src.replace(
    /(function \w+\([^)]*\)\s*\{)/,
    (m, g) => {
      if (m.includes('makeStyles') || src.indexOf(m) > src.indexOf('export')) return m;
      if (src.includes('const { colors, isDark } = useTheme()')) return m;
      return m;
    }
  );

  // Fix StatusBar
  src = src.replace(
    /barStyle="light-content"\s+backgroundColor="[^"]*"/g,
    'barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background}'
  );
  src = src.replace(
    /<StatusBar barStyle="light-content" \/>/g,
    '<StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />'
  );

  // Inline icon colors commonly hardcoded
  src = src.replace(/color="#FFFFFF"/g, 'color={colors.text}');
  src = src.replace(/color="#ffffff"/g, 'color={colors.text}');
  src = src.replace(/color="#ccc"/g, 'color={colors.textMuted}');
  src = src.replace(/placeholderTextColor="#cccccc"/g, 'placeholderTextColor={colors.textMuted}');
  src = src.replace(/placeholderTextColor="#ccc"/g, 'placeholderTextColor={colors.textMuted}');
  src = src.replace(/color="#13151A"/g, 'color={colors.background}');
  src = src.replace(/color="#1A0E00"/g, 'color={colors.accentOn}');

  // Deduplicate react imports if we added useMemo separately
  // Collapse duplicate `import { useMemo } from "react"` when useState already from react
  if ((src.match(/from ["']react["']/g) || []).length > 1) {
    // merge useMemo into existing react import that has useState
    src = src.replace(/\nimport \{ useMemo \} from ["']react["'];?\n/, '\n');
    src = src.replace(
      /import \{([^}]+)\} from ["']react["']/,
      (m, names) => {
        if (names.includes('useMemo')) return m;
        return `import { ${names.trim().replace(/,$/, '')}, useMemo } from "react"`;
      }
    );
  }

  write(rel, src);
}

function convertMutablePaletteScreen(rel, importPath, opts = {}) {
  let src = read(rel);
  if (src.includes('useAppPalette') || (src.includes('useTheme') && src.includes('styles = '))) {
    console.log('skip/partial', rel);
  }

  if (!src.includes('ThemeContext')) {
    src = ensureImport(src, `import { useTheme, ThemeColors } from "${importPath}";`);
  }

  // ProjectDetail pattern: const BG = ...
  if (src.includes('const BG =') && !src.includes('let BG')) {
    src = src.replace('const BG =', 'let BG =');
    src = src.replace('const CARD =', 'let CARD =');
    src = src.replace('const BORDER =', 'let BORDER =');
    src = src.replace('const TEXT_PRIMARY =', 'let TEXT_PRIMARY =');
    src = src.replace('const TEXT_MUTED =', 'let TEXT_MUTED =');
    src = src.replace('const YELLOW =', 'let YELLOW =');

    // Convert styles
    if (src.includes('const styles = StyleSheet.create')) {
      src = src.replace(
        'const styles = StyleSheet.create({',
        'function makeProjectStyles() {\n  return StyleSheet.create({'
      );
      const lastClose = src.lastIndexOf('});');
      src = src.slice(0, lastClose) + '});\n}\nlet styles = makeProjectStyles();\n';
    }

    // Find main component export and inject theme sync
    const re = /export default function (\w+)\(/;
    const m = src.match(re);
    if (m) {
      src = src.replace(
        re,
        `export default function ${m[1]}(`
      );
      src = src.replace(
        new RegExp(`export default function ${m[1]}\\([^)]*\\)\\s*\\{`),
        (header) =>
          `${header}
  const { colors } = useTheme();
  BG = colors.background;
  CARD = colors.card;
  BORDER = colors.border;
  TEXT_PRIMARY = colors.text;
  TEXT_MUTED = colors.textMuted;
  YELLOW = colors.accent;
  styles = makeProjectStyles();
`
      );
    }
    write(rel, src);
    return;
  }

  write(rel, src);
}

// ─── InviteMember ───────────────────────────────────────────────
(function fixInvite() {
  let src = read('Dashboard/InviteMember.tsx');
  if (src.includes('function makeInviteStyles')) {
    console.log('skip InviteMember');
    return;
  }
  if (!src.includes('const styles = StyleSheet.create')) {
    console.log('!! InviteMember unexpected');
    return;
  }
  src = src.replace(
    'const styles = StyleSheet.create({',
    'function makeInviteStyles(COLORS: {\n  bg: string; surface: string; surfaceAlt: string; border: string; yellow: string; yellowDim: string; text: string; textMuted: string; textFaint: string; danger: string; online: string;\n}) {\n  return StyleSheet.create({'
  );
  const lastClose = src.lastIndexOf('});');
  src = src.slice(0, lastClose) + '});\n}\nlet styles = makeInviteStyles(COLORS);\n';
  write('Dashboard/InviteMember.tsx', src);
})();

// ─── Auth screens ───────────────────────────────────────────────
convertAuthScreen('signinscreen.tsx', './Contexts/ThemeContext');
convertAuthScreen('Signupscreen.tsx', './Contexts/ThemeContext');
convertAuthScreen('ForgotPassword.tsx', './Contexts/ThemeContext');

// Otp / password success / splash — try same
for (const f of ['OtpVerification.tsx', 'Passwordsuccess.tsx', 'splashscreen.tsx']) {
  try {
    convertAuthScreen(f, './Contexts/ThemeContext');
  } catch (e) {
    console.log('warn', f, e.message);
  }
}

try {
  convertAuthScreen('Onboarding/Onboardingscreen.tsx', '../Contexts/ThemeContext');
} catch (e) {
  console.log('warn onboarding', e.message);
}

try {
  convertAuthScreen('AcceptInvite/AcceptInvitescreen.tsx', '../Contexts/ThemeContext');
} catch (e) {
  console.log('warn accept', e.message);
}

// ─── ProjectDetail ──────────────────────────────────────────────
convertMutablePaletteScreen('Project/ProjectDetail.tsx', '../Contexts/ThemeContext');

console.log('done batch 1');
