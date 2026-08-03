/**
 * Theme remaining dashboard/editor/pro screens + fix onboarding colors.
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

const QUOTED = [
  ['"#13151c"', 'c.background'],
  ['"#13151C"', 'c.background'],
  ['"#13151A"', 'c.background'],
  ['"#0D0D0D"', 'c.background'],
  ['"#111111"', 'c.background'],
  ['"#141414"', 'c.background'],
  ['"#000000"', 'c.background'],
  ['"#000"', 'c.background'],
  ["'#000'", 'c.background'],
  ["'black'", 'c.background'],
  ['"black"', 'c.background'],
  ['"#1e1e1e"', 'c.surface'],
  ['"#1E1E1E"', 'c.surface'],
  ['"#1C1C1C"', 'c.card'],
  ['"#1c1c1c"', 'c.card'],
  ['"#1A1A1A"', 'c.card'],
  ['"#1a1a1a"', 'c.card'],
  ['"#262626"', 'c.surface'],
  ['"#2A2A2A"', 'c.border'],
  ['"#2a2a2a"', 'c.border'],
  ['"#333"', 'c.border'],
  ['"#333333"', 'c.border'],
  ['"#3A3A3A"', 'c.border'],
  ['"#FFFFFF"', 'c.text'],
  ['"#ffffff"', 'c.text'],
  ["'#FFFFFF'", 'c.text'],
  ['"#AAAAAA"', 'c.textSecondary'],
  ['"#888888"', 'c.textMuted'],
  ['"#888"', 'c.textMuted'],
  ['"#666666"', 'c.textMuted'],
  ['"#9A9A9A"', 'c.textSecondary'],
  ['"#8A8A8A"', 'c.textSecondary'],
  ['"#ccc"', 'c.textMuted'],
  ['"#F5C518"', 'c.accent'],
  ['"#F5A623"', 'c.accent'],
  ['"#F2C200"', 'c.accent'],
  ["'#F2C200'", 'c.accent'],
  ['"#E5B800"', 'c.accent'],
  ['"#B8860B"', 'c.accent'],
  ['"#1A0E00"', 'c.accentOn'],
  ['"#FF4D4D"', 'c.danger'],
  ['"#FF6B6B"', 'c.danger'],
  ['"#E05C5C"', 'c.danger'],
];

function replaceQuoted(body) {
  let out = body;
  for (const [from, to] of QUOTED) {
    out = out.split(from).join(to);
  }
  return out;
}

function convertScreen(rel, importPath, exportFnRegex) {
  let src = read(rel);
  if (src.includes('function makeStyles') && src.includes('useTheme()')) {
    console.log('skip', rel);
    return;
  }

  if (!src.includes('ThemeContext')) {
    // insert import after first line
    const nl = src.indexOf('\n');
    src =
      src.slice(0, nl + 1) +
      `import { useMemo } from "react";\nimport { useTheme, ThemeColors } from "${importPath}";\n` +
      src.slice(nl + 1);
  } else if (!src.includes('useMemo')) {
    src = src.replace(
      /import React,\s*\{([^}]+)\}\s*from\s*["']react["']/,
      (m, n) => `import React, { ${n.trim()}, useMemo } from "react"`
    );
    if (!src.includes('useMemo')) {
      src = `import { useMemo } from "react";\n` + src;
    }
  }

  if (!src.includes('const styles = StyleSheet.create')) {
    console.log('!! no StyleSheet', rel);
    return;
  }

  src = src.replace(
    'const styles = StyleSheet.create({',
    'function makeStyles(c: ThemeColors) {\n  return StyleSheet.create({'
  );
  const lastClose = src.lastIndexOf('});');
  src = src.slice(0, lastClose) + '});\n}\n';

  // Only replace colors inside makeStyles body — find makeStyles and replace there
  const msIdx = src.indexOf('function makeStyles');
  if (msIdx >= 0) {
    const before = src.slice(0, msIdx);
    let after = src.slice(msIdx);
    after = replaceQuoted(after);
    src = before + after;
  }

  // Inject hooks
  if (!src.includes('const { colors, isDark } = useTheme()') && !src.includes('const { colors } = useTheme()')) {
    const re = exportFnRegex || /export default function \w+\([^)]*\)\s*\{/;
    if (re.test(src)) {
      src = src.replace(re, (m) => {
        return `${m}\n  const { colors, isDark } = useTheme();\n  const styles = useMemo(() => makeStyles(colors), [colors]);`;
      });
    } else {
      // try function Name(){
      const re2 = /^(function \w+\([^)]*\)\s*\{)/m;
      src = src.replace(re2, (m) => {
        return `${m}\n  const { colors, isDark } = useTheme();\n  const styles = useMemo(() => makeStyles(colors), [colors]);`;
      });
    }
  }

  // Ensure useTheme is imported
  if (!src.includes('useTheme')) {
    src = src.replace(
      /from ["']([^"']*ThemeContext)["']/,
      'useTheme, ThemeColors } from "$1"'
    );
  }

  write(rel, src);
}

// Fix onboarding hardcoded colors in makeStyles
(function fixOnboarding() {
  let src = read('Onboarding/Onboardingscreen.tsx');
  const msIdx = src.indexOf('function makeStyles');
  if (msIdx < 0) return;
  const before = src.slice(0, msIdx);
  let after = replaceQuoted(src.slice(msIdx));
  // also catch backgroundColor: 'black'
  after = after.replace(/backgroundColor:\s*'black'/g, 'backgroundColor: c.background');
  after = after.replace(/backgroundColor:\s*"black"/g, 'backgroundColor: c.background');
  write('Onboarding/Onboardingscreen.tsx', before + after);
})();

// Password reset
convertScreen('Passwordreset.tsx', './Contexts/ThemeContext', /function \w+\([^)]*\)\s*\{/);

// Dashboard screens
convertScreen('Dashboard/VersionHistory.tsx', '../Contexts/ThemeContext', /export default function \w+\([^)]*\)\s*\{/);
convertScreen('Dashboard/TeamMembers.tsx', '../Contexts/ThemeContext', /export default function \w+\([^)]*\)\s*\{/);
convertScreen('Dashboard/NewProject.tsx', '../Contexts/ThemeContext', /export default function \w+\([^)]*\)\s*\{/);
convertScreen('Dashboard/UploadVideo.tsx', '../Contexts/ThemeContext', /export default function \w+\([^)]*\)\s*\{/);
convertScreen('Dashboard/LibraryScreen.tsx', '../Contexts/ThemeContext', /export default function \w+\([^)]*\)\s*\{/);
convertScreen('Dashboard/uploadScreen.tsx', '../Contexts/ThemeContext', /export default function \w+\([^)]*\)\s*\{/);

// Editor / Pro / components
convertScreen('Editor/ReviewExport.tsx', '../Contexts/ThemeContext', /export default function \w+\([^)]*\)\s*\{/);
convertScreen('ProVersion/ProVersion.tsx', '../Contexts/ThemeContext', /export default function \w+\([^)]*\)\s*\{/);
convertScreen('components/upgradeToProBanner.tsx', '../Contexts/ThemeContext', /export default function \w+\([^)]*\)\s*\{|function \w+\([^)]*\)\s*\{|const \w+[:\s]*=\s*\([^)]*\)\s*=>\s*\{/);
convertScreen('components/Exportsheet.tsx', '../Contexts/ThemeContext', /export default function \w+\([^)]*\)\s*\{|function \w+\([^)]*\)\s*\{/);
convertScreen('components/ExportModal.tsx', '../Contexts/ThemeContext', /export default function \w+\([^)]*\)\s*\{|function \w+\([^)]*\)\s*\{/);
convertScreen('components/InviteApprovalModal.tsx', '../Contexts/ThemeContext', /export default function \w+\([^)]*\)\s*\{|function \w+\([^)]*\)\s*\{/);

console.log('batch2 done');
