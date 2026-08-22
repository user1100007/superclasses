const fs = require('fs');
let rv = fs.readFileSync('src/components/ReportsView.tsx', 'utf-8');

rv = rv.replace(
  /if \(semId === "s1"\) examScores = allMonthsScores\?\.\["s1_3"\]\?\.\[s\.id\];\s*else if \(semId === "s2"\) examScores = allMonthsScores\?\.\["s2_7"\]\?\.\[s\.id\] \|\| allMonthsScores\?\.\["s2_8"\]\?\.\[s\.id\];\s*if \(\(!examScores \|\| Object\.keys\(examScores\)\.length === 0\) && semId === semester\) \{\s*examScores = scoresMap\[s\.id\];\s*\}/,
  `// សម្រាប់ PRI គឺយកពិន្ទុចុងឆ្នាំ (ខែសីហា s2_8)
      examScores = allMonthsScores?.["s2_8"]?.[s.id];
      if (!examScores || Object.keys(examScores).length === 0) {
        if (semester === "s2" && selMonth === 8) {
          examScores = scoresMap[s.id];
        }
      }`
);

fs.writeFileSync('src/components/ReportsView.tsx', rv);
