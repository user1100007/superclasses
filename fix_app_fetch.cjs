const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(
  /const fetchAllMonthsData = async \(semId: string\) => \{\s*if \(!selClass\) return;\s*const cs = SEMESTERS.find\(\(s\) => s\.id === semId\);\s*if \(!cs\) return;\s*for \(const mIdx of cs\.months\) \{/,
  `const fetchAllMonthsData = async (semId: string) => {
    if (!selClass) return;
    
    // Always fetch both s1 and s2 for complete reports (like PRI end-of-year)
    const allMonths = [
      ...SEMESTERS.find(s => s.id === "s1")!.months.map(m => ({ sId: "s1", mIdx: m })),
      ...SEMESTERS.find(s => s.id === "s2")!.months.map(m => ({ sId: "s2", mIdx: m }))
    ];

    for (const { sId, mIdx } of allMonths) {`
);
app = app.replace(
  /const key = \`\$\{semId\}_\$\{mIdx\}\`;\s*try \{\s*const colRef = collection\(db, "classes", selClass, "semesters", semId, "months", String\(mIdx\), "scores"\);/,
  `const key = \`\$\{sId\}_\$\{mIdx\}\`;
      try {
        const colRef = collection(db, "classes", selClass, "semesters", sId, "months", String(mIdx), "scores");`
);
fs.writeFileSync('src/App.tsx', app);
