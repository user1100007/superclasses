const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsView.tsx', 'utf8');

const replacement = `
            const getStudentSemesterExamAvgLocal = (sid: string): number => {
              const semId = semester !== "annual" ? semester : "s1";
              let examScores = undefined;
              if (semId === "s1") {
                examScores = allMonthsScores?.["s1_3"]?.[sid];
              } else if (semId === "s2") {
                examScores = allMonthsScores?.["s2_7"]?.[sid] || allMonthsScores?.["s2_8"]?.[sid];
              }
              if ((!examScores || Object.keys(examScores).length === 0) && semId === semester) {
                examScores = scoresMap[sid];
              }
              if (!examScores) return 0;
              let total = 0, hasAny = false;
              SUBJECTS.forEach(s => {
                const v = examScores![s];
                if (v !== undefined && v !== "" && v !== null && !isNaN(Number(v))) {
                  total += Number(v);
                  hasAny = true;
                }
              });
              if (!hasAny) return 0;
              const evalCount = getClassEvalSubjectCount(students, scoresMap);
              return truncate2(total / evalCount);
            };
            const examAvg = isSemester ? getStudentSemesterExamAvgLocal(s.id) : getAvg(s.id, students, scoresMap);`;

code = code.replace("const examAvg = getAvg(s.id, students, scoresMap);", replacement);
fs.writeFileSync('src/components/ReportsView.tsx', code);
