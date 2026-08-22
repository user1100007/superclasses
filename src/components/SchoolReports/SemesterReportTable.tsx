import React, { useMemo, useState } from "react";
import { ClassAnnualStat, SchoolReportAdjustments } from "./types";
import { TeacherProfile } from "../../types";
import { toKhNum, getThreeWorkingDates } from "../../lib/constants";
import { printHTML } from "../../lib/printUtils";
import * as XLSX from "xlsx";

interface SemesterReportTableProps {
  teacher: TeacherProfile | null;
  classStats: ClassAnnualStat[];
  adjustments: Record<string, SchoolReportAdjustments>;
  onAdjustmentChange: (key: string, field: keyof SchoolReportAdjustments, val: number) => void;
  groupingMode: "grade" | "class";
  useKhmerNums: boolean;
  sig1Role: string;
  dateMode: "auto" | "dots";
  isEditingAdjustments: boolean;
}

export const SemesterReportTable: React.FC<SemesterReportTableProps> = ({
  teacher,
  classStats,
  adjustments,
  onAdjustmentChange,
  groupingMode,
  useKhmerNums,
  sig1Role,
  dateMode,
  isEditingAdjustments,
}) => {
  const [semesterNum, setSemesterNum] = useState<"1" | "2">("1");

  const dates = getThreeWorkingDates(semesterNum === "1" ? 3 : 7);
  const isTeacherOrOrganizer = sig1Role === "អ្នករៀបចំរបាយការណ៍" || sig1Role === "គ្រូប្រចាំថ្នាក់";

  const rows = useMemo(() => {
    if (groupingMode === "grade") {
      const GRADES = ["1", "2", "3", "4", "5", "6"];
      return GRADES.map((g) => {
        const matching = classStats.filter((c) => c.gradeLevel === g);
        const baseEnrolledTotal = matching.reduce((acc, c) => acc + c.totalEnrolled, 0);
        const baseEnrolledFemale = matching.reduce((acc, c) => acc + c.femaleEnrolled, 0);
        const passAvgTotal = matching.reduce((acc, c) => acc + c.passAvgTotal, 0);
        const passAvgFemale = matching.reduce((acc, c) => acc + c.passAvgFemale, 0);
        const failAvgTotal = matching.reduce((acc, c) => acc + c.failAvgTotal, 0);
        const failAvgFemale = matching.reduce((acc, c) => acc + c.failAvgFemale, 0);

        const adj = adjustments[g] || {};
        const col5_newTotal = adj.semNewEnrolledTotal || 0;
        const col6_newFemale = adj.semNewEnrolledFemale || 0;
        const col11_dropoutTotal = adj.semDropoutTotal || 0;
        const col12_dropoutFemale = adj.semDropoutFemale || 0;
        const colOtherTotal = adj.semOtherTotal || 0;
        const colOtherFemale = adj.semOtherFemale || 0;

        // 3 & 4: សិស្សបវេស្រកាល (Enrolled at start)
        const col3_bveTotal = Math.max(0, baseEnrolledTotal - col5_newTotal);
        const col4_bveFemale = Math.max(0, baseEnrolledFemale - col6_newFemale);

        // 1 & 2: សិស្សឆមាសទី១ (1=3+5, 2=4+6)
        const col1_semTotal = col3_bveTotal + col5_newTotal;
        const col2_semFemale = col4_bveFemale + col6_newFemale;

        // 7 & 8: សិស្សជាប់
        const col7_passTotal = passAvgTotal;
        const col8_passFemale = passAvgFemale;

        // 9 & 10: សិស្សធ្លាក់
        const col9_failTotal = failAvgTotal;
        const col10_failFemale = failAvgFemale;

        return {
          id: g,
          label: g,
          gradeName: `ថ្នាក់ទី ${g}`,
          col1_semTotal,
          col2_semFemale,
          col3_bveTotal,
          col4_bveFemale,
          col5_newTotal,
          col6_newFemale,
          col7_passTotal,
          col8_passFemale,
          col9_failTotal,
          col10_failFemale,
          col11_dropoutTotal,
          col12_dropoutFemale,
          colOtherTotal,
          colOtherFemale,
        };
      });
    } else {
      return classStats.map((c) => {
        const adj = adjustments[c.className] || {};
        const col5_newTotal = adj.semNewEnrolledTotal || 0;
        const col6_newFemale = adj.semNewEnrolledFemale || 0;
        const col11_dropoutTotal = adj.semDropoutTotal || 0;
        const col12_dropoutFemale = adj.semDropoutFemale || 0;
        const colOtherTotal = adj.semOtherTotal || 0;
        const colOtherFemale = adj.semOtherFemale || 0;

        const col3_bveTotal = Math.max(0, c.totalEnrolled - col5_newTotal);
        const col4_bveFemale = Math.max(0, c.femaleEnrolled - col6_newFemale);

        const col1_semTotal = col3_bveTotal + col5_newTotal;
        const col2_semFemale = col4_bveFemale + col6_newFemale;

        const col7_passTotal = c.passAvgTotal;
        const col8_passFemale = c.passAvgFemale;
        const col9_failTotal = c.failAvgTotal;
        const col10_failFemale = c.failAvgFemale;

        return {
          id: c.className,
          label: c.className,
          gradeName: `ថ្នាក់ ${c.className}`,
          col1_semTotal,
          col2_semFemale,
          col3_bveTotal,
          col4_bveFemale,
          col5_newTotal,
          col6_newFemale,
          col7_passTotal,
          col8_passFemale,
          col9_failTotal,
          col10_failFemale,
          col11_dropoutTotal,
          col12_dropoutFemale,
          colOtherTotal,
          colOtherFemale,
        };
      });
    }
  }, [classStats, groupingMode, adjustments]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.col1_semTotal += r.col1_semTotal;
        acc.col2_semFemale += r.col2_semFemale;
        acc.col3_bveTotal += r.col3_bveTotal;
        acc.col4_bveFemale += r.col4_bveFemale;
        acc.col5_newTotal += r.col5_newTotal;
        acc.col6_newFemale += r.col6_newFemale;
        acc.col7_passTotal += r.col7_passTotal;
        acc.col8_passFemale += r.col8_passFemale;
        acc.col9_failTotal += r.col9_failTotal;
        acc.col10_failFemale += r.col10_failFemale;
        acc.col11_dropoutTotal += r.col11_dropoutTotal;
        acc.col12_dropoutFemale += r.col12_dropoutFemale;
        acc.colOtherTotal += r.colOtherTotal;
        acc.colOtherFemale += r.colOtherFemale;
        return acc;
      },
      {
        col1_semTotal: 0,
        col2_semFemale: 0,
        col3_bveTotal: 0,
        col4_bveFemale: 0,
        col5_newTotal: 0,
        col6_newFemale: 0,
        col7_passTotal: 0,
        col8_passFemale: 0,
        col9_failTotal: 0,
        col10_failFemale: 0,
        col11_dropoutTotal: 0,
        col12_dropoutFemale: 0,
        colOtherTotal: 0,
        colOtherFemale: 0,
      }
    );
  }, [rows]);

  const exportExcel = () => {
    const semTitle = `១. លទ្ធផលសិក្សាឆមាសទី ${semesterNum} :`;
    const wsData: any[][] = [
      ["ព្រះរាជាណាចក្រកម្ពុជា"],
      ["ជាតិ សាសនា ព្រះមហាក្សត្រ"],
      [],
      [`${teacher?.school || "សាលាបឋមសិក្សា"} - ${semTitle}`],
      [],
      [
        "ថ្នាក់ទី",
        `សិស្សឆមាសទី${semesterNum}`,
        "",
        "សិស្សបវេស្រកាល",
        "",
        "សិស្សចូលថ្មីថែម",
        "",
        "សិស្សជាប់",
        "",
        "សិស្សធ្លាក់",
        "",
        "សិស្សបោះបង់",
        "",
        "ផ្សេងៗ",
        "",
      ],
      [
        "",
        "សរុប",
        "ស្រី",
        "សរុប",
        "ស្រី",
        "សរុប",
        "ស្រី",
        "សរុប",
        "ស្រី",
        "សរុប",
        "ស្រី",
        "សរុប",
        "ស្រី",
        "សរុប",
        "ស្រី",
      ],
      [
        "",
        "1=3+5",
        "2=4+6",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "",
        "",
      ],
    ];

    rows.forEach((r) => {
      wsData.push([
        r.label,
        r.col1_semTotal,
        r.col2_semFemale,
        r.col3_bveTotal,
        r.col4_bveFemale,
        r.col5_newTotal,
        r.col6_newFemale,
        r.col7_passTotal,
        r.col8_passFemale,
        r.col9_failTotal,
        r.col10_failFemale,
        r.col11_dropoutTotal,
        r.col12_dropoutFemale,
        r.colOtherTotal,
        r.colOtherFemale,
      ]);
    });

    wsData.push([
      "សរុប",
      totals.col1_semTotal,
      totals.col2_semFemale,
      totals.col3_bveTotal,
      totals.col4_bveFemale,
      totals.col5_newTotal,
      totals.col6_newFemale,
      totals.col7_passTotal,
      totals.col8_passFemale,
      totals.col9_failTotal,
      totals.col10_failFemale,
      totals.col11_dropoutTotal,
      totals.col12_dropoutFemale,
      totals.colOtherTotal,
      totals.colOtherFemale,
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, `ឆមាសទី${semesterNum}`);
    XLSX.writeFile(wb, `លទ្ធផលសិក្សាឆមាសទី${semesterNum}_${teacher?.school || "សាលា"}.xlsx`);
  };

  const handlePrint = () => {
    const tableRowsHtml = rows
      .map(
        (r) => `
      <tr>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;background-color:#f8fafc;">${useKhmerNums ? toKhNum(r.label) : r.label}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;">${useKhmerNums ? toKhNum(r.col1_semTotal) : r.col1_semTotal}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.col2_semFemale) : r.col2_semFemale}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.col3_bveTotal) : r.col3_bveTotal}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.col4_bveFemale) : r.col4_bveFemale}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.col5_newTotal) : r.col5_newTotal}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.col6_newFemale) : r.col6_newFemale}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;color:#065f46;background-color:#ecfdf5;">${useKhmerNums ? toKhNum(r.col7_passTotal) : r.col7_passTotal}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#065f46;background-color:#ecfdf5;">${useKhmerNums ? toKhNum(r.col8_passFemale) : r.col8_passFemale}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#991b1b;">${useKhmerNums ? toKhNum(r.col9_failTotal) : r.col9_failTotal}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#991b1b;">${useKhmerNums ? toKhNum(r.col10_failFemale) : r.col10_failFemale}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#b45309;">${useKhmerNums ? toKhNum(r.col11_dropoutTotal) : r.col11_dropoutTotal}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#b45309;">${useKhmerNums ? toKhNum(r.col12_dropoutFemale) : r.col12_dropoutFemale}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.colOtherTotal) : r.colOtherTotal || ""}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.colOtherFemale) : r.colOtherFemale || ""}</td>
      </tr>
    `
      )
      .join("");

    const totalRowHtml = `
      <tr style="background-color:#f1f5f9;font-weight:bold;">
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">សរុប</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.col1_semTotal) : totals.col1_semTotal}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.col2_semFemale) : totals.col2_semFemale}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.col3_bveTotal) : totals.col3_bveTotal}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.col4_bveFemale) : totals.col4_bveFemale}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.col5_newTotal) : totals.col5_newTotal}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.col6_newFemale) : totals.col6_newFemale}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;background-color:#dcfce7;color:#065f46;">${useKhmerNums ? toKhNum(totals.col7_passTotal) : totals.col7_passTotal}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;background-color:#dcfce7;color:#065f46;">${useKhmerNums ? toKhNum(totals.col8_passFemale) : totals.col8_passFemale}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;color:#991b1b;">${useKhmerNums ? toKhNum(totals.col9_failTotal) : totals.col9_failTotal}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;color:#991b1b;">${useKhmerNums ? toKhNum(totals.col10_failFemale) : totals.col10_failFemale}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;color:#b45309;">${useKhmerNums ? toKhNum(totals.col11_dropoutTotal) : totals.col11_dropoutTotal}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;color:#b45309;">${useKhmerNums ? toKhNum(totals.col12_dropoutFemale) : totals.col12_dropoutFemale}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.colOtherTotal) : totals.colOtherTotal || ""}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.colOtherFemale) : totals.colOtherFemale || ""}</td>
      </tr>
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>លទ្ធផលសិក្សាឆមាសទី ${semesterNum}</title>
        <style>
          @page { size: A4 portrait; margin: 6mm 5mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Kantumruy Pro', 'Khmer OS Siemreap', 'Hanuman', sans-serif; font-size: 10.5px; color: #0f172a; margin: 0; padding: 4px 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5px; }
          th, td { border: 1px solid #334155; text-align: center; padding: 3px 1px; }
          .header-box { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
          .sig-box { display: flex; justify-content: space-between; margin-top: 24px; }
          .sig-col { text-align: center; width: 42%; font-size: 11px; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 10px;">
          <h2 style="margin: 0; font-size: 14px; font-weight: 900;">ព្រះរាជាណាចក្រកម្ពុជា</h2>
          <h3 style="margin: 0; font-size: 12px; font-weight: 900;">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
          <div style="font-size: 10px; color: #b45309; margin-top: 1px;">꧁ ༺ ༻ ꧂</div>
        </div>

        <div class="header-box">
          <div style="font-size: 11px; line-height: 1.4; font-weight: bold;">
            <div>រដ្ឋបាលខេត្ត: ${teacher?.province || "……………………"}</div>
            <div>ការិយាល័យអប់រំ យុវជន និងកីឡា: ${teacher?.district || "……………………"}</div>
            <div>សាលារៀន: ${teacher?.school || "សាលាបឋមសិក្សា"}</div>
          </div>
        </div>

        <h1 style="text-align: center; font-size: 14px; font-weight: 900; margin: 10px 0 4px 0; color: #1e3a8a;">
          ១. លទ្ធផលសិក្សាឆមាសទី ${semesterNum} :
        </h1>

        <table border="1" cellpadding="0" cellspacing="0">
          <tbody>
            <tr>
              <td rowspan="3" style="width: 44px; font-weight: bold; background-color: #f8fafc;">
                <p style="text-align: center; margin: 0; font-size: 10px;">ថ្នាក់ទី</p>
              </td>
              <td colspan="14" style="font-weight: bold; background-color: #f1f5f9; padding: 4px 0;">
                <p style="text-align: center; margin: 0; font-size: 11.5px;">លទ្ធផលសិក្សារបស់សិស្ស</p>
              </td>
            </tr>
            <tr style="background-color: #f8fafc; font-weight: bold; font-size: 9px;">
              <td colspan="2"><p style="margin:0;">សិស្សឆមាសទី${semesterNum}</p></td>
              <td colspan="2"><p style="margin:0;">សិស្សបវេស្រកាល</p></td>
              <td colspan="2"><p style="margin:0;">សិស្សចូលថ្មីថែម</p></td>
              <td colspan="2" style="background-color: #ecfdf5; color: #065f46;"><p style="margin:0;">សិស្សជាប់</p></td>
              <td colspan="2"><p style="margin:0;">សិស្សធ្លាក់</p></td>
              <td colspan="2"><p style="margin:0;">សិស្សបោះបង់</p></td>
              <td colspan="2"><p style="margin:0;">ផ្សេងៗ</p></td>
            </tr>
            <tr style="background-color: #f1f5f9; font-size: 8.5px; font-weight: bold;">
              <td>សរុប (1=3+5)</td><td>ស្រី (2=4+6)</td>
              <td>សរុប (3)</td><td>ស្រី (4)</td>
              <td>សរុប (5)</td><td>ស្រី (6)</td>
              <td style="background-color: #dcfce7; color: #065f46;">សរុប (7)</td><td style="background-color: #dcfce7; color: #065f46;">ស្រី (8)</td>
              <td>សរុប (9)</td><td>ស្រី (10)</td>
              <td>សរុប (11)</td><td>ស្រី (12)</td>
              <td>សរុប</td><td>ស្រី</td>
            </tr>
            ${tableRowsHtml}
            ${totalRowHtml}
          </tbody>
        </table>

        <div class="sig-box">
          <div class="sig-col">
            <div style="font-weight: bold; font-size: 13px;">បានឃើញ និងឯកភាព</div>
            ${
              isTeacherOrOrganizer
                ? `
              <div style="font-size: 10px; color: #374151; line-height: 1.6; margin-top: 4px;">
                ${dateMode === "auto" ? dates.d2.lunar : "ថ្ងៃ..................... ខែ............ ឆ្នាំ............ ...... ព.ស. ២៥...."}
              </div>
              <div style="font-size: 10px; color: #374151;">
                ${dateMode === "auto" ? (teacher?.village || teacher?.district || "រោគ") + " " + dates.d2.solar : "ថ្ងៃទី........ ខែ........ ឆ្នាំ២០២...."}
              </div>
            `
                : `<div style="height: 32px;"></div>`
            }
            <div style="font-weight: bold; margin-top: 8px; font-size: 12px;">នាយក/នាយិកាសាលា</div>
            <div style="height: 55px;"></div>
          </div>
          <div class="sig-col">
            <div style="font-size: 10px; color: #374151; line-height: 1.6; margin-top: 4px;">
              ${dateMode === "auto" ? dates.d0.lunar : "ថ្ងៃ..................... ខែ............ ឆ្នាំ............ ...... ព.ស. ២៥...."}
            </div>
            <div style="font-size: 10px; color: #374151;">
              ${dateMode === "auto" ? (teacher?.village || teacher?.district || "រោគ") + " " + dates.d0.solar : "ថ្ងៃទី........ ខែ........ ឆ្នាំ២០២...."}
            </div>
            <div style="font-weight: bold; margin-top: 8px; font-size: 12px;">${sig1Role}</div>
            <div style="height: 55px;"></div>
            <div style="font-weight: bold; color: #1e3a8a; font-size: 12px;">${teacher?.fullName || "…………………………"}</div>
          </div>
        </div>
      </body>
      </html>
    `;
    printHTML(htmlContent);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Semester 1 or 2 Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-bold gap-1">
            <button
              onClick={() => setSemesterNum("1")}
              className={`px-3 py-1 rounded-md transition ${
                semesterNum === "1"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              ឆមាសទី ១
            </button>
            <button
              onClick={() => setSemesterNum("2")}
              className={`px-3 py-1 rounded-md transition ${
                semesterNum === "2"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              ឆមាសទី ២
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            📥 ទាញយកជា Excel
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            🖨️ បោះពុម្ពតារាងឆមាសទី {semesterNum}
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm text-slate-900 dark:text-slate-100 overflow-hidden">
        <div className="text-center mb-4 space-y-1">
          <h1 className="text-base md:text-lg font-black text-blue-900 dark:text-blue-400 uppercase">
            ១. លទ្ធផលសិក្សាឆមាសទី {semesterNum} :
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {teacher?.school || "សាលាបឋមសិក្សា"} · ឆ្នាំសិក្សា ២០២៥-២០២៦
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-xs">
            <tbody>
              {/* Header Row 1 */}
              <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold">
                <td
                  rowSpan={3}
                  className="border border-slate-300 dark:border-slate-700 py-2.5 px-2 text-center w-14 font-black"
                >
                  <p className="text-center m-0">ថ្នាក់ទី</p>
                </td>
                <td
                  colSpan={14}
                  className="border border-slate-300 dark:border-slate-700 py-2 px-2 text-center text-blue-900 dark:text-blue-300 font-black text-sm bg-blue-50/60 dark:bg-blue-950/40"
                >
                  <p className="text-center m-0">លទ្ធផលសិក្សារបស់សិស្ស</p>
                </td>
              </tr>

              {/* Header Row 2 */}
              <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold text-[11px] text-slate-800 dark:text-slate-200">
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center">
                  សិស្សឆមាសទី{semesterNum}
                </td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center">
                  សិស្សបវេស្រកាល
                </td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center">
                  សិស្សចូលថ្មីថែម
                </td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                  សិស្សជាប់
                </td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center text-red-700 dark:text-red-400">
                  សិស្សធ្លាក់
                </td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center text-amber-700 dark:text-amber-400">
                  សិស្សបោះបង់
                </td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center">
                  ផ្សេងៗ
                </td>
              </tr>

              {/* Header Row 3 */}
              <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-[10px] text-slate-600 dark:text-slate-400">
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">សរុប (1=3+5)</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">ស្រី (2=4+6)</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">សរុប (3)</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">ស្រី (4)</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">សរុប (5)</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">ស្រី (6)</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">សរុប (7)</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">ស្រី (8)</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center text-red-700 dark:text-red-400">សរុប (9)</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center text-red-700 dark:text-red-400">ស្រី (10)</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center text-amber-700 dark:text-amber-400">សរុប (11)</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center text-amber-700 dark:text-amber-400">ស្រី (12)</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">សរុប</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">ស្រី</td>
              </tr>

              {/* Data Rows */}
              {rows.map((r, idx) => (
                <tr
                  key={r.id}
                  className={idx % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/30" : "bg-white dark:bg-slate-900"}
                >
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-bold text-slate-800 dark:text-slate-200">
                    {useKhmerNums ? toKhNum(r.label) : r.label}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-bold">
                    {useKhmerNums ? toKhNum(r.col1_semTotal) : r.col1_semTotal}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-slate-600 dark:text-slate-400">
                    {useKhmerNums ? toKhNum(r.col2_semFemale) : r.col2_semFemale}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center">
                    {useKhmerNums ? toKhNum(r.col3_bveTotal) : r.col3_bveTotal}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-slate-600 dark:text-slate-400">
                    {useKhmerNums ? toKhNum(r.col4_bveFemale) : r.col4_bveFemale}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.semNewEnrolledTotal || 0}
                        onChange={(e) => onAdjustmentChange(r.id, "semNewEnrolledTotal", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-blue-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col5_newTotal) : r.col5_newTotal}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-slate-600 dark:text-slate-400">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.semNewEnrolledFemale || 0}
                        onChange={(e) => onAdjustmentChange(r.id, "semNewEnrolledFemale", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-blue-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col6_newFemale) : r.col6_newFemale}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                    {useKhmerNums ? toKhNum(r.col7_passTotal) : r.col7_passTotal}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                    {useKhmerNums ? toKhNum(r.col8_passFemale) : r.col8_passFemale}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-bold text-red-600 dark:text-red-400">
                    {useKhmerNums ? toKhNum(r.col9_failTotal) : r.col9_failTotal}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-red-500 dark:text-red-400">
                    {useKhmerNums ? toKhNum(r.col10_failFemale) : r.col10_failFemale}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.semDropoutTotal || 0}
                        onChange={(e) => onAdjustmentChange(r.id, "semDropoutTotal", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-amber-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400 font-bold">
                        {useKhmerNums ? toKhNum(r.col11_dropoutTotal) : r.col11_dropoutTotal}
                      </span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-amber-600 dark:text-amber-400">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.semDropoutFemale || 0}
                        onChange={(e) => onAdjustmentChange(r.id, "semDropoutFemale", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-amber-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col12_dropoutFemale) : r.col12_dropoutFemale}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-slate-600">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.semOtherTotal || 0}
                        onChange={(e) => onAdjustmentChange(r.id, "semOtherTotal", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-slate-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.colOtherTotal) : r.colOtherTotal || "—"}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-slate-600">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.semOtherFemale || 0}
                        onChange={(e) => onAdjustmentChange(r.id, "semOtherFemale", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-slate-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.colOtherFemale) : r.colOtherFemale || "—"}</span>
                    )}
                  </td>
                </tr>
              ))}

              {/* Total Row */}
              <tr className="bg-slate-200/90 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-400">
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black">
                  សរុប
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black">
                  {useKhmerNums ? toKhNum(totals.col1_semTotal) : totals.col1_semTotal}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-slate-700 dark:text-slate-300">
                  {useKhmerNums ? toKhNum(totals.col2_semFemale) : totals.col2_semFemale}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black">
                  {useKhmerNums ? toKhNum(totals.col3_bveTotal) : totals.col3_bveTotal}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-slate-700 dark:text-slate-300">
                  {useKhmerNums ? toKhNum(totals.col4_bveFemale) : totals.col4_bveFemale}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black">
                  {useKhmerNums ? toKhNum(totals.col5_newTotal) : totals.col5_newTotal}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-slate-700 dark:text-slate-300">
                  {useKhmerNums ? toKhNum(totals.col6_newFemale) : totals.col6_newFemale}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/40">
                  {useKhmerNums ? toKhNum(totals.col7_passTotal) : totals.col7_passTotal}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/40">
                  {useKhmerNums ? toKhNum(totals.col8_passFemale) : totals.col8_passFemale}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-red-900 dark:text-red-300">
                  {useKhmerNums ? toKhNum(totals.col9_failTotal) : totals.col9_failTotal}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-red-900 dark:text-red-300">
                  {useKhmerNums ? toKhNum(totals.col10_failFemale) : totals.col10_failFemale}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-amber-900 dark:text-amber-300">
                  {useKhmerNums ? toKhNum(totals.col11_dropoutTotal) : totals.col11_dropoutTotal}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-amber-900 dark:text-amber-300">
                  {useKhmerNums ? toKhNum(totals.col12_dropoutFemale) : totals.col12_dropoutFemale}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black">
                  {useKhmerNums ? toKhNum(totals.colOtherTotal) : totals.colOtherTotal || "—"}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black">
                  {useKhmerNums ? toKhNum(totals.colOtherFemale) : totals.colOtherFemale || "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
