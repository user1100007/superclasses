import React from "react";
import { ClassAttendanceStat } from "./types";
import { toKhNum } from "../../lib/constants";

interface SchoolAttendanceSummaryProps {
  attendanceStats: ClassAttendanceStat[];
  useKhmerNums?: boolean;
}

export const SchoolAttendanceSummary: React.FC<SchoolAttendanceSummaryProps> = ({
  attendanceStats,
  useKhmerNums = false,
}) => {
  const totalStudents = attendanceStats.reduce((a, b) => a + b.totalStudents, 0);
  const totalPerm = attendanceStats.reduce((a, b) => a + b.totalPermissions, 0);
  const totalUnex = attendanceStats.reduce((a, b) => a + b.totalUnexcused, 0);
  const avgPresentRate =
    attendanceStats.length > 0
      ? Math.round(attendanceStats.reduce((a, b) => a + b.presentRate, 0) / attendanceStats.length)
      : 98;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>📅</span>
            <span>កំណត់ត្រាវត្តមានសាលា (School Attendance Records & Statistics)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ស្ថិតិវត្តមាន អវត្តមានមានច្បាប់ និងឥតច្បាប់ តាមកម្រិតថ្នាក់ និងបន្ទប់នីមួយៗ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg">
            អត្រាវត្តមានមធ្យម: {avgPresentRate}%
          </span>
        </div>
      </div>

      {/* Attendance KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500">សិស្សសរុបទូទាំងសាលា</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {useKhmerNums ? toKhNum(totalStudents) : totalStudents} នាក់
          </div>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="text-xs text-emerald-700 dark:text-emerald-300">អត្រាវត្តមានសរុប</div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {avgPresentRate}%
          </div>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="text-xs text-amber-700 dark:text-amber-300">សុំច្បាប់ (P)</div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">
            {useKhmerNums ? toKhNum(totalPerm) : totalPerm} លើក
          </div>
        </div>

        <div className="bg-red-50/50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-xs text-red-700 dark:text-red-300">អវត្តមានឥតច្បាប់ (A)</div>
          <div className="text-xl font-black text-red-700 dark:text-red-400 mt-1">
            {useKhmerNums ? toKhNum(totalUnex) : totalUnex} លើក
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-300">
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-1 text-center w-10">ល.រ</th>
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center">ថ្នាក់</th>
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center">សិស្សសរុប</th>
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center text-emerald-700 dark:text-emerald-400">
                អត្រាវត្តមាន (%)
              </th>
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center text-amber-700 dark:text-amber-400">
                ច្បាប់ (P)
              </th>
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center text-red-700 dark:text-red-400">
                ឥតច្បាប់ (A)
              </th>
              <th className="border border-slate-200 dark:border-slate-800 py-2 px-3 text-left">វឌ្ឍនភាពវត្តមាន</th>
            </tr>
          </thead>
          <tbody>
            {attendanceStats.map((st, idx) => (
              <tr
                key={st.className}
                className={idx % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/30" : "bg-white dark:bg-slate-900"}
              >
                <td className="border border-slate-200 dark:border-slate-800 py-2 px-1 text-center font-semibold text-slate-500">
                  {useKhmerNums ? toKhNum(idx + 1) : idx + 1}
                </td>
                <td className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center font-bold text-blue-900 dark:text-blue-300">
                  ថ្នាក់ {st.className}
                </td>
                <td className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center font-semibold">
                  {useKhmerNums ? toKhNum(st.totalStudents) : st.totalStudents}
                </td>
                <td className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center font-black text-emerald-600 dark:text-emerald-400">
                  {useKhmerNums ? toKhNum(st.presentRate) : st.presentRate}%
                </td>
                <td className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center font-semibold text-amber-600">
                  {useKhmerNums ? toKhNum(st.totalPermissions) : st.totalPermissions}
                </td>
                <td className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-center font-semibold text-red-600">
                  {useKhmerNums ? toKhNum(st.totalUnexcused) : st.totalUnexcused}
                </td>
                <td className="border border-slate-200 dark:border-slate-800 py-2 px-3">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${st.presentRate >= 95 ? "bg-emerald-500" : st.presentRate >= 85 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(100, Math.max(0, st.presentRate))}%` }}
                    ></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
