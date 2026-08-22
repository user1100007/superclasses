const fs = require('fs');

let rv = fs.readFileSync('src/components/ReportsView.tsx', 'utf-8');
rv = rv.replace(
  /<title>តារាងសរុបពិន្ទុ PRI - ថ្នាក់ទី \$\{selClass\}<\/title><style>/,
  '<title>តារាងសរុបពិន្ទុ PRI - ថ្នាក់ទី ${selClass}</title><script src="https://cdn.tailwindcss.com"></script><style>'
);
fs.writeFileSync('src/components/ReportsView.tsx', rv);

let spr = fs.readFileSync('src/components/SchoolPriReport.tsx', 'utf-8');
spr = spr.replace(
  /<title>របាយការណ៍ PRI សាលា<\/title><style>/,
  '<title>របាយការណ៍ PRI សាលា</title><script src="https://cdn.tailwindcss.com"></script><style>'
);
fs.writeFileSync('src/components/SchoolPriReport.tsx', spr);
