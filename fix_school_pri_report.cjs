const fs = require('fs');

let spr = fs.readFileSync('src/components/SchoolPriReport.tsx', 'utf-8');
spr = spr.replace(
  /let scoresMap: Record<string, ScoreMap> = \{\};\s*if \(semesterId === "s1"\) \{\s*scoresMap = await getScoresForMonth\(3\);\s*\} else if \(semesterId === "s2"\) \{\s*scoresMap = await getScoresForMonth\(7\);\s*if \(Object\.keys\(scoresMap\)\.length === 0\) \{\s*scoresMap = await getScoresForMonth\(8\);\s*\}\s*\}/,
  `// PRI យកតែពិន្ទុចុងឆ្នាំ (ខែសីហា) ក្នុងឆមាសទី២
        let scoresMap: Record<string, ScoreMap> = await getScoresForMonth(8);`
);
fs.writeFileSync('src/components/SchoolPriReport.tsx', spr);
