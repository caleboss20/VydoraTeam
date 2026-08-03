/**
 * Batch-wire screens that use `const COLORS = { background: '#0B0D13', ... }`
 * (or similar) to ThemeContext via a mutable COLORS + recreate-styles pattern.
 *
 * Run from Vydora root: node scripts/wire-theme-screens.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'screens');

const TARGETS = [
  'Editor/EditToolPanel.tsx',
  'Editor/Editorscreen.tsx',
  'Editor/TimeLine.tsx',
  'Editor/EditorFullscreenPreview.tsx',
  'Editor/TitleCardPanel.tsx',
  'Editor/CanvasToolPanel.tsx',
  'Editor/OverlayToolPanel.tsx',
  'Editor/MaskToolPanel.tsx',
  'Editor/BrandKitPanel.tsx',
  'Editor/VoiceoverToolPanel.tsx',
  'Editor/SilenceToolPanel.tsx',
  'Editor/AssembleToolPanel.tsx',
  'Editor/RotateToolPanel.tsx',
  'Editor/MotionTrackPanel.tsx',
  'Editor/StabilizeToolPanel.tsx',
  'Editor/MusicToolPanel.tsx',
  'Editor/ColorGradePanel.tsx',
  'Editor/TemplatesPanel.tsx',
  'Editor/CaptionsToolPanel.tsx',
  'Editor/MultiCamToolPanel.tsx',
  'Editor/BeatsToolPanel.tsx',
  'Editor/StockToolPanel.tsx',
  'Editor/TransitionPanel.tsx',
  'Editor/ShortsToolPanel.tsx',
  'Editor/EffectsToolPanel.tsx',
  'Editor/MovieEffectsPanel.tsx',
  'Editor/FilterPanelTool.tsx',
  'Editor/cropRatioPanel.tsx',
  'Dashboard/InviteMember.tsx',
  'Dashboard/UploadVideo.tsx',
  'components/InviteApprovalModal.tsx',
  'Tabbar/editTools.tsx',
  'Tabbar/AddTextScreen.tsx',
  'Tabbar/TimelineScreen.tsx',
  'Tabbar/MoreScreen.tsx',
  'Tabbar/FilterScreen.tsx',
];

function ensureImport(src, fromPath) {
  if (src.includes('useAppPalette') || src.includes("ThemeContext")) {
    if (src.includes('useAppPalette')) return src;
    // has ThemeContext but not useAppPalette — extend import if possible
    if (src.includes("from '../Contexts/ThemeContext'") || src.includes('from "../Contexts/ThemeContext"')) {
      return src.replace(
        /import\s*\{([^}]+)\}\s*from\s*['"](\.\.\/)+Contexts\/ThemeContext['"]/,
        (m, names, dots) => {
          if (names.includes('useAppPalette')) return m;
          return `import { ${names.trim().replace(/,$/, '')}, useAppPalette } from '${dots}Contexts/ThemeContext'`;
        }
      );
    }
  }
  // Find a good place after other imports
  const importLine = `import { useAppPalette } from '${fromPath}';\n`;
  const lastImport = [...src.matchAll(/^import .+$/gm)].pop();
  if (!lastImport) return importLine + src;
  const idx = lastImport.index + lastImport[0].length;
  return src.slice(0, idx) + '\n' + importLine + src.slice(idx);
}

function themeImportPath(fileRel) {
  const depth = fileRel.split('/').length - 1;
  return '../'.repeat(depth) + 'Contexts/ThemeContext';
}

function findExportComponent(src) {
  const patterns = [
    /export\s+default\s+function\s+(\w+)\s*\([^)]*\)\s*\{/,
    /export\s+default\s+function\s+(\w+)\s*<[^>]*>\s*\([^)]*\)\s*\{/,
    /export\s+default\s+(\w+)\s*;/,
    /function\s+(\w+)\s*\([^)]*\)\s*\{/,
    /const\s+(\w+)\s*[:=]\s*(?:React\.FC[^=]*=\s*)?\([^)]*\)\s*=>\s*\{/,
    /const\s+(\w+)\s*=\s*function\s*\([^)]*\)\s*\{/,
  ];
  for (const p of patterns) {
    const m = src.match(p);
    if (m && m[0].includes('{')) return m;
  }
  // export default function Name() {
  const m2 = src.match(/export\s+default\s+function\s+\w+[^{]*\{/);
  if (m2) return m2;
  const m3 = src.match(/(?:export\s+default\s+)?(?:function|const)\s+\w+[^{]*\{/);
  return m3;
}

function patchFile(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.log('skip missing', rel);
    return;
  }
  let src = fs.readFileSync(full, 'utf8');
  if (src.includes('useAppPalette()') && src.includes('COLORS = useAppPalette')) {
    console.log('already', rel);
    return;
  }

  // Must have a COLORS or similar dark palette object
  const colorsMatch = src.match(
    /const\s+COLORS\s*=\s*\{[\s\S]*?background:\s*['"]#[0-9A-Fa-f]{3,8}['"][\s\S]*?\};/
  );
  if (!colorsMatch) {
    console.log('no COLORS block', rel);
    return;
  }

  src = ensureImport(src, themeImportPath(rel));

  // Replace const COLORS with let + keep dark defaults as initial
  src = src.replace(/const\s+COLORS\s*=/, 'let COLORS =');

  // Inject palette sync at start of main component
  const comp = findExportComponent(src);
  if (!comp) {
    console.log('no component', rel);
    fs.writeFileSync(full, src);
    return;
  }
  const inject = `\n  const __palette = useAppPalette();\n  COLORS = {\n    ...COLORS,\n    background: __palette.background,\n    surface: __palette.surface,\n    border: __palette.border,\n    yellow: __palette.yellow,\n    textPrimary: __palette.textPrimary,\n    textSecondary: __palette.textSecondary,\n    textMuted: __palette.textMuted,\n  };\n`;

  // Only inject once
  if (!src.includes('useAppPalette()')) {
    const braceIdx = comp.index + comp[0].length;
    // comp[0] ends with `{`
    src = src.slice(0, braceIdx) + inject + src.slice(braceIdx);
  }

  // Convert StyleSheet.create that references COLORS into a factory recreated each render.
  // Pattern: const styles = StyleSheet.create({ ... });
  // -> let styles = StyleSheet.create({}); function __makeStyles() { return StyleSheet.create({...}); }
  // and after COLORS assign: styles = __makeStyles();

  if (src.includes('const styles = StyleSheet.create({') && !src.includes('__makeStyles')) {
    src = src.replace(
      'const styles = StyleSheet.create({',
      'function __makeStyles() {\n  return StyleSheet.create({'
    );
    // Close the function after the StyleSheet — find the matching `});` for styles
    // Heuristic: last `});` in file that closes StyleSheet.create
    const lastClose = src.lastIndexOf('});');
    if (lastClose > 0) {
      src = src.slice(0, lastClose) + '});\n}\nlet styles = __makeStyles();\n' + src.slice(lastClose + 3);
    }
    // After COLORS assign in component, recreate styles
    src = src.replace(
      /COLORS = \{[\s\S]*?\};\n/,
      (m) => m + '  styles = __makeStyles();\n'
    );
  } else if (src.includes('useAppPalette()') && src.includes('__makeStyles')) {
    // already structured
  } else if (!src.includes('__makeStyles') && src.includes('StyleSheet.create')) {
    // Inline styles may reference COLORS at create time — still inject palette for
    // any runtime COLORS.xxx usage in JSX.
  }

  fs.writeFileSync(full, src);
  console.log('patched', rel);
}

for (const t of TARGETS) {
  try {
    patchFile(t);
  } catch (e) {
    console.error('fail', t, e.message);
  }
}
console.log('done');
