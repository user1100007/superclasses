import { ScoreMap, Student, TeacherProfile } from "../../types";

export type SchoolReportMode = "semester" | "baseline_test" | "annual" | "monthly_grades";

export interface ClassAnnualStat {
  className: string;
  gradeLevel: string; // "1", "2", "3", "4", "5", "6", "other"
  totalEnrolled: number;
  femaleEnrolled: number;
  passAvgTotal: number;
  passAvgFemale: number;
  failAvgTotal: number;
  failAvgFemale: number;
}

export interface ClassGradeStat {
  className: string;
  totalStudents: number;
  femaleStudents: number;
  gradeCounts: { A: number; B: number; C: number; D: number; E: number; F: number };
  femaleGradeCounts: { A: number; B: number; C: number; D: number; E: number; F: number };
  avgScore: number | null;
  loading: boolean;
}

export interface SchoolReportAdjustments {
  // Semester adjustments
  semNewEnrolledTotal?: number;
  semNewEnrolledFemale?: number;
  semDropoutTotal?: number;
  semDropoutFemale?: number;
  semOtherTotal?: number;
  semOtherFemale?: number;

  // Baseline test adjustments
  baselineFailedTotal?: number;
  baselineFailedFemale?: number;
  baselineTestedTotal?: number;
  baselineTestedFemale?: number;
  baselinePassedTotal?: number;
  baselinePassedFemale?: number;
  baselineRepeatTotal?: number;
  baselineRepeatFemale?: number;

  // Annual adjustments
  retestPassedTotal?: number;
  retestPassedFemale?: number;
  dropoutTotal?: number;
  dropoutFemale?: number;
}

export interface SchoolReportDisplayConfig {
  showSemesterTable: boolean;
  showBaselineTable: boolean;
  showAnnualTable: boolean;
  showMonthlyGradesTable: boolean;
  showPerformanceCharts: boolean;
  showStudentSummaries: boolean;
  showAttendanceRecords: boolean;
  showSummaryCards: boolean;
  showSignatures: boolean;
}

export const DEFAULT_SCHOOL_REPORT_CONFIG: SchoolReportDisplayConfig = {
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

export interface SchoolPriReportDisplayConfig {
  showPriTable: boolean;
  showPriCharts: boolean;
  showGradeSummaries: boolean;
  showAttendanceRecords: boolean;
  showSchoolSeal: boolean;
  enabledGrades: string[]; // ["1", "2", "3", "4", "5", "6"]
}

export const DEFAULT_PRI_REPORT_CONFIG: SchoolPriReportDisplayConfig = {
  showPriTable: true,
  showPriCharts: true,
  showGradeSummaries: true,
  showAttendanceRecords: true,
  showSchoolSeal: true,
  enabledGrades: ["1", "2", "3", "4", "5", "6"],
};

export interface TopStudentItem {
  id: string;
  name: string;
  gender: string;
  className: string;
  gradeLevel: string;
  avgScore: number;
  gradeLetter: string;
  photoUrl?: string;
}

export interface ClassAttendanceStat {
  className: string;
  gradeLevel: string;
  totalStudents: number;
  presentRate: number;
  totalPermissions: number;
  totalUnexcused: number;
  totalDaysRecorded: number;
}

export interface SchoolReportProps {
  teacher: TeacherProfile | null;
  selClass?: string | null;
  currentStudents?: Student[];
  currentScoresMap?: Record<string, ScoreMap>;
  allMonthsScores?: Record<string, Record<string, ScoreMap>>;
}
