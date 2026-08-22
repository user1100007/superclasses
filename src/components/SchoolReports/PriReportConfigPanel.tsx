import React from "react";
import { SchoolPriReportDisplayConfig } from "./types";

interface PriReportConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: SchoolPriReportDisplayConfig;
  onChange: (key: keyof Omit<SchoolPriReportDisplayConfig, "enabledGrades">, value: boolean) => void;
  onToggleGrade: (grade: string) => void;
  onSaveToFirestore: () => void;
  onResetDefault: () => void;
  onSelectAll: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
}

export const PriReportConfigPanel: React.FC<PriReportConfigPanelProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onToggleGrade,
  onSaveToFirestore,
  onResetDefault,
  onSelectAll,
  isSaving,
  saveSuccess,
}) => {
  if (!isOpen) return null;

  const componentItems: {
    key: keyof Omit<SchoolPriReportDisplayConfig, "enabledGrades">;
    label: string;
    description: string;
    icon: string;
  }[] = [
    {
      key: "showPriTable",
      label: "តារាងសរុបពិន្ទុតាមមុខវិជ្ជា PRI (PRI Subject Matrix Table)",
      description: "តារាងពិន្ទុកម្រិត ០-១០ ភាសាខ្មែរ, គណិតវិទ្យា, សង្គម និងវិទ្យាសាស្ត្រ",
      icon: "📋",
    },
    {
      key: "showPriCharts",
      label: "គំនូសតាងសមិទ្ធផលមុខវិជ្ជា PRI (Subject Proficiency Charts)",
      description: "ក្រាហ្វិកស្ថិតិប្រៀបធៀបសមត្ថភាពមុខវិជ្ជា និងអត្រាជាប់",
      icon: "📈",
    },
    {
      key: "showGradeSummaries",
      label: "សេចក្តីសង្ខេបសមិទ្ធផលតាមថ្នាក់ (Grade Performance Cards)",
      description: "កាតសង្ខេបចំនួនសិស្ស ស្រី និងអត្រាជាប់តាមកម្រិតថ្នាក់នីមួយៗ",
      icon: "👤",
    },
    {
      key: "showAttendanceRecords",
      label: "កំណត់ត្រាវត្តមាន និងការចូលរួម (Attendance & Participation)",
      description: "ទិន្នន័យវត្តមាន និងការចូលរួមរបស់សិស្សក្នុងវដ្តរបាយការណ៍",
      icon: "📅",
    },
    {
      key: "showSchoolSeal",
      label: "ប្លុកហត្ថលេខា និងត្រាសាលារៀន (School Seal & Signatures)",
      description: "កន្លែងវាយត្រាសាលារៀន និងហត្ថលេខានាយក/អ្នករៀបចំ",
      icon: "✍️",
    },
  ];

  const GRADES = ["1", "2", "3", "4", "5", "6"];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base">
              ⚙️
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                កំណត់ការបង្ហាញរបាយការណ៍ PRI (PRI Report Configuration)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ជ្រើសរើសតារាង គំនូសតាង ឬកម្រិតថ្នាក់ដែលចង់បង្ហាញ និងរក្សាទុកទៅ Firestore
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

          {/* Grade Level Selector Filters */}
          <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span>🏫 ជ្រើសរើសកម្រិតថ្នាក់ដែលត្រូវបង្ហាញ (Grade Levels):</span>
              <span className="text-[10px] text-blue-600 font-normal">
                {config.enabledGrades.length} / 6 ថ្នាក់ត្រូវបានជ្រើសរើស
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {GRADES.map((g) => {
                const isSelected = config.enabledGrades.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onToggleGrade(g)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span>ថ្នាក់ទី {g}</span>
                    <span className="text-[10px] opacity-80">{isSelected ? "✓ បង្ហាញ" : "លាក់"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Component Toggle Switches */}
          <div className="space-y-2.5">
            {componentItems.map((item) => {
              const isChecked = config[item.key];
              return (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    isChecked
                      ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onChange(item.key, e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
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
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
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
            {isSaving && <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">⏳ កំពុងរក្សាទុកទៅ Firestore...</span>}
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
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
