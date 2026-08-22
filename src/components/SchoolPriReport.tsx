import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { CLASSES, SEMESTERS } from "../lib/constants";
import { Student, ScoreMap, TeacherProfile } from "../types";
import { printHTML } from "../lib/printUtils";
import {
  SchoolPriReportDisplayConfig,
  DEFAULT_PRI_REPORT_CONFIG,
} from "./SchoolReports/types";
import { PriReportConfigPanel } from "./SchoolReports/PriReportConfigPanel";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SchoolPriReportProps {
  teacher: TeacherProfile | null;
  selClass?: string;
  currentScoresMap?: Record<string, ScoreMap>;
  currentStudents?: Student[];
  semester?: string;
  selMonth?: number;
  allMonthsScores?: Record<string, Record<string, ScoreMap>>;
}

export const SchoolPriReport: React.FC<SchoolPriReportProps> = ({
  teacher,
  selClass,
  currentScoresMap,
  currentStudents,
  semester,
  selMonth,
  allMonthsScores,
}) => {
  const [semesterId, setSemesterId] = useState<string>("s1");
  const [loading, setLoading] = useState<boolean>(false);
  const [reportHtml, setReportHtml] = useState<string>("");

  // Configuration Panel State
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [displayConfig, setDisplayConfig] = useState<SchoolPriReportDisplayConfig>(() => {
    try {
      const saved = localStorage.getItem("school_pri_report_config_v2");
      return saved ? JSON.parse(saved) : DEFAULT_PRI_REPORT_CONFIG;
    } catch {
      return DEFAULT_PRI_REPORT_CONFIG;
    }
  });

  // Aggregated analytics state for PRI UI
  const [priGradeSummaries, setPriGradeSummaries] = useState<
    {
      grade: string;
      totalStudents: number;
      femaleStudents: number;
      khmerPassed: number;
      mathPassed: number;
      passRate: number;
    }[]
  >([]);

  const [chartData, setChartData] = useState<any[]>([]);

  // 1. Fetch Configuration from Firestore on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configKey = teacher?.email ? `school_pri_report_${teacher.email}` : "school_pri_report_default";
        const docRef = doc(db, "reportConfigurations", configKey);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data()?.components) {
          const loaded = { ...DEFAULT_PRI_REPORT_CONFIG, ...snap.data().components };
          setDisplayConfig(loaded);
          localStorage.setItem("school_pri_report_config_v2", JSON.stringify(loaded));
        }
      } catch (err) {
        console.warn("Could not load PRI report configuration from Firestore:", err);
      }
    };
    fetchConfig();
  }, [teacher?.email]);

  // 2. Save Configuration to Firestore
  const handleSaveConfigToFirestore = async () => {
    setIsSavingConfig(true);
    setSaveSuccess(false);
    try {
      const configKey = teacher?.email ? `school_pri_report_${teacher.email}` : "school_pri_report_default";
      const docRef = doc(db, "reportConfigurations", configKey);
      await setDoc(
        docRef,
        {
          reportType: "school_pri_report",
          teacherEmail: teacher?.email || "default",
          schoolId: teacher?.schoolID || teacher?.school || "default",
          components: displayConfig,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      localStorage.setItem("school_pri_report_config_v2", JSON.stringify(displayConfig));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save PRI report configuration to Firestore:", err);
      alert("មានបញ្ហាក្នុងការរក្សាទុកការកំណត់ទៅ Firestore");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleConfigToggle = (key: keyof Omit<SchoolPriReportDisplayConfig, "enabledGrades">, value: boolean) => {
    setDisplayConfig((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem("school_pri_report_config_v2", JSON.stringify(updated));
      return updated;
    });
  };

  const handleToggleGrade = (grade: string) => {
    setDisplayConfig((prev) => {
      const exists = prev.enabledGrades.includes(grade);
      let updatedGrades = exists ? prev.enabledGrades.filter((g) => g !== grade) : [...prev.enabledGrades, grade];
      if (updatedGrades.length === 0) updatedGrades = [grade]; // keep at least 1
      const updated = { ...prev, enabledGrades: updatedGrades };
      localStorage.setItem("school_pri_report_config_v2", JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetDefaultConfig = () => {
    setDisplayConfig(DEFAULT_PRI_REPORT_CONFIG);
    localStorage.setItem("school_pri_report_config_v2", JSON.stringify(DEFAULT_PRI_REPORT_CONFIG));
  };

  const handleSelectAllConfig = () => {
    const allTrue: SchoolPriReportDisplayConfig = {
      showPriTable: true,
      showPriCharts: true,
      showGradeSummaries: true,
      showAttendanceRecords: true,
      showSchoolSeal: true,
      enabledGrades: ["1", "2", "3", "4", "5", "6"],
    };
    setDisplayConfig(allTrue);
    localStorage.setItem("school_pri_report_config_v2", JSON.stringify(allTrue));
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const gradeData: Record<string, any> = {};
      const GRADES = ["1", "2", "3", "4", "5", "6"];
      GRADES.forEach((g) => {
        gradeData[g] = {
          khmer: { female: Array(11).fill(0), male: Array(11).fill(0) },
          math: { female: Array(11).fill(0), male: Array(11).fill(0) },
          social: { female: Array(11).fill(0), male: Array(11).fill(0) },
          science: { female: Array(11).fill(0), male: Array(11).fill(0) },
        };
      });

      const gradeStudentTotals: Record<string, { total: number; female: number }> = {};
      GRADES.forEach((g) => {
        gradeStudentTotals[g] = { total: 0, female: 0 };
      });

      for (const cls of CLASSES) {
        let gradeLevel = cls.replace(/[^0-9]/g, "");
        if (!GRADES.includes(gradeLevel)) continue;

        let classStudents: Student[] = [];
        let classScores: Record<string, ScoreMap> = {};

        if (cls === selClass && currentStudents) {
          classStudents = currentStudents;
        } else {
          const stuSnap = await getDocs(collection(db, "classes", cls, "students"));
          stuSnap.forEach((d) => classStudents.push({ id: d.id, ...d.data() } as Student));
        }

        classStudents.forEach((s) => {
          gradeStudentTotals[gradeLevel].total++;
          if (s.gender === "ស្រី") gradeStudentTotals[gradeLevel].female++;
        });

        const getScoresForMonth = async (sem: string, m: number) => {
          try {
            const mRef = collection(db, "classes", cls, "semesters", sem, "months", String(m), "scores");
            const mSnap = await getDocs(mRef);
            const map: Record<string, ScoreMap> = {};
            mSnap.forEach((d) => (map[d.id] = d.data().scores || {}));
            return map;
          } catch (e) {
            return {};
          }
        };

        const s2_8 = await getScoresForMonth("s2", 8);
        const s2_7 = await getScoresForMonth("s2", 7);
        const s2_6 = await getScoresForMonth("s2", 6);
        const s1_3 = await getScoresForMonth("s1", 3);

        classScores = { ...s1_3, ...s2_6, ...s2_7, ...s2_8 };

        if (cls === selClass) {
          if (allMonthsScores) {
            Object.keys(allMonthsScores).forEach((mKey) => {
              classScores = { ...classScores, ...allMonthsScores[mKey] };
            });
          }
          if (currentScoresMap) {
            classScores = { ...classScores, ...currentScoresMap };
          }
        }

        const students = classStudents;
        const scoresMap = classScores;

        students.forEach((s) => {
          const examScores = scoresMap[s.id];
          if (!examScores) return;

          const isFemale = s.gender === "ស្រី";
          const gKey = isFemale ? "female" : "male";

          const getScore = (type: string) => {
            if (type === "khmer") {
              const keysList = [
                ["សមត្ថភាពស្ដាប់", "សមត្ថភាពស្តាប់", "ស្ដាប់", "ស្តាប់"],
                ["សមត្ថភាពអាន", "អាន", "អំណាន"],
                ["សមត្ថភាពនិយាយ", "និយាយ"],
                ["សមត្ថភាពសរសេរ", "សរសេរ", "សរសេរតាមអាន", "តែងសេចក្តី"],
              ];
              const valids: number[] = [];
              keysList.forEach((aliases) => {
                for (const k of aliases) {
                  const v = examScores[k];
                  if (v !== "" && v !== undefined && v !== null && !isNaN(Number(v))) {
                    valids.push(Number(v));
                    break;
                  }
                }
              });
              if (valids.length === 0) {
                const direct = examScores["ភាសាខ្មែរ"] ?? examScores["ខ្មែរ"];
                if (direct !== "" && direct !== undefined && direct !== null && !isNaN(Number(direct))) {
                  return Math.round(Number(direct));
                }
              }
              return valids.length ? Math.round(valids.reduce((a, b) => a + b, 0) / valids.length) : null;
            } else if (type === "math") {
              const keysList = [
                ["ចំនួន", "ចំនួននិងប្រមាណវិធី"],
                ["រង្វាស់រង្វាល់"],
                ["ពីជគណិត"],
                ["ធរណីមាត្រ"],
                ["ស្ថិតិ"],
              ];
              const valids: number[] = [];
              keysList.forEach((aliases) => {
                for (const k of aliases) {
                  const v = examScores[k];
                  if (v !== "" && v !== undefined && v !== null && !isNaN(Number(v))) {
                    valids.push(Number(v));
                    break;
                  }
                }
              });
              if (valids.length === 0) {
                const direct = examScores["គណិតវិទ្យា"] ?? examScores["គណិត"];
                if (direct !== "" && direct !== undefined && direct !== null && !isNaN(Number(direct))) {
                  return Math.round(Number(direct));
                }
              }
              return valids.length ? Math.round(valids.reduce((a, b) => a + b, 0) / valids.length) : null;
            } else if (type === "social") {
              const v = examScores["សិក្សាសង្គម"] ?? examScores["សង្គម"];
              return v !== "" && v !== undefined && v !== null && !isNaN(Number(v)) ? Math.round(Number(v)) : null;
            } else if (type === "science") {
              const v = examScores["វិទ្យាសាស្ត្រ"];
              return v !== "" && v !== undefined && v !== null && !isNaN(Number(v)) ? Math.round(Number(v)) : null;
            }
            return null;
          };

          const kh = getScore("khmer");
          const mt = getScore("math");
          const soc = getScore("social");
          const sci = getScore("science");

          if (kh !== null && kh >= 0 && kh <= 10) gradeData[gradeLevel].khmer[gKey][kh]++;
          if (mt !== null && mt >= 0 && mt <= 10) gradeData[gradeLevel].math[gKey][mt]++;
          if (soc !== null && soc >= 0 && soc <= 10) gradeData[gradeLevel].social[gKey][soc]++;
          if (sci !== null && sci >= 0 && sci <= 10) gradeData[gradeLevel].science[gKey][sci]++;
        });
      }

      // Compute summaries for PRI
      const summaries = GRADES.map((g) => {
        const khTally = [...gradeData[g].khmer.female, ...gradeData[g].khmer.male];
        const khPassed =
          gradeData[g].khmer.female.slice(5).reduce((a: number, b: number) => a + b, 0) +
          gradeData[g].khmer.male.slice(5).reduce((a: number, b: number) => a + b, 0);

        const mtPassed =
          gradeData[g].math.female.slice(5).reduce((a: number, b: number) => a + b, 0) +
          gradeData[g].math.male.slice(5).reduce((a: number, b: number) => a + b, 0);

        const totalEnrolled = gradeStudentTotals[g].total;
        const totalEvaluated = khTally.reduce((a, b) => a + b, 0) / 2;
        const passCount = Math.round((khPassed + mtPassed) / 2);
        const passRate = totalEnrolled > 0 ? Math.round((passCount / totalEnrolled) * 100) : 0;

        return {
          grade: g,
          totalStudents: totalEnrolled,
          femaleStudents: gradeStudentTotals[g].female,
          khmerPassed: khPassed,
          mathPassed: mtPassed,
          passRate,
        };
      });
      setPriGradeSummaries(summaries);

      // Prepare Chart Data
      const cData = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
        let khCount = 0;
        let mtCount = 0;
        let sciSocCount = 0;
        displayConfig.enabledGrades.forEach((g) => {
          if (gradeData[g]) {
            khCount += gradeData[g].khmer.female[score] + gradeData[g].khmer.male[score];
            mtCount += gradeData[g].math.female[score] + gradeData[g].math.male[score];
            sciSocCount +=
              gradeData[g].social.female[score] +
              gradeData[g].social.male[score] +
              gradeData[g].science.female[score] +
              gradeData[g].science.male[score];
          }
        });
        return {
          score: `${score} ពិន្ទុ`,
          ភាសាខ្មែរ: khCount,
          គណិតវិទ្យា: mtCount,
          សង្គមនិងវិទ្យាសាស្ត្រ: sciSocCount,
        };
      });
      setChartData(cData);

      const getRow = (title: string, data: any) => {
        const fTally = data.female;
        const fTotal = fTally.reduce((a: number, b: number) => a + b, 0);
        const fPassed = fTally.slice(5).reduce((a: number, b: number) => a + b, 0);

        const mTally = data.male;
        const mTotal = mTally.reduce((a: number, b: number) => a + b, 0);
        const mPassed = mTally.slice(5).reduce((a: number, b: number) => a + b, 0);

        return `
          <tr>
            <td rowspan="2" class="border border-slate-300 p-1.5 text-left font-bold text-[12px]">${title}</td>
            <td class="border border-slate-300 p-1.5 text-center text-[11px] font-bold">ស្រី</td>
            ${fTally.map((v: number) => `<td class="border border-slate-300 p-1 text-center font-semibold text-[11px]">${v || ""}</td>`).join("")}
            <td class="border border-slate-300 p-1.5 text-center font-extrabold text-[11px] bg-blue-50/50 text-blue-900">${fTotal || ""}</td>
            <td class="border border-slate-300 p-1.5 text-center font-extrabold text-[11px] bg-emerald-50/50 text-emerald-900">${fPassed || ""}</td>
          </tr>
          <tr>
            <td class="border border-slate-300 p-1.5 text-center text-[11px] font-bold">ប្រុស</td>
            ${mTally.map((v: number) => `<td class="border border-slate-300 p-1 text-center font-semibold text-[11px]">${v || ""}</td>`).join("")}
            <td class="border border-slate-300 p-1.5 text-center font-extrabold text-[11px] bg-blue-50/50 text-blue-900">${mTotal || ""}</td>
            <td class="border border-slate-300 p-1.5 text-center font-extrabold text-[11px] bg-emerald-50/50 text-emerald-900">${mPassed || ""}</td>
          </tr>
        `;
      };

      let html = `
      <div class="space-y-6 max-w-4xl mx-auto p-2" style="page-break-after: always;">
        <div class="text-center mb-4">
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
        </div>
        <div class="text-center mb-6 relative">
          <div class="absolute right-0 top-0 border-2 border-black rounded-full w-14 h-14 flex items-center justify-center font-black text-lg">PRI</div>
          <h2 class="font-extrabold text-[14px] mb-1 text-slate-900 leading-relaxed">
            តារាងសរុបពិន្ទុសិស្សតាមមុខវិជ្ជាសម្រាប់បឋមសិក្សា ( ពីថ្នាក់ទី១ដល់ថ្នាក់ទី៦ )<br/>
            ឆ្នាំសិក្សា២០២៥-២០២៦
          </h2>
        </div>
        
        <div class="text-[11px] font-bold text-slate-800 mb-4 px-1 leading-6">
          <div class="text-[10px] font-normal italic text-red-600 mb-2">
            * សូមផ្ញើទៅការិយាល័យអប់រំក្រុង/ស្រុក/ខណ្ឌវិញឲ្យបានមុនថ្ងៃទី ១៥/១០/២០២៦ ម៉ោង០០:០០<br/>
            * សូមអានសេចក្តីណែនាំមុននឹងបំពេញ សូមបំពេញជាលេខអារ៉ាប់ ហើយបំពេញដោយប្រុងប្រយ័ត្ន
          </div>
          <div class="flex items-center gap-2">
             <span>អាសយដ្ឋាន: រាជធានី/ខេត្ត:</span> <span class="border-b border-dotted border-slate-500 flex-1">${teacher?.province || ""}</span>
             <span>ក្រុង/ស្រុក/ខណ្ឌ:</span> <span class="border-b border-dotted border-slate-500 flex-1">${teacher?.district || ""}</span>
             <span>ឃុំ/សង្កាត់:</span> <span class="border-b border-dotted border-slate-500 flex-1">${teacher?.commune || ""}</span>
          </div>
          <div class="flex items-center gap-2">
             <span>សាលារៀន:</span> <span class="border-b border-dotted border-slate-500 flex-1">${teacher?.school || ""}</span>
             <span>ឈ្មោះនាយក/នាយិកា:</span> <span class="border-b border-dotted border-slate-500 flex-1"></span>
             <span>ទូរស័ព្ទ:</span> <span class="border-b border-dotted border-slate-500 flex-1">${teacher?.phone || ""}</span>
          </div>
        </div>
      `;

      if (displayConfig.showPriTable) {
        const filteredGrades = GRADES.filter((g) => displayConfig.enabledGrades.includes(g));
        filteredGrades.forEach((g) => {
          html += `
          <div class="mb-4">
            <h3 class="font-bold text-[12px] mb-1">ថ្នាក់ទី${g}</h3>
            <table class="w-full text-[11px] border-collapse border border-slate-400 text-center shadow-sm">
              <thead>
                <tr class="bg-slate-200/60 font-bold text-slate-900">
                  <th rowspan="2" class="border border-slate-400 p-1 w-24 text-[11px]">មុខវិជ្ជា</th>
                  <th rowspan="2" class="border border-slate-400 p-1 w-10 text-[11px]">ភេទ</th>
                  <th colspan="11" class="border border-slate-400 p-1 text-[11px]">ចំនួនសិស្សស្រី/ប្រុសតាមកម្រិតពិន្ទុ និងមុខវិជ្ជា</th>
                  <th rowspan="2" class="border border-slate-400 p-1 w-12 text-[10px] leading-tight">សរុប</th>
                  <th rowspan="2" class="border border-slate-400 p-1 w-14 text-[10px] leading-tight">ចំនួន<br/>សិស្សជាប់</th>
                </tr>
                <tr class="bg-slate-200/60 font-bold text-[10px] text-slate-800">
                  ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => `<th class="border border-slate-400 p-1 w-6">${v}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${getRow("ភាសាខ្មែរ", gradeData[g].khmer)}
                ${getRow("គណិតវិទ្យា", gradeData[g].math)}
                ${
                  g === "1" || g === "2" || g === "3"
                    ? getRow("វិទ្យាសាស្ត្រ + សិក្សាសង្គម", {
                        female: gradeData[g].science.female.map(
                          (v: number, i: number) => v + gradeData[g].social.female[i]
                        ),
                        male: gradeData[g].science.male.map(
                          (v: number, i: number) => v + gradeData[g].social.male[i]
                        ),
                      })
                    : `
                  ${getRow("សិក្សាសង្គម", gradeData[g].social)}
                  ${getRow("វិទ្យាសាស្ត្រ", gradeData[g].science)}
                `
                }
              </tbody>
            </table>
          </div>
          `;
        });
      }

      if (displayConfig.showSchoolSeal) {
        html += `
          <div class="flex justify-between mt-12 text-[12px] font-bold text-slate-800 px-4">
            <div class="text-center space-y-2">
              <p>សាលារៀន ពិនិត្យ និង ឯកភាពដោយនាយកសាលារៀន</p>
              <div class="w-24 h-24 rounded-full border border-slate-400 mx-auto flex items-center justify-center text-[10px] text-slate-400 mt-2">ត្រាសាលារៀន</div>
              <div class="flex items-center gap-2 mt-2"><span>ហត្ថលេខា:</span><span class="border-b border-dotted border-slate-500 flex-1"></span></div>
              <div class="flex items-center gap-2 mt-2"><span>ឈ្មោះ:</span><span class="border-b border-dotted border-slate-500 flex-1"></span></div>
              <div class="flex items-center gap-2 mt-2"><span>ថ្ងៃទី:</span><span class="border-b border-dotted border-slate-500 flex-1"></span></div>
            </div>
            <div class="text-left space-y-2 w-64">
              <p>បំពេញដោយ: ..............................................</p>
              <div class="flex items-center gap-2 mt-2"><span>ហត្ថលេខា:</span><span class="border-b border-dotted border-slate-500 flex-1"></span></div>
              <div class="flex items-center gap-2 mt-2"><span>ឈ្មោះ:</span><span class="border-b border-dotted border-slate-500 flex-1"></span></div>
              <div class="flex items-center gap-2 mt-2">
                <span>តួនាទី:</span><span class="border-b border-dotted border-slate-500 flex-1"></span>
                <span>ថ្ងៃទី:</span><span class="border-b border-dotted border-slate-500 w-16"></span>
              </div>
            </div>
          </div>
        </div>
        `;
      } else {
        html += `</div>`;
      }

      setReportHtml(html);
    } catch (e) {
      console.error(e);
      alert("មានបញ្ហាក្នុងការទាញយកទិន្នន័យ");
    }
    setLoading(false);
  };

  const handlePrint = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>របាយការណ៍ PRI សាលា</title><script src="https://cdn.tailwindcss.com"></script><style>@import url("https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Hanuman:wght@400;700;900&display=swap");
      body{font-family:'Hanuman','Battambang',sans-serif;padding:20px}
      *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #000;padding:4px}
      .space-y-6 > * + * { margin-top: 1.5rem; }
      .max-w-4xl { max-width: 56rem; }
      .mx-auto { margin-left: auto; margin-right: auto; }
      .p-2 { padding: 0.5rem; }
      .text-center { text-align: center; }
      .mb-6 { margin-bottom: 1.5rem; }
      .font-black { font-weight: 900; }
      .text-sm { font-size: 0.875rem; }
      .mb-1 { margin-bottom: 0.25rem; }
      .text-slate-900 { color: #0f172a; }
      .leading-tight { line-height: 1.25; }
      .text-\[10px\] { font-size: 10px; }
      .text-amber-800 { color: #92400e; }
      .font-normal { font-weight: 400; }
      .font-extrabold { font-weight: 800; }
      .text-\[15px\] { font-size: 15px; }
      .text-\[14px\] { font-size: 14px; }
      .leading-relaxed { line-height: 1.625; }
      .text-\[12px\] { font-size: 12px; }
      .font-bold { font-weight: 700; }
      .text-slate-800 { color: #1e293b; }
      .mb-4 { margin-bottom: 1rem; }
      .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
      .flex { display: flex; }
      .flex-wrap { flex-wrap: wrap; }
      .items-center { align-items: center; }
      .justify-between { justify-content: space-between; }
      .gap-2 { gap: 0.5rem; }
      .border-b { border-bottom-width: 1px; }
      .border-dotted { border-style: dotted; }
      .border-slate-500 { border-color: #64748b; }
      .flex-1 { flex: 1 1 0%; }
      .w-24 { width: 6rem; }
      .h-24 { height: 6rem; }
      .text-blue-900 { color: #1e3a8a; }
      .w-full { width: 100%; }
      .border-collapse { border-collapse: collapse; }
      .border { border-width: 1px; }
      .border-2 { border-width: 2px; }
      .border-black { border-color: #000; }
      .border-slate-400 { border-color: #94a3b8; }
      .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
      .bg-slate-200\/60 { background-color: rgba(226, 232, 240, 0.6); }
      .p-1\.5 { padding: 0.375rem; }
      .p-1 { padding: 0.25rem; }
      .w-16 { width: 4rem; }
      .text-\[11px\] { font-size: 11px; }
      .w-64 { width: 16rem; }
      .mt-12 { margin-top: 3rem; }
      .mt-2 { margin-top: 0.5rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .text-left { text-align: left; }
      .space-y-2 > * + * { margin-top: 0.5rem; }
      .border-slate-300 { border-color: #cbd5e1; }
      .bg-blue-50\/50 { background-color: rgba(239, 246, 255, 0.5); }
      .bg-emerald-50\/50 { background-color: rgba(236, 253, 245, 0.5); }
      .text-emerald-900 { color: #064e3b; }
      .font-semibold { font-weight: 600; }
      .absolute { position: absolute; }
      .relative { position: relative; }
      .right-0 { right: 0px; }
      .top-0 { top: 0px; }
      .rounded-full { border-radius: 9999px; }
      .text-lg { font-size: 1.125rem; }
      .italic { font-style: italic; }
      .text-red-600 { color: #dc2626; }
      .text-slate-400 { color: #94a3b8; }
      .mx-auto { margin-left: auto; margin-right: auto; }
    </style></head><body>${reportHtml}</body></html>`;
    printHTML(html);
  };

  useEffect(() => {
    generateReport();
  }, [semesterId, displayConfig]);

  const activeGrades = priGradeSummaries.filter((g) => displayConfig.enabledGrades.includes(g.grade));

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-5">
      {/* PRI Configuration Modal */}
      <PriReportConfigPanel
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={displayConfig}
        onChange={handleConfigToggle}
        onToggleGrade={handleToggleGrade}
        onSaveToFirestore={handleSaveConfigToFirestore}
        onResetDefault={handleResetDefaultConfig}
        onSelectAll={handleSelectAllConfig}
        isSaving={isSavingConfig}
        saveSuccess={saveSuccess}
      />

      {/* Main Top Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs no-print flex flex-wrap justify-between items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              🏫 របាយការណ៍ PRI (សម្រាប់បឋមសិក្សា)
            </h2>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>⚙️</span>
              <span>កំណត់ការបង្ហាញ</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            សរុបលទ្ធផលតេស្តអំណាន គណិតវិទ្យា សិក្សាសង្គម និងវិទ្យាសាស្ត្រ (កម្រិតពិន្ទុ ០ ដល់ ១០)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {SEMESTERS.filter((s) => s.id !== "annual").map((sm) => (
              <button
                key={sm.id}
                onClick={() => setSemesterId(sm.id)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  semesterId === sm.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                }`}
              >
                {sm.label}
              </button>
            ))}
          </div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
          >
            <span>🔄</span>
            <span>{loading ? "កំពុងទាញយក..." : "ធ្វើបច្ចុប្បន្នភាព"}</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={!reportHtml}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <span>🖨️</span>
            <span>បោះពុម្ព PRI សាលា</span>
          </button>
        </div>
      </div>

      {/* 1. GRADE SUMMARIES CARDS (When enabled) */}
      {displayConfig.showGradeSummaries && activeGrades.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 no-print">
          {activeGrades.map((g) => (
            <div
              key={g.grade}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">ថ្នាក់ទី {g.grade}</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {g.passRate}% ជាប់
                </span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {g.totalStudents} <span className="text-xs font-normal text-slate-500">សិស្ស</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                ស្រី: <span className="font-bold text-pink-600">{g.femaleStudents}</span> នាក់
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. PRI CHARTS (When enabled) */}
      {displayConfig.showPriCharts && chartData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs no-print space-y-2">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>📈</span>
              <span>គំនូសតាងសមិទ្ធផលពិន្ទុមុខវិជ្ជា PRI (កម្រិតពិន្ទុ ០ ដល់ ១០)</span>
            </h3>
            <span className="text-[11px] text-slate-500">គិតតាមថ្នាក់ដែលបានជ្រើសរើស</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="score" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                <Bar dataKey="ភាសាខ្មែរ" fill="#2563eb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="គណិតវិទ្យា" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="សង្គមនិងវិទ្យាសាស្ត្រ" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. PRI TABLE & OFFICIAL REPORT PREVIEW */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-emerald-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
            <p className="font-bold text-sm">កំពុងទាញយកទិន្នន័យគ្រប់ថ្នាក់...</p>
          </div>
        ) : reportHtml ? (
          <div dangerouslySetInnerHTML={{ __html: reportHtml }} className="min-w-[800px] print:m-0" />
        ) : (
          <div className="text-center py-10 text-slate-500 font-bold text-sm">មិនមានទិន្នន័យ</div>
        )}
      </div>
    </div>
  );
};
