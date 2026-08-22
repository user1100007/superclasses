const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(
  /<SchoolPriReport teacher=\{teacher\} \/>/,
  `<SchoolPriReport 
            teacher={teacher} 
            selClass={selClass}
            currentScoresMap={scoresMap}
            currentStudents={students}
            semester={semester}
            selMonth={selMonth}
            allMonthsScores={allMonthsScores}
          />`
);
fs.writeFileSync('src/App.tsx', app);

let spr = fs.readFileSync('src/components/SchoolPriReport.tsx', 'utf-8');
spr = spr.replace(
  /interface SchoolPriReportProps \{\s*teacher: TeacherProfile \| null;\s*\}/,
  `interface SchoolPriReportProps {
  teacher: TeacherProfile | null;
  selClass?: string;
  currentScoresMap?: Record<string, ScoreMap>;
  currentStudents?: Student[];
  semester?: string;
  selMonth?: number;
  allMonthsScores?: Record<string, Record<string, ScoreMap>>;
}`
);

spr = spr.replace(
  /export const SchoolPriReport: React\.FC<SchoolPriReportProps> = \(\{ teacher \}\) => \{/,
  `export const SchoolPriReport: React.FC<SchoolPriReportProps> = ({ teacher, selClass, currentScoresMap, currentStudents, semester, selMonth, allMonthsScores }) => {`
);

spr = spr.replace(
  /const stuSnap = await getDocs\(collection\(db, "classes", cls, "students"\)\);\s*const students: Student\[\] = \[\];\s*stuSnap\.forEach\(\(d\) => students\.push\(\{ id: d\.id, \.\.\.d\.data\(\) \} as Student\)\);\s*const getScoresForMonth = async \(m: number\) => \{\s*\/\/ PRI report strictly looks at semester "s2" and month 8\s*const mSnap = await getDocs\(collection\(db, "classes", cls, "semesters", "s2", "months", String\(m\), "scores"\)\);\s*const map: Record<string, ScoreMap> = \{\};\s*mSnap\.forEach\(d => map\[d\.id\] = d\.data\(\)\.scores \|\| \{\}\);\s*return map;\s*\};\s*\/\/ PRI យកតែពិន្ទុចុងឆ្នាំ \(ខែសីហា\) ក្នុងឆមាសទី២\s*let scoresMap: Record<string, ScoreMap> = await getScoresForMonth\(8\);/,
  `let classStudents: Student[] = [];
        let classScores: Record<string, ScoreMap> = {};
        
        if (cls === selClass && currentStudents) {
          classStudents = currentStudents;
        } else {
          const stuSnap = await getDocs(collection(db, "classes", cls, "students"));
          stuSnap.forEach((d) => classStudents.push({ id: d.id, ...d.data() } as Student));
        }

        const getScoresForMonth = async (m: number) => {
          const mSnap = await getDocs(collection(db, "classes", cls, "semesters", "s2", "months", String(m), "scores"));
          const map: Record<string, ScoreMap> = {};
          mSnap.forEach(d => map[d.id] = d.data().scores || {});
          return map;
        };

        classScores = await getScoresForMonth(8);

        // Fallback to local unsaved changes if this is the currently active class and month
        if (cls === selClass) {
           if (allMonthsScores && allMonthsScores["s2_8"]) {
             classScores = { ...classScores, ...allMonthsScores["s2_8"] };
           }
           if (semester === "s2" && selMonth === 8 && currentScoresMap) {
             classScores = { ...classScores, ...currentScoresMap };
           }
        }
        
        const students = classStudents;
        let scoresMap = classScores;`
);

fs.writeFileSync('src/components/SchoolPriReport.tsx', spr);
