/**
 * Repair files broken by automated theme wiring.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'screens');

// ── Passwordreset: fix broken import ─────────────────────────────
{
  let s = fs.readFileSync(path.join(ROOT, 'Passwordreset.tsx'), 'utf8');
  if (s.startsWith('import {\nimport')) {
    s = s.replace(
      /^import \{\nimport \{ useMemo \} from "react";\nimport \{ useTheme, ThemeColors \} from "\.\/Contexts\/ThemeContext";\n/,
      `import { useMemo } from "react";\nimport { useTheme, ThemeColors } from "./Contexts/ThemeContext";\nimport {\n`
    );
    // also add useMemo to React import if present
    s = s.replace(
      'import React, { useState } from "react";',
      'import React, { useState, useMemo } from "react";'
    );
    // remove duplicate standalone useMemo if React has it
    if (s.includes('useState, useMemo')) {
      s = s.replace(/^import \{ useMemo \} from "react";\n/, '');
    }
    fs.writeFileSync(path.join(ROOT, 'Passwordreset.tsx'), s);
    console.log('fixed Passwordreset');
  }
}

// ── LibraryScreen: restore stub ──────────────────────────────────
fs.writeFileSync(
  path.join(ROOT, 'Dashboard/LibraryScreen.tsx'),
  `import { Text, View } from 'react-native';
import React from 'react';

const LibraryScreen = () => {
  return (
    <View>
      <Text>LibraryScreen</Text>
    </View>
  );
};

export default LibraryScreen;
`
);
console.log('fixed LibraryScreen');

// ── uploadScreen: remove stray live hooks from commented file ────
{
  let s = fs.readFileSync(path.join(ROOT, 'Dashboard/uploadScreen.tsx'), 'utf8');
  s = s.replace(
    /\/\/ export default function VideoUploadScreen\(\) \{\n  const \{ colors, isDark \} = useTheme\(\);\n  const styles = useMemo\(\(\) => makeStyles\(colors\), \[colors\]\);\n/,
    '// export default function VideoUploadScreen() {\n'
  );
  // remove theme imports if file is fully commented / unused
  s = s.replace(/^import \{ useMemo \} from "react";\n/, '');
  s = s.replace(/^import \{ useTheme, ThemeColors \} from "\.\.\/Contexts\/ThemeContext";\n/, '');
  // fix any broken makeStyles comment ending
  s = s.replace(
    /\/\/ function makeStyles\(c: ThemeColors\) \{\n[\s\S]*$/,
    (m) => {
      // keep original commented styles if present — just strip live hooks inside comments
      return m
        .replace(/\n  const \{ colors, isDark \} = useTheme\(\);/g, '')
        .replace(/\n  const styles = useMemo\(\(\) => makeStyles\(colors\), \[colors\]\);/g, '');
    }
  );
  fs.writeFileSync(path.join(ROOT, 'Dashboard/uploadScreen.tsx'), s);
  console.log('fixed uploadScreen');
}

console.log('repair done');
