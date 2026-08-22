import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Student, ScoreMap, AttendanceMap, TeacherProfile, InvigilatorData, ReportType } from "../types";
import {
  MONTHS, SEMESTERS, SUBJECTS,
  fmtAvg, gradeOf, resultOf, getTotal, getAvg, getRank, buildRankedList, buildRankedListFromAvgs,
  KH_ORDER, MT_ORDER, computeReportStats, computeReportStatsFromAvgs, toKhNum, getClassEvalSubjectCount, truncate2,
  isFemaleStudent
} from "../lib/constants";
import {
  buildSignatureHtml, buildInvigilatorBoxHTML, buildCandidateDocHTML, buildCertificateHTML,
  buildStudentCardHTML, buildTraineeBookHTML, buildStudentQRCardsTablePrintHTML, printHTML, generateStudentQRCodeDataUrl
} from "../lib/printUtils";
import {
  buildHonorAllPrintHTML, buildHonorTop5PrintHTML, buildPublicNoticePrintHTML,
  buildLearningAgreementPrintHTML, buildIndividualAnnualLearningPlanPrintHTML
} from "../lib/printUtilsHelpers";
import { PtomRecord } from "../types";
import { QRScannerModal } from "./Modals/QRScannerModal";
import * as XLSX from "xlsx";

interface ReportsViewProps {
  students: Student[];
  scoresMap: Record<string, ScoreMap>;
  attendanceMap: Record<string, AttendanceMap>;
  honorPhotos: Record<string, string>;
  selClass: string;
  semester: string;
  selMonth: number;
  teacher: TeacherProfile | null;
  invigilatorData: InvigilatorData;
  reportType: ReportType;
  onReportTypeChange: (type: ReportType) => void;
  onOpenInvigilatorModal: () => void;
  onOpenVerifyModal: (student: Student) => void;
  onSaveCoreGrades: () => Promise<void>;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
  allMonthsScores?: Record<string, Record<string, ScoreMap>>;
  onOpenGmailModal?: (params?: { recipient?: string; subject?: string; htmlBody?: string }) => void;
  ptomRecords?: Record<string, PtomRecord>;
  onOpenPtomModal?: (studentId?: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  students,
  scoresMap,
  attendanceMap,
  honorPhotos,
  selClass,
  semester,
  selMonth,
  teacher,
  invigilatorData,
  reportType,
  onReportTypeChange,
  onOpenInvigilatorModal,
  onOpenVerifyModal,
  onSaveCoreGrades,
  toast,
  allMonthsScores = {},
  onOpenGmailModal,
  ptomRecords = {},
  onOpenPtomModal,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("__all__");
  const [studentCardSem, setStudentCardSem] = useState<string>(semester !== "annual" ? semester : "s1");
  const [agreementSubTab, setAgreementSubTab] = useState<"agreement" | "learningplan">("agreement");

  // Certificate & Student List Filtering States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [certQrUrls, setCertQrUrls] = useState<Record<string, string>>({});
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);

  // QR Code Sheet (Cut & Distribute) States
  const [qrLayoutMode, setQrLayoutMode] = useState<"cards" | "table">("cards");
  const [qrSheetUrls, setQrSheetUrls] = useState<Record<string, string>>({});
  const [isGeneratingQrSheet, setIsGeneratingQrSheet] = useState<boolean>(false);

