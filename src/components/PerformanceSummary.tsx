import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { Student, ScoreMap, TeacherProfile } from "../types";
import {
  SUBJECTS,
  SEMESTERS,
  MONTHS,
  gradeOf,
  resultOf,
  fmtAvg,
  toKhNum,
  truncate2,
  computeReportStats,
  getThreeWorkingDates,
} from "../lib/constants";
import { printHTML } from "../lib/printUtils";

interface PerformanceSummaryProps {
  students: Student[];
  allMonthsScores: Record<string, Record<string, ScoreMap>>;
  scoresMap: Record<string, ScoreMap>;
  selClass: string;
  teacher?: TeacherProfile | null;
  honorPhotos?: Record<string, string>;
  onFetchAllMonths?: () => void;
}

export interface StudentPerformance {
  student: Student;
  rank: number;
  s1Avg: number | null;
  s2Avg: number | null;
  cumAvg: number;
  grade: { l: string; c: string };
  result: "ជាប់" | "ធ្លាក់";
  subjectAvgs: Record<string, number | null>;
  subjectCount: number;
  trend: "up" | "down" | "neutral" | "none";
  trendDiff: number;
}

/**
 * Calculates the percentile rank of a score among an array of scores.
 * Standard Formula: PR = ((count(score < x) + 0.5 * count(score === x)) / totalCount) * 100
 */
export function calculatePercentileRank(
  targetScore: number | null | undefined,
  allScores: (number | null | undefined)[]
): number | null {
  if (targetScore === null || targetScore === undefined || isNaN(targetScore)) return null;
  const validScores = allScores.filter((s): s is number => s !== null && s !== undefined && !isNaN(s));
  if (validScores.length === 0) return null;
  if (validScores.length === 1) return 100;

  let strictlyBelow = 0;
  let equalTo = 0;

  for (const s of validScores) {
    if (s < targetScore) strictlyBelow++;
    else if (s === targetScore) equalTo++;
  }

  const pr = ((strictlyBelow + 0.5 * equalTo) / validScores.length) * 100;
  return Math.min(100, Math.max(0, Math.round(pr)));
}

/**
 * Returns tier information and styling for a percentile rank.
 */
export function getPercentileTier(pr: number | null): {
  tierKey: "top10" | "q4" | "q3" | "q2" | "q1" | "none";
  label: string;
  shortLabel: string;
  tierLabelKh: string;
  icon: string;
  badgeClass: string;
  bgClass: string;
  textClass: string;
  barColor: string;
  description: string;
} {
  if (pr === null) {
    return {
      tierKey: "none",
      label: "គ្មានទិន្នន័យ",
      shortLabel: "—",
      tierLabelKh: "គ្មានទិន្នន័យ",
      icon: "—",
      badgeClass: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      bgClass: "bg-slate-50 dark:bg-slate-800/40",
      textClass: "text-slate-500",
      barColor: "#94a3b8",
      description: "មិនទាន់មានពិន្ទុ",
    };
  }
  if (pr >= 90) {
    return {
      tierKey: "top10",
      label: "🏆 កំពូល ១០% (ឆ្នើមខ្លាំង)",
      shortLabel: "កំពូល ១០%",
      tierLabelKh: "កំពូល ១០%",
      icon: "🏆",
      badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700",
      bgClass: "bg-amber-50/70 dark:bg-amber-950/20",
      textClass: "text-amber-700 dark:text-amber-300",
      barColor: "#f59e0b",
      description: `ខ្ពស់ជាង ${toKhNum(pr)}% នៃមិត្តរួមថ្នាក់`,
    };
  }
  if (pr >= 75) {
    return {
      tierKey: "q4",
      label: "🌟 កម្រិតខ្ពស់ (Q4 / ៧៥-៨៩%)",
      shortLabel: "កម្រិតខ្ពស់",
      tierLabelKh: "កម្រិតខ្ពស់ Q4",
      icon: "🌟",
      badgeClass: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700",
      bgClass: "bg-emerald-50/70 dark:bg-emerald-950/20",
      textClass: "text-emerald-700 dark:text-emerald-300",
      barColor: "#10b981",
      description: `ខ្ពស់ជាង ${toKhNum(pr)}% នៃមិត្តរួមថ្នាក់`,
    };
  }
  if (pr >= 50) {
    return {
      tierKey: "q3",
      label: "🔷 មធ្យមលើ (Q3 / ៥០-៧៤%)",
      shortLabel: "មធ្យមលើ",
      tierLabelKh: "មធ្យមលើ Q3",
      icon: "🔷",
      badgeClass: "bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700",
      bgClass: "bg-blue-50/70 dark:bg-blue-950/20",
      textClass: "text-blue-700 dark:text-blue-300",
      barColor: "#3b82f6",
      description: `ខ្ពស់ជាង ${toKhNum(pr)}% នៃមិត្តរួមថ្នាក់`,
    };
  }
  if (pr >= 25) {
    return {
      tierKey: "q2",
      label: "🔶 មធ្យមក្រោម (Q2 / ២៥-៤៩%)",
      shortLabel: "មធ្យមក្រោម",
      tierLabelKh: "មធ្យមក្រោម Q2",
      icon: "🔶",
      badgeClass: "bg-orange-100 text-orange-900 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-700",
      bgClass: "bg-orange-50/70 dark:bg-orange-950/20",
      textClass: "text-orange-700 dark:text-orange-300",
      barColor: "#f97316",
      description: `ខ្ពស់ជាង ${toKhNum(pr)}% នៃមិត្តរួមថ្នាក់`,
    };
  }
  return {
    tierKey: "q1",
    label: "⚠️ ត្រូវការគាំទ្រ (Q1 / < ២៥%)",
    shortLabel: "ត្រូវការគាំទ្រ",
    tierLabelKh: "ត្រូវការគាំទ្រ Q1",
    icon: "⚠️",
    badgeClass: "bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700",
    bgClass: "bg-rose-50/70 dark:bg-rose-950/20",
    textClass: "text-rose-700 dark:text-rose-300",
    barColor: "#ef4444",
    description: `ស្ថិតក្នុងក្រុម ២៥% ក្រោមគេ`,
  };
}

