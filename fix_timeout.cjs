const fs = require('fs');
let p = fs.readFileSync('src/lib/printUtils.ts', 'utf-8');
p = p.replace(/setTimeout\(\(\) => \{\n    printWin.focus\(\);\n    printWin.print\(\);\n  \}, 800\);/g, 'setTimeout(() => { printWin.focus(); printWin.print(); }, 1500);');
fs.writeFileSync('src/lib/printUtils.ts', p);
