import React, { useState } from "react";
import { Student, ScoreMap, TeacherProfile } from "../types";
import { SEMESTERS, MONTHS, KH_ORDER, MT_ORDER, fmtAvg, gradeOf, truncate2 } from "../lib/constants";
import { printHTML } from "../lib/printUtils";
import { buildPublicNoticePrintHTML, buildAiPlanPrintHTML, buildLearningAgreementPrintHTML } from "../lib/printUtilsHelpers";
import { RawScoresModal } from "./Modals/RawScoresModal";

interface DetailTableProps {
  students: Student[];
  semesterId: string;
  onSemesterChange: (semId: string) => void;
  allMonthsScores: Record<string, Record<string, ScoreMap>>; // key: `${semId}_${monthIdx}`
  className?: string;
  teacher?: TeacherProfile | null;
}

interface DEFStudentInfo {
  id: string;
  name: string;
  gender: string;
  khmerAvg: number | null;
  khmerGrade: string;
  mathAvg: number | null;
  mathGrade: string;
  weakSubjects: string[];
}

export const DetailTable: React.FC<DetailTableProps> = ({
  students,
  semesterId,
  onSemesterChange,
  allMonthsScores,
  className = "ថ្នាក់",
  teacher,
}) => {
  // Display mode: "avg" (numerical averages) or "grade" (Khmer grade letters A-F)
  const [displayMode, setDisplayMode] = useState<"avg" | "grade">("avg");

  // AI DEF Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [selectedStudentForRaw, setSelectedStudentForRaw] = useState<Student | null>(null);
  const [defList, setDefList] = useState<DEFStudentInfo[]>([]);
  const [aiPlan, setAiPlan] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  const handlePrintPublicNotice = () => {
    const html = buildPublicNoticePrintHTML(
      students,
      className,
      semesterId,
      teacher,
      allMonthsScores,
      displayMode
    );
    printHTML(html);
  };

  if (!students.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-3xl mb-2">📊</div>
        <div className="text-[10px] font-semibold">មិនទាន់មានសិស្សក្នុងថ្នាក់នេះទេ</div>
      </div>
    );
  }

  const cs = SEMESTERS.find((s) => s.id === semesterId) || SEMESTERS[0];
  const months = cs.months;

  // Compute month average for a student
  const getMonthAvg = (sid: string, mIdx: number) => {
    const key = `${semesterId}_${mIdx}`;
    const monthData = allMonthsScores[key] || {};
    const stuScores = monthData[sid] || {};
    const keys = Object.keys(stuScores).filter((k) => stuScores[k] !== "" && !isNaN(Number(stuScores[k])));
    if (!keys.length) return null;
    const sum = keys.reduce((acc, k) => acc + Number(stuScores[k]), 0);
    return truncate2(sum / keys.length);
  };

  // Pre-calculate averages and ranks for all students
  const studentDataList = students.map((s) => {
    const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
    const mAvgs = months.map((m) => getMonthAvg(s.id, m));

    const validMAvgs = mAvgs.filter((v): v is number => v !== null);
    const monthlyAvg = validMAvgs.length > 0
      ? truncate2(validMAvgs.reduce((a, b) => a + b, 0) / validMAvgs.length)
      : null;

    let examScore: number | null = null;
    if (semesterId === "s1") {
      examScore = getMonthAvg(s.id, 3);
    } else if (semesterId === "s2") {
      examScore = getMonthAvg(s.id, 8) !== null ? getMonthAvg(s.id, 8) : (getMonthAvg(s.id, 7) !== null ? getMonthAvg(s.id, 7) : getMonthAvg(s.id, 6));
    }

    let semAvg: number | null = null;
    if (monthlyAvg !== null && examScore !== null) {
      semAvg = truncate2((monthlyAvg + examScore) / 2);
    } else if (monthlyAvg !== null) {
      semAvg = truncate2(monthlyAvg);
    } else if (examScore !== null) {
      semAvg = truncate2(examScore);
    }

    const sortScore = semAvg !== null ? semAvg : monthlyAvg !== null ? monthlyAvg : -1;
    const grade = gradeOf(sortScore > 0 ? sortScore : 0);

    return {
      student: s,
      fullName,
      mAvgs,
      monthlyAvg,
      semAvg,
      sortScore,
      grade,
      rank: 0,
    };
  });

  // Calculate Ranks (tied ranks share same number, e.g. 1, 2, 2, 4...)
  const sorted = [...studentDataList].sort((a, b) => {
    const diff = b.sortScore - a.sortScore;
    if (diff !== 0) return diff;
    return (a.student.lastName || "").localeCompare(b.student.lastName || "", "km");
  });
  const rankedMap: Record<string, number> = {};

  sorted.forEach((item, index) => {
    const curScore = item.sortScore;
    const prevScore = index > 0 ? sorted[index - 1].sortScore : null;
    if (index > 0 && prevScore !== null && curScore === prevScore && curScore > 0) {
      rankedMap[item.student.id] = rankedMap[sorted[index - 1].student.id];
    } else {
      rankedMap[item.student.id] = index + 1;
    }
  });

  const rankedData = studentDataList.map((item) => ({
    ...item,
    rank: rankedMap[item.student.id] || 0,
  }));

  // AI Extraction logic for DEF students in Khmer & Math
  const handleExtractDEF = async () => {
    setIsAiModalOpen(true);
    setLoadingAi(true);
    setAiPlan("");

    const defs: DEFStudentInfo[] = [];

    students.forEach((s) => {
      const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();

      // Gather scores across all months in selected semester
      const khmerScores: number[] = [];
      const mathScores: number[] = [];
      const weakSkills: string[] = [];

      months.forEach((mIdx) => {
        const key = `${semesterId}_${mIdx}`;
        const monthData = allMonthsScores[key] || {};
        const stuScores = monthData[s.id] || {};

        KH_ORDER.forEach((subj) => {
          if (stuScores[subj] !== undefined && stuScores[subj] !== "" && !isNaN(Number(stuScores[subj]))) {
            const val = Number(stuScores[subj]);
            khmerScores.push(val);
            if (val < 6.0 && !weakSkills.includes(subj)) {
              weakSkills.push(`${subj} (${val})`);
            }
          }
        });

        MT_ORDER.forEach((subj) => {
          if (stuScores[subj] !== undefined && stuScores[subj] !== "" && !isNaN(Number(stuScores[subj]))) {
            const val = Number(stuScores[subj]);
            mathScores.push(val);
            if (val < 6.0 && !weakSkills.includes(subj)) {
              weakSkills.push(`${subj} (${val})`);
            }
          }
        });
      });

      const khAvg = khmerScores.length ? khmerScores.reduce((a, b) => a + b, 0) / khmerScores.length : null;
      const mtAvg = mathScores.length ? mathScores.reduce((a, b) => a + b, 0) / mathScores.length : null;

      const khGrade = khAvg !== null ? gradeOf(khAvg).l : "—";
      const mtGrade = mtAvg !== null ? gradeOf(mtAvg).l : "—";

      // DEF threshold: Grade D, E, or F (average score < 7.0 or grade in ['D', 'E', 'F'])
      const isKhDEF = ["D", "E", "F"].includes(khGrade);
      const isMtDEF = ["D", "E", "F"].includes(mtGrade);
      const isWeakByScore = (khAvg !== null && khAvg < 7.0) || (mtAvg !== null && mtAvg < 7.0);

      if (isKhDEF || isMtDEF || isWeakByScore) {
        defs.push({
          id: s.id,
          name: fullName,
          gender: s.gender || "ប្រុស",
          khmerAvg: khAvg !== null ? Number(khAvg.toFixed(2)) : null,
          khmerGrade: khGrade,
          mathAvg: mtAvg !== null ? Number(mtAvg.toFixed(2)) : null,
          mathGrade: mtGrade,
          weakSubjects: weakSkills.length ? weakSkills : ["សមត្ថភាពសរសេរ", "ចំនួន"],
        });
      }
    });

    setDefList(defs);

    // Trigger AI Remediation Plan Generation
    try {
      const res = await fetch("/api/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: className,
          semesterName: cs.label,
          defStudents: defs,
        }),
      });
      const data = await res.json();
      if (data.plan) {
        setAiPlan(data.plan);
      } else {
        setAiPlan("មិនអាចទទួលបានផែនការពី AI ទេ។");
      }
    } catch (err) {
      console.error("AI fetch failed:", err);
      setAiPlan("មានបញ្ហាក្នុងការភ្ជាប់ទៅកាន់ AI Server។");
    } finally {
      setLoadingAi(false);
    }
  };

  const handlePrintAgreement = () => {
    const html = buildLearningAgreementPrintHTML(students, className || "ថ្នាក់", teacher, allMonthsScores);
    printHTML(html);
  };

  const renderCellContent = (val: number | null) => {
    if (val === null) return <span className="text-slate-300">—</span>;
    if (displayMode === "avg") {
      return <span className={val >= 5 ? "text-emerald-700 font-bold" : "text-red-600 font-extrabold"}>{fmtAvg(val)}</span>;
    } else {
      const g = gradeOf(val);
      return (
        <span
          className="inline-block px-1.5 py-0.5 rounded text-white font-extrabold text-[10.5px]"
          style={{ backgroundColor: g.c }}
        >
          {g.l}
        </span>
      );
    }
  };

  return (
    <div className="p-3 space-y-3">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 no-print bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Semester Selector */}
          <div className="flex gap-1">
            {SEMESTERS.filter((s) => s.id !== "annual").map((sm) => (
              <button
                key={sm.id}
                onClick={() => onSemesterChange(sm.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                  semesterId === sm.id
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-500 shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                }`}
              >
                {sm.label} {semesterId === sm.id && "✓"}
              </button>
            ))}
          </div>

          {/* Toggle Average vs Grade Mode */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
            <span className="text-slate-500 dark:text-slate-400 font-bold px-1.5 text-[11px]">បង្ហាញជា៖</span>
            <button
              onClick={() => setDisplayMode("avg")}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                displayMode === "avg"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              📊 មធ្យមភាគ
            </button>
            <button
              onClick={() => setDisplayMode("grade")}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                displayMode === "grade"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              🏅 និទ្ទេស (A-F)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintPublicNotice}
            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md shadow-sm flex items-center gap-1.5 transition transform active:scale-95"
            title="ព្រីនតារាងលទ្ធផលសិក្សា សម្រាប់បិទផ្សាយសាធារណៈជូនដំណឹងដល់ឪពុកម្ដាយអាណាព្យាបាលសិស្ស"
          >
            <span>🖨️ ព្រីនសន្លឹកបិទផ្សាយ (សម្រាប់អាណាព្យាបាល)</span>
          </button>

          <button
            onClick={handlePrintAgreement}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-md shadow-sm flex items-center gap-1.5 transition transform active:scale-95"
            title="ព្រីនកិច្ចព្រមព្រៀងកែលម្អលទ្ធផលសិក្សាសិស្ស (PTOM)"
          >
            <span>📜 ព្រីនកិច្ចព្រមព្រៀង (PTOM)</span>
          </button>

          <button
            onClick={handleExtractDEF}
            className="px-2 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-[10px] font-bold rounded-md shadow-sm flex items-center gap-1.5 transition transform active:scale-95"
          >
            <span>🤖 AI ស្រង់សិស្ស DEF (ខ្មែរ & គណិត) & បង្កើតផែនការ</span>
          </button>
        </div>
      </div>

      {/* Detail Table Container */}
      <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full text-[10px] text-left text-slate-700 dark:text-slate-200 border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white font-bold text-[10.5px] whitespace-nowrap">
              <th className="py-3 px-2 text-center w-8 border-r border-slate-700">ល.រ</th>
              <th className="py-3 px-2.5 text-left min-w-[140px] border-r border-slate-700">គោត្តនាម-នាម</th>
              <th className="py-3 px-2 text-center w-10 border-r border-slate-700">ភេទ</th>
              <th className="py-3 px-2 text-center min-w-[90px] border-r border-slate-700">ថ្ងៃខែឆ្នាំកំណើត</th>
              {months.map((mIdx) => (
                <th key={mIdx} className="py-3 px-2 text-center min-w-[65px] border-r border-slate-700">
                  ខែ{MONTHS[mIdx]}
                </th>
              ))}
              <th className="py-3 px-2 text-center bg-blue-900 text-white min-w-[75px] border-r border-slate-700">
                ម.ប្រចាំខែ
              </th>
              <th className="py-3 px-2 text-center bg-indigo-950 text-white min-w-[80px] border-r border-slate-700">
                ម.ប្រចាំឆមាស
              </th>
              <th className="py-3 px-2 text-center w-12 bg-amber-900 text-white border-r border-slate-700">
                ចំ.ថ្នាក់
              </th>
              <th className="py-3 px-2 text-center w-12 bg-purple-900 text-white">និទ្ទេស</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {rankedData.map((item, idx) => {
              const { student, fullName, mAvgs, monthlyAvg, semAvg, rank, grade } = item;

              return (
                <tr key={student.id} className={idx % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-900/50" : "bg-white dark:bg-slate-900"}>
                  <td className="py-2.5 px-2 text-center text-slate-400 font-bold border-r border-slate-200 dark:border-slate-800">
                    {idx + 1}
                  </td>
                  <td
                    onClick={() => setSelectedStudentForRaw(student)}
                    className="py-2.5 px-2.5 text-left font-bold text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap cursor-pointer hover:text-blue-600 transition"
                  >
                    {fullName}
                  </td>
                  <td className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                    {student.gender === "ស្រី" ? "👩" : "👨"}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap text-[11px]">
                    {student.dob || "—"}
                  </td>

                  {/* Monthly averages / grades */}
                  {months.map((mIdx, i) => {
                    const v = mAvgs[i];
                    return (
                      <td key={mIdx} className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-bold">
                        {renderCellContent(v)}
                      </td>
                    );
                  })}

                  {/* Average / Grade Monthly */}
                  <td className="py-2.5 px-2 text-center bg-blue-50/70 dark:bg-blue-950/40 border-r border-slate-200 dark:border-slate-800 font-extrabold text-blue-900 dark:text-blue-300">
                    {renderCellContent(monthlyAvg)}
                  </td>

                  {/* Average / Grade Semester */}
                  <td className="py-2.5 px-2 text-center bg-indigo-50/70 dark:bg-indigo-950/40 border-r border-slate-200 dark:border-slate-800 font-extrabold text-indigo-950 dark:text-indigo-300">
                    {renderCellContent(semAvg)}
                  </td>

                  {/* Rank Column */}
                  <td className="py-2.5 px-2 text-center font-extrabold text-amber-900 dark:text-amber-400 bg-amber-50/30 border-r border-slate-200 dark:border-slate-800">
                    {rank > 0 ? rank : idx + 1}
                  </td>

                  {/* Grade Badge */}
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-white font-extrabold text-[11px] shadow-2xs"
                      style={{ backgroundColor: grade.c }}
                    >
                      {grade.l}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* AI DEF Extraction & Remediation Plan Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  🤖 ផែនការបំប៉នសិស្ស DEF (ភាសាខ្មែរ & គណិតវិទ្យា)
                </h3>
                <p className="text-[10px] text-indigo-200">
                  ស្រង់ឈ្មោះសិស្សទទួលបាននិទ្ទេស D, E, F និងរៀបចំផែនការកែលម្អដោយ AI
                </p>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-slate-800 dark:text-slate-200">
              {/* Filtered Students Section */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    ⚠️ បញ្ជីឈ្មោះសិស្សទទួលបាននិទ្ទេស D, E, F ({defList.length} នាក់)
                  </h4>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    ភាសាខ្មែរ (៤ សមត្ថភាព) & គណិតវិទ្យា (៥ ដែន)
                  </span>
                </div>

                {defList.length === 0 ? (
                  <div className="text-[10px] text-slate-500 py-2 text-center">
                    🎉 មិនមានសិស្សទទួលបាននិទ្ទេស D, E, F ក្នុងថ្នាក់នេះទេ!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    {defList.map((stu, i) => (
                      <div
                        key={stu.id}
                        className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-amber-200 dark:border-amber-950 flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white">
                          <span>
                            {i + 1}. {stu.name} ({stu.gender})
                          </span>
                          <div className="flex gap-1 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-black">
                              ខ្មែរ: {stu.khmerGrade} ({stu.khmerAvg ?? "—"})
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-black">
                              គណិត: {stu.mathGrade} ({stu.mathAvg ?? "—"})
                            </span>
                          </div>
                        </div>
                        <div className="text-[10.5px] text-red-600 dark:text-red-400 mt-1 truncate">
                          🎯 ចំណុចខ្សោយ: {stu.weakSubjects.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Plan Output Display */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h4 className="text-[10px] font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                    📄 ផែនការបំប៉ន និងកែលម្អលទ្ធផលសិក្សា (AI Generated)
                  </h4>
                  {loadingAi && (
                    <span className="text-[10px] text-indigo-600 animate-pulse font-bold flex items-center gap-1">
                      <span className="animate-spin">🌀</span> កំពុងរៀបចំផែនការដោយ AI...
                    </span>
                  )}
                </div>

                {loadingAi ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="text-3xl animate-bounce">🤖</div>
                    <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      AI កំពុងវិភាគចំណុចខ្សោយសិស្ស និងរៀបចំវិធីសាស្ត្របំប៉ន...
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-[10px] leading-relaxed whitespace-pre-wrap font-sans bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-800 dark:text-slate-200">
                    {aiPlan}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-2">
              <button
                onClick={handleExtractDEF}
                disabled={loadingAi}
                className="px-2 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold rounded-md transition"
              >
                🔄 បង្កើតផែនការឡើងវិញ
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aiPlan);
                    alert("បានចម្លងផែនការទៅ Clipboard រួចរាល់!");
                  }}
                  disabled={!aiPlan || loadingAi}
                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold rounded-md shadow-xs transition"
                >
                  📋 ចម្លងផែនការ
                </button>
                <button
                  onClick={() => {
                    const html = buildAiPlanPrintHTML(className, cs.label, defList, aiPlan, teacher);
                    printHTML(html);
                  }}
                  disabled={!aiPlan || loadingAi}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-md shadow-xs transition disabled:opacity-50"
                >
                  🖨️ បោះពុម្ពផែនការ
                </button>
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-md transition"
                >
                  បិទ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <RawScoresModal
        isOpen={!!selectedStudentForRaw}
        onClose={() => setSelectedStudentForRaw(null)}
        student={selectedStudentForRaw}
        allMonthsScores={allMonthsScores}
        semesterId={semesterId}
      />
    </div>
  );
};