export const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({
  students,
  allMonthsScores,
  scoresMap,
  selClass,
  teacher,
  honorPhotos = {},
  onFetchAllMonths,
}) => {
  // Active Tab View within Performance Summary
  const [activeTab, setActiveTab] = useState<"ranking" | "matrix" | "progress" | "top5" | "analytics">("ranking");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | "ប្រុស" | "ស្រី">("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"rank" | "name" | "s1" | "s2" | "cum">("rank");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [displayMode, setDisplayMode] = useState<"avg" | "grade" | "percentile">("avg");

  // Selected Student Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentPerformance | null>(null);

  // Subject Progress Line Chart & Percentile Rank States
  const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECTS[0] || "សមត្ថភាពអាន");
  const [chartStudentSelection, setChartStudentSelection] = useState<"top5" | "low5" | "custom" | "classOnly">("top5");
  const [customSelectedStudentIds, setCustomSelectedStudentIds] = useState<string[]>([]);
  const [showBenchmark, setShowBenchmark] = useState<boolean>(true);
  const [showClassAvg, setShowClassAvg] = useState<boolean>(true);
  const [studentSearchInChart, setStudentSearchInChart] = useState<string>("");

  // Percentile Rank View Toggle States
  const [showPercentileRank, setShowPercentileRank] = useState<boolean>(false);
  const [percentileTierFilter, setPercentileTierFilter] = useState<"all" | "top10" | "q4" | "q3" | "q2" | "q1">("all");
  const [percentileSearchTerm, setPercentileSearchTerm] = useState<string>("");

  // Color Palette for Student Lines in Recharts
  const STUDENT_COLORS = [
    "#2563eb", // blue
    "#16a34a", // emerald
    "#d97706", // amber
    "#dc2626", // red
    "#9333ea", // purple
    "#0891b2", // cyan
    "#db2777", // pink
    "#4f46e5", // indigo
    "#ea580c", // orange
    "#059669", // teal
  ];

  // Trigger fetch of all months on mount if not loaded
  React.useEffect(() => {
    if (onFetchAllMonths) {
      onFetchAllMonths();
    }
  }, [onFetchAllMonths]);

  // 1. Compute Cumulative Scores and Averages per Student
  const performanceData = useMemo(() => {
    if (!students || students.length === 0) return [];

    const s1Months = SEMESTERS.find((s) => s.id === "s1")?.months || [0, 1, 2, 3];
    const s2Months = SEMESTERS.find((s) => s.id === "s2")?.months || [6, 7, 8];

    const calculateStudentPerformance = (s: Student): StudentPerformance => {
      const subjectScoresSum: Record<string, number> = {};
      const subjectScoresCount: Record<string, number> = {};

      SUBJECTS.forEach((subj) => {
        subjectScoresSum[subj] = 0;
        subjectScoresCount[subj] = 0;
      });

      // Track monthly averages for S1 and S2
      const s1MonthAvgs: number[] = [];
      const s2MonthAvgs: number[] = [];

      // Process S1 Months
      s1Months.forEach((mIdx) => {
        const key = `s1_${mIdx}`;
        const monthScores = allMonthsScores[key]?.[s.id] || (mIdx === 3 ? scoresMap[s.id] : undefined);
        if (monthScores) {
          let mSum = 0;
          let mCount = 0;
          SUBJECTS.forEach((subj) => {
            const v = monthScores[subj];
            if (v !== undefined && v !== "" && v !== null && !isNaN(Number(v))) {
              const num = Number(v);
              subjectScoresSum[subj] += num;
              subjectScoresCount[subj] += 1;
              mSum += num;
              mCount += 1;
            }
          });
          if (mCount > 0) {
            s1MonthAvgs.push(mSum / mCount);
          }
        }
      });

      // Process S2 Months
      s2Months.forEach((mIdx) => {
        const key = `s2_${mIdx}`;
        const monthScores = allMonthsScores[key]?.[s.id] || (mIdx === 7 ? scoresMap[s.id] : undefined);
        if (monthScores) {
          let mSum = 0;
          let mCount = 0;
          SUBJECTS.forEach((subj) => {
            const v = monthScores[subj];
            if (v !== undefined && v !== "" && v !== null && !isNaN(Number(v))) {
              const num = Number(v);
              subjectScoresSum[subj] += num;
              subjectScoresCount[subj] += 1;
              mSum += num;
              mCount += 1;
            }
          });
          if (mCount > 0) {
            s2MonthAvgs.push(mSum / mCount);
          }
        }
      });

      // Also check fallback scoresMap if no month data was found
      if (s1MonthAvgs.length === 0 && s2MonthAvgs.length === 0) {
        const curScores = scoresMap[s.id];
        if (curScores) {
          let mSum = 0;
          let mCount = 0;
          SUBJECTS.forEach((subj) => {
            const v = curScores[subj];
            if (v !== undefined && v !== "" && v !== null && !isNaN(Number(v))) {
              const num = Number(v);
              subjectScoresSum[subj] += num;
              subjectScoresCount[subj] += 1;
              mSum += num;
              mCount += 1;
            }
          });
          if (mCount > 0) {
            s1MonthAvgs.push(mSum / mCount);
          }
        }
      }

      // Per-subject averages
      const subjectAvgs: Record<string, number | null> = {};
      let totalValidSubjects = 0;
      let cumSumSubjects = 0;

      SUBJECTS.forEach((subj) => {
        if (subjectScoresCount[subj] > 0) {
          const avg = truncate2(subjectScoresSum[subj] / subjectScoresCount[subj]);
          subjectAvgs[subj] = avg;
          cumSumSubjects += avg;
          totalValidSubjects += 1;
        } else {
          subjectAvgs[subj] = null;
        }
      });

      // S1 Average
      const s1Avg =
        s1MonthAvgs.length > 0
          ? truncate2(s1MonthAvgs.reduce((a, b) => a + b, 0) / s1MonthAvgs.length)
          : null;

      // S2 Average
      const s2Avg =
        s2MonthAvgs.length > 0
          ? truncate2(s2MonthAvgs.reduce((a, b) => a + b, 0) / s2MonthAvgs.length)
          : null;

      // Cumulative Overall Average
      let cumAvg = 0;
      if (s1Avg !== null && s2Avg !== null) {
        cumAvg = truncate2((s1Avg + s2Avg) / 2);
      } else if (s1Avg !== null) {
        cumAvg = s1Avg;
      } else if (s2Avg !== null) {
        cumAvg = s2Avg;
      } else if (totalValidSubjects > 0) {
        cumAvg = truncate2(cumSumSubjects / totalValidSubjects);
      }

      const grade = gradeOf(cumAvg);
      const result = resultOf(cumAvg) as "ជាប់" | "ធ្លាក់";

      // Trend comparison S1 vs S2
      let trend: "up" | "down" | "neutral" | "none" = "none";
      let trendDiff = 0;
      if (s1Avg !== null && s2Avg !== null) {
        trendDiff = truncate2(s2Avg - s1Avg);
        if (trendDiff > 0.1) trend = "up";
        else if (trendDiff < -0.1) trend = "down";
        else trend = "neutral";
      }

      return {
        student: s,
        rank: 0,
        s1Avg,
        s2Avg,
        cumAvg,
        grade,
        result,
        subjectAvgs,
        subjectCount: totalValidSubjects,
        trend,
        trendDiff,
      };
    };

    const list = students.map(calculateStudentPerformance);

    // Sort to determine ranks
    const sortedForRank = [...list].sort((a, b) => {
      const avgB = truncate2(b.cumAvg || 0);
      const avgA = truncate2(a.cumAvg || 0);
      if (avgB !== avgA) return avgB - avgA;
      return (a.student.lastName || "").localeCompare(b.student.lastName || "", "km");
    });
    const rankMap: Record<string, number> = {};

    sortedForRank.forEach((item, index) => {
      const curAvg = truncate2(item.cumAvg || 0);
      const prevAvg = index > 0 ? truncate2(sortedForRank[index - 1].cumAvg || 0) : null;
      if (
        index > 0 &&
        prevAvg !== null &&
        curAvg === prevAvg &&
        curAvg > 0
      ) {
        rankMap[item.student.id] = rankMap[sortedForRank[index - 1].student.id];
      } else {
        rankMap[item.student.id] = index + 1;
      }
    });

    return list.map((item) => ({
      ...item,
      rank: rankMap[item.student.id] || 0,
    }));
  }, [students, allMonthsScores, scoresMap]);

  // 2. Class Summary Metrics
  const classMetrics = useMemo(() => {
    if (!performanceData.length) {
      return {
        total: 0,
        avgCum: "0.00",
        passCount: 0,
        passPct: 0,
        femalePassCount: 0,
        topStudent: null,
        bestSubject: "—",
        lowestSubject: "—",
        gradeCounts: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
      };
    }

    const total = performanceData.length;
    const validCumAvgs = performanceData.map((p) => p.cumAvg).filter((v) => v > 0);
    const avgCumNum =
      validCumAvgs.length > 0
        ? validCumAvgs.reduce((a, b) => a + b, 0) / validCumAvgs.length
        : 0;

    const passList = performanceData.filter((p) => p.result === "ជាប់");
    const femalePass = passList.filter((p) => p.student.gender === "ស្រី").length;
    const passPct = Math.round((passList.length / total) * 100);

    const sortedByRank = [...performanceData].sort((a, b) => a.rank - b.rank);
    const topStudent = sortedByRank[0] || null;

    // Calculate subject averages across class
    const subjTotals: Record<string, { sum: number; count: number }> = {};
    SUBJECTS.forEach((subj) => {
      subjTotals[subj] = { sum: 0, count: 0 };
    });

    performanceData.forEach((p) => {
      SUBJECTS.forEach((subj) => {
        const val = p.subjectAvgs[subj];
        if (val !== null && val !== undefined) {
          subjTotals[subj].sum += val;
          subjTotals[subj].count += 1;
        }
      });
    });

    let maxSubjAvg = -1;
    let bestSubject = "—";
    let minSubjAvg = 999;
    let lowestSubject = "—";

    SUBJECTS.forEach((subj) => {
      const { sum, count } = subjTotals[subj];
      if (count > 0) {
        const avg = sum / count;
        if (avg > maxSubjAvg) {
          maxSubjAvg = avg;
          bestSubject = subj;
        }
        if (avg < minSubjAvg) {
          minSubjAvg = avg;
          lowestSubject = subj;
        }
      }
    });

    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    performanceData.forEach((p) => {
      if (p.grade.l in gradeCounts) {
        gradeCounts[p.grade.l as keyof typeof gradeCounts]++;
      }
    });

    return {
      total,
      avgCum: fmtAvg(avgCumNum),
      passCount: passList.length,
      passPct,
      femalePassCount: femalePass,
      topStudent,
      bestSubject,
      lowestSubject,
      gradeCounts,
    };
  }, [performanceData]);

  // 3. Filtered and Sorted Performance Data for Display
  const filteredData = useMemo(() => {
    return performanceData
      .filter((p) => {
        // Search filter
        const name = `${p.student.lastName || ""} ${p.student.firstName || ""}`.toLowerCase();
        const code = (p.student.code || "").toLowerCase();
        const latin = (p.student.latinName || "").toLowerCase();
        const search = searchTerm.toLowerCase();
        if (search && !name.includes(search) && !code.includes(search) && !latin.includes(search)) {
          return false;
        }

        // Gender filter
        if (genderFilter !== "all" && p.student.gender !== genderFilter) {
          return false;
        }

        // Grade filter
        if (gradeFilter !== "all") {
          if (gradeFilter === "pass" && p.result !== "ជាប់") return false;
          if (gradeFilter === "fail" && p.result !== "ធ្លាក់") return false;
          if (["A", "B", "C", "D", "E", "F"].includes(gradeFilter) && p.grade.l !== gradeFilter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === "rank") comp = a.rank - b.rank;
        else if (sortBy === "cum") comp = b.cumAvg - a.cumAvg;
        else if (sortBy === "s1") comp = (b.s1Avg || 0) - (a.s1Avg || 0);
        else if (sortBy === "s2") comp = (b.s2Avg || 0) - (a.s2Avg || 0);
        else if (sortBy === "name") {
          const nameA = `${a.student.lastName} ${a.student.firstName}`;
          const nameB = `${b.student.lastName} ${b.student.firstName}`;
          comp = nameA.localeCompare(nameB, "km");
        }

        return sortOrder === "asc" ? comp : -comp;
      });
  }, [performanceData, searchTerm, genderFilter, gradeFilter, sortBy, sortOrder]);

  // 3b. Monthly Progress Data Calculation across all fetched months for Selected Subject
  const progressChartData = useMemo(() => {
    const allMonthsList = [
      { sId: "s1", mIdx: 0, label: "ធ្នូ (ឆ១)" },
      { sId: "s1", mIdx: 1, label: "មករា" },
      { sId: "s1", mIdx: 2, label: "កុម្ភៈ" },
      { sId: "s1", mIdx: 3, label: "មីនា (ឆ១)" },
      { sId: "s2", mIdx: 6, label: "មិថុនា (ឆ២)" },
      { sId: "s2", mIdx: 7, label: "កក្កដា" },
      { sId: "s2", mIdx: 8, label: "សីហា (ឆ២)" },
    ];

    return allMonthsList.map(({ sId, mIdx, label }) => {
      const key = `${sId}_${mIdx}`;
      const mScores = allMonthsScores[key] || (mIdx === 3 ? scoresMap : undefined);

      let sum = 0;
      let count = 0;
      let passCount = 0;
      let minScore = 999;
      let maxScore = -1;
      const rawScoresList: number[] = [];
      const studentMap: Record<string, number | null> = {};

      students.forEach((s) => {
        const rawVal = mScores?.[s.id]?.[selectedSubject];
        if (rawVal !== undefined && rawVal !== "" && rawVal !== null && !isNaN(Number(rawVal))) {
          const num = Number(rawVal);
          studentMap[`stu_${s.id}`] = num;
          rawScoresList.push(num);
          sum += num;
          count += 1;
          if (num >= 5.0) passCount += 1;
          if (num > maxScore) maxScore = num;
          if (num < minScore) minScore = num;
        } else {
          studentMap[`stu_${s.id}`] = null;
        }
      });

      // Calculate Percentile Rank for each student in this month for selected subject
      students.forEach((s) => {
        const num = studentMap[`stu_${s.id}`];
        if (num !== null && num !== undefined) {
          studentMap[`stu_pr_${s.id}`] = calculatePercentileRank(num, rawScoresList);
        } else {
          studentMap[`stu_pr_${s.id}`] = null;
        }
      });

      const classAvg = count > 0 ? truncate2(sum / count) : null;
      const passRate = count > 0 ? Math.round((passCount / count) * 100) : null;

      return {
        monthKey: key,
        monthName: MONTHS[mIdx] || `ខែទី${mIdx + 1}`,
        label,
        semester: sId === "s1" ? "ឆមាសទី១" : "ឆមាសទី២",
        classAvg,
        classMedianPR: count > 0 ? 50 : null,
        highest: maxScore >= 0 ? maxScore : null,
        lowest: minScore <= 10 ? minScore : null,
        passRate,
        hasData: count > 0,
        recordedCount: count,
        ...studentMap,
      };
    });
  }, [students, allMonthsScores, scoresMap, selectedSubject]);

  // Students to display in the line chart based on selection mode
  const studentsToDisplayInChart = useMemo(() => {
    const sorted = [...performanceData].sort((a, b) => a.rank - b.rank);
    if (chartStudentSelection === "top5") {
      return sorted.slice(0, 5);
    } else if (chartStudentSelection === "low5") {
      return [...sorted].reverse().slice(0, 5);
    } else if (chartStudentSelection === "custom") {
      if (customSelectedStudentIds.length > 0) {
        return sorted.filter((p) => customSelectedStudentIds.includes(p.student.id));
      }
      return sorted.slice(0, 3);
    }
    return [];
  }, [performanceData, chartStudentSelection, customSelectedStudentIds]);

  // 3c. Student Percentile Rankings for Selected Subject (across current / cumulative averages)
  const subjectStudentPercentiles = useMemo(() => {
    const allSubjScores = performanceData.map((p) => p.subjectAvgs[selectedSubject]);

    const list = performanceData.map((p) => {
      const rawScore = p.subjectAvgs[selectedSubject];
      const pr = calculatePercentileRank(rawScore, allSubjScores);
      const tier = getPercentileTier(pr);
      return {
        student: p.student,
        performance: p,
        rawScore,
        percentileRank: pr,
        tier,
      };
    });

    // Sort by Percentile Rank (highest first), then by raw score, then overall rank
    return list.sort((a, b) => {
      if (a.percentileRank === null && b.percentileRank === null) return a.performance.rank - b.performance.rank;
      if (a.percentileRank === null) return 1;
      if (b.percentileRank === null) return -1;
      if (b.percentileRank !== a.percentileRank) return b.percentileRank - a.percentileRank;
      return (b.rawScore || 0) - (a.rawScore || 0);
    });
  }, [performanceData, selectedSubject]);

  // Filtered and searched percentile list for display in the Percentile Rank View
  const filteredPercentileList = useMemo(() => {
    return subjectStudentPercentiles.filter((item) => {
      // Tier filter
      if (percentileTierFilter !== "all" && item.tier.tierKey !== percentileTierFilter) {
        return false;
      }
      // Search filter
      if (percentileSearchTerm.trim()) {
        const term = percentileSearchTerm.trim().toLowerCase();
        const fullName = `${item.student.lastName} ${item.student.firstName}`.toLowerCase();
        if (!fullName.includes(term) && !item.student.id.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [subjectStudentPercentiles, percentileTierFilter, percentileSearchTerm]);

  // Subject Percentile Benchmarks & Quartiles
  const subjectPercentileStats = useMemo(() => {
    const validScores = performanceData
      .map((p) => p.subjectAvgs[selectedSubject])
      .filter((s): s is number => s !== null && s !== undefined && !isNaN(s))
      .sort((a, b) => a - b);

    if (validScores.length === 0) {
      return {
        totalStudentsWithScore: 0,
        medianScore: null,
        top10Threshold: null,
        q3Threshold: null,
        q1Threshold: null,
        minScore: null,
        maxScore: null,
        iqr: null,
        top10Count: 0,
        q4Count: 0,
        q3Count: 0,
        q2Count: 0,
        q1Count: 0,
      };
    }

    const n = validScores.length;
    const getPercentileValue = (p: number) => {
      const idx = Math.min(n - 1, Math.max(0, Math.floor(p * n)));
      return validScores[idx];
    };

    const medianScore = getPercentileValue(0.5);
    const top10Threshold = getPercentileValue(0.9);
    const q3Threshold = getPercentileValue(0.75);
    const q1Threshold = getPercentileValue(0.25);
    const minScore = validScores[0];
    const maxScore = validScores[n - 1];
    const iqr = truncate2(q3Threshold - q1Threshold);

    let top10Count = 0;
    let q4Count = 0;
    let q3Count = 0;
    let q2Count = 0;
    let q1Count = 0;

    subjectStudentPercentiles.forEach((item) => {
      if (item.tier.tierKey === "top10") top10Count++;
      else if (item.tier.tierKey === "q4") q4Count++;
      else if (item.tier.tierKey === "q3") q3Count++;
      else if (item.tier.tierKey === "q2") q2Count++;
      else if (item.tier.tierKey === "q1") q1Count++;
    });

    return {
      totalStudentsWithScore: n,
      medianScore,
      top10Threshold,
      q3Threshold,
      q1Threshold,
      minScore,
      maxScore,
      iqr,
      top10Count,
      q4Count,
      q3Count,
      q2Count,
      q1Count,
    };
  }, [performanceData, selectedSubject, subjectStudentPercentiles]);

  // Subject Progress Overall Analytics Insights
  const subjectProgressStats = useMemo(() => {
    const monthsWithData = progressChartData.filter((d) => d.hasData);
    const totalFetchedMonths = monthsWithData.length;

    let firstMonthAvg: number | null = null;
    let latestMonthAvg: number | null = null;
    let firstMonthName = "";
    let latestMonthName = "";

    if (monthsWithData.length > 0) {
      firstMonthAvg = monthsWithData[0].classAvg;
      firstMonthName = monthsWithData[0].label;
      latestMonthAvg = monthsWithData[monthsWithData.length - 1].classAvg;
      latestMonthName = monthsWithData[monthsWithData.length - 1].label;
    }

    let progressDelta = 0;
    if (firstMonthAvg !== null && latestMonthAvg !== null) {
      progressDelta = truncate2(latestMonthAvg - firstMonthAvg);
    }

    // Find student with biggest gain from first recorded month to latest recorded month in this subject
    let mostImprovedStudent: { student: Student; gain: number; start: number; end: number } | null = null;
    let topSubjectStudent: { student: Student; avg: number } | null = null;

    if (monthsWithData.length >= 2) {
      const firstM = monthsWithData[0];
      const lastM = monthsWithData[monthsWithData.length - 1];
      let maxGain = -999;

      students.forEach((s) => {
        const startVal = firstM[`stu_${s.id}`];
        const endVal = lastM[`stu_${s.id}`];
        if (typeof startVal === "number" && typeof endVal === "number") {
          const gain = truncate2(endVal - startVal);
          if (gain > maxGain) {
            maxGain = gain;
            mostImprovedStudent = { student: s, gain, start: startVal, end: endVal };
          }
        }
      });
    }

    // Find highest overall subject average student
    let highestSubjAvg = -1;
    performanceData.forEach((p) => {
      const val = p.subjectAvgs[selectedSubject];
      if (val !== null && val > highestSubjAvg) {
        highestSubjAvg = val;
        topSubjectStudent = { student: p.student, avg: val };
      }
    });

    return {
      totalFetchedMonths,
      firstMonthAvg,
      firstMonthName,
      latestMonthAvg,
      latestMonthName,
      progressDelta,
      mostImprovedStudent,
      topSubjectStudent,
      latestPassRate: monthsWithData.length > 0 ? monthsWithData[monthsWithData.length - 1].passRate : null,
    };
  }, [progressChartData, students, performanceData, selectedSubject]);

  // Custom Tooltip for Recharts Line Chart
  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const dataPoint = payload[0]?.payload;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-2 max-w-sm z-50">
        <div className="border-b border-slate-700/80 pb-1.5 flex items-center justify-between gap-3">
          <span className="font-black text-amber-400">📅 {dataPoint?.label || label}</span>
          <span className="text-[10px] text-slate-300 font-semibold bg-slate-800 px-1.5 py-0.5 rounded">
            {dataPoint?.semester}
          </span>
        </div>

        <div className="text-[11px] font-bold text-blue-300 flex items-center justify-between">
          <span>
            មុខវិជ្ជា: <strong className="text-white">{selectedSubject}</strong>
          </span>
          {showPercentileRank && (
            <span className="text-[10px] font-black text-amber-300 bg-amber-950/60 border border-amber-800 px-1.5 py-0.5 rounded">
              🎯 របៀបបង្ហាញ៖ ចំណាត់ថ្នាក់ភាគរយ %
            </span>
          )}
        </div>

        {dataPoint?.classAvg !== null ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center bg-slate-800/90 px-2 py-1 rounded">
              <span className="text-slate-300 font-bold">
                {showPercentileRank ? "📊 មេដ្យានថ្នាក់ (Median):" : "📊 មធ្យមភាគរួមថ្នាក់:"}
              </span>
              <span className="font-black text-amber-300 text-sm">
                {showPercentileRank ? "៥០%" : fmtAvg(dataPoint.classAvg)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-300 px-1 font-semibold">
              <span>អត្រាជាប់: <strong className="text-emerald-400">{toKhNum(dataPoint.passRate || 0)}%</strong></span>
              <span>មានពិន្ទុ: <strong className="text-white">{toKhNum(dataPoint.recordedCount || 0)} នាក់</strong></span>
            </div>

            <div className="border-t border-slate-800 pt-1 space-y-1.5 max-h-48 overflow-y-auto">
              {payload
                .filter((p: any) => p.dataKey !== "classAvg" && p.dataKey !== "classMedianPR" && p.value !== null && p.value !== undefined)
                .map((entry: any, index: number) => {
                  const studentId = entry.dataKey.replace("stu_pr_", "").replace("stu_", "");
                  const rawScore = dataPoint[`stu_${studentId}`];
                  const prVal = dataPoint[`stu_pr_${studentId}`];
                  const tier = getPercentileTier(prVal);

                  return (
                    <div key={index} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-800/50 last:border-0">
                      <span className="flex items-center gap-1.5 truncate max-w-[170px]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-200 font-bold truncate">{entry.name}</span>
                      </span>

                      <div className="text-right shrink-0">
                        {showPercentileRank ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">ពិន្ទុ: {rawScore !== null ? fmtAvg(rawScore) : "—"}</span>
                            <span className="font-black text-xs px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                              {toKhNum(entry.value)}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm" style={{ color: entry.color }}>
                              {fmtAvg(entry.value)}
                            </span>
                            {prVal !== null && (
                              <span className="text-[9px] text-slate-400 font-semibold">
                                (PR {toKhNum(prVal)}%)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="text-slate-400 italic text-[11px] py-1">មិនទាន់មានទិន្នន័យពិន្ទុសម្រាប់ខែនេះនៅឡើយ</div>
        )}
      </div>
    );
  };

  // 4. Print Printable Performance Summary Report
  const handlePrintReport = () => {
    const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`;
    const school = teacher?.school || "សាលាបឋមសិក្សា";
    const province = teacher?.province || "បន្ទាយមានជ័យ";
    const district = teacher?.district || "ភ្នំស្រុក";

    const rowsHTML = performanceData
      .sort((a, b) => a.rank - b.rank)
      .map((p, idx) => {
        const photo = honorPhotos[p.student.id] || p.student.photoUrl || "";
        const photoTag = photo
          ? `<img src="${photo}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;display:inline-block;vertical-align:middle;margin-right:4px;"/>`
          : "";

        return `
        <tr style="text-align:center;font-size:11px;border-bottom:1px solid #e2e8f0;">
          <td style="padding:5px 4px;font-weight:bold;">${toKhNum(p.rank)}</td>
          <td style="padding:5px 6px;text-align:left;">
            ${photoTag}
            <strong>${p.student.lastName || ""} ${p.student.firstName || ""}</strong>
          </td>
          <td style="padding:5px 4px;">${p.student.gender || "—"}</td>
          <td style="padding:5px 4px;font-weight:600;">${p.s1Avg !== null ? fmtAvg(p.s1Avg) : "—"}</td>
          <td style="padding:5px 4px;font-weight:600;">${p.s2Avg !== null ? fmtAvg(p.s2Avg) : "—"}</td>
          <td style="padding:5px 4px;font-weight:bold;font-size:12px;color:#1e3a5f;background:#f8fafc;">${fmtAvg(p.cumAvg)}</td>
          <td style="padding:5px 4px;font-weight:900;color:${p.grade.c}">${p.grade.l}</td>
          <td style="padding:5px 4px;font-weight:bold;color:${p.result === "ជាប់" ? "#15803d" : "#dc2626"};">${p.result}</td>
        </tr>
      `;
      })
      .join("");

    const dates = getThreeWorkingDates(3);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>សេចក្តីសង្ខេបសមិទ្ធកម្មសិស្ស - ថ្នាក់ទី ${selClass}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700;900&display=swap');
          body { font-family: 'Hanuman', serif; padding: 10mm; color: #000; background: #fff; }
          .header { text-align: center; margin-bottom: 12px; }
          .title { font-size: 18px; font-weight: 900; color: #1e3a5f; margin: 6px 0; }
          .sub { font-size: 13px; font-weight: 700; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #1e3a5f; color: #fff; padding: 6px; font-size: 11px; border: 1px solid #1e3a5f; }
          td { border: 1px solid #cbd5e1; }
          .stats-grid { display: flex; justify-content: space-between; gap: 10px; margin-top: 14px; font-size: 11px; }
          .stat-box { border: 1px solid #94a3b8; padding: 8px; border-radius: 6px; flex: 1; text-align: center; background: #f8fafc; }
          .sig-container { display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size:14px;font-weight:900;">ព្រះរាជាណាចក្រកម្ពុជា<br>ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
          <div style="font-size:11px;margin-top:2px;">꧁ ༺ ༻ ꧂</div>
          <div class="title">របាយការណ៍សង្ខេបសមិទ្ធកម្ម និងចំណាត់ថ្នាក់សិស្ស (Performance Summary)</div>
          <div class="sub">${school} · ថ្នាក់ទី ${selClass} · ឆ្នាំសិក្សា ២០២៥-២០២៦</div>
        </div>

        <div class="stats-grid">
          <div class="stat-box"><strong>សិស្សសរុប</strong><br><span style="font-size:14px;font-weight:bold;">${toKhNum(classMetrics.total)} នាក់</span></div>
          <div class="stat-box"><strong>មធ្យមភាគរួមថ្នាក់</strong><br><span style="font-size:14px;font-weight:bold;color:#2563eb;">${toKhNum(classMetrics.avgCum)}</span></div>
          <div class="stat-box"><strong>អត្រាសិស្សជាប់</strong><br><span style="font-size:14px;font-weight:bold;color:#16a34a;">${toKhNum(classMetrics.passPct)}% (${toKhNum(classMetrics.passCount)} នាក់)</span></div>
          <div class="stat-box"><strong>សិស្សឆ្នើមលេខ១</strong><br><span style="font-size:13px;font-weight:bold;color:#b45309;">${classMetrics.topStudent ? `${classMetrics.topStudent.student.lastName} ${classMetrics.topStudent.student.firstName}` : "—"}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:7%;">ចំណាត់ថ្នាក់</th>
              <th style="width:28%;">គោត្តនាម និងនាមសិស្ស</th>
              <th style="width:8%;">ភេទ</th>
              <th style="width:12%;">ម.ភាគ ឆមាស១</th>
              <th style="width:12%;">ម.ភាគ ឆមាស២</th>
              <th style="width:13%;">ម.ភាគរួមឆ្នាំ</th>
              <th style="width:10%;">និទ្ទេស</th>
              <th style="width:10%;">លទ្ធផល</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>

        <div class="sig-container">
          <div style="text-align:center;width:40%;">
            <div style="font-weight:bold;font-size:12px;">បានឃើញ និងឯកភាព</div>
            <div style="font-size:10px;color:#475569;line-height:1.6;margin-top:2px;">${dates.d2.lunar}</div>
            <div style="font-size:10px;color:#475569;">${(teacher?.village || teacher?.district || district || "រោគ") + " "}${dates.d2.solar}</div>
            <div style="font-weight:bold;margin-top:4px;font-size:11px;">នាយក/នាយិកាសាលា</div>
            <div style="margin-top:45px;">................................................</div>
          </div>
          <div style="text-align:center;width:45%;">
            <div style="font-size:10px;color:#475569;line-height:1.6;margin-top:2px;">${dates.d0.lunar}</div>
            <div style="font-size:10px;color:#475569;">${(teacher?.village || teacher?.district || district || "រោគ") + " "}${dates.d0.solar}</div>
            <div style="font-weight:bold;margin-top:4px;font-size:11px;">គ្រូបន្ទុកថ្នាក់</div>
            <div style="margin-top:40px;font-weight:bold;">${tName}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printHTML(html);
  };

  // 5. Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Rank",
      "Student ID",
      "Last Name",
      "First Name",
      "Gender",
      "S1 Avg",
      "S2 Avg",
      "Cumulative Avg",
      "Grade",
      "Result",
      ...SUBJECTS,
    ];

    const csvRows = [headers.join(",")];

    performanceData
      .sort((a, b) => a.rank - b.rank)
      .forEach((p) => {
        const row = [
          p.rank,
          `"${p.student.code || p.student.id}"`,
          `"${p.student.lastName}"`,
          `"${p.student.firstName}"`,
          `"${p.student.gender}"`,
          p.s1Avg !== null ? p.s1Avg : "",
          p.s2Avg !== null ? p.s2Avg : "",
          p.cumAvg,
          `"${p.grade.l}"`,
          `"${p.result}"`,
          ...SUBJECTS.map((s) => (p.subjectAvgs[s] !== null ? p.subjectAvgs[s] : "")),
        ];
        csvRows.push(row.join(","));
      });

    const csvString = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Performance_Summary_Class_${selClass}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-4 text-slate-800 dark:text-slate-100">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-blue-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
              📈 របាយការណ៍សមិទ្ធកម្មរួម
            </span>
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-full text-xs font-bold">
              ថ្នាក់ទី {selClass}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            សេចក្តីសង្ខេបសមិទ្ធកម្ម & ចំណាត់ថ្នាក់សិស្ស (Performance Summary)
          </h2>
          <p className="text-xs text-blue-200/80 font-medium">
            ការគណនា និងវាយតម្លៃចំណាត់ថ្នាក់តាមមធ្យមភាគសរុបគ្របដណ្តប់គ្រប់ឆមាស និងមុខវិជ្ជា
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            📥 ទាញយក CSV
          </button>
          <button
            onClick={handlePrintReport}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            🖨️ បោះពុម្ពរបាយការណ៍
          </button>
        </div>
      </div>

      {/* Class Statistics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            👥 សិស្សសរុប
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {toKhNum(classMetrics.total)} <span className="text-xs font-normal">នាក់</span>
            </span>
          </div>
        </div>

        {/* Card 2: Cumulative Average */}
        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
            📊 មធ្យមភាគរួមថ្នាក់
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-blue-700 dark:text-blue-300">
              {toKhNum(classMetrics.avgCum)}
            </span>
            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
              / ១០
            </span>
          </div>
        </div>

        {/* Card 3: Pass Rate */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            ✅ អត្រាសិស្សជាប់
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {toKhNum(classMetrics.passPct)}%
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">
              ({toKhNum(classMetrics.passCount)}/{toKhNum(classMetrics.total)})
            </span>
          </div>
        </div>

        {/* Card 4: Top Student */}
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
            🥇 សិស្សឆ្នើមលេខ១
          </div>
          <div className="mt-1 truncate font-black text-xs text-amber-800 dark:text-amber-200">
            {classMetrics.topStudent
              ? `${classMetrics.topStudent.student.lastName} ${classMetrics.topStudent.student.firstName}`
              : "—"}
          </div>
        </div>

        {/* Card 5: Best Subject */}
        <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-3 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
            ⭐ មុខវិជ្ជាខ្លាំងជាងគេ
          </div>
          <div className="mt-1 truncate font-bold text-xs text-indigo-900 dark:text-indigo-200">
            {classMetrics.bestSubject}
          </div>
        </div>

        {/* Card 6: Area to Improve */}
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
            🎯 មុខវិជ្ជាត្រូវពង្រឹង
          </div>
          <div className="mt-1 truncate font-bold text-xs text-rose-900 dark:text-rose-200">
            {classMetrics.lowestSubject}
          </div>
        </div>
      </div>

      {/* Navigation Tabs and Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          {/* Internal View Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("ranking")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "ranking"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              🏆 បញ្ជីចំណាត់ថ្នាក់ទូទៅ
            </button>

            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "matrix"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              📊 ម៉ាទ្រីសពិន្ទុតតាមមុខវិជ្ជា
            </button>

            <button
              onClick={() => setActiveTab("progress")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "progress"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              📈 វឌ្ឍនភាពមុខវិជ្ជា (Line Chart)
            </button>

            <button
              onClick={() => setActiveTab("top5")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "top5"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              🥇 សិស្សពូកែកំពូល ៥
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              📈 វិភាគសមិទ្ធកម្ម
            </button>
          </div>

          {/* Value Display Mode Switch (Numerical Average vs Grade Letter A-F vs Percentile Rank %) */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500">ការបង្ហាញ:</span>
            <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center text-xs font-bold">
              <button
                onClick={() => setDisplayMode("avg")}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  displayMode === "avg"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                123 ពិន្ទុ
              </button>
              <button
                onClick={() => setDisplayMode("grade")}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  displayMode === "grade"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                A-F និទ្ទេស
              </button>
              <button
                onClick={() => setDisplayMode("percentile")}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                  displayMode === "percentile"
                    ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="បង្ហាញចំណាត់ថ្នាក់ភាគរយធៀបនឹងមិត្តរួមថ្នាក់ (Percentile Rank %)"
              >
                🎯 ភាគរយ %
              </button>
            </div>
          </div>
        </div>

        {/* Search, Filters and Sort Options */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="🔍 ស្វែងរកឈ្មោះ ឬអត្តលេខសិស្ស..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Gender Filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold text-xs cursor-pointer"
            >
              <option value="all">🚻 គ្រប់ភេទ</option>
              <option value="ប្រុស">👨 ប្រុស</option>
              <option value="ស្រី">👩 ស្រី</option>
            </select>

            {/* Grade Filter */}
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold text-xs cursor-pointer"
            >
              <option value="all">🎯 គ្រប់និទ្ទេស</option>
              <option value="A">⭐ និទ្ទេស A</option>
              <option value="B">📘 និទ្ទេស B</option>
              <option value="C">📙 និទ្ទេស C</option>
              <option value="D">📗 និទ្ទេស D</option>
              <option value="E">📕 និទ្ទេស E</option>
              <option value="F">🖤 និទ្ទេស F</option>
              <option value="pass">✅ ជាប់</option>
              <option value="fail">❌ ធ្លាក់</option>
            </select>

            {/* Sort Field */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold text-xs cursor-pointer"
            >
              <option value="rank">🥇 តម្រៀបតាមចំណាត់ថ្នាក់</option>
              <option value="cum">📊 តម្រៀបតាមម.ភាគរួមឆ្នាំ</option>
              <option value="s1">📚 តម្រៀបតាមម.ភាគឆមាស១</option>
              <option value="s2">📚 តម្រៀបតាមម.ភាគឆមាស២</option>
              <option value="name">🔤 តម្រៀបតាមឈ្មោះ A-Z</option>
            </select>

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 font-extrabold px-2.5 py-1.5 rounded-lg text-xs cursor-pointer"
              title="ប្តូរទិសដៅតម្រៀប"
            >
              {sortOrder === "asc" ? "⬆️ ឡើង" : "⬇️ ចុះ"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content Display */}

      {/* 1. OVERALL RANKING TABLE VIEW */}
      {activeTab === "ranking" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-800">
                  <th className="py-3 px-3 text-center w-14">ថ្នាក់</th>
                  <th className="py-3 px-4">សិស្ស</th>
                  <th className="py-3 px-3 text-center w-16">ភេទ</th>
                  <th className="py-3 px-3 text-center">ម.ភាគ ឆមាស១</th>
                  <th className="py-3 px-3 text-center">ម.ភាគ ឆមាស២</th>
                  <th className="py-3 px-3 text-center">និន្នាការ</th>
                  <th className="py-3 px-4 text-center bg-blue-950/80 text-blue-200">
                    មធ្យមភាគរួមឆ្នាំ
                  </th>
                  <th className="py-3 px-3 text-center w-20">និទ្ទេស</th>
                  <th className="py-3 px-3 text-center w-20">លទ្ធផល</th>
                  <th className="py-3 px-3 text-center w-16">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
                      <div className="text-2xl mb-1">🔍</div>
                      <p className="font-semibold text-xs">មិនមានទិន្នន័យត្រូវតាមការស្វែងរកឡើយ</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    const photo = honorPhotos[item.student.id] || item.student.photoUrl;
                    const isTop3 = item.rank <= 3;
                    const medal =
                      item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : "";

                    return (
                      <tr
                        key={item.student.id}
                        onClick={() => setSelectedStudent(item)}
                        className={`hover:bg-blue-50/60 dark:hover:bg-slate-800/60 transition cursor-pointer ${
                          item.rank === 1
                            ? "bg-amber-50/40 dark:bg-amber-950/20"
                            : item.rank === 2
                            ? "bg-slate-50/80 dark:bg-slate-800/30"
                            : item.rank === 3
                            ? "bg-orange-50/30 dark:bg-orange-950/20"
                            : ""
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-2.5 px-3 text-center font-black">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                              item.rank === 1
                                ? "bg-amber-400 text-slate-950 shadow-xs"
                                : item.rank === 2
                                ? "bg-slate-300 text-slate-900"
                                : item.rank === 3
                                ? "bg-amber-700 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {medal || toKhNum(item.rank)}
                          </span>
                        </td>

                        {/* Student Name and Photo */}
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs">
                              {photo ? (
                                <img
                                  src={photo}
                                  alt={item.student.firstName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{item.student.gender === "ស្រី" ? "👩" : "👨"}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-extrabold text-xs">
                                {item.student.lastName} {item.student.firstName}
                              </div>
                              {item.student.code && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  ID: {item.student.code}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Gender */}
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span
                            className={
                              item.student.gender === "ស្រី"
                                ? "text-pink-600 dark:text-pink-400"
                                : "text-blue-600 dark:text-blue-400"
                            }
                          >
                            {item.student.gender}
                          </span>
                        </td>

                        {/* S1 Avg */}
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {displayMode === "avg"
                            ? item.s1Avg !== null
                              ? fmtAvg(item.s1Avg)
                              : "—"
                            : item.s1Avg !== null
                            ? gradeOf(item.s1Avg).l
                            : "—"}
                        </td>

                        {/* S2 Avg */}
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {displayMode === "avg"
                            ? item.s2Avg !== null
                              ? fmtAvg(item.s2Avg)
                              : "—"
                            : item.s2Avg !== null
                            ? gradeOf(item.s2Avg).l
                            : "—"}
                        </td>

                        {/* Trend Indicator */}
                        <td className="py-2.5 px-3 text-center">
                          {item.trend === "up" && (
                            <span
                              className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full"
                              title={`កើនឡើង +${item.trendDiff}`}
                            >
                              📈 +{fmtAvg(item.trendDiff)}
                            </span>
                          )}
                          {item.trend === "down" && (
                            <span
                              className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full"
                              title={`ថយចុះ ${item.trendDiff}`}
                            >
                              📉 {fmtAvg(item.trendDiff)}
                            </span>
                          )}
                          {item.trend === "neutral" && (
                            <span className="text-[10px] text-slate-400 font-bold">➡️ ថេរ</span>
                          )}
                          {item.trend === "none" && (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>

                        {/* Cumulative Overall Average / Grade / Percentile */}
                        <td className="py-2.5 px-4 text-center font-black text-sm text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
                          {displayMode === "avg" ? (
                            fmtAvg(item.cumAvg)
                          ) : displayMode === "grade" ? (
                            item.grade.l
                          ) : (
                            (() => {
                              const allCumAvgs = performanceData.map((p) => p.cumAvg);
                              const pr = calculatePercentileRank(item.cumAvg, allCumAvgs);
                              const tier = getPercentileTier(pr);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black border ${tier.badgeClass}`}
                                  title={`ចំណាត់ថ្នាក់ភាគរយសរុប៖ ${pr}% (${tier.tierLabelKh})`}
                                >
                                  <span>{tier.icon}</span>
                                  <span>{toKhNum(pr || 0)}%</span>
                                </span>
                              );
                            })()
                          )}
                        </td>

                        {/* Grade */}
                        <td className="py-2.5 px-3 text-center font-black">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-white text-xs font-black shadow-2xs"
                            style={{ backgroundColor: item.grade.c }}
                          >
                            {item.grade.l}
                          </span>
                        </td>

                        {/* Pass/Fail Status */}
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              item.result === "ជាប់"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                            }`}
                          >
                            {item.result}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(item);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 p-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                            title="មើលព័ត៌មានលម្អិត"
                          >
                            👁️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SUBJECT PERFORMANCE MATRIX VIEW */}
      {activeTab === "matrix" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-bold">
            <span>📊 ម៉ាទ្រីសពិន្ទុតាមមុខវិជ្ជានីមួយៗ (Cumulative Subject Averages)</span>
            <span className="text-slate-500 font-normal">
              បៃតង = ≥៨.០ · ក្រហម = &lt;៥.០ (ចុចលើមុខវិជ្ជាដើម្បីមើលក្រាហ្វិក)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold text-[10px] border-b border-slate-800">
                  <th className="py-2.5 px-2 text-center w-10 sticky left-0 bg-slate-900 z-10">
                    #
                  </th>
                  <th className="py-2.5 px-3 sticky left-10 bg-slate-900 z-10 min-w-[130px]">
                    ឈ្មោះសិស្ស
                  </th>
                  {SUBJECTS.map((subj) => (
                    <th
                      key={subj}
                      onClick={() => {
                        setSelectedSubject(subj);
                        setActiveTab("progress");
                      }}
                      className="py-2.5 px-2 text-center font-bold truncate max-w-[80px] cursor-pointer hover:bg-blue-800 transition"
                      title={`ចុចដើម្បីមើលវឌ្ឍនភាពខែ: ${subj}`}
                    >
                      {subj} 📈
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-center bg-blue-950 text-blue-200 font-black">
                    ម.ភាគរួម
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                {filteredData.map((p) => (
                  <tr
                    key={p.student.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <td className="py-2 px-2 text-center font-bold text-slate-500 sticky left-0 bg-white dark:bg-slate-900 z-10">
                      {p.rank}
                    </td>
                    <td className="py-2 px-3 font-extrabold text-slate-900 dark:text-white sticky left-10 bg-white dark:bg-slate-900 z-10 shadow-r">
                      {p.student.lastName} {p.student.firstName}
                    </td>

                    {SUBJECTS.map((subj) => {
                      const avg = p.subjectAvgs[subj];
                      const isHigh = avg !== null && avg >= 8.0;
                      const isLow = avg !== null && avg < 5.0;

                      // Compute percentile rank in this subject
                      const allSubjScores = performanceData.map((d) => d.subjectAvgs[subj]);
                      const pr = calculatePercentileRank(avg, allSubjScores);
                      const tier = getPercentileTier(pr);

                      return (
                        <td
                          key={subj}
                          onClick={() => {
                            setSelectedSubject(subj);
                            setChartStudentSelection("custom");
                            setCustomSelectedStudentIds([p.student.id]);
                            setActiveTab("progress");
                          }}
                          className={`py-2 px-2 text-center font-bold cursor-pointer hover:opacity-80 transition ${
                            displayMode === "percentile"
                              ? avg !== null
                                ? `${tier.bgClass} ${tier.textClass}`
                                : "text-slate-400"
                              : isHigh
                              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                              : isLow
                              ? "text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                          title={
                            avg !== null
                              ? `ចុចមើលក្រាហ្វិក: ${p.student.lastName} ${p.student.firstName} (${subj}) · ពិន្ទុ: ${fmtAvg(avg)} · ចំណាត់ថ្នាក់ភាគរយ: ${pr}% (${tier.tierLabelKh})`
                              : `ចុចមើលក្រាហ្វិក: ${p.student.lastName} ${p.student.firstName} (${subj})`
                          }
                        >
                          {avg !== null ? (
                            displayMode === "avg" ? (
                              fmtAvg(avg)
                            ) : displayMode === "grade" ? (
                              gradeOf(avg).l
                            ) : (
                              <span className="font-black text-[10px]">
                                {toKhNum(pr || 0)}%
                              </span>
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2 px-3 text-center font-black text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30">
                      {displayMode === "avg"
                        ? fmtAvg(p.cumAvg)
                        : displayMode === "grade"
                        ? p.grade.l
                        : (() => {
                            const allCumAvgs = performanceData.map((d) => d.cumAvg);
                            const pr = calculatePercentileRank(p.cumAvg, allCumAvgs);
                            return `${toKhNum(pr || 0)}%`;
                          })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2b. RECHARTS SUBJECT PROGRESS LINE CHART & PERCENTILE RANK TAB VIEW */}
      {activeTab === "progress" && (
        <div className="space-y-4">
          {/* Controls Card: Subject Selection, View Mode Toggle, Comparison Mode, Toggles */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{showPercentileRank ? "🎯" : "📈"}</span>
                  <span>
                    {showPercentileRank
                      ? "ចំណាត់ថ្នាក់ភាគរយតាមមុខវិជ្ជាធៀបនឹងមិត្តរួមថ្នាក់ (Subject Percentile Rank View)"
                      : "ក្រាហ្វិកខ្សែបន្ទាត់វឌ្ឍនភាពសិស្សតាមខែ (Student Monthly Progress Line Chart)"}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {showPercentileRank
                    ? `បង្ហាញកម្រិតចំណាត់ថ្នាក់ភាគរយ (Percentile Rank %) របស់សិស្សម្នាក់ៗធៀបនឹងមិត្តរួមថ្នាក់ទាំងអស់ក្នុងមុខវិជ្ជា៖ `
                    : `ប្រៀបធៀបការវិវត្តពិន្ទុរបស់សិស្សគ្រប់ខែដែលបានទាញយក ក្នុងមុខវិជ្ជា៖ `}
                  <span className="font-bold text-blue-600 dark:text-blue-400">{selectedSubject}</span>
                </p>
              </div>

              {/* View Mode Toggle: Raw Scores vs Percentile Rank View */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center text-xs font-black">
                  <button
                    onClick={() => setShowPercentileRank(false)}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      !showPercentileRank
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>📈</span>
                    <span>ពិន្ទុជាក់ស្តែង (០-១០)</span>
                  </button>
                  <button
                    onClick={() => setShowPercentileRank(true)}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      showPercentileRank
                        ? "bg-amber-500 text-white shadow-sm font-extrabold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>🎯</span>
                    <span>ចំណាត់ថ្នាក់ភាគរយ % (Percentile)</span>
                  </button>
                </div>

                {onFetchAllMonths && (
                  <button
                    onClick={onFetchAllMonths}
                    className="bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    title="ទាញយកពិន្ទុគ្រប់ខែពី Firestore"
                  >
                    🔄 ទាញយកគ្រប់ខែ
                  </button>
                )}
              </div>
            </div>

            {/* Subject Selector and Quick Chips */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 shrink-0">
                  🎯 ជ្រើសរើសមុខវិជ្ជា៖
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {SUBJECTS.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Subject Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400">ផ្លូវកាត់:</span>
                {SUBJECTS.map((subj) => {
                  const isSel = selectedSubject === subj;
                  return (
                    <button
                      key={subj}
                      onClick={() => setSelectedSubject(subj)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        isSel
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {subj}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comparison Controls & Toggles */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Comparison Mode */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500">ការប្រៀបធៀប:</span>
                <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center text-xs font-bold flex-wrap">
                  <button
                    onClick={() => setChartStudentSelection("top5")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      chartStudentSelection === "top5"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    🥇 Top 5 ឆ្នើម
                  </button>
                  <button
                    onClick={() => setChartStudentSelection("low5")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      chartStudentSelection === "low5"
                        ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    🎯 Top 5 ត្រូវពង្រឹង
                  </button>
                  <button
                    onClick={() => setChartStudentSelection("custom")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      chartStudentSelection === "custom"
                        ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    👥 ជ្រើសរើសផ្ទាល់ខ្លួន ({toKhNum(customSelectedStudentIds.length)})
                  </button>
                  <button
                    onClick={() => setChartStudentSelection("classOnly")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      chartStudentSelection === "classOnly"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {showPercentileRank ? "📊 មេដ្យានថ្នាក់ ៥០%" : "📊 មធ្យមភាគថ្នាក់តែមួយ"}
                  </button>
                </div>
              </div>

              {/* Display Line Toggles */}
              <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showClassAvg}
                    onChange={(e) => setShowClassAvg(e.target.checked)}
                    className="accent-blue-600 rounded"
                  />
                  <span>{showPercentileRank ? "📊 មេដ្យានថ្នាក់ ៥០%" : "📊 បន្ទាត់មធ្យមភាគថ្នាក់"}</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBenchmark}
                    onChange={(e) => setShowBenchmark(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span>{showPercentileRank ? "🎯 បន្ទាត់គោលដៅ ២៥% / ៧៥% / ៩០%" : "🎯 កម្រិតគោលដៅ ៥.០ / ៨.០"}</span>
                </label>
              </div>
            </div>

            {/* Custom Student Selector Drawer */}
            {chartStudentSelection === "custom" && (
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                    👥 ជ្រើសរើសសិស្សដែលចង់ប្រៀបធៀប ({toKhNum(customSelectedStudentIds.length)} នាក់បានជ្រើសរើស)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCustomSelectedStudentIds(students.map((s) => s.id))}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      ជ្រើសទាំងអស់
                    </button>
                    <span>·</span>
                    <button
                      onClick={() => setCustomSelectedStudentIds([])}
                      className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      សម្អាត
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="🔍 ស្វែងរកឈ្មោះសិស្សដើម្បីជ្រើសរើស..."
                  value={studentSearchInChart}
                  onChange={(e) => setStudentSearchInChart(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs"
                />

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                  {students
                    .filter((s) => {
                      const fullName = `${s.lastName} ${s.firstName}`.toLowerCase();
                      return fullName.includes(studentSearchInChart.toLowerCase());
                    })
                    .map((s) => {
                      const isSelected = customSelectedStudentIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            if (isSelected) {
                              setCustomSelectedStudentIds((prev) => prev.filter((id) => id !== s.id));
                            } else {
                              setCustomSelectedStudentIds((prev) => [...prev, s.id]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                          }`}
                        >
                          <span>{isSelected ? "✓" : "+"}</span>
                          <span>
                            {s.lastName} {s.firstName}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Subject Metrics Cards (Raw vs Percentile Benchmarks) */}
          {!showPercentileRank ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Card 1: Latest Month Class Avg */}
              <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3 shadow-sm">
                <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  📊 ម.ភាគខែចុងក្រោយ
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                    {subjectProgressStats.latestMonthAvg !== null ? fmtAvg(subjectProgressStats.latestMonthAvg) : "—"}
                  </span>
                  {subjectProgressStats.progressDelta !== 0 && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        subjectProgressStats.progressDelta > 0
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {subjectProgressStats.progressDelta > 0 ? "📈 +" : "📉 "}
                      {fmtAvg(subjectProgressStats.progressDelta)}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {subjectProgressStats.latestMonthName || "ខែបច្ចុប្បន្ន"}
                </div>
              </div>

              {/* Card 2: Pass Rate */}
              <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3 shadow-sm">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  ✅ អត្រាជាប់ចុងក្រោយ
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {subjectProgressStats.latestPassRate !== null ? `${toKhNum(subjectProgressStats.latestPassRate)}%` : "—"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">≥ ៥.០ ពិន្ទុ</span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">ក្នុងមុខវិជ្ជា {selectedSubject}</div>
              </div>

              {/* Card 3: Top Improvement Student */}
              <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 shadow-sm">
                <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  🚀 រីកចម្រើនខ្លាំងជាងគេ
                </div>
                <div className="mt-1 truncate font-black text-xs text-amber-800 dark:text-amber-200">
                  {subjectProgressStats.mostImprovedStudent
                    ? `${subjectProgressStats.mostImprovedStudent.student.lastName} ${subjectProgressStats.mostImprovedStudent.student.firstName}`
                    : "—"}
                </div>
                <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                  {subjectProgressStats.mostImprovedStudent
                    ? `+${fmtAvg(subjectProgressStats.mostImprovedStudent.gain)} ពិន្ទុ (${fmtAvg(subjectProgressStats.mostImprovedStudent.start)} ➔ ${fmtAvg(subjectProgressStats.mostImprovedStudent.end)})`
                    : "ត្រូវការទិន្នន័យ ២ ខែឡើង"}
                </div>
              </div>

              {/* Card 4: Top Performer in Subject */}
              <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-xl p-3 shadow-sm">
                <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                  ⭐ ពូកែជាងគេក្នុងមុខវិជ្ជា
                </div>
                <div className="mt-1 truncate font-black text-xs text-purple-800 dark:text-purple-200">
                  {subjectProgressStats.topSubjectStudent
                    ? `${subjectProgressStats.topSubjectStudent.student.lastName} ${subjectProgressStats.topSubjectStudent.student.firstName}`
                    : "—"}
                </div>
                <div className="text-[10px] text-purple-600 font-bold mt-0.5">
                  {subjectProgressStats.topSubjectStudent ? `មធ្យមភាគ: ${fmtAvg(subjectProgressStats.topSubjectStudent.avg)}` : "—"}
                </div>
              </div>

              {/* Card 5: Fetched Months Count */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
                <div className="text-[11px] font-bold text-slate-500">
                  📅 ខែដែលមានទិន្នន័យ
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {toKhNum(subjectProgressStats.totalFetchedMonths)}{" "}
                    <span className="text-xs font-normal text-slate-500">/ ១២ ខែ</span>
                  </span>
                </div>
                <div className="text-[10px] text-blue-600 font-bold mt-0.5">
                  {subjectProgressStats.totalFetchedMonths >= 1 ? "✅ ដំណើរការក្រាហ្វិក" : "⚠️ មិនទាន់មានទិន្នន័យ"}
                </div>
              </div>
            </div>
          ) : (
            /* Percentile & Quartile Benchmarks Cards */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Card 1: Median Score (50th Percentile) */}
              <div className="bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 rounded-xl p-3 shadow-sm">
                <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                  <span>📊 មេដ្យានថ្នាក់ (Median 50th %)</span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 px-1.5 py-0.2 rounded font-black">P50</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                    {subjectPercentileStats.medianScore !== null ? fmtAvg(subjectPercentileStats.medianScore) : "—"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">ពិន្ទុកណ្ដាល</span>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  ៥០% នៃសិស្សបានពិន្ទុក្រោមតម្លៃនេះ
                </div>
              </div>

              {/* Card 2: Top 10% Benchmark (90th Percentile) */}
              <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl p-3 shadow-sm">
                <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                  <span>🏆 កំពូល ១០% (Top 10%)</span>
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 px-1.5 py-0.2 rounded font-black">≥ P90</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {subjectPercentileStats.top10Threshold !== null ? `≥ ${fmtAvg(subjectPercentileStats.top10Threshold)}` : "—"}
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                    {toKhNum(subjectPercentileStats.top10Count)} នាក់
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  ពិន្ទុស្ថិតក្នុងកំពូល ១០% នៃថ្នាក់
                </div>
              </div>

              {/* Card 3: Upper Quartile Q3 (75th Percentile) */}
              <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3 shadow-sm">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                  <span>🌟 កម្រិតខ្ពស់ Q3 (75th %)</span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 px-1.5 py-0.2 rounded font-black">P75</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {subjectPercentileStats.q3Threshold !== null ? `≥ ${fmtAvg(subjectPercentileStats.q3Threshold)}` : "—"}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    {toKhNum(subjectPercentileStats.q4Count + subjectPercentileStats.top10Count)} នាក់
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  ខ្ពស់ជាង ៧៥% នៃសិស្សក្នុងថ្នាក់
                </div>
              </div>

              {/* Card 4: Lower Quartile Q1 (25th Percentile) */}
              <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl p-3 shadow-sm">
                <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center justify-between">
                  <span>⚠️ ត្រូវការគាំទ្រ Q1 (&lt;25th %)</span>
                  <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 px-1.5 py-0.2 rounded font-black">&lt; P25</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                    {subjectPercentileStats.q1Threshold !== null ? `&lt; ${fmtAvg(subjectPercentileStats.q1Threshold)}` : "—"}
                  </span>
                  <span className="text-[10px] text-rose-700 font-bold">
                    {toKhNum(subjectPercentileStats.q1Count)} នាក់
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  ស្ថិតក្នុងបាត ២៥% ត្រូវជួយបន្ថែម
                </div>
              </div>

              {/* Card 5: Interquartile Range (IQR) */}
              <div className="bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 rounded-xl p-3 shadow-sm">
                <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center justify-between">
                  <span>📏 គម្លាត IQR (Q3 - Q1)</span>
                  <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 px-1.5 py-0.2 rounded font-black">៥០% កណ្ដាល</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-black text-purple-700 dark:text-purple-300">
                    {subjectPercentileStats.iqr !== null ? `${fmtAvg(subjectPercentileStats.iqr)}` : "—"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">ពិន្ទុ</span>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  កម្រិតគម្លាតនៃក្រុម ៥០% កណ្ដាល
                </div>
              </div>
            </div>
          )}

          {/* The Recharts Line Chart Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${showPercentileRank ? "bg-amber-500" : "bg-blue-600"}`} />
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  {showPercentileRank
                    ? `ក្រាហ្វិកគន្លងចំណាត់ថ្នាក់ភាគរយតាមខែ (Percentile Rank Trajectory) ៖ ${selectedSubject}`
                    : `បន្ទាត់ក្រាហ្វិកវិវត្តន៍ពិន្ទុជាក់ស្តែង ៖ ${selectedSubject} (ថ្នាក់ទី ${selClass})`}
                </h4>
              </div>
              <div className="text-[11px] text-slate-400 font-semibold">
                {showPercentileRank
                  ? "ខ្នាតភាគរយ៖ ០% ដល់ ១០០% (ធៀបនឹងមិត្តរួមថ្នាក់ក្នុងខែនីមួយៗ) · មេដ្យានថ្នាក់ = ៥០%"
                  : "ខ្នាតពិន្ទុ៖ ០ ដល់ ១០ · ស្ទង់មតិឆ្លងឆមាស ១ និង ២"}
              </div>
            </div>

            {subjectProgressStats.totalFetchedMonths === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <div className="text-4xl">📊</div>
                <div className="font-bold text-sm">មិនទាន់មានទិន្នន័យពិន្ទុសម្រាប់មុខវិជ្ជានេះនៅឡើយ</div>
                <p className="text-xs max-w-md mx-auto text-slate-500">
                  សូមបញ្ចូលពិន្ទុក្នុងផ្ទាំង «ប្រឡង» ឬចុចប៊ូតុង «ទាញយកគ្រប់ខែ» ខាងលើដើម្បីផ្ទុកទិន្នន័យពី Firestore
                </p>
                {onFetchAllMonths && (
                  <button
                    onClick={onFetchAllMonths}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    🔄 ទាញយកទិន្នន័យឥឡូវនេះ
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full h-80 sm:h-96 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={progressChartData}
                    margin={{ top: 15, right: 30, left: -5, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.35} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      tick={{ fontSize: 11, fontWeight: 700 }}
                      tickMargin={8}
                    />
                    <YAxis
                      domain={showPercentileRank ? [0, 100] : [0, 10]}
                      ticks={
                        showPercentileRank
                          ? [0, 25, 50, 75, 90, 100]
                          : [0, 2, 4, 5, 6, 8, 10]
                      }
                      tickFormatter={(val) => (showPercentileRank ? `${val}%` : `${val}`)}
                      stroke="#64748b"
                      tick={{ fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip content={<CustomLineTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: "14px", fontSize: "11px", fontWeight: 700 }} />

                    {/* Reference Lines for Percentile Mode */}
                    {showPercentileRank ? (
                      <>
                        {showBenchmark && (
                          <ReferenceLine
                            y={90}
                            stroke="#f59e0b"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                              value: "កំពូល ១០% (P90)",
                              fill: "#f59e0b",
                              position: "insideRight",
                              fontSize: 10,
                              fontWeight: "bold",
                            }}
                          />
                        )}
                        {showBenchmark && (
                          <ReferenceLine
                            y={75}
                            stroke="#10b981"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                              value: "កម្រិតខ្ពស់ Q3 (75%)",
                              fill: "#10b981",
                              position: "insideRight",
                              fontSize: 10,
                              fontWeight: "bold",
                            }}
                          />
                        )}
                        {showClassAvg && (
                          <ReferenceLine
                            y={50}
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            label={{
                              value: "មេដ្យានថ្នាក់ ៥០% (Median)",
                              fill: "#3b82f6",
                              position: "insideRight",
                              fontSize: 10,
                              fontWeight: "bold",
                            }}
                          />
                        )}
                        {showBenchmark && (
                          <ReferenceLine
                            y={25}
                            stroke="#f43f5e"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                              value: "កម្រិតទាប Q1 (25%)",
                              fill: "#f43f5e",
                              position: "insideRight",
                              fontSize: 10,
                              fontWeight: "bold",
                            }}
                          />
                        )}
                      </>
                    ) : (
                      /* Reference Lines for Raw Score Mode */
                      <>
                        {showBenchmark && (
                          <ReferenceLine
                            y={5}
                            stroke="#ef4444"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                              value: "ជាប់ (៥.០)",
                              fill: "#ef4444",
                              position: "insideRight",
                              fontSize: 10,
                              fontWeight: "bold",
                            }}
                          />
                        )}

                        {showBenchmark && (
                          <ReferenceLine
                            y={8}
                            stroke="#16a34a"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                              value: "ល្អ (៨.០)",
                              fill: "#16a34a",
                              position: "insideRight",
                              fontSize: 10,
                              fontWeight: "bold",
                            }}
                          />
                        )}

                        {showClassAvg && (
                          <Line
                            type="monotone"
                            dataKey="classAvg"
                            name="📊 មធ្យមភាគរួមថ្នាក់"
                            stroke="#0f172a"
                            strokeWidth={3.5}
                            dot={{ r: 5, fill: "#0f172a", strokeWidth: 2, stroke: "#ffffff" }}
                            activeDot={{ r: 8, fill: "#2563eb" }}
                            connectNulls
                          />
                        )}
                      </>
                    )}

                    {/* Student Lines */}
                    {chartStudentSelection !== "classOnly" &&
                      studentsToDisplayInChart.map((p, idx) => {
                        const color = STUDENT_COLORS[idx % STUDENT_COLORS.length];
                        const dataKey = showPercentileRank ? `stu_pr_${p.student.id}` : `stu_${p.student.id}`;
                        const subjPr = subjectStudentPercentiles.find((item) => item.student.id === p.student.id)?.percentileRank;

                        return (
                          <Line
                            key={p.student.id}
                            type="monotone"
                            dataKey={dataKey}
                            name={
                              showPercentileRank
                                ? `${p.student.lastName} ${p.student.firstName} (PR ${toKhNum(subjPr || 0)}%)`
                                : `${p.student.lastName} ${p.student.firstName} (#${toKhNum(p.rank)})`
                            }
                            stroke={color}
                            strokeWidth={2.5}
                            dot={{ r: 4, strokeWidth: 1.5, stroke: "#ffffff" }}
                            activeDot={{ r: 7 }}
                            connectNulls
                          />
                        );
                      })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Interactive Classmate Percentile Standing Leaderboard (Featured in Percentile Mode) */}
          {showPercentileRank && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🎯</span>
                    <span>ចំណាត់ថ្នាក់ភាគរយសិស្សម្នាក់ៗធៀបនឹងមិត្តរួមថ្នាក់ក្នុង៖ {selectedSubject}</span>
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    គណនាដោយរូបមន្តស្តង់ដារ Percentile Rank ផ្អែកលើពិន្ទុសរុបក្នុងមុខវិជ្ជា {selectedSubject}
                  </p>
                </div>

                <div className="text-xs font-bold text-slate-500">
                  បង្ហាញ {toKhNum(filteredPercentileList.length)} / {toKhNum(subjectStudentPercentiles.length)} នាក់
                </div>
              </div>

              {/* Tier Filters & Search Bar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1">
                {/* Tier Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs font-bold">
                  <button
                    onClick={() => setPercentileTierFilter("all")}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                      percentileTierFilter === "all"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    ទាំងអស់ ({toKhNum(subjectStudentPercentiles.length)})
                  </button>

                  <button
                    onClick={() => setPercentileTierFilter("top10")}
                    className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      percentileTierFilter === "top10"
                        ? "bg-amber-500 text-white shadow-sm font-black"
                        : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    <span>🏆</span>
                    <span>កំពូល ១០% ({toKhNum(subjectPercentileStats.top10Count)})</span>
                  </button>

                  <button
                    onClick={() => setPercentileTierFilter("q4")}
                    className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      percentileTierFilter === "q4"
                        ? "bg-emerald-600 text-white shadow-sm font-black"
                        : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                    }`}
                  >
                    <span>🌟</span>
                    <span>កម្រិតខ្ពស់ Q4 ({toKhNum(subjectPercentileStats.q4Count)})</span>
                  </button>

                  <button
                    onClick={() => setPercentileTierFilter("q3")}
                    className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      percentileTierFilter === "q3"
                        ? "bg-blue-600 text-white shadow-sm font-black"
                        : "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
                    }`}
                  >
                    <span>🔷</span>
                    <span>មធ្យមលើ Q3 ({toKhNum(subjectPercentileStats.q3Count)})</span>
                  </button>

                  <button
                    onClick={() => setPercentileTierFilter("q2")}
                    className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      percentileTierFilter === "q2"
                        ? "bg-orange-500 text-white shadow-sm font-black"
                        : "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 hover:bg-orange-100"
                    }`}
                  >
                    <span>🔶</span>
                    <span>មធ្យមក្រោម Q2 ({toKhNum(subjectPercentileStats.q2Count)})</span>
                  </button>

                  <button
                    onClick={() => setPercentileTierFilter("q1")}
                    className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                      percentileTierFilter === "q1"
                        ? "bg-rose-600 text-white shadow-sm font-black"
                        : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                    }`}
                  >
                    <span>⚠️</span>
                    <span>ត្រូវការគាំទ្រ Q1 ({toKhNum(subjectPercentileStats.q1Count)})</span>
                  </button>
                </div>

                {/* Search in Percentile List */}
                <div className="relative min-w-[200px]">
                  <input
                    type="text"
                    placeholder="🔍 ស្វែងរកឈ្មោះសិស្សក្នុងតារាងភាគរយ..."
                    value={percentileSearchTerm}
                    onChange={(e) => setPercentileSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {percentileSearchTerm && (
                    <button
                      onClick={() => setPercentileSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Percentile Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {filteredPercentileList.map((item, idx) => {
                  const prVal = item.percentileRank;
                  const isSelectedInChart = customSelectedStudentIds.includes(item.student.id);

                  return (
                    <div
                      key={item.student.id}
                      className={`border rounded-xl p-3 space-y-2.5 transition relative shadow-xs hover:shadow-md ${
                        item.tier.bgClass
                      } ${
                        prVal !== null && prVal >= 90
                          ? "border-amber-300 dark:border-amber-800/80"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {/* Header: Rank, Name, Tier Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                              {item.student.lastName} {item.student.firstName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold">
                              ភេទ: {item.student.gender} · ចំណាត់ថ្នាក់រួម: #{toKhNum(item.performance.rank)}
                            </div>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${item.tier.badgeClass}`}>
                          {item.tier.icon} {item.tier.tierLabelKh}
                        </span>
                      </div>

                      {/* Standing Bar & Percentile Numbers */}
                      <div className="space-y-1 bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            🎯 ចំណាត់ថ្នាក់ភាគរយ (PR):
                          </span>
                          <span className="font-black text-base text-slate-900 dark:text-white">
                            {prVal !== null ? `${toKhNum(prVal)}%` : "—"}
                          </span>
                        </div>

                        {/* Progress Bar of Classmate Standing */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              prVal !== null && prVal >= 90
                                ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                : prVal !== null && prVal >= 75
                                ? "bg-emerald-500"
                                : prVal !== null && prVal >= 50
                                ? "bg-blue-500"
                                : prVal !== null && prVal >= 25
                                ? "bg-orange-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${prVal || 0}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold pt-0.5">
                          <span className="text-slate-600 dark:text-slate-400 font-bold">
                            {prVal !== null
                              ? `✨ ខ្ពស់ជាង ${toKhNum(prVal)}% នៃមិត្តរួមថ្នាក់`
                              : "មិនទាន់មានពិន្ទុ"}
                          </span>
                          <span>
                            ពិន្ទុ: <strong className="text-blue-600 dark:text-blue-400 font-black">{item.rawScore !== null ? fmtAvg(item.rawScore) : "—"}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <button
                          onClick={() => {
                            if (isSelectedInChart) {
                              setCustomSelectedStudentIds((prev) => prev.filter((id) => id !== item.student.id));
                            } else {
                              setChartStudentSelection("custom");
                              setCustomSelectedStudentIds((prev) => [...prev, item.student.id]);
                            }
                          }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                            isSelectedInChart
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span>{isSelectedInChart ? "✓ ក្នុងក្រាហ្វិក" : "+ ប្រៀបធៀបក្នុងក្រាហ្វិក"}</span>
                        </button>

                        <button
                          onClick={() => setSelectedStudent(item.performance)}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>👁️ មើលលម្អិត</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Month-by-Month Detail Matrix for Selected Subject */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-bold">
              <span>
                📋 តារាងពិន្ទុលម្អិតតាមខែនីមួយៗសម្រាប់៖ {selectedSubject}{" "}
                {showPercentileRank && <span className="text-amber-600 font-extrabold">(បង្ហាញទាំងពិន្ទុ & ចំណាត់ថ្នាក់ភាគរយ %)</span>}
              </span>
              <span className="text-slate-500 font-normal">
                សរុប {toKhNum(students.length)} នាក់
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold text-[10px] border-b border-slate-800">
                    <th className="py-2.5 px-2 text-center w-10 sticky left-0 bg-slate-900 z-10">#</th>
                    <th className="py-2.5 px-3 sticky left-10 bg-slate-900 z-10 min-w-[130px]">
                      ឈ្មោះសិស្ស
                    </th>
                    {progressChartData.map((d) => (
                      <th
                        key={d.monthKey}
                        className={`py-2.5 px-2 text-center font-bold truncate max-w-[80px] ${
                          d.hasData ? "text-amber-300" : "text-slate-400"
                        }`}
                        title={d.label}
                      >
                        {d.label}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center bg-blue-950 text-blue-200 font-black">
                      {showPercentileRank ? "PR សរុប %" : "ម.ភាគមុខវិជ្ជា"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                  {/* Class Average Row */}
                  <tr className="bg-blue-50/80 dark:bg-blue-950/40 font-black">
                    <td className="py-2 px-2 text-center sticky left-0 bg-blue-100 dark:bg-blue-950 z-10">
                      ★
                    </td>
                    <td className="py-2 px-3 sticky left-10 bg-blue-100 dark:bg-blue-950 z-10 text-blue-900 dark:text-blue-200">
                      {showPercentileRank ? "📊 មេដ្យានថ្នាក់ (P50)" : "📊 មធ្យមភាគរួមថ្នាក់"}
                    </td>
                    {progressChartData.map((d) => (
                      <td
                        key={d.monthKey}
                        className="py-2 px-2 text-center text-blue-700 dark:text-blue-300 font-black"
                      >
                        {showPercentileRank
                          ? d.hasData ? "៥០%" : "—"
                          : d.classAvg !== null ? fmtAvg(d.classAvg) : "—"}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-center text-blue-800 dark:text-blue-200 font-black">
                      {showPercentileRank
                        ? "៥០%"
                        : subjectProgressStats.latestMonthAvg !== null
                        ? fmtAvg(subjectProgressStats.latestMonthAvg)
                        : "—"}
                    </td>
                  </tr>

                  {/* Student Rows */}
                  {filteredData.map((p) => {
                    const studentAvg = p.subjectAvgs[selectedSubject];
                    const prOverall = subjectStudentPercentiles.find((item) => item.student.id === p.student.id);

                    return (
                      <tr
                        key={p.student.id}
                        onClick={() => setSelectedStudent(p)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                      >
                        <td className="py-2 px-2 text-center font-bold text-slate-500 sticky left-0 bg-white dark:bg-slate-900 z-10">
                          {p.rank}
                        </td>
                        <td className="py-2 px-3 font-extrabold text-slate-900 dark:text-white sticky left-10 bg-white dark:bg-slate-900 z-10 shadow-r">
                          {p.student.lastName} {p.student.firstName}
                        </td>

                        {progressChartData.map((d) => {
                          const val = d[`stu_${p.student.id}`];
                          const prMonth = d[`stu_pr_${p.student.id}`];
                          const isHigh = val !== null && val !== undefined && val >= 8.0;
                          const isLow = val !== null && val !== undefined && val < 5.0;
                          const tier = getPercentileTier(prMonth);

                          return (
                            <td
                              key={d.monthKey}
                              className={`py-2 px-2 text-center font-bold ${
                                showPercentileRank
                                  ? prMonth !== null
                                    ? `${tier.bgClass} ${tier.textClass}`
                                    : "text-slate-400"
                                  : isHigh
                                  ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                                  : isLow
                                  ? "text-rose-600 dark:text-rose-400 font-extrabold"
                                  : "text-slate-700 dark:text-slate-300"
                              }`}
                              title={
                                val !== null && val !== undefined
                                  ? `ពិន្ទុ: ${fmtAvg(val)} · ចំណាត់ថ្នាក់ភាគរយ: ${prMonth}%`
                                  : undefined
                              }
                            >
                              {showPercentileRank ? (
                                prMonth !== null ? (
                                  <span className="font-black text-[10px]">
                                    {toKhNum(prMonth)}%
                                  </span>
                                ) : (
                                  "—"
                                )
                              ) : (
                                val !== null && val !== undefined ? fmtAvg(val) : "—"
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2 px-3 text-center font-black text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30">
                          {showPercentileRank ? (
                            prOverall?.percentileRank !== null && prOverall?.percentileRank !== undefined ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${prOverall.tier.badgeClass}`}>
                                {toKhNum(prOverall.percentileRank)}%
                              </span>
                            ) : (
                              "—"
                            )
                          ) : (
                            studentAvg !== null ? fmtAvg(studentAvg) : "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. TOP 5 HONOR CARDS VIEW */}
      {activeTab === "top5" && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              🏆 តារាងកិត្តិយសសិស្សពូកែកំពូល ៥ ច្រើនជាងគេប្រចាំឆ្នាំ
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              សិស្សដែលមានមធ្យមភាគផលបូកខ្ពស់ជាងគេបំផុតក្នុងថ្នាក់ទី {selClass}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {performanceData
              .sort((a, b) => a.rank - b.rank)
              .slice(0, 5)
              .map((p) => {
                const photo = honorPhotos[p.student.id] || p.student.photoUrl;
                const badge =
                  p.rank === 1
                    ? "🥇 លេខ ១"
                    : p.rank === 2
                    ? "🥈 លេខ ២"
                    : p.rank === 3
                    ? "🥉 លេខ ៣"
                    : p.rank === 4
                    ? "④ លេខ ៤"
                    : "⑤ លេខ ៥";

                const borderC =
                  p.rank === 1
                    ? "border-amber-400 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900"
                    : p.rank === 2
                    ? "border-slate-300 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-900"
                    : p.rank === 3
                    ? "border-amber-700/60 bg-gradient-to-b from-orange-50 to-white dark:from-amber-900/20 dark:to-slate-900"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";

                return (
                  <div
                    key={p.student.id}
                    onClick={() => setSelectedStudent(p)}
                    className={`rounded-2xl border-2 p-4 text-center shadow-lg relative flex flex-col items-center justify-between transition hover:-translate-y-1 cursor-pointer ${borderC}`}
                  >
                    <div className="bg-slate-900 text-white font-black text-xs px-3 py-1 rounded-full shadow-md mb-3">
                      {badge}
                    </div>

                    <div className="w-20 h-20 rounded-full border-4 border-amber-400/80 overflow-hidden shadow-md mb-3 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-2xl">
                      {photo ? (
                        <img
                          src={photo}
                          alt={p.student.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{p.student.gender === "ស្រី" ? "👩" : "👨"}</span>
                      )}
                    </div>

                    <div className="space-y-1 w-full">
                      <div className="font-black text-sm text-slate-900 dark:text-white truncate">
                        {p.student.lastName} {p.student.firstName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold">
                        ភេទ: {p.student.gender}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 w-full space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        មធ្យមភាគសរុប
                      </div>
                      <div className="text-2xl font-black text-blue-700 dark:text-blue-300">
                        {fmtAvg(p.cumAvg)}
                      </div>
                      <div
                        className="inline-block px-2.5 py-0.5 rounded text-white text-xs font-extrabold"
                        style={{ backgroundColor: p.grade.c }}
                      >
                        និទ្ទេស {p.grade.l}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 4. PERFORMANCE ANALYTICS & DISTRIBUTION VIEW */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Grade Distribution Bar Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              📊 ការបែងចែកនិទ្ទេសក្នុងថ្នាក់ (Grade Distribution)
            </h4>
            <div className="space-y-2 pt-2">
              {[
                { label: "A (៩.៥-១០)", key: "A", color: "#15803d" },
                { label: "B (៨.០-៩.៤)", key: "B", color: "#1d4ed8" },
                { label: "C (៧.០-៧.៩)", key: "C", color: "#b45309" },
                { label: "D (៦.៥-៦.៩)", key: "D", color: "#c2410c" },
                { label: "E (៥.០-៦.៤)", key: "E", color: "#dc2626" },
                { label: "F (<៥.០)", key: "F", color: "#7f1d1d" },
              ].map((item) => {
                const count = classMetrics.gradeCounts[item.key as keyof typeof classMetrics.gradeCounts];
                const pct = classMetrics.total > 0 ? Math.round((count / classMetrics.total) * 100) : 0;

                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span style={{ color: item.color }}>{item.label}</span>
                      <span>
                        {toKhNum(count)} នាក់ ({toKhNum(pct)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pass vs Fail & Gender Performance */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              ⚖️ លទ្ធផលជាប់/ធ្លាក់ និងសមិទ្ធកម្មតាមភេទ
            </h4>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center space-y-1">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  ✅ ប្រឡងជាប់សរុប
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {toKhNum(classMetrics.passCount)} នាក់
                </div>
                <div className="text-[11px] font-bold text-emerald-700/80">
                  ស្មើនឹង {toKhNum(classMetrics.passPct)}% នៃថ្នាក់
                </div>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-center space-y-1">
                <div className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  ❌ ប្រឡងធ្លាក់សរុប
                </div>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  {toKhNum(classMetrics.total - classMetrics.passCount)} នាក់
                </div>
                <div className="text-[11px] font-bold text-rose-700/80">
                  ស្មើនឹង {toKhNum(100 - classMetrics.passPct)}% នៃថ្នាក់
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 space-y-2 text-xs">
              <div className="font-bold text-slate-700 dark:text-slate-300">
                👩 សិស្សស្រីប្រឡងជាប់: <strong className="text-pink-600">{toKhNum(classMetrics.femalePassCount)} នាក់</strong>
              </div>
              <div className="font-bold text-slate-700 dark:text-slate-300">
                👨 សិស្សប្រុសប្រឡងជាប់: <strong className="text-blue-600">{toKhNum(classMetrics.passCount - classMetrics.femalePassCount)} នាក់</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. INDIVIDUAL STUDENT DETAIL MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border-2 border-blue-500 shrink-0 flex items-center justify-center text-lg">
                  {honorPhotos[selectedStudent.student.id] || selectedStudent.student.photoUrl ? (
                    <img
                      src={honorPhotos[selectedStudent.student.id] || selectedStudent.student.photoUrl}
                      alt={selectedStudent.student.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{selectedStudent.student.gender === "ស្រី" ? "👩" : "👨"}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedStudent.student.lastName} {selectedStudent.student.firstName}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    ភេទ: {selectedStudent.student.gender} · ថ្នាក់ទី {selClass} · ID: {selectedStudent.student.code || selectedStudent.student.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Performance Key Badges */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-2">
                <div className="text-[10px] font-bold text-amber-700">ចំណាត់ថ្នាក់</div>
                <div className="text-base font-black text-amber-800 dark:text-amber-300">
                  #{toKhNum(selectedStudent.rank)}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-2">
                <div className="text-[10px] font-bold text-blue-700">ម.ភាគរួម</div>
                <div className="text-base font-black text-blue-800 dark:text-blue-300">
                  {fmtAvg(selectedStudent.cumAvg)}
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-2">
                <div className="text-[10px] font-bold text-purple-700">និទ្ទេស</div>
                <div
                  className="text-base font-black"
                  style={{ color: selectedStudent.grade.c }}
                >
                  {selectedStudent.grade.l}
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2">
                <div className="text-[10px] font-bold text-emerald-700">លទ្ធផល</div>
                <div
                  className={`text-base font-black ${
                    selectedStudent.result === "ជាប់" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {selectedStudent.result}
                </div>
              </div>
            </div>

            {/* Semester Comparison */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 space-y-1 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex justify-between">
                <span>📚 ឆមាសទី ១: {selectedStudent.s1Avg !== null ? fmtAvg(selectedStudent.s1Avg) : "—"}</span>
                <span>📚 ឆមាសទី ២: {selectedStudent.s2Avg !== null ? fmtAvg(selectedStudent.s2Avg) : "—"}</span>
              </div>
              {selectedStudent.trend !== "none" && (
                <div className="text-[11px] font-semibold text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                  និន្នាការការសិក្សា:{" "}
                  {selectedStudent.trend === "up" ? (
                    <strong className="text-emerald-600">📈 កើនឡើង (+{fmtAvg(selectedStudent.trendDiff)})</strong>
                  ) : selectedStudent.trend === "down" ? (
                    <strong className="text-rose-600">📉 ថយចុះ ({fmtAvg(selectedStudent.trendDiff)})</strong>
                  ) : (
                    <strong className="text-slate-600">➡️ ថេរ</strong>
                  )}
                </div>
              )}
            </div>

            {/* Subject Breakdown Bars */}
            <div className="space-y-2">
              <h4 className="font-black text-xs text-slate-800 dark:text-slate-200">
                📝 សមិទ្ធកម្មតាមមុខវិជ្ជានីមួយៗ:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {SUBJECTS.map((subj) => {
                  const val = selectedStudent.subjectAvgs[subj];
                  const pct = val !== null ? Math.min(100, Math.max(0, (val / 10) * 100)) : 0;

                  return (
                    <div
                      key={subj}
                      className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg space-y-1 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex justify-between font-bold text-[11px]">
                        <span className="truncate">{subj}</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {val !== null ? fmtAvg(val) : "—"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setChartStudentSelection("custom");
                  setCustomSelectedStudentIds([selectedStudent.student.id]);
                  setActiveTab("progress");
                  setSelectedStudent(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                📈 មើលក្រាហ្វិកវឌ្ឍនភាពសិស្សនេះ
              </button>

              <button
                onClick={() => setSelectedStudent(null)}
                className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                បិទ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
