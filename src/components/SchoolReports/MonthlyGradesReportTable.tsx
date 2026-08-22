import React from "react";
import { ClassGradeStat } from "./types";
import { TeacherProfile } from "../../types";
import { MONTHS, SEMESTERS, fmtAvg, getThreeWorkingDates } from "../../lib/constants";
import { printHTML } from "../../lib/printUtils";

interface MonthlyGradesReportTableProps {
  teacher: TeacherProfile | null;
  classStats: ClassGradeStat[];
  semesterId: string;
  onSemesterChange: (semId: string) => void;
  selMonth: number;
  onMonthChange: (month: number) => void;
  sig1Role: string;
  dateMode: "auto" | "dots";
}

export const MonthlyGradesReportTable: React.FC<MonthlyGradesReportTableProps> = ({
  teacher,
  classStats,
  semesterId,
  onSemesterChange,
  selMonth,
  onMonthChange,
  sig1Role,
  dateMode,
}) => {
  const curSem = SEMESTERS.find((s) => s.id === semesterId) || SEMESTERS[0];
  const dates = getThreeWorkingDates(selMonth);
  const isTeacherOrOrganizer = sig1Role === "អ្នករៀបចំរបាយការណ៍" || sig1Role === "គ្រូប្រចាំថ្នាក់";

  const totalStudents = classStats.reduce((a, b) => a + b.totalStudents, 0);
  const totalFemales = classStats.reduce((a, b) => a + b.femaleStudents, 0);
  const totalGrades = classStats.reduce(
    (acc, cur) => {
      acc.A += cur.gradeCounts.A;
      acc.B += cur.gradeCounts.B;
      acc.C += cur.gradeCounts.C;
      acc.D += cur.gradeCounts.D;
      acc.E += cur.gradeCounts.E;
      acc.F += cur.gradeCounts.F;
      return acc;
    },
    { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }
  );

  const totalEvaluated =
    totalGrades.A + totalGrades.B + totalGrades.C + totalGrades.D + totalGrades.E + totalGrades.F;
  const defCount = totalGrades.D + totalGrades.E + totalGrades.F;
  const defPct = totalEvaluated > 0 ? ((defCount / totalEvaluated) * 100).toFixed(1) : "0";
  const passCount = totalGrades.A + totalGrades.B + totalGrades.C + totalGrades.D + totalGrades.E;
  const passPct = totalEvaluated > 0 ? ((passCount / totalEvaluated) * 100).toFixed(1) : "0";

  const handlePrint = () => {
    const tableRows = classStats
      .map((st, idx) => {
        const evalCount =
          st.gradeCounts.A +
          st.gradeCounts.B +
          st.gradeCounts.C +
          st.gradeCounts.D +
          st.gradeCounts.E +
          st.gradeCounts.F;
        const cPass =
          st.gradeCounts.A +
          st.gradeCounts.B +
          st.gradeCounts.C +
          st.gradeCounts.D +
          st.gradeCounts.E;
        const cPassPct = evalCount > 0 ? ((cPass / evalCount) * 100).toFixed(0) + "%" : "—";
        const cDEF = st.gradeCounts.D + st.gradeCounts.E + st.gradeCounts.F;

        return `
          <tr style="background-color: ${idx % 2 === 0 ? "#f8fafc" : "#ffffff"};">
            <td style="border: 1px solid #334155; padding: 4px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #334155; padding: 4px; text-align: center; font-weight: bold;">ថ្នាក់ ${st.className}</td>
            <td style="border: 1px solid #334155; padding: 4px; text-align: center; font-weight: bold;">${st.totalStudents}</td>
            <td style="border: 1px solid #334155; padding: 4px; text-align: center;">${st.femaleStudents}</td>
            <td style="border: 1px solid #334155; padding: 4px; text-align: center; color: #1e40af; font-weight: bold;">${st.gradeCounts.A || 0}</td>
            <td style="border: 1px solid #334155; padding: 4px; text-align: center; color: #0284c7;">${st.gradeCounts.B || 0}</td>
            <td style="border: 1px solid #334155; padding: 4px; text-align: center; color: #059669;">${st.gradeCounts.C || 0}</td>
            <td style="border: 1px solid #334155; padding: 4px; text-align: center; color: #d97706;">${st.gradeCounts.D || 0}</td>
            <td style="border: 1px solid #334155; padding: 4px; text-align: center; color: #ea580c;">${st.gradeCounts.E || 0}</td>
            <td style="border: 1px solid #334155; padding: 4px; text-align: center; color: #dc2626; font-weight: bold;">${st.gradeCounts.F || 0}</td>
            <td style="border: 1px solid #334155; padding: 4px; text-align: center; font-weight: bold; background-color: #ecfdf5;">${cPassPct}</td>
            <td style="border: 1px solid #334155; padding: 4px; text-align: center; font-weight: bold; background-color: #fffbeb;">${cDEF > 0 ? cDEF + " នាក់" : "0"}</td>
            <td style="border: 1px solid #334155; padding: 4px; text-align: center;">${st.avgScore !== null ? fmtAvg(st.avgScore) : "—"}</td>
          </tr>
        `;
      })
      .join("");

    const totalRow = `
      <tr style="background-color: #e2e8f0; font-weight: bold;">
        <td colspan="2" style="border: 1px solid #334155; padding: 6px; text-align: center;">សរុបសាលា</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center;">${totalStudents}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center;">${totalFemales}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center; color: #1e40af;">${totalGrades.A}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center; color: #0284c7;">${totalGrades.B}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center; color: #059669;">${totalGrades.C}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center; color: #d97706;">${totalGrades.D}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center; color: #ea580c;">${totalGrades.E}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center; color: #dc2626;">${totalGrades.F}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center; background-color: #d1fae5;">${passPct}%</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center; background-color: #fef3c7;">${defCount} នាក់</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center;">—</td>
      </tr>
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>របាយការណ៍ស្ថិតិនិទ្ទេស</title>
        <style>
          @page { size: A4 portrait; margin: 6mm 5mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Kantumruy Pro', 'Khmer OS Siemreap', 'Hanuman', sans-serif; font-size: 10.5px; margin: 0; padding: 4px 6px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5px; }
          th, td { border: 1px solid #334155; text-align: center; padding: 4px 2px; }
          .sig-box { display: flex; justify-content: space-between; margin-top: 24px; }
          .sig-col { text-align: center; width: 42%; font-size: 11px; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 14px; font-weight: 900;">ព្រះរាជាណាចក្រកម្ពុជា</h2>
          <h3 style="margin: 0; font-size: 12px; font-weight: 900;">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
        </div>

        <div style="font-size: 11px; line-height: 1.5; font-weight: bold;">
          <div>រដ្ឋបាលស្រុក: ${teacher?.district || "……………………"}</div>
          <div>ការិយាល័យអប់រំ យុវជន និងកីឡា</div>
          <div>${teacher?.school || "សាលាបឋមសិក្សា"}</div>
        </div>

        <h3 style="text-align: center; font-size: 14px; font-weight: 900; margin: 12px 0 6px 0; color: #1e3a8a;">
          របាយការណ៍សរុបលទ្ធផលនិទ្ទេសសិក្សា (ខែ${MONTHS[selMonth]} ${curSem.label})
        </h3>

        <table>
          <thead>
            <tr style="background-color: #dbeafe; font-weight: bold;">
              <th rowspan="2" style="width: 30px;">ល.រ</th>
              <th rowspan="2">ថ្នាក់</th>
              <th rowspan="2">សិស្សសរុប</th>
              <th rowspan="2">ស្រី</th>
              <th colspan="6">ចំនួនសិស្សទទួលបាននិទ្ទេស (A - F)</th>
              <th rowspan="2" style="background-color: #dcfce7;">អត្រាជាប់ (A-E)</th>
              <th rowspan="2" style="background-color: #fef3c7;">សិស្សរៀនយឺត (DEF)</th>
              <th rowspan="2">មធ្យមភាគថ្នាក់</th>
            </tr>
            <tr style="background-color: #eff6ff;">
              <th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            ${totalRow}
          </tbody>
        </table>

        <div class="sig-box">
          <div class="sig-col">
            <div style="font-weight: bold; font-size: 12px;">បានឃើញ និងឯកភាព</div>
            ${
              isTeacherOrOrganizer
                ? `
              <div style="font-size: 10px; color: #374151; margin-top: 4px;">
                ${dateMode === "auto" ? dates.d2.lunar : "ថ្ងៃ..................... ខែ............ ឆ្នាំ............ ...... ព.ស. ២៥...."}
              </div>
              <div style="font-size: 10px; color: #374151;">
                ${dateMode === "auto" ? (teacher?.village || teacher?.district || "រោគ") + " " + dates.d2.solar : "ថ្ងៃទី........ ខែ........ ឆ្នាំ២០២...."}
              </div>
            `
                : `<div style="height: 32px;"></div>`
            }
            <div style="font-weight: bold; margin-top: 8px;">នាយក/នាយិកាសាលា</div>
            <div style="height: 45px;"></div>
          </div>
          <div class="sig-col">
            <div style="font-size: 10px; color: #374151; margin-top: 4px;">
              ${dateMode === "auto" ? dates.d0.lunar : "ថ្ងៃ..................... ខែ............ ឆ្នាំ............ ...... ព.ស. ២៥...."}
            </div>
            <div style="font-size: 10px; color: #374151;">
              ${dateMode === "auto" ? (teacher?.village || teacher?.district || "រោគ") + " " + dates.d0.solar : "ថ្ងៃទី........ ខែ........ ឆ្នាំ២០២...."}
            </div>
            <div style="font-weight: bold; margin-top: 8px;">${sig1Role}</div>
            <div style="height: 45px;"></div>
            <div style="font-weight: bold; color: #1e3a8a;">${teacher?.fullName || "…………………………"}</div>
          </div>
        </div>
      </body>
      </html>
    `;
    printHTML(htmlContent);
  };

  return (
    <div className="space-y-4">
      {/* Semester & Month Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Semester Selector */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {SEMESTERS.filter((s) => s.id !== "annual").map((sm) => (
              <button
                key={sm.id}
                onClick={() => {
                  onSemesterChange(sm.id);
                  onMonthChange(sm.months[0]);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  semesterId === sm.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                }`}
              >
                {sm.label}
              </button>
            ))}
          </div>

          {/* Month Selector */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {curSem.months.map((mIdx) => (
              <button
                key={mIdx}
                onClick={() => onMonthChange(mIdx)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  selMonth === mIdx
                    ? "bg-slate-900 text-white shadow-xs dark:bg-blue-500"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                }`}
              >
                ខែ{MONTHS[mIdx]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            🖨️ បោះពុម្ពរបាយការណ៍និទ្ទេស
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">សិស្សសរុប (គ្រប់ថ្នាក់)</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalStudents} <span className="text-xs text-slate-500 font-normal">(ស្រី {totalFemales})</span>
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
            បានវាយតម្លៃ {totalEvaluated} នាក់
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">អត្រាសិស្សជាប់ (A-E)</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {passPct}% <span className="text-xs text-slate-500 font-normal">({passCount} នាក់)</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">និទ្ទេស A-E</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">សិស្សរៀនយឺត (DEF)</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {defCount} <span className="text-xs font-normal text-amber-700">({defPct}%)</span>
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">ត្រូវការផែនការជួយបំប៉ន</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">និទ្ទេស A & B (ល្អប្រសើរ)</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {totalGrades.A + totalGrades.B}{" "}
            <span className="text-xs text-slate-500 font-normal">
              ({totalEvaluated > 0 ? (((totalGrades.A + totalGrades.B) / totalEvaluated) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
            A: {totalGrades.A} | B: {totalGrades.B}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm text-slate-900 dark:text-slate-100">
        <div className="text-center mb-4 space-y-1">
          <h3 className="font-black text-base text-blue-800 dark:text-blue-400 uppercase mt-2">
            របាយការណ៍សរុបលទ្ធផលនិទ្ទេសសិក្សា (ខែ{MONTHS[selMonth]} {curSem.label})
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">គ្រប់ថ្នាក់ទាំងអស់ ក្នុងសាលារៀន</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-blue-100/90 border border-slate-300 text-slate-900 font-bold">
                <th rowSpan={2} className="border border-slate-300 py-2 px-1 text-center w-8">
                  ល.រ
                </th>
                <th rowSpan={2} className="border border-slate-300 py-2 px-2 text-center min-w-[60px]">
                  ថ្នាក់
                </th>
                <th rowSpan={2} className="border border-slate-300 py-2 px-1 text-center w-12">
                  សិស្សសរុប
                </th>
                <th rowSpan={2} className="border border-slate-300 py-2 px-1 text-center w-10">
                  ស្រី
                </th>
                <th colSpan={6} className="border border-slate-300 py-1 px-1 text-center bg-blue-200/80">
                  ចំនួនសិស្សទទួលបាននិទ្ទេស (A - F)
                </th>
                <th rowSpan={2} className="border border-slate-300 py-2 px-1 text-center w-14 bg-emerald-100">
                  អត្រាជាប់ (A-E)
                </th>
                <th rowSpan={2} className="border border-slate-300 py-2 px-1 text-center w-14 bg-amber-100">
                  សិស្សរៀនយឺត (DEF)
                </th>
                <th rowSpan={2} className="border border-slate-300 py-2 px-1 text-center min-w-[60px]">
                  មធ្យមភាគថ្នាក់
                </th>
              </tr>
              <tr className="bg-blue-50 border border-slate-300 text-slate-800 font-bold">
                <th className="border border-slate-300 py-1.5 px-1 text-center text-blue-700 bg-blue-50">និទ្ទេសA</th>
                <th className="border border-slate-300 py-1.5 px-1 text-center text-cyan-700 bg-cyan-50">និទ្ទេសB</th>
                <th className="border border-slate-300 py-1.5 px-1 text-center text-emerald-700 bg-emerald-50">និទ្ទេសC</th>
                <th className="border border-slate-300 py-1.5 px-1 text-center text-amber-700 bg-amber-50">និទ្ទេសD</th>
                <th className="border border-slate-300 py-1.5 px-1 text-center text-orange-700 bg-orange-50">និទ្ទេសE</th>
                <th className="border border-slate-300 py-1.5 px-1 text-center text-red-700 bg-red-50">និទ្ទេសF</th>
              </tr>
            </thead>
            <tbody>
              {classStats.map((st, idx) => {
                const evalCount =
                  st.gradeCounts.A +
                  st.gradeCounts.B +
                  st.gradeCounts.C +
                  st.gradeCounts.D +
                  st.gradeCounts.E +
                  st.gradeCounts.F;
                const cPass =
                  st.gradeCounts.A +
                  st.gradeCounts.B +
                  st.gradeCounts.C +
                  st.gradeCounts.D +
                  st.gradeCounts.E;
                const cPassPct = evalCount > 0 ? ((cPass / evalCount) * 100).toFixed(0) + "%" : "—";
                const cDEF = st.gradeCounts.D + st.gradeCounts.E + st.gradeCounts.F;

                return (
                  <tr key={st.className} className={idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                    <td className="border border-slate-300 py-2 px-1 text-center font-medium text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 py-2 px-2 text-center font-extrabold text-blue-900">
                      ថ្នាក់ {st.className}
                    </td>
                    <td className="border border-slate-300 py-2 px-1 text-center font-bold">{st.totalStudents}</td>
                    <td className="border border-slate-300 py-2 px-1 text-center text-slate-700">{st.femaleStudents}</td>
                    <td className="border border-slate-300 py-2 px-1 text-center font-extrabold text-blue-700 bg-blue-50/30">
                      {st.gradeCounts.A > 0 ? st.gradeCounts.A : <span className="text-slate-300">0</span>}
                    </td>
                    <td className="border border-slate-300 py-2 px-1 text-center font-extrabold text-cyan-700 bg-cyan-50/30">
                      {st.gradeCounts.B > 0 ? st.gradeCounts.B : <span className="text-slate-300">0</span>}
                    </td>
                    <td className="border border-slate-300 py-2 px-1 text-center font-extrabold text-emerald-700 bg-emerald-50/30">
                      {st.gradeCounts.C > 0 ? st.gradeCounts.C : <span className="text-slate-300">0</span>}
                    </td>
                    <td className="border border-slate-300 py-2 px-1 text-center font-extrabold text-amber-700 bg-amber-50/30">
                      {st.gradeCounts.D > 0 ? st.gradeCounts.D : <span className="text-slate-300">0</span>}
                    </td>
                    <td className="border border-slate-300 py-2 px-1 text-center font-extrabold text-orange-700 bg-orange-50/30">
                      {st.gradeCounts.E > 0 ? st.gradeCounts.E : <span className="text-slate-300">0</span>}
                    </td>
                    <td className="border border-slate-300 py-2 px-1 text-center font-extrabold text-red-700 bg-red-50/30">
                      {st.gradeCounts.F > 0 ? st.gradeCounts.F : <span className="text-slate-300">0</span>}
                    </td>
                    <td className="border border-slate-300 py-2 px-1 text-center font-black text-emerald-800 bg-emerald-50/60">
                      {cPassPct}
                    </td>
                    <td className="border border-slate-300 py-2 px-1 text-center font-black text-amber-800 bg-amber-50/60">
                      {cDEF > 0 ? `${cDEF} នាក់` : "០"}
                    </td>
                    <td className="border border-slate-300 py-2 px-1 text-center font-bold text-slate-800">
                      {st.avgScore !== null ? fmtAvg(st.avgScore) : "—"}
                    </td>
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="bg-blue-100/90 font-black text-slate-900 border-t-2 border-slate-400">
                <td colSpan={2} className="border border-slate-300 py-2.5 px-2 text-center">
                  សរុបសាលា
                </td>
                <td className="border border-slate-300 py-2.5 px-1 text-center">{totalStudents}</td>
                <td className="border border-slate-300 py-2.5 px-1 text-center">{totalFemales}</td>
                <td className="border border-slate-300 py-2.5 px-1 text-center text-blue-900">{totalGrades.A}</td>
                <td className="border border-slate-300 py-2.5 px-1 text-center text-cyan-900">{totalGrades.B}</td>
                <td className="border border-slate-300 py-2.5 px-1 text-center text-emerald-900">{totalGrades.C}</td>
                <td className="border border-slate-300 py-2.5 px-1 text-center text-amber-900">{totalGrades.D}</td>
                <td className="border border-slate-300 py-2.5 px-1 text-center text-orange-900">{totalGrades.E}</td>
                <td className="border border-slate-300 py-2.5 px-1 text-center text-red-900">{totalGrades.F}</td>
                <td className="border border-slate-300 py-2.5 px-1 text-center text-emerald-900">{passPct}%</td>
                <td className="border border-slate-300 py-2.5 px-1 text-center text-amber-900">{defCount} នាក់</td>
                <td className="border border-slate-300 py-2.5 px-1 text-center">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
