import { Student, ScoreMap } from "../types";

export const CLASSES = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B", "5A", "5B", "6A", "6B", "ML", "HL", "3ក"];

export const MONTHS = ["ធ្នូ", "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];

export const SEMESTERS = [
  { id: "s1", label: "ឆមាស១", months: [0, 1, 2, 3], color: "#2563eb" },
  { id: "s2", label: "ឆមាស២", months: [6, 7, 8], color: "#7c3aed" },
  { id: "annual", label: "ដំណាច់ឆ្នាំ", months: [], color: "#b45309" },
];

export const SUBJECTS = [
  "សមត្ថភាពស្ដាប់", "សមត្ថភាពសរសេរ", "សមត្ថភាពអាន", "សមត្ថភាពនិយាយ",
  "ចំនួន", "រង្វាស់រង្វាល់", "ធរណីមាត្រ", "ពីជគណិត", "ស្ថិតិ",
  "វិទ្យាសាស្ត្រ", "សិក្សាសង្គម", "គេហ-សិល្បៈ", "អប់រំកាយ-សុខភាព", "បំណិន", "ភាសាបរទេស"
];

export const INNER_TABS = [
  { id: "info", icon: "👤", label: "សិស្ស" },
  { id: "scores", icon: "📝", label: "ប្រឡង" },
  { id: "attendance", icon: "✅", label: "អវត្តមាន" },
  { id: "attendance-teacher", icon: "👨‍🏫", label: "វត្តមានគ្រូ" },
  { id: "detail", icon: "📊", label: "លម្អិត" },
  { id: "performance", icon: "📈", label: "សរុបសមិទ្ធកម្ម" },
  { id: "report", icon: "🖨️", label: "របាយការណ៍" },
  { id: "schoolreport", icon: "🏫", label: "របាយការណ៍សាលា" },
  { id: "prischool", icon: "📋", label: "PRI សាលា" },
  { id: "candidate", icon: "📜", label: "សលាកបត្រ/លិខិត" },
  { id: "certificate", icon: "🎓", label: "វិញ្ញាបនបត្រ QR" },
  { id: "honor", icon: "🏆", label: "កិត្តិយស" },
  { id: "gradeanalysis", icon: "🎯", label: "និទ្ទេស" },
  { id: "seating", icon: "🪑", label: "កន្លែងអង្គុយ" },
];

export const KH_ORDER = ["សមត្ថភាពស្ដាប់", "សមត្ថភាពអាន", "សមត្ថភាពនិយាយ", "សមត្ថភាពសរសេរ"];
export const MT_ORDER = ["ចំនួន", "រង្វាស់រង្វាល់", "ពីជគណិត", "ធរណីមាត្រ", "ស្ថិតិ"];

export const BLANK_STUDENT: Omit<Student, "id"> = {
  lastName: "",
  firstName: "",
  gender: "ប្រុស",
  dob: "",
  age: "",
  fatherName: "",
  fatherJob: "",
  motherName: "",
  motherJob: "",
  village: "",
  commune: "",
  district: "",
  province: "",
  phone: "",
};

// Auto Age Calculation
export function calcAge(dob?: string): string {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) {
    age--;
  }
  return age > 0 ? String(age) : "";
}

// Khmer Numbers & Dates
export function toKhNum(n: number | string): string {
  const digits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  return String(n).replace(/\d/g, (c) => digits[+c]);
}

export const KH_MONTHS_SOLAR = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
export const KH_WEEKDAYS = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
export const KH_ANIMALS = ["ជូត", "ឆ្លូវ", "ខាល", "ថោះ", "រោង", "ម្សាញ់", "មមី", "មមែ", "វក", "រកា", "ច", "កុរ"];
export const KH_SAK = ["ឯក", "ទោ", "ត្រី", "ចត្វា", "បញ្ចស័ក", "ឆ", "សប្ត", "អដ្ឋ", "នព", "សំរឹទ្ធ"];

export function moonPhase(date: Date): number {
  const r = new Date("2000-01-06T18:14:00Z");
  const syn = 29.53059;
  const diff = (date.getTime() - r.getTime()) / 864e5 + 7 / 24;
  return ((diff % syn) + syn) % syn;
}

