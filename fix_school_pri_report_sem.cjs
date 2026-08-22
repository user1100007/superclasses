const fs = require('fs');
let spr = fs.readFileSync('src/components/SchoolPriReport.tsx', 'utf-8');
spr = spr.replace(
  /const mSnap = await getDocs\(collection\(db, "classes", cls, "semesters", semesterId, "months", String\(m\), "scores"\)\);/,
  `// PRI report strictly looks at semester "s2" and month 8
          const mSnap = await getDocs(collection(db, "classes", cls, "semesters", "s2", "months", String(m), "scores"));`
);
fs.writeFileSync('src/components/SchoolPriReport.tsx', spr);
