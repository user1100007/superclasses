import React, { useState } from "react";
import { Student, ScoreMap } from "../types";
import { SUBJECTS, getTotal, getAvg, getRank, resultOf, gradeOf, fmtAvg } from "../lib/constants";

interface ScoresTableProps {
  students: Student[];
  scoresMap: Record<string, ScoreMap>;
  editMode: boolean;
  onUpdateScore: (studentId: string, subject: string, value: number | "") => void;
  onBulkUpdateScore: (subject: string, value: number | "") => void;
  onOpenPhotoModal: (id: string, name: string, gender: string) => void;
  honorPhotos: Record<string, string>;
  onLoadSampleData?: () => void;
}

export const ScoresTable: React.FC<ScoresTableProps> = ({
  students,
  scoresMap,
  editMode,
  onUpdateScore,
  onBulkUpdateScore,
  onOpenPhotoModal,
  honorPhotos,
  onLoadSampleData,
}) => {
  const [displayMode, setDisplayMode] = useState<"avg" | "grade">("avg");
  const handleBulkUpdate = (subject: string) => {
    const val = window.prompt(`បញ្ចូលពិន្ទុដែលចង់ចម្លងសម្រាប់មុខវិជ្ជា ${subject}:`);
    if (val === null) return;
    if (val === "") {
      onBulkUpdateScore(subject, "");
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      alert("សូមបញ្ចូលលេខត្រឹមត្រូវ");
      return;
    }
    onBulkUpdateScore(subject, Math.min(10, Math.max(0, num)));
  };

  if (!students.length) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center shadow-lg">
        <div className="text-4xl mb-3">📝</div>
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-1">
          មិនទាន់មានទិន្នន័យសិស្ស និងពិន្ទុនៅឡើយទេ
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          លោកគ្រូ/អ្នកគ្រូ អាចបញ្ចូលទិន្នន័យគំរូសាកល្បងភ្លាមៗ ដើម្បីពិនិត្យមើលពិន្ទុ និងការគណនាចំណាត់ថ្នាក់។
        </p>
        {onLoadSampleData && (
          <button
            onClick={onLoadSampleData}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md inline-flex items-center gap-2 cursor-pointer transition active:scale-95"
          >
            <span>⚡</span>
            <span>បញ្ចូលទិន្នន័យគំរូសាកល្បង</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls Bar for Toggle */}
      {!editMode && (
        <div className="flex flex-wrap items-center justify-start gap-2 no-print bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
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
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left text-slate-700 dark:text-slate-200 border-collapse">
        <thead>
          <tr className="bg-slate-800 dark:bg-slate-950 text-white font-bold text-[10px] whitespace-nowrap sticky top-0 z-20">
            <th className="py-3 px-2 text-center w-8 sticky left-0 z-30 bg-slate-800 dark:bg-slate-950">ល.រ</th>
            <th className="py-3 px-2.5 text-left min-w-[140px] sticky left-8 z-30 bg-slate-800 dark:bg-slate-950">គោត្តនាម-នាម</th>
            <th className="py-3 px-2 text-center w-10 sticky left-[172px] z-30 bg-slate-800 dark:bg-slate-950 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">ភេទ</th>
            {SUBJECTS.map((subj) => (
              <th key={subj} className="py-3 px-1.5 text-center min-w-[50px]">
                {subj}
                {editMode && (
                  <button onClick={() => handleBulkUpdate(subj)} className="ml-1 text-[8px] opacity-70 hover:opacity-100">
                    🔂
                  </button>
                )}
              </th>
            ))}
            <th className="py-3 px-2 text-center bg-slate-700 dark:bg-slate-900 w-16">ពិន្ទុសរុប</th>
            <th className="py-3 px-2 text-center bg-slate-700 dark:bg-slate-900 w-16">មធ្យមភាគ</th>
            <th className="py-3 px-2 text-center bg-slate-700 dark:bg-slate-900 w-12">ចំ.ថ្នាក់</th>
            <th className="py-3 px-2 text-center w-14">លទ្ធផល</th>
            <th className="py-3 px-2 text-center w-12">និទ្ទេស</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {students.map((s, idx) => {
            const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
            const photo = honorPhotos[s.id] || s.photoUrl;
            const total = getTotal(s.id, scoresMap);
            const avg = getAvg(s.id, students, scoresMap);
            const rank = getRank(s.id, students, scoresMap);
            const passFail = resultOf(avg);
            const grade = gradeOf(avg);
            const cellBg = idx % 2 === 0 ? "bg-slate-50 dark:bg-slate-900" : "bg-white dark:bg-slate-900/80";

            return (
              <tr
                key={s.id}
                className={idx % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-900/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/30" : "bg-white dark:bg-slate-900 hover:bg-blue-50/30 dark:hover:bg-blue-900/30"}
              >
                <td className={`py-2.5 px-2 text-center text-slate-400 font-bold sticky left-0 z-10 ${cellBg}`}>{idx + 1}</td>

                {/* Name */}
                <td className={`py-2.5 px-2.5 text-left whitespace-nowrap font-bold text-slate-800 dark:text-slate-100 sticky left-8 z-10 ${cellBg}`}>
                  <div
                    onClick={() => onOpenPhotoModal(s.id, fullName, s.gender)}
                    className="flex items-center justify-start gap-1.5 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-blue-400 bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      {photo ? (
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px]">{s.gender === "ស្រី" ? "👩" : "👨"}</span>
                      )}
                    </div>
                    <span className="text-left">{fullName}</span>
                  </div>
                </td>

                <td className={`py-2.5 px-1 text-center font-semibold text-slate-500 dark:text-slate-400 sticky left-[172px] z-10 ${cellBg} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                  {s.gender === "ស្រី" ? "👩" : "👨"}
                </td>

                {/* Subject score inputs/cells */}
                {SUBJECTS.map((subj) => {
                  const val = scoresMap[s.id]?.[subj] ?? "";
                  return (
                    <td key={subj} className="py-1 px-1 text-center">
                      {editMode ? (
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          value={val}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              onUpdateScore(s.id, subj, "");
                              return;
                            }
                            let num = parseFloat(raw);
                            if (isNaN(num)) {
                              onUpdateScore(s.id, subj, "");
                              return;
                            }
                            if (num < 0) num = 0;
                            if (num > 10) num = 10;
                            onUpdateScore(s.id, subj, num);
                          }}
                          placeholder="—"
                          className="w-11 text-center border border-blue-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded py-0.5 text-xs outline-none focus:border-blue-600 dark:focus:border-blue-400 font-semibold"
                        />
                      ) : (
                        <span
                          className={`font-bold ${
                            Number(val) >= 5 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {displayMode === "grade" && val !== "" && val !== undefined && !isNaN(Number(val))
                            ? <span style={{ color: gradeOf(Number(val)).c }}>{gradeOf(Number(val)).l}</span>
                            : val !== "" && val !== undefined ? val : "—"
                          }
                        </span>
                      )}
                    </td>
                  );
                })}

                {/* Calculated fields */}
                <td className="py-2 px-2 text-center bg-slate-100 dark:bg-slate-800/80 font-extrabold text-blue-900 dark:text-blue-300">
                  {total}
                </td>
                <td className="py-2 px-2 text-center bg-slate-100 dark:bg-slate-800/80 font-extrabold text-indigo-900 dark:text-indigo-300">
                  {fmtAvg(avg)}
                </td>
                <td className="py-2 px-2 text-center bg-slate-100 dark:bg-slate-800/80 font-extrabold text-slate-800 dark:text-slate-200">
                  {rank}
                </td>
                <td
                  className={`py-2 px-2 text-center font-bold text-[11px] ${
                    avg >= 5 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {passFail}
                </td>
                <td className="py-2 px-2 text-center">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-white font-extrabold text-[11px]"
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
    </div>
  );
};