export function khLunarMonth(nm: Date): string {
  const m = nm.getMonth(), d = nm.getDate();
  const ranges: [number, number, number, number, string][] = [
    [1, 6, 2, 17, "ផល្គុន"], [2, 18, 3, 16, "ចេត្រ"], [3, 17, 4, 15, "វិសាខ"],
    [4, 16, 5, 14, "ជេស្ឋ"], [5, 15, 6, 13, "បឋមាសាឍ"], [6, 14, 7, 12, "ស្រាពណ៍"],
    [7, 13, 8, 10, "ភទ្របទ"], [8, 11, 9, 9, "អស្សុជ"], [9, 10, 10, 8, "កក្តិក"],
    [10, 9, 11, 7, "មិគសិរ"], [11, 8, 0, 6, "បុស្ស"]
  ];
  for (const [sm, sd, em, ed, name] of ranges) {
    if (sm > em) {
      if (m === sm && d >= sd) return name;
      if (m === em && d <= ed) return name;
    } else {
      if (m === sm && d >= sd && (m !== em || d <= ed)) return name;
      if (m > sm && m < em) return name;
      if (m === em && d <= ed) return name;
    }
  }
  return "មាឃ";
}

export function khAnimal(date: Date): string {
  const y = date.getFullYear(), mo = date.getMonth(), dy = date.getDate();
  const adj = mo < 3 || (mo === 3 && dy < 14) ? y - 1 : y;
  return KH_ANIMALS[(((adj - 2025 + 5) % 12) + 12) % 12];
}

export function khSak(date: Date): string {
  return KH_SAK[(date.getFullYear() + 544 + 8) % 10];
}

export function fmtKhDate(date: Date) {
  const ph = moonPhase(date);
  const raw = Math.floor(ph);
  const dayType = raw < 15 ? "កើត" : "រោច";
  const dayNum = raw < 15 ? raw + 1 : raw - 14;
  const nm = new Date(date.getTime() - ph * 864e5);
  const lunar = `ថ្ងៃ${KH_WEEKDAYS[date.getDay()]} ${toKhNum(dayNum)}${dayType} ខែ${khLunarMonth(nm)} ឆ្នាំ${khAnimal(date)} ${khSak(date)}ស័ក ព.ស ${toKhNum(date.getFullYear() + 544)}`;
  const solar = `ថ្ងៃទី${toKhNum(date.getDate())} ខែ${KH_MONTHS_SOLAR[date.getMonth()]} ឆ្នាំ${toKhNum(date.getFullYear())}`;
  return { lunar, solar };
}

export function addWD(date: Date, n: number): Date {
  const d = new Date(date);
  let c = 0;
  while (c < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) c++;
  }
  return d;
}

