const fs = require('fs');

{
  const p = 'src/screens/Project/ProjectDetail.tsx';
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/backgroundColor: "#2A2A2A"/g, 'backgroundColor: BORDER');
  s = s.replace(/backgroundColor: "#1A1A1A"/g, 'backgroundColor: BG');
  s = s.replace(/backgroundColor: "#141414"/g, 'backgroundColor: BG');
  s = s.replace(/backgroundColor: "#1C1C1C"/g, 'backgroundColor: CARD');
  fs.writeFileSync(p, s);
  console.log('projectdetail patched');
}

{
  const r = 'src/screens/Editor/ReviewExport.tsx';
  let t = fs.readFileSync(r, 'utf8');
  t = t.replace(/color="#fff"/g, 'color={colors.text}');
  t = t.replace(/color="#111"/g, 'color={colors.accentOn}');
  fs.writeFileSync(r, t);
  console.log('reviewexport patched');
}

{
  const e = 'src/screens/Editor/Editorscreen.tsx';
  let u = fs.readFileSync(e, 'utf8');
  const i = u.indexOf('function __makeStyles');
  if (i < 0) {
    console.log('no makestyles');
  } else {
    let before = u.slice(0, i);
    let after = u.slice(i);
    after = after.split('"#0E1016"').join('COLORS.background');
    after = after.split('"#181A22"').join('COLORS.background');
    after = after.split('"#151821"').join('COLORS.surface');
    after = after.split('"#1E2230"').join('COLORS.surface');
    fs.writeFileSync(e, before + after);
    console.log('editorscreen patched');
  }
}