  const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`.trim();
  const schoolName = teacher?.school || "សាលាបឋមសិក្សា";

  // Compute Filtered Students based on search, gender, result, grade, and student selection
  const filteredStudents = students.filter((s) => {
    if (selectedStudentId !== "__all__" && s.id !== selectedStudentId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const fullName = `${s.lastName || ""} ${s.firstName || ""} ${s.latinName || ""} ${s.code || ""}`.toLowerCase();
      if (!fullName.includes(q)) return false;
    }

    if (genderFilter !== "all" && s.gender !== genderFilter) return false;

    const annualAvg = getAvg(s.id, students, scoresMap);
    const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;

    if (resultFilter !== "all") {
      const isPass = avgVal !== null && avgVal >= 5.0;
      if (resultFilter === "pass" && !isPass) return false;
      if (resultFilter === "fail" && isPass) return false;
    }

    if (gradeFilter !== "all") {
      const g = avgVal !== null ? gradeOf(avgVal).l : "F";
      if (g !== gradeFilter) return false;
    }

    return true;
  });

  // Pre-generate QR Codes for Web Preview when reportType is certificate
  React.useEffect(() => {
    if (reportType === "certificate") {
      let active = true;
      const generateAll = async () => {
        setIsGeneratingQr(true);
        const newUrls: Record<string, string> = {};
        for (const s of filteredStudents) {
          const annualAvg = getAvg(s.id, students, scoresMap);
          const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
          const g = avgVal !== null ? gradeOf(avgVal).l : "—";
          const rank = getRank(s.id, students, scoresMap);
          const url = await generateStudentQRCodeDataUrl(s, selClass, schoolName, avgVal, g, rank, teacher);
          newUrls[s.id] = url;
        }
        if (active) {
          setCertQrUrls(newUrls);
          setIsGeneratingQr(false);
        }
      };
      generateAll();
      return () => {
        active = false;
      };
    }
  }, [reportType, filteredStudents.length, selectedStudentId, searchQuery, genderFilter, resultFilter, gradeFilter, selClass, schoolName]);

  // Pre-generate QR Codes for QR Sheet
  React.useEffect(() => {
    if (reportType === "qr_sheet") {
      let active = true;
      const generateAllQrSheet = async () => {
        setIsGeneratingQrSheet(true);
        const newUrls: Record<string, string> = { ...qrSheetUrls };
        const missing = filteredStudents.filter((s) => !newUrls[s.id]);
        for (const s of missing) {
          try {
            const url = await generateStudentQRCodeDataUrl(s, selClass, schoolName, students, scoresMap, teacher);
            newUrls[s.id] = url;
          } catch (e) {
            console.error("QR gen error:", e);
          }
        }
        if (active) {
          setQrSheetUrls(newUrls);
          setIsGeneratingQrSheet(false);
        }
      };
      generateAllQrSheet();
      return () => {
        active = false;
      };
    }
  }, [reportType, filteredStudents.length, selectedStudentId, searchQuery, genderFilter, resultFilter, gradeFilter, selClass, schoolName]);

  const getStudentSemesterExamAvg = (sid: string): number => {
    const semId = semester !== "annual" ? semester : "s1";
    let examScores = undefined;
    if (semId === "s1") {
      examScores = allMonthsScores?.["s1_3"]?.[sid];
    } else if (semId === "s2") {
      examScores = allMonthsScores?.["s2_8"]?.[sid] || allMonthsScores?.["s2_7"]?.[sid] || allMonthsScores?.["s2_6"]?.[sid];
    }
    if ((!examScores || Object.keys(examScores).length === 0) && semId === semester) {
      examScores = scoresMap[sid];
    }
    if (!examScores) return 0;
    let total = 0, hasAny = false;
    SUBJECTS.forEach((s) => {
      const v = examScores![s];
      if (v !== undefined && v !== "" && v !== null && !isNaN(Number(v))) {
        total += Number(v);
        hasAny = true;
      }
    });
    if (!hasAny) return 0;
    const evalCount = getClassEvalSubjectCount(students, scoresMap);
    return truncate2(total / evalCount);
  };

  const getStudentSemesterMonthlyAvg = (sid: string): string => {
    const semId = semester !== "annual" ? semester : "s1";
    const semConfig = SEMESTERS.find((s) => s.id === semId) || SEMESTERS[0];
    const months = semConfig.months;

    const mAvgs = months.map((mIdx) => {
      const key = `${semId}_${mIdx}`;
      const monthData = allMonthsScores?.[key] || {};
      let stuScores = monthData[sid];
      if ((!stuScores || Object.keys(stuScores).length === 0) && semId === semester && mIdx === selMonth) {
        stuScores = scoresMap[sid];
      }
      if (!stuScores) return null;
      const keys = Object.keys(stuScores).filter(
        (k) => stuScores![k] !== "" && stuScores![k] !== undefined && !isNaN(Number(stuScores![k]))
      );
      if (!keys.length) return null;
      const sum = keys.reduce((acc, k) => acc + Number(stuScores![k]), 0);
      const evalCount = getClassEvalSubjectCount(students, scoresMap);
      return truncate2(sum / evalCount);
    });

    const validMAvgs = mAvgs.filter((v): v is number => v !== null);
    let monthlyAvg: number | null = null;
    if (validMAvgs.length > 0) {
      monthlyAvg = truncate2(validMAvgs.reduce((a, b) => a + b, 0) / validMAvgs.length);
    }

    if (monthlyAvg !== null) {
      return fmtAvg(monthlyAvg);
    }

    const fallbackAvg = getAvg(sid, students, scoresMap);
    return fallbackAvg > 0 ? fmtAvg(fallbackAvg) : "—";
  };

  const getStudentSemesterFinalAvg = (sid: string): number => {
    const semMonthlyAvg = getStudentSemesterMonthlyAvg(sid);
    const numMonthlyAvg = Number(semMonthlyAvg);
    const examAvg = getStudentSemesterExamAvg(sid);

    let semAvgVal = 0;
    if (!isNaN(numMonthlyAvg) && numMonthlyAvg > 0 && examAvg > 0) {
      semAvgVal = truncate2((numMonthlyAvg + examAvg) / 2);
    } else if (!isNaN(numMonthlyAvg) && numMonthlyAvg > 0) {
      semAvgVal = numMonthlyAvg;
    } else if (examAvg > 0) {
      semAvgVal = examAvg;
    }
    return semAvgVal;
  };

  const computeAnnualDataForStudents = useCallback(() => {
    const getSemesterAvgForStudent = (sid: string, semId: "s1" | "s2") => {
      const semConfig = SEMESTERS.find((s) => s.id === semId);
      if (!semConfig) return null;
      
      // Calculate Monthly Average
      const mAvgs: number[] = [];
      semConfig.months.forEach((mIdx) => {
        const key = `${semId}_${mIdx}`;
        const monthData = allMonthsScores?.[key];
        if (monthData && monthData[sid]) {
          const stuScores = monthData[sid];
          const valids = Object.values(stuScores)
            .filter((v) => v !== "" && v !== null && v !== undefined && !isNaN(Number(v)))
            .map(Number);
          if (valids.length > 0) {
            const sum = valids.reduce((a, b) => a + b, 0);
            const evalCount = getClassEvalSubjectCount(students, scoresMap);
            mAvgs.push(truncate2(sum / evalCount));
          }
        }
      });
      
      const monthlyAvg = mAvgs.length > 0 ? truncate2(mAvgs.reduce((a, b) => a + b, 0) / mAvgs.length) : null;
      
      // Calculate Exam Average
      let examScores = undefined;
      if (semId === "s1") {
        examScores = allMonthsScores?.["s1_3"]?.[sid];
      } else {
        examScores = allMonthsScores?.["s2_8"]?.[sid] || allMonthsScores?.["s2_7"]?.[sid] || allMonthsScores?.["s2_6"]?.[sid];
      }
      
      let examAvg: number | null = null;
      if (examScores && Object.keys(examScores).length > 0) {
         let total = 0, hasAny = false;
         SUBJECTS.forEach(s => {
           const v = examScores![s];
           if (v !== undefined && v !== "" && v !== null && !isNaN(Number(v))) {
             total += Number(v);
             hasAny = true;
           }
         });
         if (hasAny) {
           const evalCount = getClassEvalSubjectCount(students, scoresMap);
           examAvg = truncate2(total / evalCount);
         }
      }
      
      if (monthlyAvg !== null && examAvg !== null) {
        return truncate2((monthlyAvg + examAvg) / 2);
      } else if (monthlyAvg !== null) {
        return truncate2(monthlyAvg);
      } else if (examAvg !== null) {
        return truncate2(examAvg);
      }
      return null;
    };

    const rawData = students.map((s) => {
      const s1Avg = getSemesterAvgForStudent(s.id, "s1");
      const s2Avg = getSemesterAvgForStudent(s.id, "s2");

      let annualAvg: number | null = null;
      if (s1Avg !== null && s2Avg !== null) {
        annualAvg = truncate2((s1Avg + s2Avg) / 2);
      } else if (s1Avg !== null) {
        annualAvg = truncate2(s1Avg);
      } else if (s2Avg !== null) {
        annualAvg = truncate2(s2Avg);
      } else {
        const fallbackAvg = getAvg(s.id, students, scoresMap);
        annualAvg = fallbackAvg > 0 ? truncate2(fallbackAvg) : null;
      }

      const stuAtt = attendanceMap[s.id] || {};
      const attVals = Object.values(stuAtt);
      const pCount = attVals.filter((v) => v === "P").length;
      const aCount = attVals.filter((v) => v === "A").length;
      const totalAbs = pCount + aCount;

      return {
        student: s,
        s1Avg,
        s2Avg,
        annualAvg,
        pCount,
        aCount,
        totalAbs,
      };
    });

    const sortedS1 = [...rawData]
      .filter((r) => r.s1Avg !== null)
      .sort((a, b) => {
        const avgB = truncate2(b.s1Avg || 0);
        const avgA = truncate2(a.s1Avg || 0);
        if (avgB !== avgA) return avgB - avgA;
        return (a.student.lastName || "").localeCompare(b.student.lastName || "", "km");
      });
    const s1RankMap: Record<string, number> = {};
    sortedS1.forEach((item, idx) => {
      const curAvg = truncate2(item.s1Avg || 0);
      const prevAvg = idx > 0 ? truncate2(sortedS1[idx - 1].s1Avg || 0) : null;
      if (idx > 0 && prevAvg !== null && curAvg === prevAvg) {
        s1RankMap[item.student.id] = s1RankMap[sortedS1[idx - 1].student.id];
      } else {
        s1RankMap[item.student.id] = idx + 1;
      }
    });

    const sortedS2 = [...rawData]
      .filter((r) => r.s2Avg !== null)
      .sort((a, b) => {
        const avgB = truncate2(b.s2Avg || 0);
        const avgA = truncate2(a.s2Avg || 0);
        if (avgB !== avgA) return avgB - avgA;
        return (a.student.lastName || "").localeCompare(b.student.lastName || "", "km");
      });
    const s2RankMap: Record<string, number> = {};
    sortedS2.forEach((item, idx) => {
      const curAvg = truncate2(item.s2Avg || 0);
      const prevAvg = idx > 0 ? truncate2(sortedS2[idx - 1].s2Avg || 0) : null;
      if (idx > 0 && prevAvg !== null && curAvg === prevAvg) {
        s2RankMap[item.student.id] = s2RankMap[sortedS2[idx - 1].student.id];
      } else {
        s2RankMap[item.student.id] = idx + 1;
      }
    });

    const sortedAnnual = [...rawData]
      .filter((r) => r.annualAvg !== null)
      .sort((a, b) => {
        const avgB = truncate2(b.annualAvg || 0);
        const avgA = truncate2(a.annualAvg || 0);
        if (avgB !== avgA) return avgB - avgA;
        return (a.student.lastName || "").localeCompare(b.student.lastName || "", "km");
      });
    const annualRankMap: Record<string, number> = {};
    sortedAnnual.forEach((item, idx) => {
      const curAvg = truncate2(item.annualAvg || 0);
      const prevAvg = idx > 0 ? truncate2(sortedAnnual[idx - 1].annualAvg || 0) : null;
      if (idx > 0 && prevAvg !== null && curAvg === prevAvg) {
        annualRankMap[item.student.id] = annualRankMap[sortedAnnual[idx - 1].student.id];
      } else {
        annualRankMap[item.student.id] = idx + 1;
      }
    });

    return rawData.map((item) => ({
      ...item,
      s1Rank: item.s1Avg !== null ? (s1RankMap[item.student.id] ?? null) : null,
      s2Rank: item.s2Avg !== null ? (s2RankMap[item.student.id] ?? null) : null,
      annualRank: item.annualAvg !== null ? (annualRankMap[item.student.id] ?? null) : null,
    }));
  }, [students, scoresMap, allMonthsScores, attendanceMap]);

  const isSemester = reportType === "semester";
  const isAnnual = reportType === "annual";

  const ranked = useMemo(() => {
    if (isAnnual) {
      const annualData = computeAnnualDataForStudents();
      const studentMap = new Map(students.map((s) => [s.id, s]));
      const sorted = [...annualData].sort((a, b) => {
        if (a.annualAvg !== null && b.annualAvg !== null) {
          const avgB = truncate2(b.annualAvg);
          const avgA = truncate2(a.annualAvg);
          if (avgB !== avgA) return avgB - avgA;
        }
        if (a.annualAvg !== null && b.annualAvg === null) return -1;
        if (a.annualAvg === null && b.annualAvg !== null) return 1;
        return (a.student.lastName || "").localeCompare(b.student.lastName || "", "km");
      });
      return sorted.map((item) => {
        const s = studentMap.get(item.student.id) || item.student;
        return {
          ...s,
          _rank: item.annualRank !== null ? item.annualRank : undefined,
        };
      });
    }
    if (isSemester) {
      return buildRankedListFromAvgs(
        students,
        (s) => getStudentSemesterFinalAvg(s.id),
        (s) => getStudentSemesterExamAvg(s.id)
      );
    }
    return buildRankedList(students, scoresMap);
  }, [students, scoresMap, allMonthsScores, semester, selMonth, isSemester, isAnnual, attendanceMap]);

  const stats = useMemo(() => {
    if (isAnnual) {
      const annualData = computeAnnualDataForStudents();
      const avgMap = new Map<string, number>();
      annualData.forEach((d) => {
        if (d.annualAvg !== null && d.annualAvg > 0) {
          avgMap.set(d.student.id, truncate2(d.annualAvg));
        }
      });
      return computeReportStatsFromAvgs(students, (s) => avgMap.get(s.id) ?? 0);
    }
    if (isSemester) {
      return computeReportStatsFromAvgs(students, (s) => getStudentSemesterFinalAvg(s.id));
    }
    return computeReportStats(students, scoresMap);
  }, [students, scoresMap, allMonthsScores, semester, selMonth, isSemester, isAnnual, attendanceMap]);

  const halfIndex = Math.ceil(ranked.length / 2);
  const leftRanked = ranked.slice(0, halfIndex);
  const rightRanked = ranked.slice(halfIndex);

  // Helper to render student ranking table chunk with equal height padding
  const targetRows = Math.max(leftRanked.length, rightRanked.length);

  const renderRankTable = (list: Student[], startIdx: number) => {
    const missingRows = Math.max(0, targetRows - list.length);

    return (
      <div className="overflow-x-auto w-full">
        <table className="rank-table w-full border-collapse border border-slate-300 text-[13px] min-w-[340px]">
          <thead className="sticky top-0 z-10 bg-blue-100 shadow-xs">
            <tr className="bg-blue-100/90 border border-slate-300">
              <th className="border border-slate-300 py-2.5 px-1 text-center w-7 sticky top-0 bg-blue-100 z-10">ល.រ</th>
              <th className="border border-slate-300 py-2.5 px-1.5 text-left min-w-[100px] sticky top-0 bg-blue-100 z-10">គោត្តនាម-នាម</th>
              <th className="border border-slate-300 py-2.5 px-1 text-center w-8 sticky top-0 bg-blue-100 z-10">ភេទ</th>
              <th className="border border-slate-300 py-2.5 px-1 text-center min-w-[70px] sticky top-0 bg-blue-100 z-10">ថ្ងៃខែឆ្នាំកំណើត</th>
              {isSemester ? (
                <>
                  <th className="border border-slate-300 py-2.5 px-1 text-center w-12 sticky top-0 bg-blue-100 z-10">មធ្យមភាគខែ</th>
                  <th className="border border-slate-300 py-2.5 px-1 text-center w-12 sticky top-0 bg-blue-100 z-10">ម.ប្រឡង</th>
                  <th className="border border-slate-300 py-2.5 px-1 text-center w-12 sticky top-0 bg-blue-100 z-10">ម.ប្រចាំឆមាស</th>
                </>
              ) : (
                <>
                  <th className="border border-slate-300 py-2.5 px-1 text-center w-12 sticky top-0 bg-blue-100 z-10">ពិន្ទុសរុប</th>
                  <th className="border border-slate-300 py-2.5 px-1 text-center w-12 sticky top-0 bg-blue-100 z-10">ម.ប្រឡង</th>
                </>
              )}
              <th className="border border-slate-300 py-2.5 px-1 text-center w-10 sticky top-0 bg-blue-100 z-10">ចំ.ថ្នាក់</th>
              <th className="border border-slate-300 py-2.5 px-1 text-center w-10 sticky top-0 bg-blue-100 z-10">និទ្ទេស</th>
            </tr>
          </thead>
        <tbody>
          {list.map((s, idx) => {
            const rowIdx = startIdx + idx;
            const total = getTotal(s.id, scoresMap);
            const examAvg = isSemester ? getStudentSemesterExamAvg(s.id) : getAvg(s.id, students, scoresMap);
            const semMonthlyAvg = getStudentSemesterMonthlyAvg(s.id);
            const finalAvg = isSemester ? getStudentSemesterFinalAvg(s.id) : examAvg;
            const g = gradeOf(finalAvg);

            return (
              <tr key={s.id} className={idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                <td className="border border-slate-300 py-2.5 px-1 text-center font-semibold">{rowIdx + 1}</td>
                <td className="border border-slate-300 py-2.5 px-1.5 text-left font-bold text-slate-800 whitespace-nowrap">
                  {s.lastName} {s.firstName}
                </td>
                <td className="border border-slate-300 py-2.5 px-1 text-center">{s.gender === "ស្រី" ? "ស្រី" : "ប្រុស"}</td>
                <td className="border border-slate-300 py-2.5 px-1 text-center text-slate-600 text-[11.5px] whitespace-nowrap">{s.dob || "—"}</td>
                {isSemester ? (
                  <>
                    <td className="border border-slate-300 py-2.5 px-1 text-center font-extrabold text-blue-700">{semMonthlyAvg}</td>
                    <td className="border border-slate-300 py-2.5 px-1 text-center font-extrabold">{fmtAvg(examAvg)}</td>
                    <td className="border border-slate-300 py-2.5 px-1 text-center font-extrabold text-indigo-700">{fmtAvg(finalAvg)}</td>
                  </>
                ) : (
                  <>
                    <td className="border border-slate-300 py-2.5 px-1 text-center font-extrabold text-blue-700">{total}</td>
                    <td className="border border-slate-300 py-2.5 px-1 text-center font-extrabold">{fmtAvg(examAvg)}</td>
                  </>
                )}
                <td className="border border-slate-300 py-2.5 px-1 text-center font-bold">{s._rank || rowIdx + 1}</td>
                <td className="border border-slate-300 py-2.5 px-1 text-center font-black" style={{ color: g.c }}>
                  {g.l}
                </td>
              </tr>
            );
          })}
          {Array.from({ length: missingRows }).map((_, i) => (
            <tr key={`empty-${i}`} className={(list.length + i) % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
              <td className="border border-slate-300 py-2.5 px-1 text-center text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-2.5 px-1.5 text-left text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-2.5 px-1 text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-2.5 px-1 text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-2.5 px-1 text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-2.5 px-1 text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-2.5 px-1 text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-2.5 px-1 text-transparent">&nbsp;</td>
              {isSemester && <td className="border border-slate-300 py-2.5 px-1 text-transparent">&nbsp;</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    );
  };
  
  const renderPriReport = () => {
    const semId = semester !== "annual" ? semester : "s1";
    
    const initTally = () => ({
      female: Array(11).fill(0),
      male: Array(11).fill(0)
    });
    
    const tallies = {
      khmer: initTally(),
      math: initTally(),
      social: initTally(),
      science: initTally()
    };
    
    students.forEach(s => {
      let examScores = undefined;
      // សម្រាប់ PRI គឺយកពិន្ទុចុងឆ្នាំ (ខែសីហា s2_8) ឬ ខែកក្កដា (s2_7) ឬខែដែលជ្រើសរើស
      examScores = allMonthsScores?.["s2_8"]?.[s.id];
      if (!examScores || Object.keys(examScores).length === 0) {
        examScores = allMonthsScores?.["s2_7"]?.[s.id];
      }
      if (!examScores || Object.keys(examScores).length === 0) {
        examScores = allMonthsScores?.["s2_6"]?.[s.id];
      }
      if (!examScores || Object.keys(examScores).length === 0) {
        examScores = allMonthsScores?.[`${semester}_${selMonth}`]?.[s.id];
      }
      if (!examScores || Object.keys(examScores).length === 0) {
        examScores = scoresMap[s.id];
      }
      if (!examScores || Object.keys(examScores).length === 0) {
        if (allMonthsScores) {
          for (const k of Object.keys(allMonthsScores)) {
            if (allMonthsScores[k]?.[s.id] && Object.keys(allMonthsScores[k][s.id]).length > 0) {
              examScores = allMonthsScores[k][s.id];
              break;
            }
          }
        }
      }
      if (!examScores) return;

      const isFemale = isFemaleStudent(s.gender);
      const gKey = isFemale ? "female" : "male";
      
      const getScore = (type: string) => {
        if (type === "khmer") {
           const keysList = [
             ["សមត្ថភាពស្ដាប់", "សមត្ថភាពស្តាប់", "ស្ដាប់", "ស្តាប់"],
             ["សមត្ថភាពអាន", "អាន", "អំណាន"],
             ["សមត្ថភាពនិយាយ", "និយាយ"],
             ["សមត្ថភាពសរសេរ", "សរសេរ", "សរសេរតាមអាន", "តែងសេចក្តី"]
           ];
           const valids: number[] = [];
           keysList.forEach(aliases => {
             for (const k of aliases) {
               const v = examScores[k];
               if (v !== "" && v !== undefined && v !== null && !isNaN(Number(v))) {
                 valids.push(Number(v));
                 break;
               }
             }
           });
           if (valids.length === 0) {
             const direct = examScores["ភាសាខ្មែរ"] ?? examScores["ខ្មែរ"];
             if (direct !== "" && direct !== undefined && direct !== null && !isNaN(Number(direct))) {
               return Math.round(Number(direct));
             }
           }
           return valids.length ? Math.round(valids.reduce((a,b)=>a+b,0)/valids.length) : null;
        } else if (type === "math") {
           const keysList = [
             ["ចំនួន", "ចំនួននិងប្រមាណវិធី"],
             ["រង្វាស់រង្វាល់"],
             ["ពីជគណិត"],
             ["ធរណីមាត្រ"],
             ["ស្ថិតិ"]
           ];
           const valids: number[] = [];
           keysList.forEach(aliases => {
             for (const k of aliases) {
               const v = examScores[k];
               if (v !== "" && v !== undefined && v !== null && !isNaN(Number(v))) {
                 valids.push(Number(v));
                 break;
               }
             }
           });
           if (valids.length === 0) {
             const direct = examScores["គណិតវិទ្យា"] ?? examScores["គណិត"];
             if (direct !== "" && direct !== undefined && direct !== null && !isNaN(Number(direct))) {
               return Math.round(Number(direct));
             }
           }
           return valids.length ? Math.round(valids.reduce((a,b)=>a+b,0)/valids.length) : null;
        } else if (type === "social") {
           const v = examScores["សិក្សាសង្គម"] ?? examScores["សង្គម"];
           return (v !== "" && v !== undefined && v !== null && !isNaN(Number(v))) ? Math.round(Number(v)) : null;
        } else if (type === "science") {
           const v = examScores["វិទ្យាសាស្ត្រ"];
           return (v !== "" && v !== undefined && v !== null && !isNaN(Number(v))) ? Math.round(Number(v)) : null;
        }
        return null;
      };

      const kh = getScore("khmer");
      const mt = getScore("math");
      const soc = getScore("social");
      const sci = getScore("science");

      if (kh !== null && kh >= 0 && kh <= 10) tallies.khmer[gKey][kh]++;
      if (mt !== null && mt >= 0 && mt <= 10) tallies.math[gKey][mt]++;
      if (soc !== null && soc >= 0 && soc <= 10) tallies.social[gKey][soc]++;
      if (sci !== null && sci >= 0 && sci <= 10) tallies.science[gKey][sci]++;
    });

    const getRow = (title: string, data: any) => {
      const fTally = data.female;
      const fTotal = fTally.reduce((a: number, b: number) => a + b, 0);
      const fPassed = fTally.slice(5).reduce((a: number, b: number) => a + b, 0);
      
      const mTally = data.male;
      const mTotal = mTally.reduce((a: number, b: number) => a + b, 0);
      const mPassed = mTally.slice(5).reduce((a: number, b: number) => a + b, 0);

      return `
        <tr>
          <td rowspan="2" class="border border-slate-300 p-1.5 text-left font-bold text-[12px]">${title}</td>
          <td class="border border-slate-300 p-1.5 text-center text-[11px] font-bold">ស្រី</td>
          ${fTally.map((v: number) => `<td class="border border-slate-300 p-1 text-center font-semibold text-[11px]">${v || ''}</td>`).join('')}
          <td class="border border-slate-300 p-1.5 text-center font-extrabold text-[11px] bg-blue-50/50 text-blue-900">${fTotal || ''}</td>
          <td class="border border-slate-300 p-1.5 text-center font-extrabold text-[11px] bg-emerald-50/50 text-emerald-900">${fPassed || ''}</td>
        </tr>
        <tr>
          <td class="border border-slate-300 p-1.5 text-center text-[11px] font-bold">ប្រុស</td>
          ${mTally.map((v: number) => `<td class="border border-slate-300 p-1 text-center font-semibold text-[11px]">${v || ''}</td>`).join('')}
          <td class="border border-slate-300 p-1.5 text-center font-extrabold text-[11px] bg-blue-50/50 text-blue-900">${mTotal || ''}</td>
          <td class="border border-slate-300 p-1.5 text-center font-extrabold text-[11px] bg-emerald-50/50 text-emerald-900">${mPassed || ''}</td>
        </tr>
      `;
    };

    const semLabel = SEMESTERS.find(s => s.id === semId)?.label || semId;

    return `
      <div class="space-y-6 max-w-4xl mx-auto p-2">
        <div class="text-center mb-6">
          <h2 class="font-black text-sm mb-1 text-slate-900 leading-tight">
            ព្រះរាជាណាចក្រកម្ពុជា<br/>
            ជាតិ សាសនា ព្រះមហាក្សត្រ<br/>
            <span class="text-[10px] text-amber-800 font-normal">꧁ ༺ ༻ ꧂</span>
          </h2>
        </div>
        