export function getThreeWorkingDates(selMonth: number) {
  const MONTH_MAP = [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const calMonth = MONTH_MAP[selMonth];
  const today = new Date();
  let year = today.getFullYear();
  if (selMonth === 0) {
    year = today.getMonth() >= 1 ? year - 1 : year;
  }
  let d0 = new Date(year, calMonth, 23);
  while (d0.getDay() === 0 || d0.getDay() === 6) {
    d0.setDate(d0.getDate() + 1);
  }
  const d1 = addWD(d0, 1);
  const d2 = addWD(d0, 2);
  return { d0: fmtKhDate(d0), d1: fmtKhDate(d1), d2: fmtKhDate(d2) };
}

// Grading Helpers
export function gradeOf(avg: number) {
  const val = Number(avg);
  if (val >= 9.5) return { l: "A", c: "#15803d" };
  if (val >= 8.0) return { l: "B", c: "#1d4ed8" };
  if (val >= 7.0) return { l: "C", c: "#b45309" };
  if (val >= 6.5) return { l: "D", c: "#c2410c" };
  if (val >= 5.0) return { l: "E", c: "#dc2626" };
  return { l: "F", c: "#7f1d1d" };
}

export function resultOf(avg: number) {
  return Number(avg) >= 5 ? "ជាប់" : "ធ្លាក់";
}

export function truncate2(n: number): number {
  if (isNaN(n) || n === null || n === undefined) return 0;
  return Math.floor((Number(n) + 1e-9) * 100) / 100;
}

export function fmtAvg(n: number): string {
  const v = truncate2(n);
  return v > 0 ? v.toFixed(2) : "0.00";
}

export function getClassEvalSubjectCount(stuList: Student[], scoresMap: Record<string, ScoreMap>): number {
  if (!stuList.length) return SUBJECTS.length;
  const activeSubjs = SUBJECTS.filter(subj => stuList.some(s => {
    const v = scoresMap[s.id]?.[subj];
    return v !== undefined && v !== "" && v !== null && !isNaN(Number(v));
  }));
  return activeSubjs.length > 0 ? activeSubjs.length : SUBJECTS.length;
}

export function getTotal(sid: string, scoresMap: Record<string, ScoreMap>): number {
  let total = 0;
  SUBJECTS.forEach(s => {
    const v = scoresMap[sid]?.[s];
    if (v !== undefined && v !== "" && v !== null && !isNaN(Number(v))) {
      total += Number(v);
    }
  });
  return total;
}

export function getAvg(sid: string, stuList: Student[], scoresMap: Record<string, ScoreMap>): number {
  const tot = getTotal(sid, scoresMap);
  if (tot === 0) {
    const hasAnyScore = SUBJECTS.some(s => {
      const v = scoresMap[sid]?.[s];
      return v !== undefined && v !== "" && v !== null && !isNaN(Number(v));
    });
    if (!hasAnyScore) return 0;
  }
  const evalCount = getClassEvalSubjectCount(stuList, scoresMap);
  return truncate2(tot / evalCount);
}

export function buildRankedList(stuList: Student[], scoresMap: Record<string, ScoreMap>): Student[] {
  const sorted = [...stuList].sort((a, b) => {
    const avgB = truncate2(getAvg(b.id, stuList, scoresMap));
    const avgA = truncate2(getAvg(a.id, stuList, scoresMap));
    if (avgB !== avgA) return avgB - avgA;
    const totB = getTotal(b.id, scoresMap);
    const totA = getTotal(a.id, scoresMap);
    if (totB !== totA) return totB - totA;
    return (a.lastName || "").localeCompare(b.lastName || "", "km");
  });
  
  const result: Student[] = [];
  sorted.forEach((s, i) => {
    const curAvg = truncate2(getAvg(s.id, stuList, scoresMap));
    const prevAvg = i > 0 ? truncate2(getAvg(sorted[i - 1].id, stuList, scoresMap)) : null;
    const isTie = i > 0 && prevAvg !== null && curAvg > 0 && curAvg === prevAvg;
    if (isTie) {
      result.push({ ...s, _rank: result[i - 1]._rank });
    } else {
      result.push({ ...s, _rank: i + 1 });
    }
  });
  return result;
}

export function buildRankedListFromAvgs(
  stuList: Student[],
  getAvgForStudent: (s: Student) => number,
  getSecondaryScore?: (s: Student) => number
): Student[] {
  const sorted = [...stuList].sort((a, b) => {
    const avgA = truncate2(getAvgForStudent(a));
    const avgB = truncate2(getAvgForStudent(b));
    if (avgB !== avgA) return avgB - avgA;
    if (getSecondaryScore) {
      const secA = truncate2(getSecondaryScore(a));
      const secB = truncate2(getSecondaryScore(b));
      if (secB !== secA) return secB - secA;
    }
    return (a.lastName || "").localeCompare(b.lastName || "", "km");
  });

  const result: Student[] = [];
  sorted.forEach((s, i) => {
    const curAvg = truncate2(getAvgForStudent(s));
    const prevAvg = i > 0 ? truncate2(getAvgForStudent(sorted[i - 1])) : null;
    const isTie = i > 0 && prevAvg !== null && curAvg > 0 && curAvg === prevAvg;
    if (isTie) {
      result.push({ ...s, _rank: result[i - 1]._rank });
    } else {
      result.push({ ...s, _rank: i + 1 });
    }
  });
  return result;
}

export function getRank(sid: string, stuList: Student[], scoresMap: Record<string, ScoreMap>): number | string {
  const ranked = buildRankedList(stuList, scoresMap);
  const found = ranked.find(r => r.id === sid);
  return found && found._rank !== undefined ? found._rank : "—";
}

export function isFemaleStudent(gender?: string | null): boolean {
  if (!gender) return false;
  const g = String(gender).trim().toLowerCase();
  return g === "ស្រី" || g.includes("ស្រី") || g === "f" || g === "female" || g === "ស";
}

export interface ReportStats {
  total: number;
  male: number;
  female: number;
  malePct: number;
  femalePct: number;
  grades: Record<string, { count: number; female: number; pct: number; femalePct: number }>;
  passCount: number;
  passFemale: number;
  passPct: number;
  passFemalePct: number;
  failCount: number;
  failFemale: number;
  failPct: number;
  failFemalePct: number;
}

export function computeReportStats(
  students: Student[],
  scoresMap: Record<string, ScoreMap>
): ReportStats {
  const total = students.length;
  if (total === 0) {
    const emptyGrade = { count: 0, female: 0, pct: 0, femalePct: 0 };
    return {
      total: 0, male: 0, female: 0, malePct: 0, femalePct: 0,
      grades: { A: emptyGrade, B: emptyGrade, C: emptyGrade, D: emptyGrade, E: emptyGrade, F: emptyGrade },
      passCount: 0, passFemale: 0, passPct: 0, passFemalePct: 0,
      failCount: 0, failFemale: 0, failPct: 0, failFemalePct: 0,
    };
  }

  const female = students.filter((s) => isFemaleStudent(s.gender)).length;
  const male = total - female;
  const femalePct = total > 0 ? Math.round((female / total) * 100) : 0;
  const malePct = total > 0 ? (100 - femalePct) : 0;

  const gradeCounts: Record<string, { count: number; female: number }> = {
    A: { count: 0, female: 0 },
    B: { count: 0, female: 0 },
    C: { count: 0, female: 0 },
    D: { count: 0, female: 0 },
    E: { count: 0, female: 0 },
    F: { count: 0, female: 0 },
  };

  let passCount = 0;
  let passFemale = 0;
  let failCount = 0;
  let failFemale = 0;

  students.forEach((s) => {
    const avg = getAvg(s.id, students, scoresMap);
    const g = gradeOf(avg).l;
    const isFem = isFemaleStudent(s.gender);
    if (gradeCounts[g]) {
      gradeCounts[g].count++;
      if (isFem) {
        gradeCounts[g].female++;
      }
    }
    if (avg >= 5.0) {
      passCount++;
      if (isFem) passFemale++;
    } else {
      failCount++;
      if (isFem) failFemale++;
    }
  });

  const passPct = total > 0 ? Math.round((passCount / total) * 100) : 0;
  const failPct = total > 0 ? 100 - passPct : 0;
  const passFemalePct = female > 0 ? Math.round((passFemale / female) * 100) : 0;
  const failFemalePct = female > 0 ? 100 - passFemalePct : 0;

  const gradesFormatted: Record<string, { count: number; female: number; pct: number; femalePct: number }> = {};
  ["A", "B", "C", "D", "E", "F"].forEach((letter) => {
    const cnt = gradeCounts[letter].count;
    const fem = gradeCounts[letter].female;
    const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
    const femalePct = female > 0 ? Math.round((fem / female) * 100) : 0;
    gradesFormatted[letter] = { count: cnt, female: fem, pct, femalePct };
  });

  return {
    total,
    male,
    female,
    malePct,
    femalePct,
    grades: gradesFormatted,
    passCount,
    passFemale,
    passPct,
    passFemalePct,
    failCount,
    failFemale,
    failPct,
    failFemalePct,
  };
}

export function computeReportStatsFromAvgs(
  students: Student[],
  getAvgForStudent: (s: Student) => number
): ReportStats {
  const total = students.length;
  if (total === 0) {
    const emptyGrade = { count: 0, female: 0, pct: 0, femalePct: 0 };
    return {
      total: 0, male: 0, female: 0, malePct: 0, femalePct: 0,
      grades: { A: emptyGrade, B: emptyGrade, C: emptyGrade, D: emptyGrade, E: emptyGrade, F: emptyGrade },
      passCount: 0, passFemale: 0, passPct: 0, passFemalePct: 0,
      failCount: 0, failFemale: 0, failPct: 0, failFemalePct: 0,
    };
  }

  const female = students.filter((s) => isFemaleStudent(s.gender)).length;
  const male = total - female;
  const femalePct = total > 0 ? Math.round((female / total) * 100) : 0;
  const malePct = total > 0 ? (100 - femalePct) : 0;

  const gradeCounts: Record<string, { count: number; female: number }> = {
    A: { count: 0, female: 0 },
    B: { count: 0, female: 0 },
    C: { count: 0, female: 0 },
    D: { count: 0, female: 0 },
    E: { count: 0, female: 0 },
    F: { count: 0, female: 0 },
  };

  let passCount = 0;
  let passFemale = 0;
  let failCount = 0;
  let failFemale = 0;

  students.forEach((s) => {
    const avg = getAvgForStudent(s);
    const g = gradeOf(avg).l;
    const isFem = isFemaleStudent(s.gender);
    if (gradeCounts[g]) {
      gradeCounts[g].count++;
      if (isFem) {
        gradeCounts[g].female++;
      }
    }
    if (avg >= 5.0) {
      passCount++;
      if (isFem) passFemale++;
    } else {
      failCount++;
      if (isFem) failFemale++;
    }
  });

  const passPct = total > 0 ? Math.round((passCount / total) * 100) : 0;
  const failPct = total > 0 ? 100 - passPct : 0;
  const passFemalePct = female > 0 ? Math.round((passFemale / female) * 100) : 0;
  const failFemalePct = female > 0 ? 100 - passFemalePct : 0;

  const gradesFormatted: Record<string, { count: number; female: number; pct: number; femalePct: number }> = {};
  ["A", "B", "C", "D", "E", "F"].forEach((letter) => {
    const cnt = gradeCounts[letter].count;
    const fem = gradeCounts[letter].female;
    const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
    const femalePct = female > 0 ? Math.round((fem / female) * 100) : 0;
    gradesFormatted[letter] = { count: cnt, female: fem, pct, femalePct };
  });

  return {
    total,
    male,
    female,
    malePct,
    femalePct,
    grades: gradesFormatted,
    passCount,
    passFemale,
    passPct,
    passFemalePct,
    failCount,
    failFemale,
    failPct,
    failFemalePct,
  };
}
