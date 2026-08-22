const fs = require('fs');
let spr = fs.readFileSync('src/components/SchoolPriReport.tsx', 'utf-8');
spr = spr.replace(
  /<script src="https:\/\/cdn.tailwindcss.com"><\/script><style>/,
  '<script src="https://cdn.tailwindcss.com"></script><style>@import url("https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Hanuman:wght@400;700;900&display=swap");'
);
spr = spr.replace(
  /font-family:'Khmer OS Siemreap',sans-serif;/,
  "font-family:'Hanuman','Battambang',sans-serif;"
);
fs.writeFileSync('src/components/SchoolPriReport.tsx', spr);
