const fs = require('fs');

const files = [
  'src/screens/signinscreen.tsx',
  'src/screens/Signupscreen.tsx',
  'src/screens/ForgotPassword.tsx',
  'src/screens/OtpVerification.tsx',
  'src/screens/Passwordsuccess.tsx',
  'src/screens/splashscreen.tsx',
  'src/screens/Onboarding/Onboardingscreen.tsx',
  'src/screens/AcceptInvite/AcceptInvitescreen.tsx',
];

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  const before = s;

  // Fix broken JSX: color=c.xxx → color={colors.xxx}
  s = s.replace(
    /\b(color|backgroundColor|placeholderTextColor|borderColor)=c\.(\w+)/g,
    '$1={colors.$2}'
  );

  // StatusBar: force theme-aware barStyle
  s = s.replace(
    /barStyle="light-content"\s+backgroundColor=\{colors\.background\}/g,
    'barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background}'
  );
  s = s.replace(
    /<StatusBar\s+barStyle="light-content"\s*\/>/g,
    '<StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />'
  );

  if (s !== before) {
    fs.writeFileSync(f, s);
    console.log('fixed', f);
  } else {
    console.log('ok', f);
  }
}

// ForgotPassword / Otp / splash / Passwordsuccess / Onboarding — inject hooks if missing
function injectHooks(file, fnPattern) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('const { colors, isDark } = useTheme()')) {
    console.log('hooks ok', file);
    return;
  }
  if (!s.includes('function makeStyles')) {
    console.log('no makeStyles', file);
    return;
  }
  // Ensure useMemo import
  if (!s.includes('useMemo')) {
    if (s.includes('from "react"') || s.includes("from 'react'")) {
      s = s.replace(
        /import React,\s*\{([^}]+)\}\s*from\s*["']react["']/,
        (m, names) => `import React, { ${names.trim()}, useMemo } from "react"`
      );
      s = s.replace(
        /import \{([^}]+)\}\s*from\s*["']react["']/,
        (m, names) => {
          if (names.includes('useMemo')) return m;
          return `import { ${names.trim()}, useMemo } from "react"`;
        }
      );
    } else {
      s = `import { useMemo } from "react";\n` + s;
    }
  }

  const re = new RegExp(fnPattern);
  if (!re.test(s)) {
    console.log('fn not found', file, fnPattern);
    return;
  }
  s = s.replace(re, (m) => {
    return (
      m +
      `\n  const { colors, isDark } = useTheme();\n  const styles = useMemo(() => makeStyles(colors), [colors]);`
    );
  });
  fs.writeFileSync(file, s);
  console.log('injected hooks', file);
}

injectHooks('src/screens/ForgotPassword.tsx', /function ForgotPassword\(\)\s*\{/);
injectHooks('src/screens/OtpVerification.tsx', /function VerifyEmail\(\)\s*\{/);
injectHooks('src/screens/Passwordsuccess.tsx', /function \w+\([^)]*\)\s*\{/);
injectHooks('src/screens/splashscreen.tsx', /export default function \w+\([^)]*\)\s*\{|function \w+\([^)]*\)\s*\{/);
injectHooks('src/screens/Onboarding/Onboardingscreen.tsx', /export default function \w+\([^)]*\)\s*\{|function \w+\([^)]*\)\s*\{/);

console.log('done fix');
