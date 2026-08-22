import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ClassAnnualStat, ClassGradeStat } from "./types";
import { toKhNum } from "../../lib/constants";

interface SchoolPerformanceChartsProps {
  annualStats: ClassAnnualStat[];
  gradeStats: ClassGradeStat[];
  useKhmerNums?: boolean;
}

const COLORS = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#f97316", "#ef4444"];
const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b"];

export const SchoolPerformanceCharts: React.FC<SchoolPerformanceChartsProps> = ({
  annualStats,
  gradeStats,
  useKhmerNums = false,
}) => {
  // 1. Grade-level Comparison (Pass vs Fail)
  const GRADES = ["1", "2", "3", "4", "5", "6"];
  const gradeLevelData = GRADES.map((g) => {
    const matching = annualStats.filter((c) => c.gradeLevel === g);
    const totalEnrolled = matching.reduce((a, b) => a + b.totalEnrolled, 0);
    const passCount = matching.reduce((a, b) => a + b.passAvgTotal, 0);
    const failCount = matching.reduce((a, b) => a + b.failAvgTotal, 0);
    const passRate = totalEnrolled > 0 ? Math.round((passCount / totalEnrolled) * 100) : 0;

    return {
      name: `ថ្នាក់ទី ${useKhmerNums ? toKhNum(g) : g}`,
      grade: g,
      សរុប: totalEnrolled,
      ជាប់: passCount,
      ធ្លាក់: failCount,
      អត្រាជាប់: passRate,
    };
  });

  // 2. Grade Distribution (A-F) across school
  const totalGrades = gradeStats.reduce(
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

  const gradeDistData = [
    { name: "និទ្ទេស A (ឆ្នើម)", count: totalGrades.A, fill: "#2563eb" },
    { name: "និទ្ទេស B (ល្អណាស់)", count: totalGrades.B, fill: "#06b6d4" },
    { name: "និទ្ទេស C (ល្អ)", count: totalGrades.C, fill: "#10b981" },
    { name: "និទ្ទេស D (មធ្យម)", count: totalGrades.D, fill: "#f59e0b" },
    { name: "និទ្ទេស E (ខ្សោយ)", count: totalGrades.E, fill: "#f97316" },
    { name: "និទ្ទេស F (ធ្លាក់)", count: totalGrades.F, fill: "#ef4444" },
  ];

  // 3. School-wide Pass vs Reinforcement Pie
  const totalEvaluated =
    totalGrades.A + totalGrades.B + totalGrades.C + totalGrades.D + totalGrades.E + totalGrades.F;
  const goodCount = totalGrades.A + totalGrades.B + totalGrades.C;
  const slowCount = totalGrades.D + totalGrades.E;
  const failCount = totalGrades.F;

  const pieData = [
    { name: "និទ្ទេសល្អ (A-C)", value: goodCount },
    { name: "ត្រូវការបំប៉ន (D-E)", value: slowCount },
    { name: "មិនទាន់ជាប់ (F)", value: failCount },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>📈</span>
          <span>គំនូសតាងសមិទ្ធផលសិក្សា (School Academic Performance Charts)</span>
        </h3>
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
          វាយតម្លៃសិស្សសរុប {totalEvaluated} នាក់
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart: Pass vs Fail by Grade Level */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center justify-between">
            <span>📊 អត្រាសិស្សជាប់ និងធ្លាក់តាមកម្រិតថ្នាក់ (១-៦)</span>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">ចំនួនសិស្ស (នាក់)</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeLevelData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
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
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                <Bar dataKey="ជាប់" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ធ្លាក់" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Grade Distribution A-F */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center justify-between">
            <span>🏆 ការបែងចែកនិទ្ទេសសិស្សទូទាំងសាលា (A ដល់ F)</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
              និទ្ទេស A-C: {goodCount} នាក់
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDistData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
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
                <Bar dataKey="count" name="ចំនួនសិស្ស" radius={[4, 4, 0, 0]}>
                  {gradeDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Progress Bars & Rate Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {gradeLevelData.slice(0, 3).map((g) => (
          <div
            key={g.grade}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs"
          >
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              <span>{g.name}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black">{g.អត្រាជាប់}% ជាប់</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${g.អត្រាជាប់}%` }}></div>
              <div className="bg-red-400 h-full" style={{ width: `${100 - g.អត្រាជាប់}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>ជាប់: {g.ជាប់} នាក់</span>
              <span>ធ្លាក់: {g.ធ្លាក់} នាក់</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
