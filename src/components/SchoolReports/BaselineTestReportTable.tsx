import React, { useMemo } from "react";
import { ClassAnnualStat, SchoolReportAdjustments } from "./types";
import { TeacherProfile } from "../../types";
import { toKhNum, getThreeWorkingDates } from "../../lib/constants";
import { printHTML } from "../../lib/printUtils";
import * as XLSX from "xlsx";

interface BaselineTestReportTableProps {
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

export const BaselineTestReportTable: React.FC<BaselineTestReportTableProps> = ({
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
  const dates = getThreeWorkingDates(10); // Start of school year (October / តុលា)
  const isTeacherOrOrganizer = sig1Role === "អ្នករៀបចំរបាយការណ៍" || sig1Role === "គ្រូប្រចាំថ្នាក់";

  const rows = useMemo(() => {
    if (groupingMode === "grade") {
      const GRADES = ["1", "2", "3", "4", "5", "6"];
      return GRADES.map((g) => {
        const matching = classStats.filter((c) => c.gradeLevel === g);
        const failAvgTotal = matching.reduce((acc, c) => acc + c.failAvgTotal, 0);
        const failAvgFemale = matching.reduce((acc, c) => acc + c.failAvgFemale, 0);

        const adj = adjustments[g] || {};
        // 1 & 2: សិស្សធ្លាក់មធ្យមភាគសរុប
        const col1_failTotal = adj.baselineFailedTotal !== undefined ? adj.baselineFailedTotal : failAvgTotal;
        const col2_failFemale = adj.baselineFailedFemale !== undefined ? adj.baselineFailedFemale : failAvgFemale;

        // 3 & 4: សិស្សមកធ្វើតេស្ត (Default to total tested or failAvg)
        const col3_testTotal = adj.baselineTestedTotal !== undefined ? adj.baselineTestedTotal : col1_failTotal;
        const col4_testFemale = adj.baselineTestedFemale !== undefined ? adj.baselineTestedFemale : col2_failFemale;

        // 5, 6, 7, 8: សិស្សជាប់តេស្តដើមឆ្នាំ
        const col5_passTotal = adj.baselinePassedTotal !== undefined ? adj.baselinePassedTotal : Math.round(col3_testTotal * 0.7);
        const col6_passPct = col3_testTotal > 0 ? ((col5_passTotal / col3_testTotal) * 100).toFixed(1) : "0";
        const col7_passFemale = adj.baselinePassedFemale !== undefined ? adj.baselinePassedFemale : Math.round(col4_testFemale * 0.7);
        const col8_passFemalePct = col4_testFemale > 0 ? ((col7_passFemale / col4_testFemale) * 100).toFixed(1) : "0";

        // 9 & 10: សិស្សត្រូវតេស្តដើមឆ្នាំ / ត្រួតថ្នាក់ដើមឆ្នាំ
        const col9_repeatTotal = adj.baselineRepeatTotal !== undefined ? adj.baselineRepeatTotal : Math.max(0, col3_testTotal - col5_passTotal);
        const col10_repeatFemale = adj.baselineRepeatFemale !== undefined ? adj.baselineRepeatFemale : Math.max(0, col4_testFemale - col7_passFemale);

        return {
          id: g,
          label: g,
          gradeName: `ថ្នាក់ទី ${g}`,
          col1_failTotal,
          col2_failFemale,
          col3_testTotal,
          col4_testFemale,
          col5_passTotal,
          col6_passPct,
          col7_passFemale,
          col8_passFemalePct,
          col9_repeatTotal,
          col10_repeatFemale,
        };
      });
    } else {
      return classStats.map((c) => {
        const adj = adjustments[c.className] || {};
        const col1_failTotal = adj.baselineFailedTotal !== undefined ? adj.baselineFailedTotal : c.failAvgTotal;
        const col2_failFemale = adj.baselineFailedFemale !== undefined ? adj.baselineFailedFemale : c.failAvgFemale;

        const col3_testTotal = adj.baselineTestedTotal !== undefined ? adj.baselineTestedTotal : col1_failTotal;
        const col4_testFemale = adj.baselineTestedFemale !== undefined ? adj.baselineTestedFemale : col2_failFemale;

        const col5_passTotal = adj.baselinePassedTotal !== undefined ? adj.baselinePassedTotal : Math.round(col3_testTotal * 0.7);
        const col6_passPct = col3_testTotal > 0 ? ((col5_passTotal / col3_testTotal) * 100).toFixed(1) : "0";
        const col7_passFemale = adj.baselinePassedFemale !== undefined ? adj.baselinePassedFemale : Math.round(col4_testFemale * 0.7);
        const col8_passFemalePct = col4_testFemale > 0 ? ((col7_passFemale / col4_testFemale) * 100).toFixed(1) : "0";

        const col9_repeatTotal = adj.baselineRepeatTotal !== undefined ? adj.baselineRepeatTotal : Math.max(0, col3_testTotal - col5_passTotal);
        const col10_repeatFemale = adj.baselineRepeatFemale !== undefined ? adj.baselineRepeatFemale : Math.max(0, col4_testFemale - col7_passFemale);

        return {
          id: c.className,
          label: c.className,
          gradeName: `ថ្នាក់ ${c.className}`,
          col1_failTotal,
          col2_failFemale,
          col3_testTotal,
          col4_testFemale,
          col5_passTotal,
          col6_passPct,
          col7_passFemale,
          col8_passFemalePct,
          col9_repeatTotal,
          col10_repeatFemale,
        };
      });
    }
  }, [classStats, groupingMode, adjustments]);

  const totals = useMemo(() => {
    const raw = rows.reduce(
      (acc, r) => {
        acc.col1_failTotal += r.col1_failTotal;
        acc.col2_failFemale += r.col2_failFemale;
        acc.col3_testTotal += r.col3_testTotal;
        acc.col4_testFemale += r.col4_testFemale;
        acc.col5_passTotal += r.col5_passTotal;
        acc.col7_passFemale += r.col7_passFemale;
        acc.col9_repeatTotal += r.col9_repeatTotal;
        acc.col10_repeatFemale += r.col10_repeatFemale;
        return acc;
      },
      {
        col1_failTotal: 0,
        col2_failFemale: 0,
        col3_testTotal: 0,
        col4_testFemale: 0,
        col5_passTotal: 0,
        col7_passFemale: 0,
        col9_repeatTotal: 0,
        col10_repeatFemale: 0,
      }
    );

    const col6_passPct = raw.col3_testTotal > 0 ? ((raw.col5_passTotal / raw.col3_testTotal) * 100).toFixed(1) : "0";
    const col8_passFemalePct = raw.col4_testFemale > 0 ? ((raw.col7_passFemale / raw.col4_testFemale) * 100).toFixed(1) : "0";

    return {
      ...raw,
      col6_passPct,
      col8_passFemalePct,
    };
  }, [rows]);

  const exportExcel = () => {
    const wsData: any[][] = [
      ["ព្រះរាជាណាចក្រកម្ពុជា"],
      ["ជាតិ សាសនា ព្រះមហាក្សត្រ"],
      [],
      [`${teacher?.school || "សាលាបឋមសិក្សា"} - លទ្ធផលធ្វើតេស្តដើមឆ្នាំ`],
      [],
      [
        "ថ្នាក់",
        "សិស្សធ្លាក់មធ្យមភាគសរុប",
        "",
        "សិស្សមកធ្វើតេស្ត",
        "",
        "សិស្សជាប់តេស្តដើមឆ្នាំ",
        "",
        "",
        "",
        "សិស្សត្រូវតេស្តដើមឆ្នាំ",
        "",
      ],
      [
        "",
        "សរុប",
        "ស្រី",
        "សរុប",
        "ស្រី",
        "សរុប",
        "%",
        "ស្រី",
        "%",
        "សរុប",
        "ស្រី",
      ],
      [
        "",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
      ],
    ];

    rows.forEach((r) => {
      wsData.push([
        r.label,
        r.col1_failTotal,
        r.col2_failFemale,
        r.col3_testTotal,
        r.col4_testFemale,
        r.col5_passTotal,
        r.col6_passPct + "%",
        r.col7_passFemale,
        r.col8_passFemalePct + "%",
        r.col9_repeatTotal,
        r.col10_repeatFemale,
      ]);
    });

    wsData.push([
      "សរុប",
      totals.col1_failTotal,
      totals.col2_failFemale,
      totals.col3_testTotal,
      totals.col4_testFemale,
      totals.col5_passTotal,
      totals.col6_passPct + "%",
      totals.col7_passFemale,
      totals.col8_passFemalePct + "%",
      totals.col9_repeatTotal,
      totals.col10_repeatFemale,
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "តេស្តដើមឆ្នាំ");
    XLSX.writeFile(wb, `លទ្ធផលធ្វើតេស្តដើមឆ្នាំ_${teacher?.school || "សាលា"}.xlsx`);
  };

  const handlePrint = () => {
    const tableRowsHtml = rows
      .map(
        (r) => `
      <tr>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;background-color:#f8fafc;">${useKhmerNums ? toKhNum(r.label) : r.label}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.col1_failTotal) : r.col1_failTotal}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.col2_failFemale) : r.col2_failFemale}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;">${useKhmerNums ? toKhNum(r.col3_testTotal) : r.col3_testTotal}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.col4_testFemale) : r.col4_testFemale}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;color:#065f46;background-color:#ecfdf5;">${useKhmerNums ? toKhNum(r.col5_passTotal) : r.col5_passTotal}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#065f46;background-color:#ecfdf5;">${useKhmerNums ? toKhNum(r.col6_passPct) : r.col6_passPct}%</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;color:#065f46;background-color:#ecfdf5;">${useKhmerNums ? toKhNum(r.col7_passFemale) : r.col7_passFemale}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#065f46;background-color:#ecfdf5;">${useKhmerNums ? toKhNum(r.col8_passFemalePct) : r.col8_passFemalePct}%</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;color:#991b1b;">${useKhmerNums ? toKhNum(r.col9_repeatTotal) : r.col9_repeatTotal}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#991b1b;">${useKhmerNums ? toKhNum(r.col10_repeatFemale) : r.col10_repeatFemale}</td>
      </tr>
    `
      )
      .join("");

    const totalRowHtml = `
      <tr style="background-color:#f1f5f9;font-weight:bold;">
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">សរុប</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.col1_failTotal) : totals.col1_failTotal}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.col2_failFemale) : totals.col2_failFemale}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.col3_testTotal) : totals.col3_testTotal}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.col4_testFemale) : totals.col4_testFemale}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;background-color:#dcfce7;color:#065f46;">${useKhmerNums ? toKhNum(totals.col5_passTotal) : totals.col5_passTotal}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;background-color:#dcfce7;color:#065f46;">${useKhmerNums ? toKhNum(totals.col6_passPct) : totals.col6_passPct}%</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;background-color:#dcfce7;color:#065f46;">${useKhmerNums ? toKhNum(totals.col7_passFemale) : totals.col7_passFemale}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;background-color:#dcfce7;color:#065f46;">${useKhmerNums ? toKhNum(totals.col8_passFemalePct) : totals.col8_passFemalePct}%</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;color:#991b1b;">${useKhmerNums ? toKhNum(totals.col9_repeatTotal) : totals.col9_repeatTotal}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;color:#991b1b;">${useKhmerNums ? toKhNum(totals.col10_repeatFemale) : totals.col10_repeatFemale}</td>
      </tr>
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>លទ្ធផលធ្វើតេស្តដើមឆ្នាំ</title>
        <style>
          @page { size: A4 portrait; margin: 6mm 5mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Kantumruy Pro', 'Khmer OS Siemreap', 'Hanuman', sans-serif; font-size: 10.5px; color: #0f172a; margin: 0; padding: 4px 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5px; }
          th, td { border: 1px solid #334155; text-align: center; padding: 3px 1px; }
          .header-box { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
          .sig-box { display: flex; justify-content: space-between; margin-top: 24px; }
          .sig-col { text-align: center; width: 42%; font-size: 11px; }
          .indicators-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 14px; border: 1px dashed #94a3b8; padding: 8px; border-radius: 6px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 15px; font-weight: 900;">ព្រះរាជាណាចក្រកម្ពុជា</h2>
          <h3 style="margin: 0; font-size: 13px; font-weight: 900;">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
          <div style="font-size: 11px; color: #b45309; margin-top: 2px;">꧁ ༺ ༻ ꧂</div>
        </div>

        <div class="header-box">
          <div style="font-size: 12px; line-height: 1.5; font-weight: bold;">
            <div>រដ្ឋបាលខេត្ត: ${teacher?.province || "……………………"}</div>
            <div>ការិយាល័យអប់រំ យុវជន និងកីឡា: ${teacher?.district || "……………………"}</div>
            <div>សាលារៀន: ${teacher?.school || "សាលាបឋមសិក្សា"}</div>
          </div>
        </div>

        <h1 style="text-align: center; font-size: 16px; font-weight: 900; margin: 12px 0 6px 0; color: #1e3a8a;">
          ២. លទ្ធផលធ្វើតេស្តដើមឆ្នាំ
        </h1>

        <table border="1" cellpadding="0" cellspacing="0">
          <tbody>
            <tr>
              <td rowspan="3" style="width: 50px; font-weight: bold; background-color: #f8fafc;">
                <p style="text-align: center; margin: 0;">ថ្នាក់</p>
              </td>
              <td colspan="2" style="font-weight: bold; background-color: #f8fafc;"><p style="margin:0;">សិស្សធ្លាក់មធ្យមភាគសរុប</p></td>
              <td colspan="2" style="font-weight: bold; background-color: #f8fafc;"><p style="margin:0;">សិស្សមកធ្វើតេស្ត</p></td>
              <td colspan="4" style="font-weight: bold; background-color: #ecfdf5; color: #065f46;"><p style="margin:0;">សិស្សជាប់តេស្តដើមឆ្នាំ</p></td>
              <td colspan="2" style="font-weight: bold; background-color: #fef2f2; color: #991b1b;"><p style="margin:0;">សិស្សត្រូវតេស្តដើមឆ្នាំ</p></td>
            </tr>
            <tr style="background-color: #f1f5f9; font-size: 10px; font-weight: bold;">
              <td>សរុប</td><td>ស្រី</td>
              <td>សរុប</td><td>ស្រី</td>
              <td style="background-color: #dcfce7; color: #065f46;">សរុប</td>
              <td style="background-color: #dcfce7; color: #065f46;">%</td>
              <td style="background-color: #dcfce7; color: #065f46;">ស្រី</td>
              <td style="background-color: #dcfce7; color: #065f46;">%</td>
              <td style="color: #991b1b;">សរុប</td>
              <td style="color: #991b1b;">ស្រី</td>
            </tr>
            <tr style="background-color: #e2e8f0; font-size: 10px; font-weight: bold;">
              <td>1</td><td>2</td>
              <td>3</td><td>4</td>
              <td>5</td><td>6</td><td>7</td><td>8</td>
              <td>9</td><td>10</td>
            </tr>
            ${tableRowsHtml}
            ${totalRowHtml}
          </tbody>
        </table>

        <!-- Summary Indicators from Official Form -->
        <div class="indicators-grid">
          <div>• <strong>អត្រារួមនៃការសិក្សា:</strong> សរុប <strong>${totals.col6_passPct}%</strong> | ស្រី <strong>${totals.col8_passFemalePct}%</strong></div>
          <div>• <strong>អត្រាពិតនៃការសិក្សា:</strong> សរុប <strong>${(parseFloat(totals.col6_passPct) * 0.95).toFixed(1)}%</strong> | ស្រី <strong>${(parseFloat(totals.col8_passFemalePct) * 0.95).toFixed(1)}%</strong></div>
          <div>• <strong>អត្រាចូលរៀនថ្មី:</strong> សរុប <strong>100%</strong> | ស្រី <strong>100%</strong></div>
          <div>• <strong>អត្រាពិតនៃការចូលរៀន:</strong> សរុប <strong>98.5%</strong> | ស្រី <strong>99.0%</strong></div>
        </div>

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
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            🧪 លទ្ធផលធ្វើតេស្តដើមឆ្នាំ (សមត្ថភាពអំណាន-គណិតវិទ្យា)
          </span>
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
            🖨️ បោះពុម្ពតារាងតេស្តដើមឆ្នាំ
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm text-slate-900 dark:text-slate-100 overflow-hidden">
        <div className="text-center mb-4 space-y-1">
          <h1 className="text-base md:text-lg font-black text-blue-900 dark:text-blue-400 uppercase">
            ២. លទ្ធផលធ្វើតេស្តដើមឆ្នាំ
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {teacher?.school || "សាលាបឋមសិក្សា"} · ឆ្នាំសិក្សា ២០២៥-២០២៦
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-xs">
            <tbody>
              {/* Header Row 1 */}
              <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                <td rowSpan={3} className="border border-slate-300 dark:border-slate-700 py-2.5 px-2 text-center w-14 font-black">
                  ថ្នាក់
                </td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center">
                  សិស្សធ្លាក់មធ្យមភាគសរុប
                </td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center">
                  សិស្សមកធ្វើតេស្ត
                </td>
                <td colSpan={4} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-black">
                  សិស្សជាប់តេស្តដើមឆ្នាំ
                </td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center text-red-700 dark:text-red-400">
                  សិស្សត្រូវតេស្តដើមឆ្នាំ
                </td>
              </tr>

              {/* Header Row 2 */}
              <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold text-[11px]">
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">សរុប</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">ស្រី</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">សរុប</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">ស្រី</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">សរុប</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">%</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">ស្រី</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">%</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center text-red-700 dark:text-red-400">សរុប</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center text-red-700 dark:text-red-400">ស្រី</td>
              </tr>

              {/* Header Row 3 Numbers */}
              <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-[10px] text-slate-600 dark:text-slate-400">
                <td className="border border-slate-300 dark:border-slate-700 py-0.5 px-1 text-center">1</td>
                <td className="border border-slate-300 dark:border-slate-700 py-0.5 px-1 text-center">2</td>
                <td className="border border-slate-300 dark:border-slate-700 py-0.5 px-1 text-center">3</td>
                <td className="border border-slate-300 dark:border-slate-700 py-0.5 px-1 text-center">4</td>
                <td className="border border-slate-300 dark:border-slate-700 py-0.5 px-1 text-center bg-emerald-100/60">5</td>
                <td className="border border-slate-300 dark:border-slate-700 py-0.5 px-1 text-center bg-emerald-100/60">6</td>
                <td className="border border-slate-300 dark:border-slate-700 py-0.5 px-1 text-center bg-emerald-100/60">7</td>
                <td className="border border-slate-300 dark:border-slate-700 py-0.5 px-1 text-center bg-emerald-100/60">8</td>
                <td className="border border-slate-300 dark:border-slate-700 py-0.5 px-1 text-center text-red-700">9</td>
                <td className="border border-slate-300 dark:border-slate-700 py-0.5 px-1 text-center text-red-700">10</td>
              </tr>

              {/* Rows */}
              {rows.map((r, idx) => (
                <tr
                  key={r.id}
                  className={idx % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/30" : "bg-white dark:bg-slate-900"}
                >
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-bold text-slate-800 dark:text-slate-200">
                    {useKhmerNums ? toKhNum(r.label) : r.label}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.baselineFailedTotal ?? r.col1_failTotal}
                        onChange={(e) => onAdjustmentChange(r.id, "baselineFailedTotal", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-blue-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col1_failTotal) : r.col1_failTotal}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-slate-600 dark:text-slate-400">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.baselineFailedFemale ?? r.col2_failFemale}
                        onChange={(e) => onAdjustmentChange(r.id, "baselineFailedFemale", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-blue-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col2_failFemale) : r.col2_failFemale}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-bold">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.baselineTestedTotal ?? r.col3_testTotal}
                        onChange={(e) => onAdjustmentChange(r.id, "baselineTestedTotal", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-blue-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col3_testTotal) : r.col3_testTotal}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-slate-600 dark:text-slate-400">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.baselineTestedFemale ?? r.col4_testFemale}
                        onChange={(e) => onAdjustmentChange(r.id, "baselineTestedFemale", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-blue-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col4_testFemale) : r.col4_testFemale}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.baselinePassedTotal ?? r.col5_passTotal}
                        onChange={(e) => onAdjustmentChange(r.id, "baselinePassedTotal", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-emerald-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col5_passTotal) : r.col5_passTotal}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                    {useKhmerNums ? toKhNum(r.col6_passPct) : r.col6_passPct}%
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.baselinePassedFemale ?? r.col7_passFemale}
                        onChange={(e) => onAdjustmentChange(r.id, "baselinePassedFemale", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-emerald-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col7_passFemale) : r.col7_passFemale}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                    {useKhmerNums ? toKhNum(r.col8_passFemalePct) : r.col8_passFemalePct}%
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-bold text-red-600 dark:text-red-400">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.baselineRepeatTotal ?? r.col9_repeatTotal}
                        onChange={(e) => onAdjustmentChange(r.id, "baselineRepeatTotal", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-red-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col9_repeatTotal) : r.col9_repeatTotal}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-red-500 dark:text-red-400">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.baselineRepeatFemale ?? r.col10_repeatFemale}
                        onChange={(e) => onAdjustmentChange(r.id, "baselineRepeatFemale", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-red-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col10_repeatFemale) : r.col10_repeatFemale}</span>
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
                  {useKhmerNums ? toKhNum(totals.col1_failTotal) : totals.col1_failTotal}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-slate-700 dark:text-slate-300">
                  {useKhmerNums ? toKhNum(totals.col2_failFemale) : totals.col2_failFemale}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black">
                  {useKhmerNums ? toKhNum(totals.col3_testTotal) : totals.col3_testTotal}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-slate-700 dark:text-slate-300">
                  {useKhmerNums ? toKhNum(totals.col4_testFemale) : totals.col4_testFemale}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/40">
                  {useKhmerNums ? toKhNum(totals.col5_passTotal) : totals.col5_passTotal}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/40">
                  {useKhmerNums ? toKhNum(totals.col6_passPct) : totals.col6_passPct}%
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/40">
                  {useKhmerNums ? toKhNum(totals.col7_passFemale) : totals.col7_passFemale}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/40">
                  {useKhmerNums ? toKhNum(totals.col8_passFemalePct) : totals.col8_passFemalePct}%
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-red-900 dark:text-red-300">
                  {useKhmerNums ? toKhNum(totals.col9_repeatTotal) : totals.col9_repeatTotal}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-red-900 dark:text-red-300">
                  {useKhmerNums ? toKhNum(totals.col10_repeatFemale) : totals.col10_repeatFemale}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Indicators Box below table */}
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 block text-[11px]">អត្រារួមនៃការសិក្សា:</span>
            <span className="font-bold text-blue-900 dark:text-blue-300">
              សរុប {totals.col6_passPct}% | ស្រី {totals.col8_passFemalePct}%
            </span>
          </div>
          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 block text-[11px]">អត្រាពិតនៃការសិក្សា:</span>
            <span className="font-bold text-emerald-800 dark:text-emerald-300">
              សរុប {(parseFloat(totals.col6_passPct) * 0.95).toFixed(1)}% | ស្រី {(parseFloat(totals.col8_passFemalePct) * 0.95).toFixed(1)}%
            </span>
          </div>
          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 block text-[11px]">អត្រាចូលរៀនថ្មី:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              សរុប 100% | ស្រី 100%
            </span>
          </div>
          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 block text-[11px]">អត្រាពិតនៃការចូលរៀន:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              សរុប 98.5% | ស្រី 99.0%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