        <div class="text-center mb-6">
          <h2 class="font-extrabold text-[15px] mb-1 text-slate-900 leading-relaxed">
            តារាងសរុបពិន្ទុសិស្សតាមមុខវិជ្ជាសម្រាប់សាលាបឋមសិក្សា<br/>
            ឆ្នាំសិក្សា២០២៥-២០២៦<br/>
            ( សម្រាប់គ្រូ )
          </h2>
        </div>
        <div class="text-[12px] font-bold text-slate-800 mb-4 px-1 leading-8">
          <div class="flex items-center gap-2">
             <span>រាជធានី/ខេត្ត:</span> <span class="border-b border-dotted border-slate-500 flex-1">${teacher?.province || ""}</span>
             <span>ក្រុង ស្រុក ខណ្ឌ:</span> <span class="border-b border-dotted border-slate-500 flex-1">${teacher?.district || ""}</span>
             <span>ឃុំ សង្កាត់:</span> <span class="border-b border-dotted border-slate-500 flex-1">${teacher?.commune || ""}</span>
          </div>
          <div class="flex items-center gap-2">
             <span>ឈ្មោះសាលា:</span> <span class="border-b border-dotted border-slate-500 flex-1">${teacher?.school || ""}</span>
             <span>ទូរស័ព្ទអ្នកបំពេញ:</span> <span class="border-b border-dotted border-slate-500 flex-1">${teacher?.phone || ""}</span>
             <span>ថ្នាក់ទី:</span> <span class="border-b border-dotted border-slate-500 w-24 text-center text-blue-900">${selClass}</span>
          </div>
        </div>


