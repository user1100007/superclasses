const fs = require('fs');
let spr = fs.readFileSync('src/components/SchoolPriReport.tsx', 'utf-8');

spr = spr.replace(
  /<div class="relative mb-6" style="min-height: 70px;">\s*<div class="absolute left-0 top-0 text-left">\s*<h2 class="font-bold text-\[12px\] text-slate-900 leading-tight">\s*ក្រសួងអប់រំ យុវជន និងកីឡា<br\/>\s*នាយកដ្ឋានធានាគុណភាពអប់រំ<br\/>\s*អាសយដ្ឋាន៖ អគារលេខ 169 មហាវិថី ព្រះនរោត្តម រាជធានីភ្នំពេញ\s*<\/h2>\s*<\/div>\s*<div class="absolute right-0 top-0 text-center">\s*<h2 class="font-black text-sm mb-1 text-slate-900 leading-tight">\s*ព្រះរាជាណាចក្រកម្ពុជា<br\/>\s*ជាតិ សាសនា ព្រះមហាក្សត្រ\s*<\/h2>\s*<\/div>\s*<\/div>/,
  `<div class="text-center mb-4">
          <h2 class="font-black text-sm mb-1 text-slate-900 leading-tight">
            ព្រះរាជាណាចក្រកម្ពុជា<br/>
            ជាតិ សាសនា ព្រះមហាក្សត្រ<br/>
            <span class="text-[10px] text-amber-800 font-normal">꧁ ༺ ༻ ꧂</span>
          </h2>
        </div>
        <div class="text-left mb-4">
          <h2 class="font-bold text-[12px] text-slate-900 leading-tight">
            ក្រសួងអប់រំ យុវជន និងកីឡា<br/>
            នាយកដ្ឋានធានាគុណភាពអប់រំ<br/>
            អាសយដ្ឋាន៖ អគារលេខ 169 មហាវិថី ព្រះនរោត្តម រាជធានីភ្នំពេញ
          </h2>
        </div>`
);

fs.writeFileSync('src/components/SchoolPriReport.tsx', spr);
