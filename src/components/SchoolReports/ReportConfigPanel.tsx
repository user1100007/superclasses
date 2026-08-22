import React from "react";
import { SchoolReportDisplayConfig } from "./types";

interface ReportConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: SchoolReportDisplayConfig;
  onChange: (key: keyof SchoolReportDisplayConfig, value: boolean) => void;
  onSaveToFirestore: () => void;
  onResetDefault: () => void;
  onSelectAll: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
}

export const ReportConfigPanel: React.FC<ReportConfigPanelProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onSaveToFirestore,
  onResetDefault,
  onSelectAll,
  isSaving,
  saveSuccess,
}) => {
  if (!isOpen) return null;

  const items: {
    key: keyof SchoolReportDisplayConfig;
    label: string;
    description: string;
    icon: string;
    category: "tables" | "analytics" | "layout";
  }[] = [
    // Tables
    {
      key: "showSemesterTable",
      label: "១. តារាងលទ្ធផលសិក្សាឆមាស (Semester Table)",
      description: "តារាងលទ្ធផលសិក្សាឆមាសទី១ និងឆមាសទី២ ជាមួយរូបមន្ត B=A+1-2",
      icon: "📘",
      category: "tables",
    },
    {
      key: "showBaselineTable",
      label: "២. តារាងតេស្តដើមឆ្នាំ (Baseline Test Table)",
      description: "តារាងវាយតម្លៃសមត្ថភាពអំណាន និងគណិតវិទ្យាដើមឆ្នាំសិក្សា",
      icon: "🧪",
      category: "tables",
    },
    {
      key: "showAnnualTable",
      label: "៣. តារាងលទ្ធផលសិក្សាដំណាច់ឆ្នាំ (Annual Final Table)",
      description: "តារាងសរុបដំណាច់ឆ្នាំ រូបមន្តក្រសួង A=5+6+7, B=5+6, 5=3+4",
      icon: "📑",
      category: "tables",
    },
    {
      key: "showMonthlyGradesTable",
      label: "៤. តារាងស្ថិតិនិទ្ទេសតាមខែ/ឆមាស (A - F)",
      description: "ការបែងចែកចំនួនសិស្សទទួលបាននិទ្ទេស A, B, C, D, E, F",
      icon: "📊",
      category: "tables",
    },
    // Analytics & Details
    {
      key: "showPerformanceCharts",
      label: "គំនូសតាងសមិទ្ធផលសិក្សា (Performance Charts)",
      description: "គំនូសតាងស្ថិតិប្រៀបធៀបអត្រាជាប់/ធ្លាក់ និងក្រាហ្វនិទ្ទេស",
      icon: "📈",
      category: "analytics",
    },
    {
      key: "showStudentSummaries",
      label: "សេចក្តីសង្ខេបសិស្សម្នាក់ៗ (Student Summaries)",
      description: "បញ្ជីឈ្មោះសិស្សឆ្នើមទូទាំងសាលា និងសិស្សត្រូវការបំប៉ន",
      icon: "👤",
      category: "analytics",
    },
    {
      key: "showAttendanceRecords",
      label: "កំណត់ត្រាវត្តមានសាលា (School Attendance Records)",
      description: "ស្ថិតិវត្តមាន អវត្តមានមានច្បាប់ និងឥតច្បាប់តាមថ្នាក់",
      icon: "📅",
      category: "analytics",
    },
    // Layout
    {
      key: "showSummaryCards",
      label: "កាតសង្ខេបស្ថិតិរហ័ស (KPI Summary Cards)",
      description: "ប្រអប់ស្ថិតិសិស្សសរុប ស្រី អត្រាជាប់ និងភាគរយសំខាន់ៗ",
      icon: "🏷️",
      category: "layout",
    },
    {
      key: "showSignatures",
      label: "ប្រអប់ហត្ថលេខាផ្លូវការ (Official Signatures Footer)",
      description: "កន្លែងចុះហត្ថលេខា នាយកសាលា និងអ្នករៀបចំរបាយការណ៍",
      icon: "✍️",
      category: "layout",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base">
              ⚙️
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                កំណត់ការបង្ហាញរបាយការណ៍ (Report Configuration)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ជ្រើសរើសតារាង ឬសមាសភាគដែលលោកគ្រូ-អ្នកគ្រូចង់បង្ហាញ និងរក្សាទុកទៅ Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-semibold">ជម្រើសរហ័ស:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onSelectAll}
                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                ✓ ជ្រើសទាំងអស់
              </button>
              <button
                onClick={onResetDefault}
                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                🔄 កំណត់ឡើងវិញ
              </button>
            </div>
          </div>

          {/* Toggle List Grouped */}
          <div className="space-y-2.5">
            {items.map((item) => {
              const isChecked = config[item.key];
              return (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    isChecked
                      ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onChange(item.key, e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isChecked
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {isChecked ? "បង្ហាញ" : "លាក់"}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold">
            {isSaving && <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">⏳ កំពុងរក្សាទុកទៅ Firestore...</span>}
            {saveSuccess && <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">✅ បានរក្សាទុកក្នុង Firestore រួចរាល់!</span>}
            {!isSaving && !saveSuccess && (
              <span className="text-slate-500 dark:text-slate-400">ការកំណត់នឹងត្រូវរក្សាទុកក្នុងគណនីគ្រូ</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              បិទ
            </button>
            <button
              onClick={onSaveToFirestore}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <span>💾</span>
              <span>រក្សាទុកទៅ Firestore</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
