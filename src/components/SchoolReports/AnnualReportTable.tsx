import React, { useMemo } from "react";
import { ClassAnnualStat, SchoolReportAdjustments } from "./types";
import { TeacherProfile } from "../../types";
import { toKhNum, getThreeWorkingDates, fmtKhDate } from "../../lib/constants";
import { printHTML } from "../../lib/printUtils";
import * as XLSX from "xlsx";

interface AnnualReportTableProps {
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

export const AnnualReportTable: React.FC<AnnualReportTableProps> = ({
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
  const curYear = new Date().getFullYear();
  const dates = {
    d0: fmtKhDate(new Date(curYear, 7, 14)),
    d1: fmtKhDate(new Date(curYear, 7, 17)),
    d2: fmtKhDate(new Date(curYear, 7, 18)),
  };
  const isTeacherOrOrganizer = sig1Role === "អ្នករៀបចំរបាយការណ៍" || sig1Role === "គ្រូប្រចាំថ្នាក់";

  const rows = useMemo(() => {
    if (groupingMode === "grade") {
      const GRADES = ["1", "2", "3", "4", "5", "6"];
      return GRADES.map((g) => {
        const matchingClasses = classStats.filter((c) => c.gradeLevel === g);
        const passAvgTotal = matchingClasses.reduce((acc, c) => acc + c.passAvgTotal, 0);
        const passAvgFemale = matchingClasses.reduce((acc, c) => acc + c.passAvgFemale, 0);
        const failAvgTotal = matchingClasses.reduce((acc, c) => acc + c.failAvgTotal, 0);
        const failAvgFemale = matchingClasses.reduce((acc, c) => acc + c.failAvgFemale, 0);

        const adj = adjustments[g] || {};
        const retestPassedTotal = adj.retestPassedTotal || 0;
        const retestPassedFemale = adj.retestPassedFemale || 0;
        const dropoutTotal = adj.dropoutTotal || 0;
        const dropoutFemale = adj.dropoutFemale || 0;

        const col3_total = passAvgTotal;
        const col3_female = passAvgFemale;
        const col4_total = retestPassedTotal;
        const col4_female = retestPassedFemale;
        const col5_total = col3_total + col4_total;
        const col5_female = col3_female + col4_female;
        const col6_total = Math.max(0, failAvgTotal - col4_total);
        const col6_female = Math.max(0, failAvgFemale - col4_female);
        const col7_total = dropoutTotal;
        const col7_female = dropoutFemale;
        const colB_total = col5_total + col6_total;
        const colB_female = col5_female + col6_female;
        const colA_total = col5_total + col6_total + col7_total;
        const colA_female = col5_female + col6_female + col7_female;

        return {
          id: g,
          label: g,
          gradeName: `ថ្នាក់ទី ${g}`,
          colA_total,
          colA_female,
          colB_total,
          colB_female,
          col3_total,
          col3_female,
          col4_total,
          col4_female,
          col5_total,
          col5_female,
          col6_total,
          col6_female,
          col7_total,
          col7_female,
        };
      });
    } else {
      return classStats.map((c) => {
        const adj = adjustments[c.className] || {};
        const retestPassedTotal = adj.retestPassedTotal || 0;
        const retestPassedFemale = adj.retestPassedFemale || 0;
        const dropoutTotal = adj.dropoutTotal || 0;
        const dropoutFemale = adj.dropoutFemale || 0;

        const col3_total = c.passAvgTotal;
        const col3_female = c.passAvgFemale;
        const col4_total = retestPassedTotal;
        const col4_female = retestPassedFemale;
        const col5_total = col3_total + col4_total;
        const col5_female = col3_female + col4_female;
        const col6_total = Math.max(0, c.failAvgTotal - col4_total);
        const col6_female = Math.max(0, c.failAvgFemale - col4_female);
        const col7_total = dropoutTotal;
        const col7_female = dropoutFemale;
        const colB_total = col5_total + col6_total;
        const colB_female = col5_female + col6_female;
        const colA_total = col5_total + col6_total + col7_total;
        const colA_female = col5_female + col6_female + col7_female;

        return {
          id: c.className,
          label: c.className,
          gradeName: `ថ្នាក់ ${c.className}`,
          colA_total,
          colA_female,
          colB_total,
          colB_female,
          col3_total,
          col3_female,
          col4_total,
          col4_female,
          col5_total,
          col5_female,
          col6_total,
          col6_female,
          col7_total,
          col7_female,
        };
      });
    }
  }, [classStats, groupingMode, adjustments]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.colA_total += r.colA_total;
        acc.colA_female += r.colA_female;
        acc.colB_total += r.colB_total;
        acc.colB_female += r.colB_female;
        acc.col3_total += r.col3_total;
        acc.col3_female += r.col3_female;
        acc.col4_total += r.col4_total;
        acc.col4_female += r.col4_female;
        acc.col5_total += r.col5_total;
        acc.col5_female += r.col5_female;
        acc.col6_total += r.col6_total;
        acc.col6_female += r.col6_female;
        acc.col7_total += r.col7_total;
        acc.col7_female += r.col7_female;
        return acc;
      },
      {
        colA_total: 0,
        colA_female: 0,
        colB_total: 0,
        colB_female: 0,
        col3_total: 0,
        col3_female: 0,
        col4_total: 0,
        col4_female: 0,
        col5_total: 0,
        col5_female: 0,
        col6_total: 0,
        col6_female: 0,
        col7_total: 0,
        col7_female: 0,
      }
    );
  }, [rows]);

  const exportExcel = () => {
    const wsData: any[][] = [
      ["ព្រះរាជាណាចក្រកម្ពុជា"],
      ["ជាតិ សាសនា ព្រះមហាក្សត្រ"],
      [],
      [`${teacher?.school || "សាលាបឋមសិក្សា"} - លទ្ធផលសិក្សាដំណាច់ឆ្នាំ`],
      [],
      [
        "ថ្នាក់ទី",
        "សិស្សដំណាច់ឆ្នាំ",
        "",
        "សិស្សចុងឆ្នាំ",
        "",
        "ជាប់មធ្យមភាគ",
        "",
        "ធ្វើតេស្ដជាប់",
        "",
        "ជាប់ចុងឆ្នាំ",
        "",
        "សិស្សត្រួតថ្នាក់",
        "",
        "សិស្សបោះបង់",
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
        "A=5+6+7",
        "",
        "B=5+6",
        "",
        "3",
        "",
        "4",
        "",
        "5=3+4",
        "",
        "6",
        "",
        "7",
        "",
      ],
    ];

    rows.forEach((r) => {
      wsData.push([
        r.label,
        r.colA_total,
        r.colA_female,
        r.colB_total,
        r.colB_female,
        r.col3_total,
        r.col3_female,
        r.col4_total,
        r.col4_female,
        r.col5_total,
        r.col5_female,
        r.col6_total,
        r.col6_female,
        r.col7_total,
        r.col7_female,
      ]);
    });

    wsData.push([
      "សរុប",
      totals.colA_total,
      totals.colA_female,
      totals.colB_total,
      totals.colB_female,
      totals.col3_total,
      totals.col3_female,
      totals.col4_total,
      totals.col4_female,
      totals.col5_total,
      totals.col5_female,
      totals.col6_total,
      totals.col6_female,
      totals.col7_total,
      totals.col7_female,
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "ដំណាច់ឆ្នាំ");
    XLSX.writeFile(wb, `លទ្ធផលសិក្សាដំណាច់ឆ្នាំ_${teacher?.school || "សាលា"}.xlsx`);
  };

  const handlePrint = () => {
    const tableRowsHtml = rows
      .map(
        (r) => `
      <tr>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;background-color:#f8fafc;">${useKhmerNums ? toKhNum(r.label) : r.label}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;">${useKhmerNums ? toKhNum(r.colA_total) : r.colA_total}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.colA_female) : r.colA_female}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;">${useKhmerNums ? toKhNum(r.colB_total) : r.colB_total}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.colB_female) : r.colB_female}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;color:#1e40af;">${useKhmerNums ? toKhNum(r.col3_total) : r.col3_total}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#1e40af;">${useKhmerNums ? toKhNum(r.col3_female) : r.col3_female}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.col4_total) : r.col4_total}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;">${useKhmerNums ? toKhNum(r.col4_female) : r.col4_female}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;color:#065f46;background-color:#ecfdf5;">${useKhmerNums ? toKhNum(r.col5_total) : r.col5_total}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;font-weight:bold;color:#065f46;background-color:#ecfdf5;">${useKhmerNums ? toKhNum(r.col5_female) : r.col5_female}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#991b1b;">${useKhmerNums ? toKhNum(r.col6_total) : r.col6_total}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#991b1b;">${useKhmerNums ? toKhNum(r.col6_female) : r.col6_female}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#b45309;">${useKhmerNums ? toKhNum(r.col7_total) : r.col7_total}</td>
        <td style="border:1px solid #334155;padding:4px 2px;text-align:center;color:#b45309;">${useKhmerNums ? toKhNum(r.col7_female) : r.col7_female}</td>
      </tr>
    `
      )
      .join("");

    const totalRowHtml = `
      <tr style="background-color:#f1f5f9;font-weight:bold;">
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">សរុប</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.colA_total) : totals.colA_total}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.colA_female) : totals.colA_female}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.colB_total) : totals.colB_total}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.colB_female) : totals.colB_female}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;color:#1e40af;">${useKhmerNums ? toKhNum(totals.col3_total) : totals.col3_total}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;color:#1e40af;">${useKhmerNums ? toKhNum(totals.col3_female) : totals.col3_female}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.col4_total) : totals.col4_total}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;">${useKhmerNums ? toKhNum(totals.col4_female) : totals.col4_female}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;background-color:#dcfce7;color:#065f46;">${useKhmerNums ? toKhNum(totals.col5_total) : totals.col5_total}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;background-color:#dcfce7;color:#065f46;">${useKhmerNums ? toKhNum(totals.col5_female) : totals.col5_female}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;color:#991b1b;">${useKhmerNums ? toKhNum(totals.col6_total) : totals.col6_total}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;color:#991b1b;">${useKhmerNums ? toKhNum(totals.col6_female) : totals.col6_female}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;color:#b45309;">${useKhmerNums ? toKhNum(totals.col7_total) : totals.col7_total}</td>
        <td style="border:1px solid #334155;padding:5px 2px;text-align:center;font-weight:900;color:#b45309;">${useKhmerNums ? toKhNum(totals.col7_female) : totals.col7_female}</td>
      </tr>
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>លទ្ធផលសិក្សាដំណាច់ឆ្នាំ</title>
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
          ៣. លទ្ធផលសិក្សាដំណាច់ឆ្នាំ
        </h1>

        <table border="1" cellpadding="0" cellspacing="0">
          <tbody>
            <tr>
              <td rowspan="4" style="width: 44px; font-weight: bold; background-color: #f8fafc;">
                <p style="text-align: center; margin: 0; font-size: 10px;">ថ្នាក់ទី</p>
              </td>
              <td colspan="14" style="font-weight: bold; background-color: #f1f5f9; padding: 4px 0;">
                <p style="text-align: center; margin: 0; font-size: 11.5px;">លទ្ធផលសិក្សារបស់សិស្ស</p>
              </td>
            </tr>
            <tr style="background-color: #f8fafc; font-weight: bold; font-size: 9px;">
              <td colspan="2"><p style="margin:0;">សិស្សដំណាច់ឆ្នាំ</p></td>
              <td colspan="2"><p style="margin:0;">សិស្សចុងឆ្នាំ</p></td>
              <td colspan="2" style="color: #1e40af;"><p style="margin:0;">ជាប់មធ្យមភាគ</p></td>
              <td colspan="2"><p style="margin:0;">ធ្វើតេស្ដជាប់</p></td>
              <td colspan="2" style="background-color: #ecfdf5; color: #065f46;"><p style="margin:0;">ជាប់ចុងឆ្នាំ</p></td>
              <td colspan="2" style="color: #991b1b;"><p style="margin:0;">សិស្សត្រួតថ្នាក់</p></td>
              <td colspan="2" style="color: #b45309;"><p style="margin:0;">សិស្សបោះបង់</p></td>
            </tr>
            <tr style="background-color: #f1f5f9; font-size: 8.5px; font-weight: bold;">
              <td>សរុប</td><td>ស្រី</td>
              <td>សរុប</td><td>ស្រី</td>
              <td style="color: #1e40af;">សរុប</td><td style="color: #1e40af;">ស្រី</td>
              <td>សរុប</td><td>ស្រី</td>
              <td style="background-color: #dcfce7; color: #065f46;">សរុប</td><td style="background-color: #dcfce7; color: #065f46;">ស្រី</td>
              <td style="color: #991b1b;">សរុប</td><td style="color: #991b1b;">ស្រី</td>
              <td style="color: #b45309;">សរុប</td><td style="color: #b45309;">ស្រី</td>
            </tr>
            <tr style="background-color: #e2e8f0; font-size: 8px; font-weight: bold;">
              <td colspan="2">A=5+6+7</td>
              <td colspan="2">B=5+6</td>
              <td colspan="2" style="color: #1e40af;">3</td>
              <td colspan="2">4</td>
              <td colspan="2" style="background-color: #dcfce7; color: #065f46;">5=3+4</td>
              <td colspan="2" style="color: #991b1b;">6</td>
              <td colspan="2" style="color: #b45309;">7</td>
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
            <div style="font-weight: bold; margin-top: 8px; font-size: 12px;">នាយកកម្រង</div>
            <div style="height: 55px;"></div>
          </div>
          <div class="sig-col">
            <div style="font-weight: bold; font-size: 13px;">បានឃើញ និងអនុម័ត</div>
            ${
              isTeacherOrOrganizer
                ? `
              <div style="font-size: 10px; color: #374151; line-height: 1.6; margin-top: 4px;">
                ${dateMode === "auto" ? dates.d1.lunar : "ថ្ងៃ..................... ខែ............ ឆ្នាំ............ ...... ព.ស. ២៥...."}
              </div>
              <div style="font-size: 10px; color: #374151;">
                ${dateMode === "auto" ? (teacher?.village || teacher?.district || "រោគ") + " " + dates.d1.solar : "ថ្ងៃទី........ ខែ........ ឆ្នាំ២០២...."}
              </div>
            `
                : `<div style="height: 32px;"></div>`
            }
            <div style="font-weight: bold; margin-top: 8px; font-size: 12px;">នាយកសាលា</div>
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
      {/* Quick Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">សិស្សដំណាច់ឆ្នាំ (A=5+6+7)</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totals.colA_total}{" "}
            <span className="text-xs text-slate-500 font-normal">(ស្រី {totals.colA_female})</span>
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
            សិស្សចុងឆ្នាំ (B): {totals.colB_total} នាក់
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">ជាប់ចុងឆ្នាំ (5=3+4)</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {totals.col5_total}{" "}
            <span className="text-xs text-slate-500 font-normal">(ស្រី {totals.col5_female})</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            អត្រាជាប់:{" "}
            {totals.colB_total > 0
              ? ((totals.col5_total / totals.colB_total) * 100).toFixed(1)
              : "0"}
            %
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">សិស្សត្រួតថ្នាក់ (6)</div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
            {totals.col6_total}{" "}
            <span className="text-xs text-slate-500 font-normal">(ស្រី {totals.col6_female})</span>
          </div>
          <div className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
            អត្រាត្រួតថ្នាក់:{" "}
            {totals.colB_total > 0
              ? ((totals.col6_total / totals.colB_total) * 100).toFixed(1)
              : "0"}
            %
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">សិស្សបោះបង់ (7)</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {totals.col7_total}{" "}
            <span className="text-xs text-slate-500 font-normal">(ស្រី {totals.col7_female})</span>
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
            អត្រាបោះបង់:{" "}
            {totals.colA_total > 0
              ? ((totals.col7_total / totals.colA_total) * 100).toFixed(1)
              : "0"}
            %
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            📑 លទ្ធផលសិក្សាដំណាច់ឆ្នាំ (រូបមន្ត A=5+6+7, B=5+6, 5=3+4)
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
            🖨️ បោះពុម្ពតារាងដំណាច់ឆ្នាំ
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm text-slate-900 dark:text-slate-100 overflow-hidden">
        <div className="text-center mb-4 space-y-1">
          <h1 className="text-base md:text-lg font-black text-blue-900 dark:text-blue-400 uppercase">
            ៣. លទ្ធផលសិក្សាដំណាច់ឆ្នាំ
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
                <td rowSpan={4} className="border border-slate-300 dark:border-slate-700 py-2.5 px-2 text-center w-14 font-black">
                  <p className="text-center m-0">ថ្នាក់ទី</p>
                </td>
                <td colSpan={14} className="border border-slate-300 dark:border-slate-700 py-2 px-2 text-center text-blue-900 dark:text-blue-300 font-black text-sm bg-blue-50/60 dark:bg-blue-950/40">
                  <p className="text-center m-0">លទ្ធផលសិក្សារបស់សិស្ស</p>
                </td>
              </tr>

              {/* Header Row 2 */}
              <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold text-[11px] text-slate-800 dark:text-slate-200">
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center">សិស្សដំណាច់ឆ្នាំ</td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center">សិស្សចុងឆ្នាំ</td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center text-blue-700 dark:text-blue-400">ជាប់មធ្យមភាគ</td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center">ធ្វើតេស្ដជាប់</td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">ជាប់ចុងឆ្នាំ</td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center text-red-700 dark:text-red-400">សិស្សត្រួតថ្នាក់</td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1.5 px-1 text-center text-amber-700 dark:text-amber-400">សិស្សបោះបង់</td>
              </tr>

              {/* Header Row 3 */}
              <tr className="bg-white dark:bg-slate-900 font-bold text-[11px] text-slate-700 dark:text-slate-300">
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-11">សរុប</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-10">ស្រី</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-11">សរុប</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-10">ស្រី</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-11 text-blue-700 dark:text-blue-400">សរុប</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-10 text-blue-700 dark:text-blue-400">ស្រី</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-11">សរុប</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-10">ស្រី</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-11 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">សរុប</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">ស្រី</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-11 text-red-700 dark:text-red-400">សរុប</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-10 text-red-700 dark:text-red-400">ស្រី</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-11 text-amber-700 dark:text-amber-400">សរុប</td>
                <td className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center w-10 text-amber-700 dark:text-amber-400">ស្រី</td>
              </tr>

              {/* Header Row 4 (Formulas) */}
              <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-[10px] text-slate-600 dark:text-slate-400">
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">A=5+6+7</td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">B=5+6</td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center text-blue-700 dark:text-blue-400">3</td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center">4</td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">5=3+4</td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center text-red-700 dark:text-red-400">6</td>
                <td colSpan={2} className="border border-slate-300 dark:border-slate-700 py-1 px-1 text-center text-amber-700 dark:text-amber-400">7</td>
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
                    {useKhmerNums ? toKhNum(r.colA_total) : r.colA_total}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-slate-600 dark:text-slate-400">
                    {useKhmerNums ? toKhNum(r.colA_female) : r.colA_female}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-bold">
                    {useKhmerNums ? toKhNum(r.colB_total) : r.colB_total}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-slate-600 dark:text-slate-400">
                    {useKhmerNums ? toKhNum(r.colB_female) : r.colB_female}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-bold text-blue-700 dark:text-blue-400">
                    {useKhmerNums ? toKhNum(r.col3_total) : r.col3_total}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-blue-600 dark:text-blue-400">
                    {useKhmerNums ? toKhNum(r.col3_female) : r.col3_female}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.retestPassedTotal || 0}
                        onChange={(e) => onAdjustmentChange(r.id, "retestPassedTotal", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-blue-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col4_total) : r.col4_total}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-slate-600 dark:text-slate-400">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.retestPassedFemale || 0}
                        onChange={(e) => onAdjustmentChange(r.id, "retestPassedFemale", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-blue-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col4_female) : r.col4_female}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                    {useKhmerNums ? toKhNum(r.col5_total) : r.col5_total}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                    {useKhmerNums ? toKhNum(r.col5_female) : r.col5_female}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center font-bold text-red-600 dark:text-red-400">
                    {useKhmerNums ? toKhNum(r.col6_total) : r.col6_total}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-red-500 dark:text-red-400">
                    {useKhmerNums ? toKhNum(r.col6_female) : r.col6_female}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.dropoutTotal || 0}
                        onChange={(e) => onAdjustmentChange(r.id, "dropoutTotal", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-amber-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {useKhmerNums ? toKhNum(r.col7_total) : r.col7_total}
                      </span>
                    )}
                  </td>
                  <td className="border border-slate-300 dark:border-slate-700 py-2 px-1 text-center text-amber-600 dark:text-amber-400">
                    {isEditingAdjustments ? (
                      <input
                        type="number"
                        min={0}
                        value={adjustments[r.id]?.dropoutFemale || 0}
                        onChange={(e) => onAdjustmentChange(r.id, "dropoutFemale", parseInt(e.target.value) || 0)}
                        className="w-10 text-center py-0.5 px-1 bg-white dark:bg-slate-800 border border-amber-400 rounded text-xs font-bold"
                      />
                    ) : (
                      <span>{useKhmerNums ? toKhNum(r.col7_female) : r.col7_female}</span>
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
                  {useKhmerNums ? toKhNum(totals.colA_total) : totals.colA_total}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-slate-700 dark:text-slate-300">
                  {useKhmerNums ? toKhNum(totals.colA_female) : totals.colA_female}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black">
                  {useKhmerNums ? toKhNum(totals.colB_total) : totals.colB_total}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-slate-700 dark:text-slate-300">
                  {useKhmerNums ? toKhNum(totals.colB_female) : totals.colB_female}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-blue-900 dark:text-blue-300">
                  {useKhmerNums ? toKhNum(totals.col3_total) : totals.col3_total}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-blue-900 dark:text-blue-300">
                  {useKhmerNums ? toKhNum(totals.col3_female) : totals.col3_female}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black">
                  {useKhmerNums ? toKhNum(totals.col4_total) : totals.col4_total}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-slate-700 dark:text-slate-300">
                  {useKhmerNums ? toKhNum(totals.col4_female) : totals.col4_female}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/40">
                  {useKhmerNums ? toKhNum(totals.col5_total) : totals.col5_total}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/40">
                  {useKhmerNums ? toKhNum(totals.col5_female) : totals.col5_female}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-red-900 dark:text-red-300">
                  {useKhmerNums ? toKhNum(totals.col6_total) : totals.col6_total}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-red-900 dark:text-red-300">
                  {useKhmerNums ? toKhNum(totals.col6_female) : totals.col6_female}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-amber-900 dark:text-amber-300">
                  {useKhmerNums ? toKhNum(totals.col7_total) : totals.col7_total}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 py-2.5 px-1 text-center font-black text-amber-900 dark:text-amber-300">
                  {useKhmerNums ? toKhNum(totals.col7_female) : totals.col7_female}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
