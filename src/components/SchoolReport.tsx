import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { CLASSES, SEMESTERS, gradeOf, getAvg } from "../lib/constants";
import { Student, ScoreMap, TeacherProfile } from "../types";
import {
  SchoolReportMode,
  ClassAnnualStat,
  ClassGradeStat,
  SchoolReportAdjustments,
  SchoolReportProps,
  SchoolReportDisplayConfig,
  DEFAULT_SCHOOL_REPORT_CONFIG,
  TopStudentItem,
  ClassAttendanceStat,
} from "./SchoolReports/types";
import { SemesterReportTable } from "./SchoolReports/SemesterReportTable";
import { BaselineTestReportTable } from "./SchoolReports/BaselineTestReportTable";
import { AnnualReportTable } from "./SchoolReports/AnnualReportTable";
import { MonthlyGradesReportTable } from "./SchoolReports/MonthlyGradesReportTable";
import { SchoolPerformanceCharts } from "./SchoolReports/SchoolPerformanceCharts";
import { SchoolStudentSummaries } from "./SchoolReports/SchoolStudentSummaries";
import { SchoolAttendanceSummary } from "./SchoolReports/SchoolAttendanceSummary";
import { ReportConfigPanel } from "./SchoolReports/ReportConfigPanel";

export const SchoolReport: React.FC<SchoolReportProps> = ({
  teacher,
  selClass,
  currentStudents,
  currentScoresMap,
  allMonthsScores,
}) => {
  // Main view mode:
  const [reportMode, setReportMode] = useState<SchoolReportMode>("semester");

  // Settings & Toggles
  const [groupingMode, setGroupingMode] = useState<"grade" | "class">("grade");
  const [useKhmerNums, setUseKhmerNums] = useState<boolean>(false);
  const [isEditingAdjustments, setIsEditingAdjustments] = useState<boolean>(false);
  const [sig1Role, setSig1Role] = useState<string>("អ្នករៀបចំរបាយការណ៍");
  const [dateMode, setDateMode] = useState<"auto" | "dots">("auto");

  // Monthly Grades Report Settings
  const [semesterId, setSemesterId] = useState<string>("s1");
  const [selMonth, setSelMonth] = useState<number>(3); // Default March / មីនា

  // Configuration Panel State
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [displayConfig, setDisplayConfig] = useState<SchoolReportDisplayConfig>(() => {
    try {
      const saved = localStorage.getItem("school_report_display_config_v2");
      return saved ? JSON.parse(saved) : DEFAULT_SCHOOL_REPORT_CONFIG;
    } catch {
      return DEFAULT_SCHOOL_REPORT_CONFIG;
    }
  });

  // Custom adjustments for retest, dropouts, baseline tests, transfers
  const [adjustments, setAdjustments] = useState<Record<string, SchoolReportAdjustments>>(() => {
    try {
      const saved = localStorage.getItem("school_report_adjustments_v2");
      if (saved) return JSON.parse(saved);
      const v1 = localStorage.getItem("school_report_adjustments_v1");
      return v1 ? JSON.parse(v1) : {};
    } catch {
      return {};
    }
  });

  // Data States
  const [classAnnualStats, setClassAnnualStats] = useState<ClassAnnualStat[]>([]);
  const [classMonthlyStats, setClassMonthlyStats] = useState<ClassGradeStat[]>([]);
  const [topStudentsList, setTopStudentsList] = useState<TopStudentItem[]>([]);
  const [slowLearnersList, setSlowLearnersList] = useState<TopStudentItem[]>([]);
  const [attendanceStatsList, setAttendanceStatsList] = useState<ClassAttendanceStat[]>([]);
  const [loadingAll, setLoadingAll] = useState<boolean>(false);

  // 1. Fetch Configuration from Firestore on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configKey = teacher?.email ? `school_report_${teacher.email}` : "school_report_default";
        const docRef = doc(db, "reportConfigurations", configKey);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data()?.components) {
          const loaded = { ...DEFAULT_SCHOOL_REPORT_CONFIG, ...snap.data().components };
          setDisplayConfig(loaded);
          localStorage.setItem("school_report_display_config_v2", JSON.stringify(loaded));
        }
      } catch (err) {
        console.warn("Could not load school report configuration from Firestore:", err);
      }
    };
    fetchConfig();
  }, [teacher?.email]);

  // 2. Save Configuration to Firestore
  const handleSaveConfigToFirestore = async () => {
    setIsSavingConfig(true);
    setSaveSuccess(false);
    try {
      const configKey = teacher?.email ? `school_report_${teacher.email}` : "school_report_default";
      const docRef = doc(db, "reportConfigurations", configKey);
      await setDoc(
        docRef,
        {
          reportType: "school_report",
          teacherEmail: teacher?.email || "default",
          schoolId: teacher?.schoolID || teacher?.school || "default",
          components: displayConfig,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      localStorage.setItem("school_report_display_config_v2", JSON.stringify(displayConfig));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save report configuration to Firestore:", err);
      alert("មានបញ្ហាក្នុងការរក្សាទុកការកំណត់ទៅ Firestore");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleConfigToggle = (key: keyof SchoolReportDisplayConfig, value: boolean) => {
    setDisplayConfig((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem("school_report_display_config_v2", JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetDefaultConfig = () => {
    setDisplayConfig(DEFAULT_SCHOOL_REPORT_CONFIG);
    localStorage.setItem("school_report_display_config_v2", JSON.stringify(DEFAULT_SCHOOL_REPORT_CONFIG));
  };

  const handleSelectAllConfig = () => {
    const allTrue: SchoolReportDisplayConfig = {
      showSemesterTable: true,
      showBaselineTable: true,
      showAnnualTable: true,
      showMonthlyGradesTable: true,
      showPerformanceCharts: true,
      showStudentSummaries: true,
      showAttendanceRecords: true,
      showSummaryCards: true,
      showSignatures: true,
    };
    setDisplayConfig(allTrue);
    localStorage.setItem("school_report_display_config_v2", JSON.stringify(allTrue));
  };

  // Fetch all classes data from Firestore
  const fetchAllSchoolData = async () => {
    setLoadingAll(true);
    const annStats: ClassAnnualStat[] = [];
    const monStats: ClassGradeStat[] = [];
    const allStudentsForSummary: TopStudentItem[] = [];
    const attStats: ClassAttendanceStat[] = [];

    for (const cls of CLASSES) {
      try {
        let students: Student[] = [];
        if (cls === selClass && currentStudents && currentStudents.length > 0) {
          students = currentStudents;
        } else {
          const stuSnap = await getDocs(collection(db, "classes", cls, "students"));
          stuSnap.forEach((docSnap) => {
            students.push({ id: docSnap.id, ...docSnap.data() } as Student);
          });
        }

        const gradeLevel = cls.replace(/[^0-9]/g, "") || "other";
        const femaleEnrolled = students.filter((s) => s.gender === "ស្រី").length;
        const totalEnrolled = students.length;

        // Fetch attendance for class
        let permCount = 0;
        let unexCount = 0;
        let daysCount = 0;
        try {
          const attSnap = await getDocs(
            collection(db, "classes", cls, "semesters", semesterId, "months", String(selMonth), "attendance")
          );
          attSnap.forEach((d) => {
            const days = d.data().days || {};
            Object.values(days).forEach((status) => {
              daysCount++;
              if (status === "P") permCount++;
              if (status === "A") unexCount++;
            });
          });
        } catch {
          // No attendance logged yet
        }

        const presentRate = daysCount > 0 ? Math.round(((daysCount - (permCount + unexCount)) / daysCount) * 100) : 98;
        attStats.push({
          className: cls,
          gradeLevel,
          totalStudents: totalEnrolled,
          presentRate,
          totalPermissions: permCount,
          totalUnexcused: unexCount,
          totalDaysRecorded: daysCount,
        });

        if (totalEnrolled === 0) {
          annStats.push({
            className: cls,
            gradeLevel,
            totalEnrolled: 0,
            femaleEnrolled: 0,
            passAvgTotal: 0,
            passAvgFemale: 0,
            failAvgTotal: 0,
            failAvgFemale: 0,
          });
          monStats.push({
            className: cls,
            totalStudents: 0,
            femaleStudents: 0,
            gradeCounts: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
            femaleGradeCounts: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
            avgScore: null,
            loading: false,
          });
          continue;
        }

        // Monthly Score Fetching
        let monthlyScoresMap: Record<string, ScoreMap> = {};
        if (cls === selClass && currentScoresMap) {
          monthlyScoresMap = currentScoresMap;
        } else {
          try {
            const mSnap = await getDocs(
              collection(db, "classes", cls, "semesters", semesterId, "months", String(selMonth), "scores")
            );
            mSnap.forEach((docSnap) => {
              monthlyScoresMap[docSnap.id] = docSnap.data().scores || {};
            });
          } catch (e) {
            console.warn(`Monthly scores fetch failed for ${cls}`, e);
          }
        }

        const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
        const femaleCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
        let sumAvgs = 0;
        let countAvgs = 0;

        students.forEach((s) => {
          const avg = getAvg(s.id, students, monthlyScoresMap);
          if (avg > 0 || Object.keys(monthlyScoresMap[s.id] || {}).length > 0) {
            sumAvgs += avg;
            countAvgs++;
            const g = gradeOf(avg).l as "A" | "B" | "C" | "D" | "E" | "F";
            if (counts[g] !== undefined) {
              counts[g]++;
              if (s.gender === "ស្រី") femaleCounts[g]++;
            }

            allStudentsForSummary.push({
              id: s.id,
              name: `${s.lastName} ${s.firstName}`,
              gender: s.gender || "ប្រុស",
              className: cls,
              gradeLevel,
              avgScore: avg,
              gradeLetter: g,
              photoUrl: s.photoUrl,
            });
          }
        });

        monStats.push({
          className: cls,
          totalStudents: totalEnrolled,
          femaleStudents: femaleEnrolled,
          gradeCounts: counts,
          femaleGradeCounts: femaleCounts,
          avgScore: countAvgs > 0 ? sumAvgs / countAvgs : null,
          loading: false,
        });

        // Annual Score Fetching
        let annualScoresMap: Record<string, ScoreMap> = {};
        const fetchMonthScores = async (sem: string, m: number) => {
          try {
            const snap = await getDocs(
              collection(db, "classes", cls, "semesters", sem, "months", String(m), "scores")
            );
            const map: Record<string, ScoreMap> = {};
            snap.forEach((d) => (map[d.id] = d.data().scores || {}));
            return map;
          } catch {
            return {};
          }
        };

        const [s2_8, s2_7, s2_6, s1_3] = await Promise.all([
          fetchMonthScores("s2", 8),
          fetchMonthScores("s2", 7),
          fetchMonthScores("s2", 6),
          fetchMonthScores("s1", 3),
        ]);

        annualScoresMap = { ...s1_3, ...s2_6, ...s2_7, ...s2_8 };

        if (cls === selClass) {
          if (allMonthsScores) {
            Object.keys(allMonthsScores).forEach((mKey) => {
              annualScoresMap = { ...annualScoresMap, ...allMonthsScores[mKey] };
            });
          }
          if (currentScoresMap) {
            annualScoresMap = { ...annualScoresMap, ...currentScoresMap };
          }
        }

        let passAvgTotal = 0;
        let passAvgFemale = 0;
        let failAvgTotal = 0;
        let failAvgFemale = 0;

        students.forEach((s) => {
          const avg = getAvg(s.id, students, annualScoresMap);
          const isFemale = s.gender === "ស្រី";
          const hasScore = Object.keys(annualScoresMap[s.id] || {}).length > 0;
          const passed = hasScore ? avg >= 5.0 : true;

          if (passed) {
            passAvgTotal++;
            if (isFemale) passAvgFemale++;
          } else {
            failAvgTotal++;
            if (isFemale) failAvgFemale++;
          }
        });

        annStats.push({
          className: cls,
          gradeLevel,
          totalEnrolled,
          femaleEnrolled,
          passAvgTotal,
          passAvgFemale,
          failAvgTotal,
          failAvgFemale,
        });
      } catch (err) {
        console.warn(`Error processing class ${cls}:`, err);
      }
    }

    // Sort Top Students & Slow learners
    const sorted = [...allStudentsForSummary].sort((a, b) => b.avgScore - a.avgScore);
    const top = sorted.filter((s) => s.avgScore >= 8.0);
    const slow = sorted.filter((s) => s.avgScore < 5.0).reverse();

    setTopStudentsList(top.length > 0 ? top : sorted.slice(0, 10));
    setSlowLearnersList(slow);
    setAttendanceStatsList(attStats);
    setClassAnnualStats(annStats);
    setClassMonthlyStats(monStats);
    setLoadingAll(false);
  };

  useEffect(() => {
    fetchAllSchoolData();
  }, [semesterId, selMonth]);

  // Handle saving adjustments
  const handleAdjustmentChange = (key: string, field: keyof SchoolReportAdjustments, val: number) => {
    setAdjustments((prev) => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          [field]: Math.max(0, val),
        },
      };
      try {
        localStorage.setItem("school_report_adjustments_v2", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save adjustments", e);
      }
      return updated;
    });
  };

  // Determine available tabs based on configuration
  const enabledTabs = useMemo(() => {
    const tabs: { mode: SchoolReportMode; label: string; icon: string }[] = [];
    if (displayConfig.showSemesterTable) {
      tabs.push({ mode: "semester", label: "១. លទ្ធផលសិក្សាឆមាស", icon: "📘" });
    }
    if (displayConfig.showBaselineTable) {
      tabs.push({ mode: "baseline_test", label: "២. តេស្តដើមឆ្នាំ", icon: "🧪" });
    }
    if (displayConfig.showAnnualTable) {
      tabs.push({ mode: "annual", label: "៣. ដំណាច់ឆ្នាំ", icon: "📑" });
    }
    if (displayConfig.showMonthlyGradesTable) {
      tabs.push({ mode: "monthly_grades", label: "៤. ស្ថិតិនិទ្ទេស (A-F)", icon: "📊" });
    }
    return tabs;
  }, [displayConfig]);

  // Auto-switch mode if current tab is disabled
  useEffect(() => {
    if (enabledTabs.length > 0 && !enabledTabs.some((t) => t.mode === reportMode)) {
      setReportMode(enabledTabs[0].mode);
    }
  }, [enabledTabs, reportMode]);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-5">
      {/* Configuration Modal Drawer */}
      <ReportConfigPanel
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={displayConfig}
        onChange={handleConfigToggle}
        onSaveToFirestore={handleSaveConfigToFirestore}
        onResetDefault={handleResetDefaultConfig}
        onSelectAll={handleSelectAllConfig}
        isSaving={isSavingConfig}
        saveSuccess={saveSuccess}
      />

      {/* Top Header & Selector Tabs + Config Trigger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs no-print flex flex-wrap justify-between items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
              🏫 របាយការណ៍សាលារៀន (School Academic Reports)
            </h2>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="កំណត់ការបង្ហាញតារាង និងសមាសភាគ"
            >
              <span>⚙️</span>
              <span>កំណត់ការបង្ហាញ</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {teacher?.school || "សាលាបឋមសិក្សា"} — តារាងលទ្ធផលសិក្សាឆមាស, តេស្តដើមឆ្នាំ, ដំណាច់ឆ្នាំ, ស្ថិតិនិទ្ទេស និងកំណត់ត្រាវត្តមាន
          </p>
        </div>

        {/* View Mode Selector Tabs */}
        {enabledTabs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {enabledTabs.map((tab) => (
              <button
                key={tab.mode}
                onClick={() => setReportMode(tab.mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  reportMode === tab.mode
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Global Toolbar for Grouping, Khmer numbers, Signatory, and Refresh */}
      {reportMode !== "monthly_grades" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs no-print flex flex-wrap justify-between items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Grouping Mode */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-bold">
              <span className="text-slate-500 text-[11px] pl-1">ការបង្ហាញ:</span>
              <button
                onClick={() => setGroupingMode("grade")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  groupingMode === "grade"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                }`}
              >
                ថ្នាក់ទី ១ ដល់ ៦
              </button>
              <button
                onClick={() => setGroupingMode("class")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  groupingMode === "class"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                }`}
              >
                តាមបន្ទប់ (1A, 1B...)
              </button>
            </div>

            {/* Number Format Toggle */}
            <button
              onClick={() => setUseKhmerNums(!useKhmerNums)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                useKhmerNums
                  ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200"
                  : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <span>{useKhmerNums ? "🇰🇭 លេខខ្មែរ (១២៣)" : "🔢 លេខសកល (123)"}</span>
            </button>

            {/* Signatory #1 Role Selector */}
            {displayConfig.showSignatures && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-400 text-[11px] pl-1">✍️ ហត្ថលេខាទី១:</span>
                <select
                  value={sig1Role}
                  onChange={(e) => setSig1Role(e.target.value)}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1 text-xs font-bold outline-none"
                >
                  <option value="អ្នករៀបចំរបាយការណ៍">អ្នករៀបចំរបាយការណ៍</option>
                  <option value="គ្រូប្រចាំថ្នាក់">គ្រូប្រចាំថ្នាក់</option>
                  <option value="មន្ត្រីការិយាល័យ">មន្ត្រីការិយាល័យ</option>
                  <option value="លេខាធិការ">លេខាធិការ</option>
                  <option value="បេឡាធិការ">បេឡាធិការ</option>
                  <option value="ហេរញ្ញិក">ហេរញ្ញិក</option>
                </select>
              </div>
            )}

            {/* Date Format Selector */}
            {displayConfig.showSignatures && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-400 text-[11px] pl-1">📅 កាលបរិច្ឆេទ:</span>
                <select
                  value={dateMode}
                  onChange={(e) => setDateMode(e.target.value as "auto" | "dots")}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1 text-xs font-bold outline-none"
                >
                  <option value="auto">ស្វ័យប្រវត្តិ (តាមខែ)</option>
                  <option value="dots">ចុចជួរ (... បោះពុម្ព)</option>
                </select>
              </div>
            )}

            {/* Adjustment mode button */}
            <button
              onClick={() => setIsEditingAdjustments(!isEditingAdjustments)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                isEditingAdjustments
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <span>✏️ {isEditingAdjustments ? "រួចរាល់ (Done)" : "កែសម្រួលទិន្នន័យបន្ថែម"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAllSchoolData}
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              🔄 ធ្វើបច្ចុប្បន្នភាព
            </button>
          </div>
        </div>
      )}

      {loadingAll ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 space-y-2">
          <div className="text-3xl animate-spin inline-block">⏳</div>
          <div className="text-sm font-semibold">កំពុងទាញយកទិន្នន័យគ្រប់ថ្នាក់ទាំងអស់ពី Firestore...</div>
        </div>
      ) : (
        <>
          {/* 1. SEMESTER REPORT TABLE */}
          {reportMode === "semester" && displayConfig.showSemesterTable && (
            <SemesterReportTable
              teacher={teacher}
              classStats={classAnnualStats}
              adjustments={adjustments}
              onAdjustmentChange={handleAdjustmentChange}
              groupingMode={groupingMode}
              useKhmerNums={useKhmerNums}
              sig1Role={sig1Role}
              dateMode={dateMode}
              isEditingAdjustments={isEditingAdjustments}
            />
          )}

          {/* 2. BASELINE TEST REPORT TABLE */}
          {reportMode === "baseline_test" && displayConfig.showBaselineTable && (
            <BaselineTestReportTable
              teacher={teacher}
              classStats={classAnnualStats}
              adjustments={adjustments}
              onAdjustmentChange={handleAdjustmentChange}
              groupingMode={groupingMode}
              useKhmerNums={useKhmerNums}
              sig1Role={sig1Role}
              dateMode={dateMode}
              isEditingAdjustments={isEditingAdjustments}
            />
          )}

          {/* 3. ANNUAL REPORT TABLE */}
          {reportMode === "annual" && displayConfig.showAnnualTable && (
            <AnnualReportTable
              teacher={teacher}
              classStats={classAnnualStats}
              adjustments={adjustments}
              onAdjustmentChange={handleAdjustmentChange}
              groupingMode={groupingMode}
              useKhmerNums={useKhmerNums}
              sig1Role={sig1Role}
              dateMode={dateMode}
              isEditingAdjustments={isEditingAdjustments}
            />
          )}

          {/* 4. MONTHLY GRADES REPORT TABLE */}
          {reportMode === "monthly_grades" && displayConfig.showMonthlyGradesTable && (
            <MonthlyGradesReportTable
              teacher={teacher}
              classStats={classMonthlyStats}
              semesterId={semesterId}
              onSemesterChange={setSemesterId}
              selMonth={selMonth}
              onMonthChange={setSelMonth}
              sig1Role={sig1Role}
              dateMode={dateMode}
            />
          )}

          {/* 5. PERFORMANCE CHARTS (When enabled) */}
          {displayConfig.showPerformanceCharts && (
            <div className="pt-2">
              <SchoolPerformanceCharts
                annualStats={classAnnualStats}
                gradeStats={classMonthlyStats}
                useKhmerNums={useKhmerNums}
              />
            </div>
          )}

          {/* 6. INDIVIDUAL STUDENT SUMMARIES (When enabled) */}
          {displayConfig.showStudentSummaries && (
            <div className="pt-2">
              <SchoolStudentSummaries
                topStudents={topStudentsList}
                slowLearners={slowLearnersList}
                useKhmerNums={useKhmerNums}
              />
            </div>
          )}

          {/* 7. SCHOOL ATTENDANCE SUMMARY (When enabled) */}
          {displayConfig.showAttendanceRecords && (
            <div className="pt-2">
              <SchoolAttendanceSummary
                attendanceStats={attendanceStatsList}
                useKhmerNums={useKhmerNums}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
