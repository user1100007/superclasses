import React, { useState } from "react";
import { TopStudentItem } from "./types";
import { toKhNum, fmtAvg } from "../../lib/constants";

interface SchoolStudentSummariesProps {
  topStudents: TopStudentItem[];
  slowLearners: TopStudentItem[];
  useKhmerNums?: boolean;
}

export const SchoolStudentSummaries: React.FC<SchoolStudentSummariesProps> = ({
  topStudents,
  slowLearners,
  useKhmerNums = false,
}) => {
  const [activeTab, setActiveTab] = useState<"top" | "slow">("top");
  const [filterGrade, setFilterGrade] = useState<string>("all");

  const filterStudents = (list: TopStudentItem[]) => {
    if (filterGrade === "all") return list;
    return list.filter((s) => s.gradeLevel === filterGrade);
  };

  const displayedStudents = activeTab === "top" ? filterStudents(topStudents) : filterStudents(slowLearners);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>👤</span>
            <span>សេចក្តីសង្ខេបសិស្សម្នាក់ៗ (Individual Student Summaries & Distinction Roster)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            បញ្ជីឈ្មោះសិស្សឆ្នើមទូទាំងសាលា និងសិស្សដែលត្រូវការផែនការជួយបំប៉នសមត្ថភាព
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tab Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-bold">
            <button
              onClick={() => setActiveTab("top")}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "top"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              <span>🏆</span>
              <span>សិស្សឆ្នើម ({topStudents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("slow")}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "slow"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              <span>⚠️</span>
              <span>ត្រូវការបំប៉ន ({slowLearners.length})</span>
            </button>
          </div>

          {/* Grade Filter */}
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold outline-none"
          >
            <option value="all">គ្រប់កម្រិតថ្នាក់ (១-៦)</option>
            <option value="1">ថ្នាក់ទី ១</option>
            <option value="2">ថ្នាក់ទី ២</option>
            <option value="3">ថ្នាក់ទី ៣</option>
            <option value="4">ថ្នាក់ទី ៤</option>
            <option value="5">ថ្នាក់ទី ៥</option>
            <option value="6">ថ្នាក់ទី ៦</option>
          </select>
        </div>
      </div>

      {/* Student List Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-300">
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-1 text-center w-10">ល.រ</th>
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-3 text-left">គោត្តនាម-នាម</th>
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center w-14">ភេទ</th>
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center w-20">ថ្នាក់</th>
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center w-24">មធ្យមភាគ</th>
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center w-20">និទ្ទេស</th>
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-3 text-left">ស្ថានភាពវាយតម្លៃ</th>
            </tr>
          </thead>
          <tbody>
            {displayedStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                  មិនមានទិន្នន័យសិស្សក្នុងជម្រើសនេះទេ
                </td>
              </tr>
            ) : (
              displayedStudents.slice(0, 50).map((s, idx) => {
                const isFemale = s.gender === "ស្រី";
                return (
                  <tr
                    key={`${s.className}-${s.id}-${idx}`}
                    className={idx % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/30" : "bg-white dark:bg-slate-900"}
                  >
                    <td className="border border-slate-200 dark:border-slate-800 py-2 px-1 text-center font-semibold text-slate-500">
                      {useKhmerNums ? toKhNum(idx + 1) : idx + 1}
                    </td>
                    <td className="border border-slate-200 dark:border-slate-800 py-2 px-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-300">
                        {isFemale ? "♀" : "♂"}
                      </span>
                      <span>{s.name}</span>
                    </td>
                    <td
                      className={`border border-slate-200 dark:border-slate-800 py-2 px-2 text-center font-semibold ${
                        isFemale ? "text-pink-600 dark:text-pink-400" : "text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {s.gender}
                    </td>
                    <td className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center font-bold text-slate-800 dark:text-slate-200">
                      ថ្នាក់ {s.className}
                    </td>
                    <td className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center font-black text-slate-900 dark:text-white">
                      {useKhmerNums ? toKhNum(fmtAvg(s.avgScore)) : fmtAvg(s.avgScore)}
                    </td>
                    <td className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
                          s.gradeLetter === "A"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : s.gradeLetter === "B"
                            ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300"
                            : s.gradeLetter === "C"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : s.gradeLetter === "D"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : s.gradeLetter === "E"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        និទ្ទេស {s.gradeLetter}
                      </span>
                    </td>
                    <td className="border border-slate-200 dark:border-slate-800 py-2 px-3">
                      {s.avgScore >= 8.5 ? (
                        <span className="text-blue-600 dark:text-blue-400 font-bold">🌟 សិស្សពូកែឆ្នើម (Honor Roll)</span>
                      ) : s.avgScore >= 5.0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">✅ ជាប់មធ្យមភាគ</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">⚠️ ត្រូវការជួយបំប៉នបន្ទាន់</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