        <table class="w-full text-xs border-collapse border border-slate-400 text-center shadow-sm">
          <thead>
            <tr class="bg-slate-200/60 font-bold text-slate-900">
              <th rowspan="2" class="border border-slate-400 p-2 w-28 text-[12px]">មុខវិជ្ជា</th>
              <th rowspan="2" class="border border-slate-400 p-2 w-12 text-[12px]">ភេទ</th>
              <th colspan="11" class="border border-slate-400 p-1.5 text-[12px]">ចំនួនសិស្សស្រី/ប្រុសតាមកម្រិតពិន្ទុ និងមុខវិជ្ជា</th>
              <th rowspan="2" class="border border-slate-400 p-2 w-16 text-[11px] leading-tight">សរុប<br/>សិស្ស</th>
              <th rowspan="2" class="border border-slate-400 p-2 w-20 text-[11px] leading-tight">សរុប<br/>សិស្សជាប់</th>
            </tr>
            <tr class="bg-slate-200/60 font-bold text-[11px] text-slate-800">
              ${[0,1,2,3,4,5,6,7,8,9,10].map(v => `<th class="border border-slate-400 p-1.5 w-7">${v}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${getRow("ភាសាខ្មែរ", tallies.khmer)}
            ${getRow("គណិតវិទ្យា", tallies.math)}
            ${getRow("សិក្សាសង្គម", tallies.social)}
            ${getRow("វិទ្យាសាស្ត្រ", tallies.science)}
          </tbody>
        </table>
        
        
        <div class="flex justify-end mt-12 text-[12px] font-bold text-slate-800 px-4">
          <div class="text-left space-y-2">
            <p>បំពេញនៅថ្ងៃទី ............ / ............ / ២០២......</p>
            <p>បំពេញដោយ : ..............................................</p>
            <p>ហត្ថលេខា : ..............................................</p>
          </div>
        </div>
      </div>

    `;
  };


  const computeCoreGradeRow = (s: Student) => {
    const khRaw = KH_ORDER.map((subj) => scoresMap[s.id]?.[subj]);
    const mtRaw = MT_ORDER.map((subj) => scoresMap[s.id]?.[subj]);
    const khGrades = khRaw.map((v) =>
      v !== "" && v !== undefined && !isNaN(Number(v)) ? gradeOf(Number(v)).l : null
    );
    const mtGrades = mtRaw.map((v) =>
      v !== "" && v !== undefined && !isNaN(Number(v)) ? gradeOf(Number(v)).l : null
    );

    const khValids = khRaw.filter((v) => v !== "" && v !== undefined && !isNaN(Number(v))).map(Number);
    const mtValids = mtRaw.filter((v) => v !== "" && v !== undefined && !isNaN(Number(v))).map(Number);

    const khAvg = khValids.length ? khValids.reduce((a, b) => a + b, 0) / khValids.length : null;
    const mtAvg = mtValids.length ? mtValids.reduce((a, b) => a + b, 0) / mtValids.length : null;

    const khCombined = khAvg !== null ? gradeOf(khAvg).l : null;
    const mtCombined = mtAvg !== null ? gradeOf(mtAvg).l : null;

    return { khGrades, mtGrades, khAvg, mtAvg, khCombined, mtCombined };
  };

  const renderAnnualReportTable = (isPrint: boolean = false) => {
    const annualData = computeAnnualDataForStudents();
    const dataToRender = isPrint
      ? [...annualData].sort((a, b) => {
          if (a.annualAvg !== null && b.annualAvg !== null) {
            const avgB = truncate2(b.annualAvg);
            const avgA = truncate2(a.annualAvg);
            if (avgB !== avgA) return avgB - avgA;
          }
          if (a.annualAvg !== null && b.annualAvg === null) return -1;
          if (a.annualAvg === null && b.annualAvg !== null) return 1;
          return (a.student.lastName || "").localeCompare(b.student.lastName || "", "km");
        })
      : annualData;

    return (
      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse border border-slate-400 text-[10px] text-center" style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #94a3b8" }}>
          <thead>
            <tr className="bg-blue-100 text-slate-900 font-bold" style={{ backgroundColor: "#dbeafe", color: "#0f172a" }}>
              <th rowSpan={2} className="border border-slate-400 p-1 text-center" style={{ width: "28px", border: "1px solid #94a3b8", padding: "3px 2px" }}>
                <p>ល.រ</p>
              </th>
              <th rowSpan={2} className="border border-slate-400 p-1 text-left whitespace-nowrap" style={{ minWidth: "110px", width: "120px", border: "1px solid #94a3b8", padding: "3px 5px", textAlign: "left" }}>
                <p>គោត្តនាម- នាម</p>
              </th>
              <th rowSpan={2} className="border border-slate-400 p-1 text-center whitespace-nowrap" style={{ width: "35px", border: "1px solid #94a3b8", padding: "3px 2px" }}>
                <p>ភេទ</p>
              </th>
              <th rowSpan={2} className="border border-slate-400 p-1 text-center whitespace-nowrap" style={{ width: "72px", border: "1px solid #94a3b8", padding: "3px 2px", textAlign: "center" }}>
                <p style={{ textAlign: "center" }}>ថ្ងៃខែកំណើត</p>
              </th>
              <th rowSpan={2} className="border border-slate-400 p-1 text-left" style={{ minWidth: "150px", border: "1px solid #94a3b8", padding: "3px 5px", textAlign: "left" }}>
                <p>ទីលំនៅបច្ចុប្បន្ន</p>
              </th>
              <th colSpan={2} className="border border-slate-400 p-1 text-center" style={{ width: "70px", border: "1px solid #94a3b8", padding: "3px 2px", textAlign: "center" }}>
                <p style={{ textAlign: "center" }}>ឆមាសទី១</p>
              </th>
              <th colSpan={2} className="border border-slate-400 p-1 text-center" style={{ width: "70px", border: "1px solid #94a3b8", padding: "3px 2px", textAlign: "center" }}>
                <p style={{ textAlign: "center" }}>ឆមាសទី២</p>
              </th>
              <th colSpan={2} className="border border-slate-400 p-1 text-center" style={{ width: "74px", border: "1px solid #94a3b8", padding: "3px 2px", textAlign: "center" }}>
                <p style={{ textAlign: "center" }}>ប្រចាំឆ្នាំ</p>
              </th>
              <th rowSpan={2} className="border border-slate-400 p-1 text-center whitespace-nowrap" style={{ width: "32px", border: "1px solid #94a3b8", padding: "3px 2px" }}>
                <p>និទ្ទេស</p>
              </th>
              <th colSpan={3} className="border border-slate-400 p-1 text-center" style={{ width: "68px", border: "1px solid #94a3b8", padding: "3px 2px", textAlign: "center" }}>
                <p style={{ textAlign: "center" }}>អវត្តមាន</p>
              </th>
            </tr>
            <tr className="bg-blue-100 text-slate-900 font-bold text-[9px]" style={{ backgroundColor: "#dbeafe", color: "#0f172a" }}>
              <th className="border border-slate-400 p-0.5" style={{ width: "38px", border: "1px solid #94a3b8", padding: "2px", backgroundColor: "rgba(226, 232, 240, 0.6)" }}>
                <p>ម.ភាគ</p>
              </th>
              <th className="border border-slate-400 p-0.5" style={{ width: "32px", border: "1px solid #94a3b8", padding: "2px", backgroundColor: "rgba(203, 213, 225, 0.6)" }}>
                <p>ចំណាត់</p>
              </th>
              <th className="border border-slate-400 p-0.5" style={{ width: "38px", border: "1px solid #94a3b8", padding: "2px", backgroundColor: "rgba(226, 232, 240, 0.6)" }}>
                <p>ម.ភាគ</p>
              </th>
              <th className="border border-slate-400 p-0.5" style={{ width: "32px", border: "1px solid #94a3b8", padding: "2px", backgroundColor: "rgba(203, 213, 225, 0.6)" }}>
                <p>ចំណាត់</p>
              </th>
              <th className="border border-slate-400 p-0.5" style={{ width: "40px", border: "1px solid #94a3b8", padding: "2px", backgroundColor: "rgba(226, 232, 240, 0.6)" }}>
                <p>ម.ភាគ</p>
              </th>
              <th className="border border-slate-400 p-0.5" style={{ width: "34px", border: "1px solid #94a3b8", padding: "2px", backgroundColor: "rgba(203, 213, 225, 0.6)" }}>
                <p>ចំណាត់</p>
              </th>
              <th className="border border-slate-400 p-0.5" style={{ width: "22px", border: "1px solid #94a3b8", padding: "2px" }}>
                <p>ច្ប</p>
              </th>
              <th className="border border-slate-400 p-0.5" style={{ width: "22px", border: "1px solid #94a3b8", padding: "2px" }}>
                <p>អច្ប</p>
              </th>
              <th className="border border-slate-400 p-0.5" style={{ width: "24px", border: "1px solid #94a3b8", padding: "2px" }}>
                <p>សរុប</p>
              </th>
            </tr>
          </thead>
          <tbody>
            {dataToRender.map((row, idx) => {
              const s = row.student;
              const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
              const addrParts: string[] = [];
              if (s.village) addrParts.push(s.village.startsWith("ភូមិ") ? s.village : `ភូមិ${s.village}`);
              if (s.commune) addrParts.push(s.commune.startsWith("ឃុំ") || s.commune.startsWith("សង្កាត់") ? s.commune : `ឃុំ${s.commune}`);
              if (s.district) addrParts.push(s.district.startsWith("ស្រុក") || s.district.startsWith("ក្រុង") || s.district.startsWith("ខណ្ឌ") ? s.district : `ស្រុក${s.district}`);
              const address = addrParts.join(" ") || "—";
              const gradeInfo = row.annualAvg !== null ? gradeOf(row.annualAvg) : { l: "—", c: "#64748b" };

              return (
                <tr key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="border border-slate-400 p-0.5 text-center font-semibold" style={{ border: "1px solid #94a3b8", padding: "2px" }}>
                    {idx + 1}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-left font-bold text-slate-900 whitespace-nowrap" style={{ border: "1px solid #94a3b8", padding: "2px 5px", textAlign: "left" }}>
                    {fullName}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center whitespace-nowrap" style={{ border: "1px solid #94a3b8", padding: "2px" }}>
                    {s.gender || "—"}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center whitespace-nowrap text-[9.5px]" style={{ border: "1px solid #94a3b8", padding: "2px" }}>
                    {s.dob || "—"}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-left text-[9px] leading-snug" style={{ border: "1px solid #94a3b8", padding: "2px 5px", textAlign: "left" }}>
                    {address}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-semibold" style={{ border: "1px solid #94a3b8", padding: "2px", backgroundColor: "rgba(226, 232, 240, 0.3)" }}>
                    {row.s1Avg !== null ? fmtAvg(row.s1Avg) : "—"}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-semibold" style={{ border: "1px solid #94a3b8", padding: "2px", backgroundColor: "rgba(203, 213, 225, 0.4)" }}>
                    {row.s1Rank !== null ? row.s1Rank : "—"}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-semibold" style={{ border: "1px solid #94a3b8", padding: "2px", backgroundColor: "rgba(226, 232, 240, 0.3)" }}>
                    {row.s2Avg !== null ? fmtAvg(row.s2Avg) : "—"}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-semibold" style={{ border: "1px solid #94a3b8", padding: "2px", backgroundColor: "rgba(203, 213, 225, 0.4)" }}>
                    {row.s2Rank !== null ? row.s2Rank : "—"}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-bold text-blue-900" style={{ border: "1px solid #94a3b8", padding: "2px", color: "#1e3a8a", backgroundColor: "rgba(219, 234, 254, 0.4)" }}>
                    {row.annualAvg !== null ? fmtAvg(row.annualAvg) : "—"}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-bold text-blue-900" style={{ border: "1px solid #94a3b8", padding: "2px", color: "#1e3a8a", backgroundColor: "rgba(191, 219, 254, 0.5)" }}>
                    {row.annualRank !== null ? row.annualRank : "—"}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-black" style={{ border: "1px solid #94a3b8", padding: "2px", color: gradeInfo.c }}>
                    {gradeInfo.l}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center" style={{ border: "1px solid #94a3b8", padding: "2px" }}>
                    {row.pCount}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center" style={{ border: "1px solid #94a3b8", padding: "2px" }}>
                    {row.aCount}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-bold" style={{ border: "1px solid #94a3b8", padding: "2px" }}>
                    {row.totalAbs}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const computeCoreGradeStats = () => {
    const total = students.length || 1;
    const femaleTotal = students.filter((s) => isFemaleStudent(s.gender)).length || 1;
    const khCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    const khFemaleCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    const mtCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    const mtFemaleCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

    students.forEach((s) => {
      const r = computeCoreGradeRow(s);
      const isFemale = isFemaleStudent(s.gender);
      if (r.khCombined && khCounts[r.khCombined] !== undefined) {
        khCounts[r.khCombined]++;
        if (isFemale) khFemaleCounts[r.khCombined]++;
      }
      if (r.mtCombined && mtCounts[r.mtCombined] !== undefined) {
        mtCounts[r.mtCombined]++;
        if (isFemale) mtFemaleCounts[r.mtCombined]++;
      }
    });

    const khAbcCount = khCounts.A + khCounts.B + khCounts.C;
    const khDefCount = khCounts.D + khCounts.E + khCounts.F;
    const mtAbcCount = mtCounts.A + mtCounts.B + mtCounts.C;
    const mtDefCount = mtCounts.D + mtCounts.E + mtCounts.F;

    return {
      total,
      femaleTotal,
      khCounts,
      khFemaleCounts,
      mtCounts,
      mtFemaleCounts,
      khAbcPct: ((khAbcCount / total) * 100).toFixed(1) + "%",
      khDefPct: ((khDefCount / total) * 100).toFixed(1) + "%",
      mtAbcPct: ((mtAbcCount / total) * 100).toFixed(1) + "%",
      mtDefPct: ((mtDefCount / total) * 100).toFixed(1) + "%",
    };
  };

  // Export Core Grades XLSX
  const handleExportCoreGradesXLSX = () => {
    if (!students.length) return;
    const buildRows = (order: string[], title: string) => {
      const row0 = ["ល.រ", "គោត្តនាម-នាម", "ភេទ", "ថ្ងៃខែឆ្នាំកំណើត", title, ...Array(order.length - 1).fill(""), "និទ្ទេសរួម"];
      const row1 = ["", "", "", "", ...order, ""];
      const rows: any[][] = [row0, row1];
      students.forEach((s, i) => {
        const r = computeCoreGradeRow(s);
        const grades = order === KH_ORDER ? r.khGrades : r.mtGrades;
        const combined = order === KH_ORDER ? r.khCombined : r.mtCombined;
        rows.push([i + 1, `${s.lastName} ${s.firstName}`, s.gender, s.dob || "", ...grades.map((g) => g || ""), combined || ""]);
      });
      return rows;
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildRows(KH_ORDER, "លទ្ធផលតេស្ត មុខវិជ្ជាភាសាខ្មែរ")), "ភាសាខ្មែរ");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildRows(MT_ORDER, "លទ្ធផលតេស្ត មុខវិជ្ជាគណិតវិទ្យា")), "គណិតវិទ្យា");
    const semLabel = SEMESTERS.find((x) => x.id === semester)?.label || semester;
    XLSX.writeFile(wb, `coregrades_${selClass}_${semLabel}_${MONTHS[selMonth]}.xlsx`);
    toast("📥 Export និទ្ទេសគោល Excel រួចរាល់");
  };

  
  const handleExportReportXLSX = () => {
    if (reportType === "pri") {
      const docElem = document.getElementById("reportDocContent");
      if (!docElem) return;
      const table = docElem.querySelector("table");
      if (!table) return;
      const wb = XLSX.utils.table_to_book(table);
      const semLabel = SEMESTERS.find(s => s.id === (semester !== "annual" ? semester : "s1"))?.label || semester;
      XLSX.writeFile(wb, `pri_report_${selClass}_${semLabel}.xlsx`);
      toast("📥 Export Excel រួចរាល់");
      return;
    }
    if (reportType === "semester") {
      const rows: any[][] = [
        ["ល.រ", "គោត្តនាម-នាម", "ភេទ", "ថ្ងៃខែឆ្នាំកំណើត", "មធ្យមភាគខែ", "ម.ប្រឡង", "ម.ប្រចាំឆមាស", "ចំ.ថ្នាក់", "និទ្ទេស"]
      ];

      ranked.forEach((s, i) => {
        const examAvg = getStudentSemesterExamAvg(s.id);
        const semMonthlyAvg = getStudentSemesterMonthlyAvg(s.id);
        const numMonthlyAvg = Number(semMonthlyAvg);
        const semAvgVal = getStudentSemesterFinalAvg(s.id);
        const g = gradeOf(semAvgVal);
        
        rows.push([
          i + 1,
          `${s.lastName} ${s.firstName}`,
          s.gender === "ស្រី" ? "ស្រី" : "ប្រុស",
          s.dob || "",
          numMonthlyAvg > 0 ? numMonthlyAvg : "",
          examAvg > 0 ? Number(fmtAvg(examAvg)) : "",
          semAvgVal > 0 ? Number(fmtAvg(semAvgVal)) : "",
          s._rank || i + 1,
          g.l
        ]);
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "ចំណាត់ថ្នាក់ឆមាស");
      const semLabel = SEMESTERS.find((x) => x.id === semester)?.label || semester;
      XLSX.writeFile(wb, `semester_report_${selClass}_${semLabel}.xlsx`);
      toast("📥 Export Excel រួចរាល់");

    } else if (reportType === "annual") {
      const annualData = computeAnnualDataForStudents();
      const dataToRender = [...annualData].sort((a, b) => {
        if (a.annualAvg !== null && b.annualAvg !== null) {
          const avgB = truncate2(b.annualAvg);
          const avgA = truncate2(a.annualAvg);
          if (avgB !== avgA) return avgB - avgA;
        }
        if (a.annualAvg !== null && b.annualAvg === null) return -1;
        if (a.annualAvg === null && b.annualAvg !== null) return 1;
        return (a.student.lastName || "").localeCompare(b.student.lastName || "", "km");
      });

      const rows: any[][] = [
        ["ល.រ", "គោត្តនាម-នាម", "ភេទ", "ថ្ងៃខែឆ្នាំកំណើត", "ទីលំនៅបច្ចុប្បន្ន (ភូមិ-ឃុំ-ស្រុក)", "ម.ប្រចាំឆ១", "ចំ.ថ្នាក់ឆ១", "ម.ប្រចាំឆ២", "ចំ.ថ្នាក់ឆ២", "ម.ប្រចាំឆ្នាំ", "ចំ.ថ្នាក់ឆ្នាំ", "និទ្ទេស", "អវត្តមានច្បាប់", "អវត្តមានឥតច្បាប់", "អវត្តមានសរុប"]
      ];

      dataToRender.forEach((row, i) => {
        const s = row.student;
        const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
        const addrParts = [];
        if (s.village) addrParts.push(s.village.startsWith("ភូមិ") ? s.village : `ភូមិ${s.village}`);
        if (s.commune) addrParts.push(s.commune.startsWith("ឃុំ") || s.commune.startsWith("សង្កាត់") ? s.commune : `ឃុំ${s.commune}`);
        if (s.district) addrParts.push(s.district.startsWith("ស្រុក") || s.district.startsWith("ក្រុង") || s.district.startsWith("ខណ្ឌ") ? s.district : `ស្រុក${s.district}`);
        const address = addrParts.join(" ") || "";
        const gradeInfo = row.annualAvg !== null ? gradeOf(row.annualAvg) : { l: "" };

        rows.push([
          i + 1,
          fullName,
          s.gender || "",
          s.dob || "",
          address,
          row.s1Avg !== null ? Number(fmtAvg(row.s1Avg)) : "",
          row.s1Rank !== null ? row.s1Rank : "",
          row.s2Avg !== null ? Number(fmtAvg(row.s2Avg)) : "",
          row.s2Rank !== null ? row.s2Rank : "",
          row.annualAvg !== null ? Number(fmtAvg(row.annualAvg)) : "",
          row.annualRank !== null ? row.annualRank : "",
          gradeInfo.l,
          row.pCount,
          row.aCount,
          row.totalAbs
        ]);
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "ចំណាត់ថ្នាក់ដំណាច់ឆ្នាំ");
      XLSX.writeFile(wb, `annual_report_${selClass}.xlsx`);
      toast("📥 Export Excel រួចរាល់");
    }
  };


  // Print Handler
  const handlePrintReport = () => {
    if (reportType === "pri") {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>តារាងសរុបពិន្ទុ PRI - ថ្នាក់ទី ${selClass}</title><script src="https://cdn.tailwindcss.com"></script><style>
        @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Hanuman:wght@400;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Hanuman','Battambang',sans-serif;background:#fff;padding:1cm;} @page{size:A4 portrait;margin:1cm;}

      .space-y-6 > * + * { margin-top: 1.5rem; }
      .max-w-4xl { max-width: 56rem; }
      .mx-auto { margin-left: auto; margin-right: auto; }
      .p-2 { padding: 0.5rem; }
      .text-center { text-align: center; }
      .mb-6 { margin-bottom: 1.5rem; }
      .font-black { font-weight: 900; }
      .text-sm { font-size: 0.875rem; }
      .mb-1 { margin-bottom: 0.25rem; }
      .text-slate-900 { color: #0f172a; }
      .leading-tight { line-height: 1.25; }
      .text-\[10px\] { font-size: 10px; }
      .text-amber-800 { color: #92400e; }
      .font-normal { font-weight: 400; }
      .font-extrabold { font-weight: 800; }
      .text-\[15px\] { font-size: 15px; }
      .leading-relaxed { line-height: 1.625; }
      .text-\[12px\] { font-size: 12px; }
      .font-bold { font-weight: 700; }
      .text-slate-800 { color: #1e293b; }
      .mb-4 { margin-bottom: 1rem; }
      .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
      .leading-8 { line-height: 2rem; }
      .flex { display: flex; }
      .items-center { align-items: center; }
      .gap-2 { gap: 0.5rem; }
      .border-b { border-bottom-width: 1px; }
      .border-dotted { border-style: dotted; }
      .border-slate-500 { border-color: #64748b; }
      .flex-1 { flex: 1 1 0%; }
      .w-24 { width: 6rem; }
      .text-blue-900 { color: #1e3a8a; }
      .w-full { width: 100%; }
      .border-collapse { border-collapse: collapse; }
      .border { border-width: 1px; }
      .border-slate-400 { border-color: #94a3b8; }
      .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
      .bg-slate-200\/60 { background-color: rgba(226, 232, 240, 0.6); }
      .p-2 { padding: 0.5rem; }
      .w-28 { width: 7rem; }
      .w-12 { width: 3rem; }
      .p-1\.5 { padding: 0.375rem; }
      .w-16 { width: 4rem; }
      .text-\[11px\] { font-size: 11px; }
      .w-20 { width: 5rem; }
      .w-7 { width: 1.75rem; }
      .justify-end { justify-content: flex-end; }
      .mt-12 { margin-top: 3rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .text-left { text-align: left; }
      .space-y-2 > * + * { margin-top: 0.5rem; }
      .border-slate-300 { border-color: #cbd5e1; }
      .bg-blue-50\/50 { background-color: rgba(239, 246, 255, 0.5); }
      .bg-emerald-50\/50 { background-color: rgba(236, 253, 245, 0.5); }
      .text-emerald-900 { color: #064e3b; }
      .p-1 { padding: 0.25rem; }
      .font-semibold { font-weight: 600; }

      </style></head><body>` + renderPriReport() + `</body></html>`;
      printHTML(html);
      return;
    }
    if (reportType === "studentcard") {
      const list = selectedStudentId === "__all__" ? students : students.filter((s) => s.id === selectedStudentId);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>សៀវភៅតាមដាន - ថ្នាក់ទី ${selClass}</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Hanuman:wght@400;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Hanuman','Battambang',sans-serif;background:#fff;padding:.4cm .5cm;}
        @page{size:A4 landscape;margin:.4cm .5cm;}
        .page-break{page-break-after:always;width:100%;}
        .page-break:last-child{page-break-after:auto;}
      </style></head><body>` + list.map((s) => `<div class="page-break">${buildStudentCardHTML(s, selClass, teacher, scoresMap, attendanceMap, selMonth, semester, students)}</div>`).join("") + `</body></html>`;
      printHTML(html);
      return;
    }

    if (reportType === "traineebook") {
      const list = selectedStudentId === "__all__" ? students : students.filter((s) => s.id === selectedStudentId);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>សៀវភៅសិក្ខាគារិក - ថ្នាក់ទី ${selClass}</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Hanuman:wght@400;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Hanuman','Battambang',sans-serif;background:#fff;padding:.4cm .5cm;}
        @page{size:A4 landscape;margin:.4cm .5cm;}
        .page-break{page-break-after:always;width:100%;}
        .page-break:last-child{page-break-after:auto;}
      </style></head><body>` + list.map((s, idx) => `<div class="page-break">${buildTraineeBookHTML(s, idx, selClass, teacher, scoresMap, attendanceMap, students, allMonthsScores, semester)}</div>`).join("") + `</body></html>`;
      printHTML(html);
      return;
    }

    if (reportType === "agreement") {
      const list = selectedStudentId === "__all__" ? filteredStudents : students.filter((s) => s.id === selectedStudentId);
      if (list.length === 0) {
        toast("⚠️ ពុំមានសិស្សនៅក្នុងបញ្ជីជ្រើសរើសទេ", "error");
        return;
      }
      if (agreementSubTab === "learningplan") {
        const html = buildIndividualAnnualLearningPlanPrintHTML(list, selClass, teacher, ptomRecords);
        printHTML(html);
      } else {
        const html = buildLearningAgreementPrintHTML(list, selClass, teacher, allMonthsScores, ptomRecords);
        printHTML(html);
      }
      return;
    }

    if (reportType === "candidate") {
      const list = selectedStudentId === "__all__" ? students : students.filter((s) => s.id === selectedStudentId);
      toast(`⏳ កំពុងបង្កើត QR Code សម្រាប់សលាកបត្របេក្ខជន (${list.length} នាក់)...`, "info");
      const qrPromises = list.map(async (s) => {
        const dataUrl = await generateStudentQRCodeDataUrl(s, selClass, schoolName, students, scoresMap, teacher);
        return { id: s.id, dataUrl };
      });

      Promise.all(qrPromises).then((qrResults) => {
        const qrMap = Object.fromEntries(qrResults.map((r) => [r.id, r.dataUrl]));
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>សលាកបត្របេក្ខជន</title><style>
          @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Hanuman:wght@400;700;900&display=swap');
          *{box-sizing:border-box;margin:0;padding:0;}
          body{font-family:'Hanuman','Battambang',sans-serif;background:#fff;}
          @page{size:A4 portrait;margin:10mm;}
          .page-break{page-break-after:always;}
          .page-break:last-child{page-break-after:auto;}
        </style></head><body>` + list.map((s) => `<div class="page-break">${buildCandidateDocHTML(s, selClass, teacher, students, scoresMap, honorPhotos, undefined, qrMap[s.id])}</div>`).join("") + `</body></html>`;
        printHTML(html);
      });
      return;
    }

    if (reportType === "certificate") {
      const list = filteredStudents;
      if (list.length === 0) {
        toast("⚠️ ពុំមានសិស្សនៅក្នុងបញ្ជីជ្រើសរើសទេ", "error");
        return;
      }
      toast(`⏳ កំពុងបង្កើត QR Code សម្រាប់វិញ្ញាបនបត្រ (${list.length} នាក់)...`, "info");

      const qrPromises = list.map(async (s) => {
        const annualAvg = getAvg(s.id, students, scoresMap);
        const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
        const g = avgVal !== null ? gradeOf(avgVal).l : "—";
        const rank = getRank(s.id, students, scoresMap);
        const dataUrl = await generateStudentQRCodeDataUrl(s, selClass, schoolName, avgVal, g, rank, teacher);
        return { id: s.id, dataUrl };
      });

      Promise.all(qrPromises).then((qrResults) => {
        const qrMap = Object.fromEntries(qrResults.map((r) => [r.id, r.dataUrl]));
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>វិញ្ញាបនបត្របញ្ជាក់ការសិក្សា - ថ្នាក់ ${selClass} (${list.length} នាក់)</title><style>
          @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Hanuman:wght@400;700;900&display=swap');
          *{box-sizing:border-box;margin:0;padding:0;}
          body{font-family:'Hanuman','Battambang',sans-serif;background:#fff;}
          @page{size:A4 portrait;margin:10mm;}
          .page-break{page-break-after:always;}
          .page-break:last-child{page-break-after:auto;}
        </style></head><body>` + list.map((s) => `<div class="page-break">${buildCertificateHTML(s, selClass, teacher, students, scoresMap, qrMap[s.id])}</div>`).join("") + `</body></html>`;
        
        printHTML(html);
        toast(`✅ បានបង្កើតវិញ្ញាបនបត្រចំនួន ${list.length} ច្បាប់ រួចរាល់!`, "success");
      });
      return;
    }

    if (reportType === "qr_sheet") {
      const list = filteredStudents;
      if (list.length === 0) {
        toast("⚠️ ពុំមានសិស្សនៅក្នុងបញ្ជីជ្រើសរើសទេ", "error");
        return;
      }
      toast(`⏳ កំពុងរៀបចំ និងបង្កើត QR Code ទាំងថ្នាក់ (${list.length} នាក់)...`, "info");

      const qrPromises = list.map(async (s) => {
        if (qrSheetUrls[s.id]) {
          return { id: s.id, dataUrl: qrSheetUrls[s.id] };
        }
        const dataUrl = await generateStudentQRCodeDataUrl(s, selClass, schoolName, students, scoresMap, teacher);
        return { id: s.id, dataUrl };
      });

      Promise.all(qrPromises).then((qrResults) => {
        const qrMap = Object.fromEntries(qrResults.map((r) => [r.id, r.dataUrl]));
        const html = buildStudentQRCardsTablePrintHTML(
          list,
          selClass,
          teacher,
          scoresMap,
          qrMap,
          qrLayoutMode,
          allMonthsScores
        );
        printHTML(html);
        toast(`✅ បានបង្កើត PDF QR Code សិស្សចំនួន ${list.length} នាក់ រួចរាល់!`, "success");
      });
      return;
    }

    const previewEl = document.getElementById("reportDocContent");
    if (!previewEl) return;
    const html = `<!DOCTYPE html><html lang="km"><head><meta charset="UTF-8"><title>របាយការណ៍ - ថ្នាក់ទី ${selClass}</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700;900&family=Battambang:wght@400;700&display=swap" rel="stylesheet"><style>
      *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
      body{font-family:'Hanuman','Battambang',sans-serif;font-size:11px;line-height:1.5;padding:.2cm .3cm;color:#0f172a;background:#fff;width:100%}
      @page{size:A4 portrait;margin:.2cm .3cm}
      #reportDocContent{padding:0 !important;border:none !important;box-shadow:none !important;width:100% !important;max-width:100% !important}
      
      .text-center{text-align:center !important}
      .text-left{text-align:left !important}
      .text-right{text-align:right !important}
      .font-bold{font-weight:700 !important}
      .font-black{font-weight:900 !important}
      .font-extrabold{font-weight:800 !important}
      .flex{display:flex !important}
      .justify-between{justify-content:space-between !important}
      .items-start{align-items:flex-start !important}
      .items-center{align-items:center !important}
      .gap-1{gap:4px !important}
      .gap-2{gap:8px !important}
      .gap-3{gap:12px !important}
      .gap-4{gap:16px !important}
      .mb-1{margin-bottom:4px !important}
      .mb-2{margin-bottom:8px !important}
      .mb-3{margin-bottom:12px !important}
      .mt-1{margin-top:4px !important}
      .mt-2{margin-top:8px !important}
      .w-full{width:100% !important}
      .pl-3{padding-left:12px !important}
      .pt-1{padding-top:4px !important}
      .pt-2.5,.pt-2{padding-top:8px !important}

      .grid{display:flex !important;gap:10px !important;align-items:stretch !important;width:100% !important}
      .grid-cols-2 > *{flex:1 !important;min-width:0 !important}
      .grid-cols-1 > *{width:100% !important}

      .rank-table{width:100% !important;border-collapse:collapse !important;font-size:12px !important}
      .rank-table th{background:#dbeafe !important;border:1px solid #93c5fd !important;padding:5px 2px !important;text-align:center !important;font-weight:700 !important;color:#1e3a8a !important}
      .rank-table td{border:1px solid #cbd5e1 !important;padding:4px 3px !important;height:28px !important;text-align:center !important}
      .rank-table th.text-left, .rank-table td.text-left{text-align:left !important;padding-left:6px !important}

      .sig-section{margin-top:14px !important;display:flex !important;justify-content:space-between !important;gap:8px !important}
      .sig-col{text-align:center !important;flex:1 !important}

      .g-A{color:#15803d !important;font-weight:800 !important}
      .g-B{color:#1d4ed8 !important;font-weight:800 !important}
      .g-C{color:#b45309 !important;font-weight:800 !important}
      .g-D{color:#c2410c !important;font-weight:800 !important}
      .g-E{color:#dc2626 !important;font-weight:800 !important}
      .g-F{color:#7f1d1d !important;font-weight:800 !important}
      .pass{color:#16a34a !important;font-weight:700 !important}
      .fail{color:#dc2626 !important;font-weight:700 !important}
      .no-print{display:none !important}
    </style></head><body>${previewEl.innerHTML}</body></html>`;
    printHTML(html);
  };

  return (
    <div className="p-3 space-y-3">
      {/* Sticky Top Control Bar */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md no-print space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Controls: Report Type & Sub-options */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Dropdown Selector for Report Types */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-300 font-bold text-xs pl-1">
                📊 ប្រភេទរបាយការណ៍:
              </span>
              <select
                value={reportType}
                onChange={(e) => onReportTypeChange(e.target.value as ReportType)}
                className="bg-white dark:bg-slate-700 text-blue-900 dark:text-blue-200 font-extrabold text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 shadow-xs outline-none cursor-pointer hover:border-blue-500 transition"
              >
                <optgroup label="📊 របាយការណ៍ពិន្ទុ និងលទ្ធផលសិក្សា">
                  <option value="monthly">📅 របាយការណ៍ប្រចាំខែ (Monthly)</option>
                  <option value="semester">📚 របាយការណ៍ប្រចាំឆមាស (Semester)</option>
                  <option value="annual">🏆 របាយការណ៍ដំណាច់ឆ្នាំ (Annual)</option>
                  <option value="attendance">✅ របាយការណ៍វត្តមាន (Attendance)</option>
                  <option value="coregrade">🎯 របាយការណ៍និទ្ទេសគោល (Core Grades)</option>
                  <option value="pri">🏫 តារាងសរុបពិន្ទុ PRI (សាលាបឋម)</option>
                </optgroup>
                <optgroup label="📑 លិខិត ឯកសារ និងសៀវភៅតាមដានសិស្ស">
                  <option value="studentcard">📖 សៀវភៅតាមដាន (Student Track Card)</option>
                  <option value="traineebook">📕 សៀវភៅសិក្ខាគារិក (Trainee Book)</option>
                  <option value="candidate">📜 សលាកបត្រសិស្ស (Candidate Doc)</option>
                  <option value="certificate">🎓 វិញ្ញាបនបត្រសិស្ស (Certificate)</option>
                  <option value="agreement">📜 កិច្ចព្រមព្រៀង (PTOM Agreement)</option>
                  <option value="qr_sheet">🏷️ ប័ណ្ណ QR Code សិស្សទាំងថ្នាក់ (QR Code Sheet)</option>
                </optgroup>
              </select>
            </div>

            {/* Student Dropdown Selector for Individual Reports */}
            {(reportType === "candidate" ||
              reportType === "certificate" ||
              reportType === "studentcard" ||
              reportType === "traineebook" ||
              reportType === "agreement" ||
              reportType === "qr_sheet") && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-300 font-bold text-xs pl-1">
                  👤 ជ្រើសរើសសិស្ស:
                </span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 outline-none cursor-pointer"
                >
                  <option value="__all__">🏫 ពុម្ពទាំងថ្នាក់ (All Students)</option>
                  {students.map((s, idx) => (
                    <option key={s.id} value={s.id}>
                      {idx + 1}. {s.lastName} {s.firstName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Core Grade Sub-Actions */}
            {reportType === "coregrade" && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={onSaveCoreGrades}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
                >
                  💾 រក្សាទុក
                </button>
                <button
                  onClick={handleExportCoreGradesXLSX}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
                >
                  📥 Excel
                </button>
                <button
                  onClick={onOpenInvigilatorModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
                >
                  🖋️ អនុរក្ស
                </button>
              </div>
            )}

            {/* Agreement Sub-Actions */}
            {reportType === "agreement" && (
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAgreementSubTab("agreement")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    agreementSubTab === "agreement"
                      ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-blue-700"
                  }`}
                >
                  📜 PTOM
                </button>
                <button
                  type="button"
                  onClick={() => setAgreementSubTab("learningplan")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    agreementSubTab === "learningplan"
                      ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-emerald-700"
                  }`}
                >
                  📋 ផែនការរៀនសូត្រ
                </button>
                {onOpenPtomModal && (
                  <button
                    type="button"
                    onClick={() => onOpenPtomModal(selectedStudentId !== "__all__" ? selectedStudentId : undefined)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1"
                  >
                    <span>✍️</span> <span>បញ្ចូល/កែប្រែ</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Controls: Essential Print & Gmail Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                onReportTypeChange("qr_sheet");
              }}
              className={`active:scale-95 font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                reportType === "qr_sheet"
                  ? "bg-amber-600 text-white shadow-amber-600/30"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
              title="បង្កើត និងព្រីន PDF QR Code សិស្សទាំងថ្នាក់ សម្រាប់កាត់ចែក"
            >
              <span>🏷️</span> <span className="hidden sm:inline">PDF QR Code ទាំងថ្នាក់</span>
            </button>

            <button
              onClick={() => {
                const html = buildPublicNoticePrintHTML(
                  students,
                  selClass,
                  semester !== "annual" ? semester : "s1",
                  teacher,
                  allMonthsScores,
                  "avg"
                );
                printHTML(html);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
              title="ព្រីនសន្លឹកលទ្ធផលសិក្សា សម្រាប់បិទផ្សាយសាធារណៈជូនដំណឹងដល់ឪពុកម្ដាយ"
            >
              <span>📢</span> <span className="hidden sm:inline">សន្លឹកបិទផ្សាយ</span>
            </button>

            <button
              onClick={() => setIsQrScannerOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="ស្កែន QR Code ដោយប្រើប្រាស់កាមេរ៉ា ដើម្បីផ្ទៀងផ្ទាត់សិស្ស"
            >
              <span>📷</span> <span className="hidden sm:inline">ស្កែន QR</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1"
            >
              <span>🖨️</span> <span>ព្រីន PDF</span>
            </button>
            {(reportType === "semester" || reportType === "annual" || reportType === "pri") && (
              <button
                onClick={handleExportReportXLSX}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1"
                title="ទាញយករាយនាម និងចំណាត់ថ្នាក់ជាឯកសារ Excel"
              >
                <span>📥</span> <span>Excel</span>
              </button>
            )}

            <button
              onClick={() => {
                const docElem = document.getElementById("reportDocContent");
                const htmlContent = docElem
                  ? `<div style="font-family: 'Hanuman', 'Battambang', Arial, sans-serif; line-height: 1.5; color: #0f172a; padding: 15px; border: 1px solid #cbd5e1; border-radius: 8px;">${docElem.innerHTML}</div>`
                  : `<p>របាយការណ៍លទ្ធផលសិក្សា - ថ្នាក់ទី ${selClass}</p>`;
                let reportName = `របាយការណ៍លទ្ធផលសិក្សា - ថ្នាក់ទី ${selClass}`;
                if (reportType === "monthly") reportName = `លទ្ធផលសិក្សាប្រចាំខែ ${MONTHS[selMonth]} - ថ្នាក់ទី ${selClass}`;
                else if (reportType === "semester") reportName = `លទ្ធផលសិក្សាប្រចាំឆមាស - ថ្នាក់ទី ${selClass}`;
                else if (reportType === "studentCard") reportName = `សៀវភៅសិក្ខាគារិក - ថ្នាក់ទី ${selClass}`;

                if (onOpenGmailModal) {
                  onOpenGmailModal({
                    subject: `${reportName} - ${schoolName}`,
                    htmlBody: htmlContent,
                  });
                }
              }}
              className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1"
            >
              <span>✉️</span> <span className="hidden sm:inline">Gmail</span>
            </button>
          </div>
        </div>
      </div>

      {/* Student Filter Bar for Certificates, QR Sheets & Individual Reports */}
      {(reportType === "certificate" || reportType === "candidate" || reportType === "studentcard" || reportType === "traineebook" || reportType === "qr_sheet") && (
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-3 rounded-2xl shadow-lg no-print flex flex-wrap items-center justify-between gap-3 border border-blue-900/50">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <input
                type="text"
                placeholder="🔍 ស្វែងរកឈ្មោះសិស្ស..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/90 text-white placeholder-slate-400 border border-slate-700 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-400 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Gender Filter */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700">
              {[
                ["all", "ទាំងអស់"],
                ["ប្រុស", "👨 ប្រុស"],
                ["ស្រី", "👩 ស្រី"],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setGenderFilter(val)}
                  className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition ${
                    genderFilter === val ? "bg-blue-600 text-white shadow-xs" : "text-slate-300 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Result Filter */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700">
              {[
                ["all", "លទ្ធផល"],
                ["pass", "✅ ជាប់"],
                ["fail", "❌ ធ្លាក់"],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setResultFilter(val)}
                  className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition ${
                    resultFilter === val
                      ? val === "pass"
                        ? "bg-emerald-600 text-white"
                        : val === "fail"
                        ? "bg-rose-600 text-white"
                        : "bg-blue-600 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Grade Filter */}
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">🏆 គ្រប់និទ្ទេស (A-F)</option>
              <option value="A">និទ្ទេស A</option>
              <option value="B">និទ្ទេស B</option>
              <option value="C">និទ្ទេស C</option>
              <option value="D">និទ្ទេស D</option>
              <option value="E">និទ្ទេស E</option>
              <option value="F">និទ្ទេស F</option>
            </select>

            {/* Clear All Filters */}
            {(searchQuery || genderFilter !== "all" || resultFilter !== "all" || gradeFilter !== "all" || selectedStudentId !== "__all__") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setGenderFilter("all");
                  setResultFilter("all");
                  setGradeFilter("all");
                  setSelectedStudentId("__all__");
                }}
                className="text-amber-400 hover:text-amber-300 text-[11px] font-bold underline px-1"
              >
                🔄 កំណត់ឡើងវិញ
              </button>
            )}
          </div>

          {/* Student Count & QR Sheet / Certificate Batch Action */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-blue-900/80 border border-blue-500/30 px-3 py-1 rounded-xl text-xs font-black text-blue-200">
              🎓 សិស្សជ្រើសរើស ៖ <span className="text-amber-300 text-sm">{filteredStudents.length}</span> / {students.length} នាក់
            </div>

            {reportType === "qr_sheet" && (
              <div className="flex items-center gap-1.5">
                {/* Layout Mode Toggle */}
                <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setQrLayoutMode("cards")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                      qrLayoutMode === "cards"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-slate-300 hover:text-white"
                    }`}
                    title="ប័ណ្ណកាត់ចែក (8 ប័ណ្ណក្នុង១ទំព័រ A4)"
                  >
                    <span>🏷️</span> <span className="hidden md:inline">ប័ណ្ណកាត់ចែក</span> (8/A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrLayoutMode("table")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                      qrLayoutMode === "table"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-slate-300 hover:text-white"
                    }`}
                    title="តារាងបញ្ជីរួម (Master Table)"
                  >
                    <span>📋</span> <span>តារាងបញ្ជី</span>
                  </button>
                </div>

                <button
                  onClick={handlePrintReport}
                  disabled={filteredStudents.length === 0}
                  className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-black text-xs px-3.5 py-1.5 rounded-xl transition shadow-md shadow-amber-600/30 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  title="ព្រីន PDF QR Code ទាំងថ្នាក់"
                >
                  <span>🖨️</span> <span>ព្រីន PDF QR ({filteredStudents.length})</span>
                </button>
              </div>
            )}

            {reportType === "certificate" && (
              <button
                onClick={handlePrintReport}
                disabled={filteredStudents.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs px-3.5 py-1.5 rounded-xl transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>📜</span> <span>ព្រីនវិញ្ញាបនបត្រ PDF ({filteredStudents.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Document Preview Container */}
      <div id="reportDocContent" className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm font-sans text-xs overflow-auto max-h-[calc(100vh-170px)] relative">
        {/* Kingdom Motto Header (Centered) */}
        <div className="text-center mb-2" style={{ textAlign: "center", width: "100%", marginBottom: "8px" }}>
          <h2 className="text-sm font-black text-slate-900 leading-tight" style={{ textAlign: "center", fontSize: "14px", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
            ព្រះរាជាណាចក្រកម្ពុជា
            <br />
            ជាតិ សាសនា ព្រះមហាក្សត្រ
          </h2>
          <div className="text-[10px] text-amber-800 mt-0.5 font-normal" style={{ textAlign: "center", fontSize: "10px", color: "#92400e", marginTop: "2px" }}>꧁ ༺ ༻ ꧂</div>
        </div>

        {/* Administration Info (Left) & Invigilator Box (Right if coregrade) */}
        <div className="flex justify-between items-start gap-4 mb-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", width: "100%", marginBottom: "8px" }}>
          <div className="text-xs text-slate-900 leading-snug font-bold" style={{ fontSize: "12px", color: "#0f172a", lineHeight: 1.4, fontWeight: "bold" }}>
            <div>រដ្ឋបាលស្រុកភ្នំស្រុក</div>
            <div>ការិយាល័យអប់រំ យុវជន និងកីឡាស្រុក</div>
            <div>កម្រងស្ពានស្រែង</div>
            <div>{schoolName}</div>
          </div>

          {reportType === "coregrade" && (
            <div dangerouslySetInnerHTML={{ __html: buildInvigilatorBoxHTML(invigilatorData) }} />
          )}
        </div>

        <hr className="border-t-2 border-slate-900 mb-3" style={{ border: "none", borderTop: "2px solid #0f172a", marginBottom: "12px", width: "100%" }} />

        {/* Dynamic Titles */}
        {reportType === "monthly" && (
          <div className="text-center mb-3">
            <h3 className="text-base font-black text-slate-900">
              លទ្ធផលសិក្សាប្រចាំខែ {MONTHS[selMonth]}
            </h3>
            <p className="text-xs font-bold text-slate-800">ថ្នាក់ទី {selClass}</p>
          </div>
        )}

        {reportType === "semester" && (
          <div className="text-center mb-3">
            <h3 className="text-base font-black text-slate-900">
              លទ្ធផលសិក្សា {SEMESTERS.find((s) => s.id === semester)?.label}
            </h3>
            <p className="text-xs font-bold text-slate-800">ថ្នាក់ទី {selClass}</p>
          </div>
        )}

        {reportType === "annual" && (
          <div className="text-center mb-3">
            <h3 className="text-base font-black text-slate-900">
              ចំណាត់ថ្នាក់ដំណាច់ឆ្នាំ ឆ្នាំសិក្សា ២០២៥ - ២០២៦
            </h3>
            <p className="text-xs font-bold text-slate-800">
              {teacher?.school || "សាលាបឋមសិក្សា"} · ថ្នាក់ទី {selClass}
            </p>
          </div>
        )}

        {reportType === "coregrade" && (
          <div className="text-center mb-3">
            <h3 className="text-base font-black text-slate-900">
              លទ្ធផលតេស្ត (ABC) មុខវិជ្ជាភាសាខ្មែរ និងគណិតវិទ្យា
            </h3>
            <p className="text-xs font-bold text-slate-800">
              ថ្នាក់ទី {selClass} · {SEMESTERS.find((s) => s.id === semester)?.label} · ខែ
              {MONTHS[selMonth]}
            </p>
          </div>
        )}

        {reportType === "qr_sheet" && (
          <div className="text-center mb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center justify-center gap-2">
              <span>🏷️</span>
              <span>
                {qrLayoutMode === "cards"
                  ? "ប័ណ្ណ QR Code សម្រាប់កាត់ចែកជូនសិស្ស (QR Code Cards for Distribution)"
                  : "តារាងបញ្ជី QR Code ផ្ទៀងផ្ទាត់សិស្សទាំងថ្នាក់ (QR Code Master Sheet)"}
              </span>
            </h3>
            <p className="text-xs font-bold text-slate-800 mt-0.5">
              {schoolName} · ថ្នាក់ទី {selClass} · ចំនួនសិស្សសរុប {filteredStudents.length} នាក់ · ឆ្នាំសិក្សា ២០២៥-២០២៦
            </p>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-center gap-1">
              <span>✂️</span>
              <span>
                {qrLayoutMode === "cards"
                  ? "ទម្រង់ប័ណ្ណ 8 ក្នុង១ទំព័រ A4 មានបន្ទាត់ដាច់ងាយស្រួលកាត់ចែកជូនសិស្ស ឬបិទលើសៀវភៅតាមដាន"
                  : "ទម្រង់តារាងបញ្ជីរួមសម្រាប់បិទលើក្តារព័ត៌មាន ឬរក្សាទុកក្នុងសៀវភៅតាមដាន"}
              </span>
            </div>
          </div>
        )}

        {/* Standard Academic Reports (Monthly, Semester, Annual, Attendance) */}
        {(reportType === "monthly" || reportType === "semester" || reportType === "annual" || reportType === "attendance") && (
          <div className="space-y-3">
            {reportType === "annual" ? (
              <>
                <div className="print:hidden">
                  {renderAnnualReportTable(false)}
                </div>
                <div className="hidden print:block">
                  {renderAnnualReportTable(true)}
                </div>
              </>
            ) : (
              /* 2-Column Split Student Tables for Monthly / Semester / Attendance */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                <div>{renderRankTable(leftRanked, 0)}</div>
                <div>{rightRanked.length > 0 ? renderRankTable(rightRanked, halfIndex) : null}</div>
              </div>
            )}

            {/* Bottom Summary Statistics Section (Two Cards Side-by-Side as in sample image) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[10.5px] leading-relaxed mt-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
              {/* Left Box: Total Students & Grade Breakdown */}
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-2">
                <div>
                  <div className="font-extrabold text-slate-900 flex items-center gap-1 mb-1">
                    <span>👥</span> <span>សិស្សទាំងអស់</span>
                  </div>
                  <div className="pl-1 text-slate-800">
                    -សរុប <strong className="font-bold text-slate-900">{stats.total}</strong>នាក់ ប្រុស <strong className="font-bold text-slate-900">{stats.male}</strong>នាក់ ({stats.malePct}%) ស្រី <strong className="font-bold text-slate-900">{stats.female}</strong>នាក់ ({stats.femalePct}%)
                  </div>
                </div>

                <div>
                  <div className="font-extrabold text-slate-900 flex items-center gap-1 mb-1">
                    <span>📊</span> <span>ចំណាត់ថ្នាក់ដោយនិទ្ទេស</span>
                  </div>
                  <div className="pl-1 space-y-0.5">
                    {(["A", "B", "C", "D", "E", "F"] as const).map((g) => {
                      const item = stats.grades[g];
                      return (
                        <div key={g} className="flex justify-between items-center text-slate-800">
                          <span>
                            -សិស្សនិទ្ទេស <strong className="font-extrabold" style={{ color: gradeOf(g === "A" ? 9.5 : g === "B" ? 8.5 : g === "C" ? 7.5 : g === "D" ? 6.8 : g === "E" ? 5.5 : 3).c }}>{g}</strong> សរុប <strong className="font-bold">{item.count}</strong>នាក់ ({item.pct}%)
                          </span>
                          <span className="text-slate-600 text-[10px]">
                            ស្រី <strong className="font-semibold">{item.female}</strong>នាក់ ({item.femalePct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Box: Pass/Fail Results & Percentages */}
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-2">
                <div>
                  <div className="font-extrabold text-slate-900 flex items-center gap-1 mb-1">
                    <span>✅</span> <span>លទ្ធផលការប្រឡង</span>
                  </div>
                  <div className="pl-1 space-y-0.5 text-slate-800">
                    <div className="flex justify-between items-center">
                      <span>-ជាប់ <strong className="font-bold text-emerald-700">{stats.passCount}</strong>នាក់ ({stats.passPct}%)</span>
                      <span className="text-slate-600 text-[10px]">ស្រី <strong className="font-semibold text-emerald-700">{stats.passFemale}</strong>នាក់ ({stats.passFemalePct}%)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>-ធ្លាក់ <strong className="font-bold text-rose-700">{stats.failCount}</strong>នាក់ ({stats.failPct}%)</span>
                      <span className="text-slate-600 text-[10px]">ស្រី <strong className="font-semibold text-rose-700">{stats.failFemale}</strong>នាក់ ({stats.failFemalePct}%)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="font-extrabold text-slate-900 flex items-center gap-1 mb-1">
                    <span>📈</span> <span>អត្រាប្រឡង</span>
                  </div>
                  <div className="pl-1 space-y-0.5 text-slate-800">
                    <div className="flex justify-between items-center">
                      <span>-អត្រាជាប់</span>
                      <span>សរុប <strong className="font-extrabold text-emerald-700">{stats.passPct}%</strong> | ស្រី <strong className="font-extrabold text-emerald-700">{stats.passFemalePct}%</strong></span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>-អត្រាធ្លាក់</span>
                      <span>សរុប <strong className="font-extrabold text-rose-700">{stats.failPct}%</strong> | ស្រី <strong className="font-extrabold text-rose-700">{stats.failFemalePct}%</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {reportType === "pri" && (
          <div dangerouslySetInnerHTML={{ __html: renderPriReport() }} />
        )}

        {reportType === "coregrade" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Khmer Table */}
              <div>
                <h4 className="font-extrabold text-blue-900 text-xs mb-1 text-center">
                  📖 ភាសាខ្មែរ (៤ មុខវិជ្ជា)
                </h4>
                <table className="w-full text-[11px] border-collapse border border-slate-300 text-center">
                  <thead>
                    <tr className="bg-blue-100 font-bold">
                      <th className="border border-slate-300 p-1">ល.រ</th>
                      <th className="border border-slate-300 p-1 text-left">ឈ្មោះ</th>
                      <th className="border border-slate-300 p-1 w-8">ភេទ</th>
                      {KH_ORDER.map((k) => (
                        <th key={k} className="border border-slate-300 p-1 text-[9px]">
                          {k.replace("សមត្ថភាព", "")}
                        </th>
                      ))}
                      <th className="border border-slate-300 p-1">រួម</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => {
                      const r = computeCoreGradeRow(s);
                      return (
                        <tr key={s.id} className="border-b border-slate-200">
                          <td className="p-1">{idx + 1}</td>
                          <td className="p-1 text-left font-bold">
                            {s.lastName} {s.firstName}
                          </td>
                          <td className="p-1 text-center font-medium">{s.gender || "—"}</td>
                          {r.khGrades.map((g, i) => (
                            <td key={i} className="p-1 font-bold">
                              {g || "—"}
                            </td>
                          ))}
                          <td className="p-1 font-black text-blue-900">{r.khCombined || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Math Table */}
              <div>
                <h4 className="font-extrabold text-blue-900 text-xs mb-1 text-center">
                  🔢 គណិតវិទ្យា (៥ មុខវិជ្ជា)
                </h4>
                <table className="w-full text-[11px] border-collapse border border-slate-300 text-center">
                  <thead>
                    <tr className="bg-blue-100 font-bold">
                      <th className="border border-slate-300 p-1">ល.រ</th>
                      <th className="border border-slate-300 p-1 text-left">ឈ្មោះ</th>
                      <th className="border border-slate-300 p-1 w-8">ភេទ</th>
                      {MT_ORDER.map((m) => (
                        <th key={m} className="border border-slate-300 p-1 text-[9px]">
                          {m}
                        </th>
                      ))}
                      <th className="border border-slate-300 p-1">រួម</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => {
                      const r = computeCoreGradeRow(s);
                      return (
                        <tr key={s.id} className="border-b border-slate-200">
                          <td className="p-1">{idx + 1}</td>
                          <td className="p-1 text-left font-bold">
                            {s.lastName} {s.firstName}
                          </td>
                          <td className="p-1 text-center font-medium">{s.gender || "—"}</td>
                          {r.mtGrades.map((g, i) => (
                            <td key={i} className="p-1 font-bold">
                              {g || "—"}
                            </td>
                          ))}
                          <td className="p-1 font-black text-blue-900">{r.mtCombined || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Summary Table for Core Grade (ABC) */}
            {(() => {
              const coreStats = computeCoreGradeStats();
              const gradesList = ["A", "B", "C", "D", "E", "F"] as const;
              const gradeColors: Record<string, string> = {
                A: "#15803d",
                B: "#1d4ed8",
                C: "#b45309",
                D: "#c2410c",
                E: "#dc2626",
                F: "#7f1d1d",
              };

              return (
                <div className="space-y-3 pt-2 text-[10.5px] mt-2">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 text-center">
                      <thead>
                        <tr className="bg-blue-100/90 text-blue-950 font-bold">
                          <th rowSpan={2} className="border border-slate-300 p-1 text-center min-w-[75px]">
                            មុខវិជ្ជា
                          </th>
                          {gradesList.map((g) => (
                            <th key={g} colSpan={4} className="border border-slate-300 p-1 text-center" style={{ color: gradeColors[g] }}>
                              និទ្ទេស {g}
                            </th>
                          ))}
                        </tr>
                        <tr className="bg-blue-100/90 text-blue-950 font-bold text-[9px]">
                          {gradesList.map((g) => (
                            <React.Fragment key={g}>
                              <th className="border border-slate-300 p-0.5 w-6">សរុប</th>
                              <th className="border border-slate-300 p-0.5 w-7">%</th>
                              <th className="border border-slate-300 p-0.5 w-6 bg-pink-50/70 text-pink-950">ស្រី</th>
                              <th className="border border-slate-300 p-0.5 w-7 bg-pink-50/70 text-pink-950">%</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Khmer Row */}
                        <tr className="bg-white border-b border-slate-200">
                          <td className="border border-slate-300 p-1 text-left font-bold text-slate-900 whitespace-nowrap">
                            📖 ភាសាខ្មែរ
                          </td>
                          {gradesList.map((g) => {
                            const count = coreStats.khCounts[g] || 0;
                            const pct = coreStats.total > 0 ? ((count / coreStats.total) * 100).toFixed(1) + "%" : "0%";
                            const fCount = coreStats.khFemaleCounts[g] || 0;
                            const fPct = coreStats.femaleTotal > 0 ? ((fCount / coreStats.femaleTotal) * 100).toFixed(1) + "%" : "0%";
                            return (
                              <React.Fragment key={g}>
                                <td className="border border-slate-300 p-1 font-bold" style={{ color: gradeColors[g] }}>
                                  {count}
                                </td>
                                <td className="border border-slate-300 p-1 text-slate-700 text-[9.5px]">
                                  {pct}
                                </td>
                                <td className="border border-slate-300 p-1 font-bold text-pink-700 bg-pink-50/30">
                                  {fCount}
                                </td>
                                <td className="border border-slate-300 p-1 text-pink-800 text-[9.5px] bg-pink-50/30">
                                  {fPct}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                        {/* Math Row */}
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                          <td className="border border-slate-300 p-1 text-left font-bold text-slate-900 whitespace-nowrap">
                            🔢 គណិតវិទ្យា
                          </td>
                          {gradesList.map((g) => {
                            const count = coreStats.mtCounts[g] || 0;
                            const pct = coreStats.total > 0 ? ((count / coreStats.total) * 100).toFixed(1) + "%" : "0%";
                            const fCount = coreStats.mtFemaleCounts[g] || 0;
                            const fPct = coreStats.femaleTotal > 0 ? ((fCount / coreStats.femaleTotal) * 100).toFixed(1) + "%" : "0%";
                            return (
                              <React.Fragment key={g}>
                                <td className="border border-slate-300 p-1 font-bold" style={{ color: gradeColors[g] }}>
                                  {count}
                                </td>
                                <td className="border border-slate-300 p-1 text-slate-700 text-[9.5px]">
                                  {pct}
                                </td>
                                <td className="border border-slate-300 p-1 font-bold text-pink-700 bg-pink-50/30">
                                  {fCount}
                                </td>
                                <td className="border border-slate-300 p-1 text-pink-800 text-[9.5px] bg-pink-50/30">
                                  {fPct}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Box for ABC vs DEF Rates */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="border border-slate-300 rounded-lg p-2 bg-emerald-50/40 text-center">
                      <div className="text-[10px] font-bold text-emerald-900">📖 ភាសាខ្មែរ: ABC / DEF</div>
                      <div className="text-xs font-black mt-0.5 flex justify-center gap-4">
                        <span className="text-emerald-700">ABC: {coreStats.khAbcPct}</span>
                        <span className="text-rose-700">DEF: {coreStats.khDefPct}</span>
                      </div>
                    </div>
                    <div className="border border-slate-300 rounded-lg p-2 bg-blue-50/40 text-center">
                      <div className="text-[10px] font-bold text-blue-900">🔢 គណិតវិទ្យា: ABC / DEF</div>
                      <div className="text-xs font-black mt-0.5 flex justify-center gap-4">
                        <span className="text-emerald-700">ABC: {coreStats.mtAbcPct}</span>
                        <span className="text-rose-700">DEF: {coreStats.mtDefPct}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {reportType === "studentcard" && (
          <div className="space-y-6">
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                dangerouslySetInnerHTML={{
                  __html: buildStudentCardHTML(s, selClass, teacher, scoresMap, attendanceMap, selMonth, semester, students),
                }}
              />
            ))}
          </div>
        )}

        {reportType === "traineebook" && (
          <div className="space-y-6 overflow-x-auto">
            {filteredStudents.map((s, idx) => (
              <div
                key={s.id}
                dangerouslySetInnerHTML={{
                  __html: buildTraineeBookHTML(s, idx, selClass, teacher, scoresMap, attendanceMap, students, allMonthsScores, semester),
                }}
              />
            ))}
          </div>
        )}

        {reportType === "candidate" && (
          <div className="space-y-6">
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                dangerouslySetInnerHTML={{
                  __html: buildCandidateDocHTML(s, selClass, teacher, students, scoresMap, honorPhotos),
                }}
              />
            ))}
          </div>
        )}

        {reportType === "certificate" && (
          <div className="space-y-6">
            {isGeneratingQr && (
              <div className="text-center py-4 text-blue-600 font-bold text-xs animate-pulse no-print">
                ⚡ កំពុងបង្កើត QR Code សម្រាប់ផ្ទៀងផ្ទាត់ព័ត៌មានសិស្ស...
              </div>
            )}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                🔍 ពុំមានទិន្នន័យសិស្សត្រូវតាមលក្ខខណ្ឌជ្រើសរើសឡើយ
              </div>
            ) : (
              filteredStudents.map((s) => (
                <div
                  key={s.id}
                  dangerouslySetInnerHTML={{
                    __html: buildCertificateHTML(s, selClass, teacher, students, scoresMap, certQrUrls[s.id]),
                  }}
                />
              ))
            )}
          </div>
        )}

        {reportType === "agreement" && (
          <div className="space-y-6">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                🔍 ពុំមានទិន្នន័យសិស្សត្រូវតាមលក្ខខណ្ឌជ្រើសរើសឡើយ
              </div>
            ) : (
              filteredStudents.map((s) => (
                <div
                  key={s.id}
                  dangerouslySetInnerHTML={{
                    __html:
                      agreementSubTab === "learningplan"
                        ? buildIndividualAnnualLearningPlanPrintHTML([s], selClass, teacher, ptomRecords)
                        : buildLearningAgreementPrintHTML([s], selClass, teacher, allMonthsScores, ptomRecords),
                  }}
                />
              ))
            )}
          </div>
        )}

        {reportType === "qr_sheet" && (
          <div className="space-y-4">
            {isGeneratingQrSheet && (
              <div className="text-center py-3 text-amber-600 dark:text-amber-400 font-bold text-xs animate-pulse bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                ⚡ កំពុងរៀបចំ និងបង្កើត QR Code សិស្សទាំងថ្នាក់...
              </div>
            )}

            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                🔍 ពុំមានទិន្នន័យសិស្សត្រូវតាមលក្ខខណ្ឌជ្រើសរើសឡើយ
              </div>
            ) : qrLayoutMode === "cards" ? (
              /* GRID OF CARDS (8 PER A4 PAGE CUTTING FORMAT) */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStudents.map((s, idx) => {
                  const annualAvg = getAvg(s.id, students, scoresMap);
                  const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
                  const g = avgVal !== null ? gradeOf(avgVal) : { l: "—", c: "#6b7280" };
                  const rank = getRank(s.id, students, scoresMap);
                  const qrUrl = qrSheetUrls[s.id] || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(s.id)}`;
                  const guardian = s.fatherName || s.motherName || "";

                  return (
                    <div
                      key={s.id}
                      className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3.5 bg-white transition shadow-xs flex flex-col justify-between relative group"
                    >
                      {/* Card Top */}
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-2">
                        <div className="font-extrabold text-[11px] text-blue-900 truncate max-w-[200px]">
                          🏫 {schoolName} · ថ្នាក់ {selClass}
                        </div>
                        <div className="text-[10px] font-black bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          ល.រ: {idx + 1}
                        </div>
                      </div>

                      {/* Card Content (Info + QR) */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-sm font-black text-slate-900 truncate">
                            {s.lastName} {s.firstName}
                          </div>
                          <div className="text-[11px] font-bold text-blue-700 uppercase truncate">
                            {s.latinName || "STUDENT"}
                          </div>
                          <div className="text-[10.5px] text-slate-700">
                            <strong>អត្តលេខ ៖</strong> <span className="font-mono font-bold text-blue-900">{s.code || s.id}</span>
                          </div>
                          <div className="text-[10.5px] text-slate-700">
                            <strong>ភេទ ៖</strong> {s.gender} &nbsp;|&nbsp; <strong>ថ្ងៃកំណើត ៖</strong> {s.dob || "—"}
                          </div>
                          {guardian && (
                            <div className="text-[10px] text-slate-600 truncate">
                              <strong>អាណាព្យាបាល ៖</strong> {guardian}
                            </div>
                          )}
                          <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold">
                              ម.ភាគ: <strong>{avgVal !== null ? avgVal : "—"}</strong>
                            </span>
                            <span
                              className="px-1.5 py-0.5 rounded font-black text-white"
                              style={{ backgroundColor: g.c }}
                            >
                              និទ្ទេស {g.l}
                            </span>
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                              ចំណាត់ថ្នាក់ #{rank !== null ? rank : "—"}
                            </span>
                          </div>
                        </div>

                        {/* QR Image Box */}
                        <div className="flex flex-col items-center justify-center text-center flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenVerifyModal(s)}
                            className="group/qr relative cursor-pointer"
                            title="ចុចដើម្បីពិនិត្យផ្ទៀងផ្ទាត់ព័ត៌មានសិស្ស"
                          >
                            <img
                              src={qrUrl}
                              alt="QR"
                              className="w-20 h-20 object-contain border border-slate-300 rounded-lg p-1 bg-white shadow-xs group-hover/qr:scale-105 transition"
                            />
                            <div className="text-[9px] font-extrabold text-sky-600 mt-1 flex items-center justify-center gap-0.5">
                              <span>📲</span> <span>ស្កែនផ្ទៀងផ្ទាត់</span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Card Bottom Cut Guideline */}
                      <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-1.5 mt-2.5 text-[9.5px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <span>✂️</span> <span>កាត់តាមបន្ទាត់ដាច់ចែកជូនសិស្ស</span>
                        </span>
                        <span>ឆ្នាំសិក្សា ២០២៥-២០២៦</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE MASTER ROSTER MODE */
              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800">
                      <th className="p-2 border-r border-slate-300 text-center w-10 font-black">ល.រ</th>
                      <th className="p-2 border-r border-slate-300 text-center w-24 font-black">អត្តលេខ</th>
                      <th className="p-2 border-r border-slate-300 text-left font-black">គោត្តនាម-នាម</th>
                      <th className="p-2 border-r border-slate-300 text-left font-black">អក្សរឡាតាំង</th>
                      <th className="p-2 border-r border-slate-300 text-center w-14 font-black">ភេទ</th>
                      <th className="p-2 border-r border-slate-300 text-center w-24 font-black">ថ្ងៃខែឆ្នាំកំណើត</th>
                      <th className="p-2 border-r border-slate-300 text-center font-black">លទ្ធផលសិក្សា</th>
                      <th className="p-2 border-r border-slate-300 text-center w-20 font-black">QR Code</th>
                      <th className="p-2 text-center w-28 font-black">ហត្ថលេខាទទួល</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, idx) => {
                      const annualAvg = getAvg(s.id, students, scoresMap);
                      const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
                      const g = avgVal !== null ? gradeOf(avgVal) : { l: "—", c: "#6b7280" };
                      const rank = getRank(s.id, students, scoresMap);
                      const qrUrl = qrSheetUrls[s.id] || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(s.id)}`;

                      return (
                        <tr
                          key={s.id}
                          className="border-b border-dashed border-slate-300 hover:bg-blue-50/50 transition"
                        >
                          <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-700">{idx + 1}</td>
                          <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-blue-900">{s.code || s.id}</td>
                          <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{s.lastName} {s.firstName}</td>
                          <td className="p-2 border-r border-slate-300 font-bold text-blue-700 uppercase">{s.latinName || "—"}</td>
                          <td className="p-2 border-r border-slate-300 text-center">{s.gender}</td>
                          <td className="p-2 border-r border-slate-300 text-center">{s.dob || "—"}</td>
                          <td className="p-2 border-r border-slate-300 text-center">
                            <span className="font-bold">ម.ភាគ {avgVal !== null ? avgVal : "—"}</span>
                            <span
                              className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-black text-white"
                              style={{ backgroundColor: g.c }}
                            >
                              {g.l}
                            </span>
                            <span className="ml-1 text-slate-500 font-bold">#{rank !== null ? rank : "—"}</span>
                          </td>
                          <td className="p-1.5 border-r border-slate-300 text-center bg-slate-50">
                            <button
                              type="button"
                              onClick={() => onOpenVerifyModal(s)}
                              title="ចុចដើម្បីពិនិត្យមើលព័ត៌មានលម្អិត"
                              className="inline-block hover:scale-105 transition cursor-pointer"
                            >
                              <img
                                src={qrUrl}
                                alt="QR"
                                className="w-12 h-12 object-contain border border-slate-300 rounded p-0.5 bg-white mx-auto"
                              />
                            </button>
                          </td>
                          <td className="p-2 text-center text-slate-400 text-[10px]">
                            <div className="border-b border-dotted border-slate-300 h-6 mb-1"></div>
                            <span>ហត្ថលេខា/កាលបរិច្ឆេទ</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Signature Box */}
        {reportType !== "candidate" && reportType !== "certificate" && reportType !== "studentcard" && reportType !== "traineebook" && reportType !== "agreement" && reportType !== "qr_sheet" && (
          <div dangerouslySetInnerHTML={{ __html: buildSignatureHtml(tName, selMonth, "គ្រូប្រចាំថ្នាក់", teacher, reportType) }} />
        )}
      </div>

      {/* Camera QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={isQrScannerOpen}
        students={students}
        scoresMap={scoresMap}
        selClass={selClass}
        schoolName={schoolName}
        teacher={teacher}
        onClose={() => setIsQrScannerOpen(false)}
        onVerifyStudent={(stu) => {
          setSelectedStudentId(stu.id);
          onOpenVerifyModal(stu);
        }}
        onSelectStudent={(stu) => {
          setSelectedStudentId(stu.id);
          onOpenVerifyModal(stu);
        }}
        toast={toast}
      />
    </div>
  );
};
