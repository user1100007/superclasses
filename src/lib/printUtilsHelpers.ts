import { Student, ScoreMap } from "../types";
import { getAvg, gradeOf, fmtAvg, getThreeWorkingDates, MONTHS, SEMESTERS, toKhNum, truncate2 } from "./constants";

export function buildHonorAllPrintHTML(
  ranked: Student[],
  honorPhotos: Record<string, string>,
  selClass: string,
  semester: string,
  selMonth: number,
  teacher: any,
  scoresMap: Record<string, ScoreMap>
): string {
  const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`;
  const school = teacher?.school || "សាលាបឋមសិក្សា";
  const dates = getThreeWorkingDates(selMonth);
  const MEDAL2 = ["🥇", "🥈", "🥉", "④", "⑤"];
  const GRADE_C: Record<string, string> = { A: "#15803d", B: "#1d4ed8", C: "#b45309", D: "#c2410c", E: "#dc2626", F: "#7f1d1d" };
  const BORDER_C = ["#f59e0b", "#94a3b8", "#b45309"];

  let hdr = `<div style="display:flex;justify-content:center;margin-bottom:4px"><div style="text-align:center"><div style="font-size:14px;font-weight:900;color:#1a1a2e">ព្រះរាជាណាចក្រកម្ពុជា</div><div style="font-size:12px;color:#333;margin-top:2px">ជាតិ សាសនា ព្រះមហាក្សត្រ</div></div></div>`;
  hdr += `<div style="text-align:left;font-size:12px;color:#1e3a5f;line-height:2;margin-bottom:4px"><div><strong>រដ្ឋបាលស្រុកភ្នំស្រុក</strong></div><div><strong>ការិយាល័យអប់រំ យុវជន និងកីឡាស្រុក</strong></div><div><strong>កម្រងស្ពានស្រែង</strong></div><div>${school}</div></div>`;
  hdr += `<hr style="border:none;border-top:2.5px solid #1e3a5f;margin:4px 0 6px"/><div style="text-align:center;font-size:15px;font-weight:900;color:#b45309;margin:3px 0 2px">តារាងកិត្តិយស (ប្លង់តុសិស្សអង្គុយក្នុងថ្នាក់)</div><div style="text-align:center;font-size:13px;font-weight:800;color:#1e3a5f;margin-bottom:10px">ថ្នាក់ទី ${selClass} · ${SEMESTERS.find(s=>s.id===semester)?.label || semester} · ខែ${MONTHS[selMonth]}</div>`;

  // Classroom Blackboard / Front of class indicator
  const blackboardHTML = `<div style="text-align:center;background:linear-gradient(90deg,#0f172a,#1e3a5f,#0f172a);color:#ffffff;font-weight:900;font-size:10.5px;padding:4px 0;border-radius:6px;margin-bottom:10px;letter-spacing:0.5px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    🏫 ខាងមុខថ្នាក់ / ក្ដារខៀន (FRONT OF CLASSROOM) 🏫
  </div>`;

  // Helper to build 1 Student seat card inside a desk
  function buildSeatCard(s: Student | null, defaultRank: number) {
    if (!s) {
      return `<div style="width:82px;height:124px;border:1.5px dashed #cbd5e1;border-radius:8px;background:#f8fafc;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#cbd5e1;font-size:9px;font-weight:700;">
        <span style="font-size:18px;">🪑</span>
        <span style="margin-top:2px;">តុទំនេរ</span>
      </div>`;
    }

    const rank = typeof s._rank === "number" ? s._rank : Number(s._rank) || defaultRank;
    const avg = Number(getAvg(s.id, ranked, scoresMap));
    const g = gradeOf(avg);
    const photo = honorPhotos[s.id] || s.photoUrl || null;
    const medal = rank <= 5 ? MEDAL2[rank - 1] : "";
    const isTop3 = rank <= 3;
    const border = rank <= 3 ? BORDER_C[rank - 1] : "#cbd5e1";
    const bg = rank === 1 ? "#fffbeb" : rank === 2 ? "#f0f4ff" : rank === 3 ? "#fff7ed" : "#ffffff";

    const photoHTML = photo
      ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`
      : `<div style="font-size:30px;line-height:1;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${s.gender === "ស្រី" ? "👩" : "👨"}</div>`;

    return `<div style="width:82px;background:${bg};border:1.5px solid ${border};border-radius:8px;padding:4px 3px;text-align:center;position:relative;box-shadow:0 1px 3px rgba(0,0,0,0.05);flex-shrink:0;">
      <div style="font-size:9px;font-weight:900;color:${isTop3 ? border : "#64748b"};line-height:1;margin-bottom:3px;display:flex;align-items:center;justify-content:center;gap:2px;">
        ${medal ? `<span>${medal}</span>` : ""}<span>#${rank}</span>
      </div>
      <div style="width:48px;height:48px;border-radius:50%;margin:0 auto 3px;overflow:hidden;border:2px solid ${border};background:#f1f5f9;">${photoHTML}</div>
      <div style="font-weight:800;font-size:9px;color:#0f172a;line-height:1.2;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.lastName} ${s.firstName}">${s.lastName} ${s.firstName}</div>
      <div style="font-size:10px;font-weight:900;color:${GRADE_C[g.l]};line-height:1;margin-bottom:2px;">${fmtAvg(avg)}</div>
      <div style="display:inline-block;background:${g.c};color:#fff;border-radius:6px;padding:1px 6px;font-size:8px;font-weight:800;">${g.l}</div>
    </div>`;
  }

  // Classroom Grid Layout:
  // 4 desk columns across, separated by aisles (gap: 14px).
  // Each desk column contains up to 5 desks from front to back (Row 1 to Row 5).
  // Each desk seats 2 students (Left & Right).
  // Total 20 desks = 40 students per page grid.
  const PAGE_SIZE = 40;
  let allPagesHTML = "";

  for (let pageStart = 0; pageStart < Math.max(ranked.length, 1); pageStart += PAGE_SIZE) {
    const pageStudents = ranked.slice(pageStart, pageStart + PAGE_SIZE);
    let deskCounter = 1;
    let gridRowsHTML = "";

    // 5 Rows of Desks (Front to Back)
    for (let row = 0; row < 5; row++) {
      // Check if there are any students in this entire row across all 4 desk columns
      let hasStudentsInRow = false;
      for (let c = 0; c < 8; c++) {
        if (pageStudents[row * 8 + c]) {
          hasStudentsInRow = true;
          break;
        }
      }

      // If an entire row has no students, skip rendering this empty desk row
      if (!hasStudentsInRow) {
        continue;
      }

      let rowDesksHTML = "";

      // 4 Desk Columns across
      for (let col = 0; col < 4; col++) {
        const studentIndexL = row * 8 + col * 2;
        const studentIndexR = studentIndexL + 1;

        const sL = pageStudents[studentIndexL] || null;
        const sR = pageStudents[studentIndexR] || null;

        const currentDeskNum = pageStart / 2 + deskCounter;
        deskCounter++;

        rowDesksHTML += `<div style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:8px;padding:4px;width:174px;box-shadow:0 1px 2px rgba(0,0,0,0.03);flex-shrink:0;">
          <div style="text-align:center;font-size:8.5px;font-weight:800;color:#64748b;margin-bottom:3px;border-bottom:1px dashed #e2e8f0;padding-bottom:2px;">
            🪑 តុទី ${currentDeskNum}
          </div>
          <div style="display:flex;gap:4px;justify-content:center;">
            ${buildSeatCard(sL, pageStart + studentIndexL + 1)}
            ${buildSeatCard(sR, pageStart + studentIndexR + 1)}
          </div>
        </div>`;
      }

      gridRowsHTML += `<div style="display:flex;justify-content:center;gap:12px;margin-bottom:8px;page-break-inside:avoid;">
        ${rowDesksHTML}
      </div>`;
    }

    const pageClassroomHTML = `<div style="${pageStart > 0 ? "page-break-before:always;" : ""}">
      ${blackboardHTML}
      <div style="margin-bottom:6px;">${gridRowsHTML}</div>
      <div style="text-align:center;background:#f1f5f9;color:#64748b;font-weight:800;font-size:9px;padding:3px 0;border-radius:6px;margin-bottom:8px;border:1px dashed #cbd5e1;">
        🚪 ខាងក្រោយថ្នាក់ (REAR OF CLASSROOM) 🚪
      </div>
    </div>`;

    allPagesHTML += pageClassroomHTML;
  }

  const vLoc = (teacher?.village || teacher?.district || "រោគ") + " ";

  const sig = `<div style="display:flex;justify-content:space-between;margin-top:10px;font-size:11px;gap:4px;page-break-inside:avoid;">
    <div style="text-align:center;flex:1;"><div style="font-size:11px;font-weight:700;color:#1e3a5f;">បានឃើញ និងឯកភាព</div><div style="font-size:10px;text-align:left;color:#374151;line-height:1.6;margin-top:2px;">${dates.d2.lunar}</div><div style="font-size:10px;text-align:left;">${vLoc}${dates.d2.solar}</div><div style="font-weight:700;color:#1e3a5f;font-size:10.5px;margin-top:2px;">នាយក/នាយិកា</div></div>
    <div style="text-align:center;flex:1;"><div style="font-size:11px;font-weight:700;color:#1e3a5f;">បានឃើញ និងអនុម័ត</div><div style="font-size:10px;text-align:left;color:#374151;line-height:1.6;margin-top:2px;">${dates.d1.lunar}</div><div style="font-size:10px;text-align:left;">${vLoc}${dates.d1.solar}</div><div style="font-weight:700;color:#1e3a5f;font-size:10.5px;margin-top:2px;">ប្រធាន គ.គ.ថ.</div></div>
    <div style="text-align:center;flex:1;"><div style="font-size:10px;text-align:left;color:#374151;line-height:1.6;margin-top:2px;">${dates.d0.lunar}</div><div style="font-size:10px;text-align:left;">${vLoc}${dates.d0.solar}</div><div style="font-weight:700;color:#1e3a5f;font-size:10.5px;margin-top:2px;">គ្រូប្រចាំថ្នាក់</div><div style="margin-top:16px;font-weight:900;color:#1e3a5f;font-size:10.5px;">${tName.trim()}</div></div>
  </div>`;

  return `<!DOCTYPE html><html lang="km"><head><meta charset="UTF-8"><title>តារាងកិត្តិយស - ប្លង់ថ្នាក់</title><link href="https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700;900&family=Battambang:wght@400;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Hanuman','Battambang',sans-serif;font-size:10.5px;padding:.4cm .5cm;color:#1e293b}@page{size:A4;margin:.4cm .5cm}</style></head><body>${hdr}${allPagesHTML}${sig}</body></html>`;
}

export function buildHonorTop5PrintHTML(
  ranked: Student[],
  honorPhotos: Record<string, string>,
  selClass: string,
  semester: string,
  selMonth: number,
  teacher: any,
  scoresMap: Record<string, ScoreMap>
): string {
  const top5 = ranked.slice(0, 5);
  const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`;
  const school = teacher?.school || "សាលាបឋមសិក្សា";
  const dates = getThreeWorkingDates(selMonth);
  const MEDAL2 = ["🥇", "🥈", "🥉", "④", "⑤"];
  const GRADE_C: Record<string, string> = { A: "#15803d", B: "#1d4ed8", C: "#b45309", D: "#c2410c", E: "#dc2626", F: "#7f1d1d" };

  let hdr = `<div style="display:flex;justify-content:center;margin-bottom:4px"><div style="text-align:center"><div style="font-size:14px;font-weight:900;color:#1a1a2e">ព្រះរាជាណាចក្រកម្ពុជា</div><div style="font-size:12px;color:#333;margin-top:2px">ជាតិ សាសនា ព្រះមហាក្សត្រ</div></div></div>`;
  hdr += `<div style="text-align:left;font-size:12px;color:#1e3a5f;line-height:2;margin-bottom:4px"><div><strong>រដ្ឋបាលស្រុកភ្នំស្រុក</strong></div><div><strong>ការិយាល័យអប់រំ យុវជន និងកីឡាស្រុក</strong></div><div><strong>កម្រងស្ពានស្រែង</strong></div><div>${school}</div></div>`;
  hdr += `<hr style="border:none;border-top:2.5px solid #1e3a5f;margin:4px 0 8px"/><div style="text-align:center;font-size:16px;font-weight:900;color:#b45309;margin:5px 0 2px">តារាងកិត្តិយស Top 5</div><div style="text-align:center;font-size:14px;font-weight:800;color:#1e3a5f;margin-bottom:16px">ថ្នាក់ទី ${selClass} · ${SEMESTERS.find(s=>s.id===semester)?.label || semester} · ខែ${MONTHS[selMonth]}</div>`;

  const BORDER_C = ["#f59e0b", "#64748b", "#b45309", "#3b82f6", "#10b981"];
  const CARD_BG = ["linear-gradient(160deg,#fffbeb,#fef3c7)", "linear-gradient(160deg,#f0f4ff,#e2e8f0)", "linear-gradient(160deg,#fff7ed,#fed7aa)", "#fafafa", "#fafafa"];
  const CW = 135, CH = 180, PD = 75;

  function buildRoundCard(s: Student | null, i: number, extra = "") {
    if (!s) return `<div style="width:${CW}px;height:${CH}px;flex-shrink:0;${extra}"></div>`;
    const avg = Number(getAvg(s.id, ranked, scoresMap));
    const g = gradeOf(avg);
    const photo = honorPhotos[s.id] || s.photoUrl || null;
    const photoHTML = photo
      ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`
      : `<div style="font-size:38px;line-height:1;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${s.gender === "ស្រី" ? "👩" : "👨"}</div>`;

    return `<div style="width:${CW}px;height:${CH}px;flex-shrink:0;background:${CARD_BG[i]};border:2px solid ${BORDER_C[i]};border-radius:14px;padding:8px 8px 6px;text-align:center;position:relative;box-shadow:0 3px 10px rgba(0,0,0,0.06);display:flex;flex-direction:column;align-items:center;justify-content:space-between;${extra}">
      <div style="display:inline-flex;align-items:center;justify-content:center;gap:3px;background:${BORDER_C[i]};color:#ffffff;font-size:10px;font-weight:900;border-radius:12px;padding:2px 8px;margin-bottom:4px;box-shadow:0 2px 4px rgba(0,0,0,0.12);">
        <span>${MEDAL2[i]}</span><span>ចំណាត់ #${i + 1}</span>
      </div>
      <div style="width:${PD}px;height:${PD}px;border-radius:50%;margin:0 auto 4px;overflow:hidden;border:2.5px solid ${BORDER_C[i]};background:#f1f5f9;flex-shrink:0;">${photoHTML}</div>
      <div style="font-weight:900;font-size:11px;color:#1e3a5f;line-height:1.2;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;" title="${s.lastName} ${s.firstName}">${s.lastName} ${s.firstName}</div>
      <div style="font-size:13px;font-weight:900;color:${GRADE_C[g.l]};margin-bottom:2px;">${fmtAvg(avg)}</div>
      <div style="display:inline-block;background:${g.c};color:#fff;border-radius:14px;padding:1.5px 10px;font-size:10px;font-weight:800;">និទ្ទេស ${g.l}</div>
    </div>`;
  }

  const s1 = top5[0] || null, s2 = top5[1] || null, s3 = top5[2] || null, s4 = top5[3] || null, s5 = top5[4] || null;
  const raised = `position:relative;transform:translateY(-20px);z-index:3;`;

  let cardsHTML = `<div style="margin-bottom:12px;padding-top:20px;">
    <div style="display:grid;grid-template-columns:repeat(3,${CW}px);gap:16px;justify-content:center;margin-bottom:0;">
      ${buildRoundCard(s2, 1)}
      ${buildRoundCard(s1, 0, raised)}
      ${buildRoundCard(s3, 2)}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,${CW}px);gap:16px;justify-content:center;margin-top:10px;">
      ${buildRoundCard(s4, 3)}
      <div style="width:${CW}px;height:${CH}px;flex-shrink:0;"></div>
      ${buildRoundCard(s5, 4)}
    </div>
  </div>`;

  const sig = `<div style="display:flex;justify-content:space-between;margin-top:14px;font-size:12px;gap:4px;">
    <div style="text-align:center;flex:1;"><div style="font-size:12px;font-weight:700;color:#1e3a5f;">បានឃើញ និងឯកភាព</div><div style="font-size:11px;text-align:left;color:#374151;line-height:1.8;margin-top:2px;">${dates.d2.lunar}</div><div style="font-size:11px;text-align:left;">${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d2.solar}</div><div style="font-weight:700;color:#1e3a5f;font-size:11px;margin-top:3px;">នាយក/នាយិកា</div></div>
    <div style="text-align:center;flex:1;"><div style="font-size:12px;font-weight:700;color:#1e3a5f;">បានឃើញ និងអនុម័ត</div><div style="font-size:11px;text-align:left;color:#374151;line-height:1.8;margin-top:2px;">${dates.d1.lunar}</div><div style="font-size:11px;text-align:left;">${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d1.solar}</div><div style="font-weight:700;color:#1e3a5f;font-size:11px;margin-top:3px;">ប្រធាន គ.គ.ថ.</div></div>
    <div style="text-align:center;flex:1;"><div style="font-size:11px;text-align:left;color:#374151;line-height:1.8;margin-top:2px;">${dates.d0.lunar}</div><div style="font-size:11px;text-align:left;">${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d0.solar}</div><div style="font-weight:700;color:#1e3a5f;font-size:11px;margin-top:3px;">គ្រូប្រចាំថ្នាក់</div><div style="margin-top:20px;font-weight:900;color:#1e3a5f;font-size:11px;">${tName.trim()}</div></div>
  </div>`;

  return `<!DOCTYPE html><html lang="km"><head><meta charset="UTF-8"><title>តារាងកិត្តិយស Top 5</title><link href="https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700;900&family=Battambang:wght@400;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Hanuman','Battambang',sans-serif;font-size:11px;padding:.5cm .7cm;color:#1e293b}@page{size:A4;margin:.5cm .7cm}</style></head><body>${hdr}${cardsHTML}${sig}</body></html>`;
}

export function buildPublicNoticePrintHTML(
  students: Student[],
  selClass: string,
  semesterId: string,
  teacher: any,
  allMonthsScores: Record<string, Record<string, ScoreMap>>,
  displayMode: "avg" | "grade" = "avg"
): string {
  const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`.trim();
  const schoolName = teacher?.school || "សាលាបឋមសិក្សា";
  const dates = getThreeWorkingDates(3);

  const cs = SEMESTERS.find((s) => s.id === semesterId) || SEMESTERS[0];
  const months = cs.months;
  const semesterLabel = cs.label;

  const femaleCount = students.filter((s) => s.gender === "ស្រី").length;

  const getMonthAvg = (sid: string, mIdx: number) => {
    const key = `${semesterId}_${mIdx}`;
    const monthData = allMonthsScores[key] || {};
    const stuScores = monthData[sid] || {};
    const keys = Object.keys(stuScores).filter((k) => stuScores[k] !== "" && !isNaN(Number(stuScores[k])));
    if (!keys.length) return null;
    const sum = keys.reduce((acc, k) => acc + Number(stuScores[k]), 0);
    return truncate2(sum / keys.length);
  };

  const studentDataList = students.map((s) => {
    const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
    const mAvgs = months.map((m) => getMonthAvg(s.id, m));

    const firstThree = mAvgs.slice(0, 3).filter((v): v is number => v !== null);
    const monthlyAvg =
      firstThree.length > 0
        ? truncate2(firstThree.reduce((a, b) => a + b, 0) / firstThree.length)
        : null;

    let semAvg: number | null = null;
    if (monthlyAvg !== null && mAvgs.length > 3 && mAvgs[3] !== null) {
      semAvg = truncate2((monthlyAvg + mAvgs[3]) / 2);
    } else if (monthlyAvg !== null) {
      semAvg = truncate2(monthlyAvg);
    } else if (mAvgs.length > 3 && mAvgs[3] !== null) {
      semAvg = truncate2(mAvgs[3]);
    }

    const sortScore = semAvg !== null ? semAvg : monthlyAvg !== null ? monthlyAvg : -1;
    const g = gradeOf(sortScore > 0 ? sortScore : 0);

    return {
      student: s,
      fullName,
      mAvgs,
      monthlyAvg,
      semAvg,
      sortScore,
      grade: g,
      rank: 0,
    };
  });

  const sorted = [...studentDataList].sort((a, b) => {
    const diff = b.sortScore - a.sortScore;
    if (diff !== 0) return diff;
    return (a.student.lastName || "").localeCompare(b.student.lastName || "", "km");
  });
  const rankedMap: Record<string, number> = {};

  sorted.forEach((item, index) => {
    const curScore = item.sortScore;
    const prevScore = index > 0 ? sorted[index - 1].sortScore : null;
    if (index > 0 && prevScore !== null && curScore === prevScore && curScore > 0) {
      rankedMap[item.student.id] = rankedMap[sorted[index - 1].student.id];
    } else {
      rankedMap[item.student.id] = index + 1;
    }
  });

  const rankedData = studentDataList.map((item) => ({
    ...item,
    rank: rankedMap[item.student.id] || 0,
  }));

  const sortedRankedData = [...rankedData].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (a.student.lastName || "").localeCompare(b.student.lastName || "", "km");
  });

  const tableRows = sortedRankedData
    .map((item, idx) => {
      const { student, fullName, mAvgs, monthlyAvg, semAvg, rank, grade } = item;

      const mCells = months
        .map((mIdx, i) => {
          const v = mAvgs[i];
          if (v === null) return `<td style="padding:6px;text-align:center;border:1px solid #cbd5e1;color:#94a3b8">—</td>`;
          if (displayMode === "avg") {
            const clr = v >= 5 ? "#15803d" : "#dc2626";
            return `<td style="padding:6px;text-align:center;border:1px solid #cbd5e1;font-weight:700;color:${clr}">${fmtAvg(v)}</td>`;
          } else {
            const g = gradeOf(v);
            return `<td style="padding:6px;text-align:center;border:1px solid #cbd5e1"><span style="display:inline-block;padding:2px 6px;border-radius:4px;background:${g.c};color:#fff;font-weight:800;font-size:10px">${g.l}</span></td>`;
          }
        })
        .join("");

      const formatAvgCell = (v: number | null) => {
        if (v === null) return `<td style="padding:6px;text-align:center;border:1px solid #cbd5e1;color:#94a3b8">—</td>`;
        if (displayMode === "avg") {
          const clr = v >= 5 ? "#15803d" : "#dc2626";
          return `<td style="padding:6px;text-align:center;border:1px solid #cbd5e1;font-weight:900;color:${clr};background:#f8fafc">${fmtAvg(v)}</td>`;
        } else {
          const g = gradeOf(v);
          return `<td style="padding:6px;text-align:center;border:1px solid #cbd5e1;background:#f8fafc"><span style="display:inline-block;padding:2px 6px;border-radius:4px;background:${g.c};color:#fff;font-weight:800;font-size:10px">${g.l}</span></td>`;
        }
      };

      // Calculate weak subjects for this student across the semester
      const subjectTotals: Record<string, number> = {};
      const subjectCounts: Record<string, number> = {};

      months.forEach((mIdx) => {
        const key = `${semesterId}_${mIdx}`;
        const monthData = allMonthsScores[key] || {};
        const stuScores = monthData[student.id] || {};

        Object.entries(stuScores).forEach(([subKey, val]) => {
          if (val !== undefined && val !== "" && !isNaN(Number(val))) {
            const scoreNum = Number(val);
            subjectTotals[subKey] = (subjectTotals[subKey] || 0) + scoreNum;
            subjectCounts[subKey] = (subjectCounts[subKey] || 0) + 1;
          }
        });
      });

      const weakSubjects: string[] = [];
      Object.keys(subjectTotals).forEach((subKey) => {
        const avg = subjectTotals[subKey] / subjectCounts[subKey];
        if (avg < 5.0) {
          weakSubjects.push(`${subKey} (${avg.toFixed(1)})`);
        }
      });

      // If no subjects < 5.0, check subjects < 6.0 for C, D, E, F students
      if (weakSubjects.length === 0 && (grade.l === "C" || ["D", "E", "F"].includes(grade.l))) {
        Object.keys(subjectTotals).forEach((subKey) => {
          const avg = subjectTotals[subKey] / subjectCounts[subKey];
          if (avg < 6.0) {
            weakSubjects.push(`${subKey} (${avg.toFixed(1)})`);
          }
        });
      }

      let parentNote = "";
      let noteColor = "#15803d";

      if (grade.l === "A" || grade.l === "B") {
        noteColor = "#15803d";
        if (weakSubjects.length > 0) {
          parentNote = `ល្អប្រសើរ (គួរពង្រឹង៖ ${weakSubjects.join(", ")})`;
        } else {
          parentNote = "ល្អប្រសើរ (សូមបន្តលើកទឹកចិត្ត)";
        }
      } else if (grade.l === "C") {
        noteColor = "#b45309";
        if (weakSubjects.length > 0) {
          parentNote = `មធ្យម (ខ្សោយ៖ ${weakSubjects.join(", ")} - ត្រូវបន្ថែមការខិតខំ)`;
        } else {
          parentNote = "មធ្យម (ត្រូវបន្ថែមការខិតខំ)";
        }
      } else { // D, E, F
        noteColor = "#dc2626";
        if (weakSubjects.length > 0) {
          parentNote = `ខ្សោយ (ខ្សោយ៖ ${weakSubjects.join(", ")} - ត្រូវការបំប៉ន & សហការជាមួយគ្រូ)`;
        } else {
          parentNote = "ខ្សោយ (ត្រូវការបំប៉ន & សហការជាមួយគ្រូ)";
        }
      }

      return `<tr>
        <td style="padding:6px;text-align:center;border:1px solid #cbd5e1">${idx + 1}</td>
        <td style="padding:6px;border:1px solid #cbd5e1;font-weight:700">${fullName}</td>
        <td style="padding:6px;text-align:center;border:1px solid #cbd5e1">${student.gender}</td>
        <td style="padding:6px;text-align:center;border:1px solid #cbd5e1">${student.dob || "—"}</td>
        ${mCells}
        ${formatAvgCell(monthlyAvg)}
        ${formatAvgCell(semAvg)}
        <td style="padding:6px;text-align:center;border:1px solid #cbd5e1;font-weight:900;color:#b45309">${rank || "—"}</td>
        <td style="padding:6px;text-align:center;border:1px solid #cbd5e1"><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${grade.c};color:#fff;font-weight:800">${grade.l}</span></td>
        <td style="padding:6px;border:1px solid #cbd5e1;font-size:10px;color:${noteColor};font-weight:600">${parentNote}</td>
      </tr>`;
    })
    .join("");

  const monthHeaders = months
    .map(
      (mIdx) =>
        `<th style="padding:8px 4px;border:1px solid #0f172a;background:#1e293b;color:#fff;text-align:center;min-width:55px">ខែ${MONTHS[mIdx]}</th>`
    )
    .join("");

  const headerHTML = `
    <div style="text-align:center;margin-bottom:6px">
      <div style="font-size:15px;font-weight:900;color:#0f172a">ព្រះរាជាណាចក្រកម្ពុជា</div>
      <div style="font-size:13px;font-weight:700;color:#0f172a">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
      <div style="font-size:11px;color:#475569;margin-top:2px">***</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#1e293b;margin-bottom:8px">
      <div>
        <div><strong>រដ្ឋបាលខេត្ត/ស្រុក:</strong> ${teacher?.province || "……………………"} / ${teacher?.district || "……………………"}</div>
        <div><strong>សាលារៀន:</strong> ${schoolName}</div>
      </div>
      <div style="text-align:right">
        <div><strong>ថ្នាក់ទី:</strong> ${selClass} &nbsp;|&nbsp; <strong>គ្រូប្រចាំថ្នាក់:</strong> ${tName}</div>
        <div><strong>ចំនួនសិស្សសរុប:</strong> ${students.length} នាក់ (ស្រី ${femaleCount} នាក់)</div>
      </div>
    </div>
    <hr style="border:none;border-top:2px solid #0f172a;margin:4px 0 10px"/>
    <div style="text-align:center;margin-bottom:12px">
      <div style="font-size:17px;font-weight:900;color:#1e3a5f">
        តារាងលទ្ធផលសិក្សាប្រចាំ${semesterLabel} សម្រាប់បិទផ្សាយជាសាធារណៈ
      </div>
      <div style="font-size:11.5px;font-weight:800;color:#b45309;margin-top:3px">
        📢 ជូនដំណឹងដល់ឪពុកម្ដាយ និងអាណាព្យាបាលសិស្ស ដើមី្បរួមគ្នាតាមដាន ជំរុញ និងសហការជាមួយគ្រូបង្រៀន
      </div>
    </div>
  `;

  const noticeBox = `
    <div style="margin-top:14px;padding:10px 14px;background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:8px;font-size:10.5px;line-height:1.7;color:#1e293b;page-break-inside:avoid">
      <div style="font-weight:900;color:#b45309;font-size:11.5px;margin-bottom:4px">
        📌 សារជូនដំណឹង និងការអំពាវនាវដល់ឪពុកម្ដាយ/អាណាព្យាបាលសិស្ស៖
      </div>
      <ul style="margin-left:18px;margin-bottom:0">
        <li><strong>ការតាមដាននៅផ្ទះ៖</strong> សូមលោកឪពុកអ្នកម្ដាយមេត្តាជួយពិនិត្យកិច្ចការផ្ទះ និងជំរុញកូនៗឱ្យស្វ័យសិក្សាយ៉ាងហោច ៣០ នាទី ទៅ ១ ម៉ោង ជារៀងរាល់ថ្ងៃ។</li>
        <li><strong>ការសិក្សាបំប៉ន៖</strong> ចំពោះសិស្សដែលមាននិទ្ទេស D, E, F សាលារៀនមានរៀបចំម៉ោងបំប៉នពិសេសលើមុខវិជ្ជា <strong>ភាសាខ្មែរ</strong> និង <strong>គណិតវិទ្យា</strong>។ សូមអាណាព្យាបាលសហការបញ្ជូនកូនមករៀនបំប៉នឱ្យបានទៀងទាត់។</li>
        <li><strong>កិច្ចសហការ៖</strong> ប្រសិនបើមានចម្ងល់ ឬសំណូមពរផ្សេងៗ សូមទំនាក់ទំនងមកកាន់លោកគ្រូ/អ្នកគ្រូប្រចាំថ្នាក់តាមរយៈទូរស័ព្ទ៖ <strong>${teacher?.phone || "……………………"}</strong>។</li>
      </ul>
    </div>
  `;

  const sigHTML = `
    <div style="display:flex;justify-content:space-between;margin-top:18px;font-size:11px;gap:8px;page-break-inside:avoid">
      <div style="text-align:center;flex:1">
        <div style="font-weight:800;color:#0f172a">បានឃើញ និងឯកភាព</div>
        <div style="font-size:10px;color:#475569;margin-top:2px">${dates.d2.lunar}</div>
        <div style="font-size:10px;color:#475569">${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d2.solar}</div>
        <div style="font-weight:800;color:#0f172a;margin-top:4px">នាយក/នាយិកាសាលា</div>
      </div>
      <div style="text-align:center;flex:1">
        <div style="font-weight:800;color:#0f172a">បានឃើញ និងពិនិត្យត្រឹមត្រូវ</div>
        <div style="font-size:10px;color:#475569;margin-top:2px">${dates.d1.lunar}</div>
        <div style="font-size:10px;color:#475569">${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d1.solar}</div>
        <div style="font-weight:800;color:#0f172a;margin-top:4px">លោកគ្រូ/អ្នកគ្រូប្រចាំថ្នាក់</div>
        <div style="margin-top:35px;font-weight:800;color:#1e3a5f">${tName}</div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <title>តារាងបិទផ្សាយលទ្ធផលសិក្សាប្រចាំ${semesterLabel}</title>
  <link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;500;600;700;800;900&family=Hanuman:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Battambang', 'Hanuman', sans-serif; font-size: 10px; color: #0f172a; background: #fff; padding: 4px; }
    @page { size: A4 portrait; margin: 6mm 5mm; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9px; }
  </style>
</head>
<body>
  ${headerHTML}
  <table>
    <thead>
      <tr style="background:#0f172a;color:#fff">
        <th style="padding:4px 2px;border:1px solid #0f172a;text-align:center;width:26px">ល.រ</th>
        <th style="padding:4px;border:1px solid #0f172a;text-align:left">គោត្តនាម និងនាម</th>
        <th style="padding:4px 2px;border:1px solid #0f172a;text-align:center;width:28px">ភេទ</th>
        <th style="padding:4px 2px;border:1px solid #0f172a;text-align:center;width:60px">ថ្ងៃខែកំណើត</th>
        ${monthHeaders}
        <th style="padding:4px 2px;border:1px solid #0f172a;background:#1e3a5f;color:#fff;text-align:center;width:45px">ម.ភាគខែ</th>
        <th style="padding:4px 2px;border:1px solid #0f172a;background:#1e3a5f;color:#fff;text-align:center;width:48px">ម.ភាគឆមាស</th>
        <th style="padding:4px 2px;border:1px solid #0f172a;background:#b45309;color:#fff;text-align:center;width:38px">ចំណាត់ថ្នាក់</th>
        <th style="padding:4px 2px;border:1px solid #0f172a;background:#0f172a;color:#fff;text-align:center;width:40px">និទ្ទេស</th>
        <th style="padding:4px;border:1px solid #0f172a;text-align:left">ការកត់សម្គាល់ និងសំណូមពរ</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  ${noticeBox}
  ${sigHTML}
</body>
</html>`;
}

function matchPtomLevel(val: string | undefined, level: number): string {
  if (!val) return "";
  const v = val.trim().toUpperCase();
  let l = 0;
  if (["A", "B", "A/B", "B/A", "A+", "B+", "4"].includes(v)) l = 4;
  else if (["C", "D+", "C+", "C/D", "3"].includes(v)) l = 3;
  else if (["D", "E", "E+", "D/E", "2"].includes(v)) l = 2;
  else if (["F", "F+", "1"].includes(v)) l = 1;
  else {
    if (v.startsWith("A") || v.startsWith("B")) l = 4;
    else if (v.startsWith("C")) l = 3;
    else if (v.startsWith("D")) l = (v === "D+" || v === "D") ? 3 : 2;
    else if (v.startsWith("E")) l = 2;
    else if (v.startsWith("F")) l = 1;
  }
  return l === level ? val : "";
}

export function buildLearningAgreementPrintHTML(
  students: Student[],
  selClass: string,
  teacher: any,
  allMonthsScores: Record<string, Record<string, ScoreMap>> = {},
  ptomRecords: Record<string, any> = {}
): string {
  const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`.trim();
  const schoolName = teacher?.school || "សាលាបឋមសិក្សា";
  const provinceName = teacher?.province || "……………………";
  const teacherPhone = teacher?.phone || "……………………";

  const dates = getThreeWorkingDates(3);

  const pagesHTML = students
    .map((s) => {
      const studentName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
      const father = s.fatherName || "……………………";
      const mother = s.motherName || "……………………";
      const phone = s.phone || "……………………";
      const gender = s.gender || "ប្រុស";

      const rec = ptomRecords[s.id] || {
        familyStatus: "រស់នៅជាមួយឪពុកម្ដាយ",
        khmerBaseline: "F",
        mathBaseline: "F",
        khmerQ1Plan: "E",
        khmerQ1Actual: "",
        khmerQ2Plan: "D",
        khmerQ2Actual: "",
        khmerQ3Plan: "D+",
        khmerQ3Actual: "",
        khmerQ4Plan: "C",
        khmerQ4Actual: "",

        mathQ1Plan: "E",
        mathQ1Actual: "",
        mathQ2Plan: "D",
        mathQ2Actual: "",
        mathQ3Plan: "D+",
        mathQ3Actual: "",
        mathQ4Plan: "C",
        mathQ4Actual: "",
      };

      const familyStatus = rec.familyStatus || "រស់នៅជាមួយឪពុកម្ដាយ";

      // Khmer Rows
      const renderKhmerRow = (label: string, level: number, color: string) => {
        const base = matchPtomLevel(rec.khmerBaseline || (level === 1 ? "F" : ""), level);
        const q1P = matchPtomLevel(rec.khmerQ1Plan || (level === 2 ? "E" : ""), level);
        const q1A = matchPtomLevel(rec.khmerQ1Actual, level);
        const q2P = matchPtomLevel(rec.khmerQ2Plan || (level === 2 ? "D" : ""), level);
        const q2A = matchPtomLevel(rec.khmerQ2Actual, level);
        const q3P = matchPtomLevel(rec.khmerQ3Plan || (level === 3 ? "D+" : ""), level);
        const q3A = matchPtomLevel(rec.khmerQ3Actual, level);
        const q4P = matchPtomLevel(rec.khmerQ4Plan || (level === 3 ? "C" : ""), level);
        const q4A = matchPtomLevel(rec.khmerQ4Actual, level);

        return `
          <tr ${level % 2 === 1 ? 'class="subtle" style="background: #f8fafc;"' : ""}>
            <td style="text-align: center; font-weight: bold; color: ${color};">${label}</td>
            <td style="font-weight: bold;">${level}</td>
            <td style="font-weight: bold; color: #dc2626;">${base}</td>
            <td style="font-weight: bold; color: #0f172a;">${q1P}</td>
            <td style="font-weight: bold; color: #dc2626;">${q1A}</td>
            <td style="font-weight: bold; color: #0f172a;">${q2P}</td>
            <td style="font-weight: bold; color: #dc2626;">${q2A}</td>
            <td style="font-weight: bold; color: #0f172a;">${q3P}</td>
            <td style="font-weight: bold; color: #dc2626;">${q3A}</td>
            <td style="font-weight: bold; color: #0f172a;">${q4P}</td>
            <td style="font-weight: bold; color: #dc2626;">${q4A}</td>
          </tr>`;
      };

      // Math Rows
      const renderMathRow = (label: string, level: number, color: string) => {
        const base = matchPtomLevel(rec.mathBaseline || (level === 1 ? "F" : ""), level);
        const q1P = matchPtomLevel(rec.mathQ1Plan || (level === 2 ? "E" : ""), level);
        const q1A = matchPtomLevel(rec.mathQ1Actual, level);
        const q2P = matchPtomLevel(rec.mathQ2Plan || (level === 2 ? "D" : ""), level);
        const q2A = matchPtomLevel(rec.mathQ2Actual, level);
        const q3P = matchPtomLevel(rec.mathQ3Plan || (level === 3 ? "D+" : ""), level);
        const q3A = matchPtomLevel(rec.mathQ3Actual, level);
        const q4P = matchPtomLevel(rec.mathQ4Plan || (level === 3 ? "C" : ""), level);
        const q4A = matchPtomLevel(rec.mathQ4Actual, level);

        return `
          <tr ${level % 2 === 1 ? 'class="subtle" style="background: #f8fafc;"' : ""}>
            <td style="text-align: center; font-weight: bold; color: ${color};">${label}</td>
            <td style="font-weight: bold;">${level}</td>
            <td style="font-weight: bold; color: #dc2626;">${base}</td>
            <td style="font-weight: bold; color: #0f172a;">${q1P}</td>
            <td style="font-weight: bold; color: #dc2626;">${q1A}</td>
            <td style="font-weight: bold; color: #0f172a;">${q2P}</td>
            <td style="font-weight: bold; color: #dc2626;">${q2A}</td>
            <td style="font-weight: bold; color: #0f172a;">${q3P}</td>
            <td style="font-weight: bold; color: #dc2626;">${q3A}</td>
            <td style="font-weight: bold; color: #0f172a;">${q4P}</td>
            <td style="font-weight: bold; color: #dc2626;">${q4A}</td>
          </tr>`;
      };

      return `
    <div class="sheet" style="page-break-after: always; padding: 12px; margin-bottom: 20px; background: #fff; border-radius: 8px;">
      <table class="report">
        <colgroup>
          <col style="width: 11%">
          <col style="width: 6%">
          <col style="width: 11%">
          <col style="width: 9%">
          <col style="width: 9%">
          <col style="width: 9%">
          <col style="width: 9%">
          <col style="width: 9%">
          <col style="width: 9%">
          <col style="width: 9%">
          <col style="width: 9%">
        </colgroup>
        <tbody>
          <!-- Header Info: Clean format without bottom underlines -->
          <tr>
            <td colspan="11" style="text-align: left; font-size: 13px; line-height: 1.8; border: none; padding: 3px 2px;">
              <strong>ឈ្មោះសិស្ស :</strong> <span style="font-weight: 800; color: #0f172a;">${studentName || "...................................."}</span> &nbsp;&nbsp;&nbsp;&nbsp;
              <strong>ភេទ :</strong> <span>${gender || ".........."}</span> &nbsp;&nbsp;&nbsp;&nbsp;
              <strong>ថ្នាក់ទី :</strong> <span style="font-weight: 800;">${selClass || ".........."}</span>
            </td>
          </tr>
          <tr>
            <td colspan="11" style="text-align: left; font-size: 13px; line-height: 1.8; border: none; padding: 3px 2px;">
              <strong>ស្ថានភាពគ្រួសារ :</strong> <span>${familyStatus}</span>
            </td>
          </tr>
          <tr>
            <td colspan="11" style="text-align: left; font-size: 13px; line-height: 1.8; border: none; padding: 3px 2px;">
              <strong>សាលារៀន :</strong> <span style="font-weight: 700;">${schoolName || "...................................."}</span> &nbsp;&nbsp;&nbsp;&nbsp;
              <strong>ខេត្ត :</strong> <span>${provinceName || "........................"}</span>
            </td>
          </tr>
          <tr>
            <td colspan="11" style="text-align: left; font-size: 13px; line-height: 1.8; border: none; padding: 3px 2px;">
              <strong>ឈ្មោះឪពុក :</strong> <span>${father || "........................"}</span> &nbsp;&nbsp;
              <strong>លេខទូរស័ព្ទ :</strong> <span>${phone || "........................"}</span> &nbsp;&nbsp;
              <strong>ឈ្មោះម្ដាយ :</strong> <span>${mother || "........................"}</span> &nbsp;&nbsp;
              <strong>លេខទូរស័ព្ទ :</strong> <span>${phone || "........................"}</span>
            </td>
          </tr>
          <tr>
            <td colspan="11" style="text-align: left; font-size: 13px; line-height: 1.8; border: none; padding: 3px 2px; padding-bottom: 8px;">
              <strong>ឈ្មោះគ្រូប្រចាំថ្នាក់ :</strong> <span style="font-weight: 700;">${tName || "........................"}</span> &nbsp;&nbsp;&nbsp;&nbsp;
              <strong>លេខទូរស័ព្ទ :</strong> <span>${teacherPhone || "........................"}</span>
            </td>
          </tr>

          <tr>
            <td colspan="11" style="text-align: center; font-weight: 800; font-size: 13.5px; background: #fff; color: #0f172a; padding: 6px; border: 1px solid #000;">
              ផែនការរៀនសូត្រប្រចាំឆ្នាំរបស់សិស្សម្នាក់ៗប្រើលទ្ធផលតេស្ត PTOM
            </td>
          </tr>

          <!-- Table Header: Khmer -->
          <tr class="header-cell" style="background: #fff; font-weight: 700;">
            <td rowspan="3" style="font-weight: bold; vertical-align: middle;"><div class="v-text">និទ្ទេស</div></td>
            <td rowspan="3" style="font-weight: bold; vertical-align: middle;"><div class="v-text">កម្រិត</div></td>
            <td rowspan="3" style="font-weight: bold; vertical-align: middle;"><div class="v-text">លទ្ធផលសិក្សាដើមឆ្នាំ</div></td>
            <td colspan="8" style="font-weight: 800; background: #fff; color: #000; font-size: 13px;">លទ្ធផលសិក្សាតាមត្រីមាស-ភាសាខ្មែរ</td>
          </tr>
          <tr class="header-cell" style="background: #fff;">
            <td colspan="2" style="font-weight: bold;">ត្រីមាសទី១</td>
            <td colspan="2" style="font-weight: bold;">ត្រីមាសទី២</td>
            <td colspan="2" style="font-weight: bold;">ត្រីមាសទី៣</td>
            <td colspan="2" style="font-weight: bold;">ត្រីមាសទី៤</td>
          </tr>
          <tr class="header-cell" style="background: #fff; font-size: 11px;">
            <td><div class="v-text">ផែនការ</div></td>
            <td><div class="v-text" style="color: #dc2626;">ជាក់ស្តែង</div></td>
            <td><div class="v-text">ផែនការ</div></td>
            <td><div class="v-text" style="color: #dc2626;">ជាក់ស្តែង</div></td>
            <td><div class="v-text">ផែនការ</div></td>
            <td><div class="v-text" style="color: #dc2626;">ជាក់ស្តែង</div></td>
            <td><div class="v-text">ផែនការ</div></td>
            <td><div class="v-text" style="color: #dc2626;">ជាក់ស្តែង</div></td>
          </tr>

          <!-- Table Rows: Khmer -->
          ${renderKhmerRow("B & A", 4, "#15803d")}
          ${renderKhmerRow("D & C", 3, "#b45309")}
          ${renderKhmerRow("E & D", 2, "#c2410c")}
          ${renderKhmerRow("F", 1, "#991b1b")}

          <!-- Separator Row -->
          <tr>
            <td colspan="11" style="background: #fff; height: 10px; border-left: none; border-right: none;"></td>
          </tr>

          <!-- Table Header: Math -->
          <tr class="header-cell" style="background: #fff; font-weight: 700;">
            <td rowspan="3" style="font-weight: bold; vertical-align: middle;"><div class="v-text">និទ្ទេស</div></td>
            <td rowspan="3" style="font-weight: bold; vertical-align: middle;"><div class="v-text">កម្រិត</div></td>
            <td rowspan="3" style="font-weight: bold; vertical-align: middle;"><div class="v-text">លទ្ធផលសិក្សាដើមឆ្នាំ</div></td>
            <td colspan="8" style="font-weight: 800; background: #fff; color: #000; font-size: 13px;">លទ្ធផលសិក្សាតាមត្រីមាស-គណិតវិទ្យា</td>
          </tr>
          <tr class="header-cell" style="background: #fff;">
            <td colspan="2" style="font-weight: bold;">ត្រីមាសទី១</td>
            <td colspan="2" style="font-weight: bold;">ត្រីមាសទី២</td>
            <td colspan="2" style="font-weight: bold;">ត្រីមាសទី៣</td>
            <td colspan="2" style="font-weight: bold;">ត្រីមាសទី៤</td>
          </tr>
          <tr class="header-cell" style="background: #fff; font-size: 11px;">
            <td><div class="v-text">ផែនការ</div></td>
            <td><div class="v-text" style="color: #dc2626;">ជាក់ស្តែង</div></td>
            <td><div class="v-text">ផែនការ</div></td>
            <td><div class="v-text" style="color: #dc2626;">ជាក់ស្តែង</div></td>
            <td><div class="v-text">ផែនការ</div></td>
            <td><div class="v-text" style="color: #dc2626;">ជាក់ស្តែង</div></td>
            <td><div class="v-text">ផែនការ</div></td>
            <td><div class="v-text" style="color: #dc2626;">ជាក់ស្តែង</div></td>
          </tr>

          <!-- Table Rows: Math -->
          ${renderMathRow("B & A", 4, "#15803d")}
          ${renderMathRow("D & C", 3, "#b45309")}
          ${renderMathRow("E & D", 2, "#c2410c")}
          ${renderMathRow("F", 1, "#991b1b")}

          <!-- Footer / Dates & Signatures -->
          <tr>
            <td colspan="5" style="border: none;"></td>
            <td colspan="6" style="border: none; text-align: center; font-size: 11.5px; padding-top: 10px;">
              ${dates.d0.lunar}<br/>
              ${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d0.solar}
            </td>
          </tr>
          <tr>
            <td colspan="3" style="border: none; text-align: center; font-weight: bold; font-size: 12px; vertical-align: top;">
              បានឃើញ និងឯកភាព<br/>
              <span style="font-size: 12px; font-weight: 800;">គ្រូប្រចាំថ្នាក់</span>
              <div style="margin-top: 45px; font-weight: 800;">${tName}</div>
            </td>
            <td colspan="4" style="border: none; text-align: center; font-weight: bold; font-size: 12px; vertical-align: top;">
              ហត្ថលេខា ឬស្នាមមេដៃមាតាបិតា/អាណាព្យាបាល
              <div style="margin-top: 55px; color: #475569; font-size: 11px;">(ឈ្មោះ) …………………………………………</div>
            </td>
            <td colspan="4" style="border: none; text-align: center; font-weight: bold; font-size: 12px; vertical-align: top;">
              ហត្ថលេខា / ឈ្មោះសិស្ស
              <div style="margin-top: 55px; font-weight: bold; color: #0f172a;">${studentName}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <title>ផែនការរៀនសូត្រប្រចាំឆ្នាំ (កិច្ចព្រមព្រៀង/កិច្ចសន្យារៀនសូត្រ)</title>
  <link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;500;600;700;800;900&family=Hanuman:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Battambang', 'Hanuman', sans-serif; font-size: 12px; color: #0f172a; background: #f8fafc; padding: 0.4cm; }
    @page { size: A4 portrait; margin: 0.4cm 0.5cm; }
    .sheet { background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    table.report { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.report td, table.report th {
      border: 1px solid #000;
      padding: 5px 3px;
      text-align: center;
      vertical-align: middle;
      font-size: 11.5px;
      line-height: 1.3;
      word-wrap: break-word;
    }
    .v-text {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      display: inline-block;
      white-space: nowrap;
      margin: 0 auto;
      font-size: 10.5px;
      font-weight: 700;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; margin: 0; border-radius: 0; page-break-after: always; }
      .sheet:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>
  ${pagesHTML}
</body>
</html>`;
}

export function buildAiPlanPrintHTML(
  className: string,
  semesterName: string,
  defStudents: Array<{
    name: string;
    gender: string;
    khmerGrade: string;
    khmerAvg: number | null;
    mathGrade: string;
    mathAvg: number | null;
    weakSubjects: string[];
  }>,
  aiPlanText: string,
  teacher: any
): string {
  const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`.trim();
  const schoolName = teacher?.school || "សាលាបឋមសិក្សា";
  const dates = getThreeWorkingDates(3);

  const defRows = defStudents
    .map(
      (s, i) => `<tr style="background:${i % 2 === 0 ? "#ffffff" : "#fffbeb"}">
      <td style="padding:6px;text-align:center;border:1px solid #fde68a;font-weight:700">${i + 1}</td>
      <td style="padding:6px 8px;border:1px solid #fde68a;font-weight:800">${s.name} (${s.gender})</td>
      <td style="padding:6px;text-align:center;border:1px solid #fde68a;font-weight:800;color:#1e3a5f">ខ្មែរ: ${s.khmerGrade} (${s.khmerAvg ?? "—"})</td>
      <td style="padding:6px;text-align:center;border:1px solid #fde68a;font-weight:800;color:#581c87">គណិត: ${s.mathGrade} (${s.mathAvg ?? "—"})</td>
      <td style="padding:6px 8px;border:1px solid #fde68a;color:#dc2626;font-size:10px">${s.weakSubjects?.join(", ") || "សរសេរ, ចំនួន"}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <title>ផែនការសកម្មភាពបំប៉នសិស្ស DEF - ថ្នាក់ទី${className}</title>
  <link href="https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700;900&family=Battambang:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Hanuman', 'Battambang', sans-serif; font-size: 11px; padding: 0.8cm 1cm; color: #0f172a; line-height: 1.6; background: #fff; }
    @page { size: A4 portrait; margin: 0.8cm 1cm; }
    .def-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10.5px; }
    .def-table th { background: #b45309; color: #fff; border: 1px solid #78350f; padding: 6px; text-align: center; }
    .plan-box { border: 1.5px solid #cbd5e1; background: #f8fafc; padding: 14px; border-radius: 8px; margin-top: 10px; font-size: 11px; white-space: pre-wrap; line-height: 1.8; }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:6px">
    <div style="font-size:15px;font-weight:900;color:#0f172a">ព្រះរាជាណាចក្រកម្ពុជា</div>
    <div style="font-size:13px;font-weight:700;color:#0f172a">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
    <div style="font-size:11px;color:#475569;margin-top:2px">***</div>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#1e293b;margin-bottom:8px">
    <div>
      <div><strong>សាលារៀន:</strong> ${schoolName}</div>
      <div><strong>ថ្នាក់ទី:</strong> ${className} &nbsp;|&nbsp; <strong>កាលបរិច្ឆេទ:</strong> ${semesterName}</div>
    </div>
    <div style="text-align:right">
      <div><strong>គ្រូប្រចាំថ្នាក់:</strong> ${tName}</div>
      <div><strong>ចំនួនសិស្សត្រូវបំប៉ន:</strong> ${defStudents.length} នាក់</div>
    </div>
  </div>
  <hr style="border:none;border-top:2px solid #0f172a;margin:4px 0 12px"/>

  <div style="text-align:center;margin-bottom:12px">
    <div style="font-size:16px;font-weight:900;color:#1e3a5f">
      📘 ផែនការសកម្មភាពបំប៉ន និងកែលម្អលទ្ធផលសិក្សាសិស្សរៀនយឺត (និទ្ទេស D, E, F)
    </div>
    <div style="font-size:11px;font-weight:700;color:#b45309;margin-top:2px">
      (មុខវិជ្ជា ភាសាខ្មែរ ៤ សមត្ថភាព និង គណិតវិទ្យា ៥ ដែន)
    </div>
  </div>

  <div style="margin-bottom:12px">
    <div style="font-weight:900;font-size:12px;color:#b45309;margin-bottom:4px">
      📋 បញ្ជីឈ្មោះសិស្សទទួលបាននិទ្ទេស D, E, F ត្រូវទទួលការបំប៉ន (${defStudents.length} នាក់)
    </div>
    <table class="def-table">
      <thead>
        <tr>
          <th style="width:35px">ល.រ</th>
          <th style="text-align:left">គោត្តនាម-នាម (ភេទ)</th>
          <th style="width:120px">ភាសាខ្មែរ</th>
          <th style="width:120px">គណិតវិទ្យា</th>
          <th style="text-align:left">ចំណុចខ្សោយសំខាន់ៗ</th>
        </tr>
      </thead>
      <tbody>
        ${defRows}
      </tbody>
    </table>
  </div>

  <div style="font-weight:900;font-size:12px;color:#1e3a5f;margin-top:14px;margin-bottom:4px">
    💡 ខ្លឹមសារផែនការបំប៉ន និងវិធីសាស្ត្រអនុវត្ត (រៀបចំដោយ AI)
  </div>
  <div class="plan-box">${aiPlanText}</div>

  <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:11px;gap:8px;page-break-inside:avoid">
    <div style="text-align:center;flex:1">
      <div style="font-weight:800;color:#0f172a">បានឃើញ និងឯកភាព</div>
      <div style="font-size:10px;color:#475569;margin-top:2px">${dates.d2.lunar}</div>
      <div style="font-size:10px;color:#475569">${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d2.solar}</div>
      <div style="font-weight:800;color:#0f172a;margin-top:4px">នាយក/នាយិកាសាលា</div>
    </div>
    <div style="text-align:center;flex:1">
      <div style="font-weight:800;color:#0f172a">បានឃើញ និងអនុម័ត</div>
      <div style="font-size:10px;color:#475569;margin-top:2px">${dates.d1.lunar}</div>
      <div style="font-size:10px;color:#475569">${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d1.solar}</div>
      <div style="font-weight:800;color:#0f172a;margin-top:4px">ប្រធាន គ.គ.ថ.</div>
    </div>
    <div style="text-align:center;flex:1">
      <div style="font-size:10px;color:#475569">${dates.d0.lunar}</div>
      <div style="font-size:10px;color:#475569">${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d0.solar}</div>
      <div style="font-weight:800;color:#0f172a;margin-top:4px">គ្រូប្រចាំថ្នាក់</div>
      <div style="margin-top:24px;font-weight:900;color:#0f172a;border-top:1px stroke #94a3b8;padding-top:2px">${tName}</div>
    </div>
  </div>
</body>
</html>`;
}

export function buildIndividualAnnualLearningPlanPrintHTML(
  students: Student[],
  selClass: string,
  teacher: any,
  ptomRecords: Record<string, any> = {}
): string {
  const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`.trim();
  const schoolName = teacher?.school || "សាលាបឋមសិក្សា..........";
  const districtName = teacher?.district || "........................";
  const dates = getThreeWorkingDates(3);

  const gradeList = ["ទី៦", "ទី៥", "ទី៤", "ទី៣", "ទី២", "ទី១"];
  const currentGradeNum = selClass ? selClass.replace(/[^0-9]/g, "") : "";

  const pagesHTML = students
    .map((s) => {
      const studentName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
      const rec = ptomRecords[s.id] || {};

      const khRows = gradeList
        .map((gLabel) => {
          const isCurrentRow = currentGradeNum && gLabel.includes(toKhNum(currentGradeNum));

          const baseline = isCurrentRow ? (rec.khmerBaseline || "") : "";
          const q1 = isCurrentRow ? (rec.khmerQ1Actual || rec.khmerQ1Plan || "") : "";
          const q2 = isCurrentRow ? (rec.khmerQ2Actual || rec.khmerQ2Plan || "") : "";
          const q3 = isCurrentRow ? (rec.khmerQ3Actual || rec.khmerQ3Plan || "") : "";
          const q4 = isCurrentRow ? (rec.khmerQ4Actual || rec.khmerQ4Plan || "") : "";
          const yearEnd = isCurrentRow ? (rec.khmerYearEndActual || rec.khmerQ4Actual || "") : "";

          return `
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; background: ${isCurrentRow ? '#fef3c7' : '#fff'};">${gLabel}</td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; color: #dc2626;">${baseline}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; color: #1e3a5f;">${q1}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; color: #1e3a5f;">${q2}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; color: #1e3a5f;">${q3}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; color: #1e3a5f;">${q4}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; color: #16a34a;">${yearEnd}</td>
          </tr>`;
        })
        .join("");

      const mathRows = gradeList
        .map((gLabel) => {
          const isCurrentRow = currentGradeNum && gLabel.includes(toKhNum(currentGradeNum));

          const baseline = isCurrentRow ? (rec.mathBaseline || "") : "";
          const q1 = isCurrentRow ? (rec.mathQ1Actual || rec.mathQ1Plan || "") : "";
          const q2 = isCurrentRow ? (rec.mathQ2Actual || rec.mathQ2Plan || "") : "";
          const q3 = isCurrentRow ? (rec.mathQ3Actual || rec.mathQ3Plan || "") : "";
          const q4 = isCurrentRow ? (rec.mathQ4Actual || rec.mathQ4Plan || "") : "";
          const yearEnd = isCurrentRow ? (rec.mathYearEndActual || rec.mathQ4Actual || "") : "";

          return `
          <tr>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; background: ${isCurrentRow ? '#fef3c7' : '#fff'};">${gLabel}</td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; color: #dc2626;">${baseline}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; color: #1e3a5f;">${q1}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; color: #1e3a5f;">${q2}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; color: #1e3a5f;">${q3}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; color: #1e3a5f;">${q4}</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold; color: #16a34a;">${yearEnd}</td>
          </tr>`;
        })
        .join("");

      return `
    <div class="sheet" style="page-break-after: always; padding: 16px; margin-bottom: 20px; background: #fff; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 6px;">
        <div style="font-size: 13px; font-weight: bold;">ព្រះរាជាណាចក្រកម្ពុជា</div>
        <div style="font-size: 12px; font-weight: bold;">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: -20px; margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: bold; line-height: 1.5;">
          ការិយាល័យអប់រំ យុវជន និងកីឡានៃរដ្ឋបាល ${districtName}<br/>
          សាលាបឋមសិក្សា ${schoolName}
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 12px;">
        <h3 style="font-size: 15px; font-weight: 900; color: #000; margin-bottom: 6px;">
          ការរៀបចំផែនការរៀនសូត្រប្រចាំឆ្នាំរបស់សិស្សម្នាក់ៗ
        </h3>
        <div style="font-size: 12px; font-weight: bold;">
          សិស្សឈ្មោះ ៖ <span style="font-weight: 900; color: #0f172a; text-decoration: underline;">${studentName || "...................................."}</span> &nbsp;&nbsp;&nbsp;&nbsp;
          ថ្នាក់ទី ៖ <span style="font-weight: 900;">${selClass || ".........."}</span> &nbsp;&nbsp;&nbsp;&nbsp;
          ឆ្នាំសិក្សា ៖ <span>២០២៤-២០២៥</span>
        </div>
      </div>

      <!-- Khmer Language Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: center; margin-bottom: 12px; border: 1px solid #000;">
        <thead>
          <tr style="background: #f8fafc;">
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 65px; font-weight: bold;">កម្រិតថ្នាក់</th>
            <th colspan="6" style="border: 1px solid #000; padding: 4px; font-weight: bold;">កម្រិតសិក្សា ភាសាខ្មែរ ដើមឆ្នាំសិក្សា</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 75px; font-weight: bold;">កម្រិតសិក្សា<br/>ដើមឆ្នាំ</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 75px; font-weight: bold;">កម្រិតសិក្សា<br/>ចុងត្រីមាសទី១</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 75px; font-weight: bold;">កម្រិតសិក្សា<br/>ចុងត្រីមាសទី២</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 75px; font-weight: bold;">កម្រិតសិក្សា<br/>ចុងត្រីមាសទី៣</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 75px; font-weight: bold;">កម្រិតសិក្សា<br/>ចុងត្រីមាសទី៤</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 75px; font-weight: bold;">កម្រិតសិក្សា<br/>ចុងឆ្នាំ</th>
          </tr>
          <tr style="background: #f8fafc; font-size: 10px;">
            <th style="border: 1px solid #000; padding: 3px;">១.ស្គាល់តួអក្សរ</th>
            <th style="border: 1px solid #000; padding: 3px;">២.ស្គាល់ពាក្យ</th>
            <th style="border: 1px solid #000; padding: 3px;">៣.អានពាក្យ</th>
            <th style="border: 1px solid #000; padding: 3px;">៤.អានល្បះ</th>
            <th style="border: 1px solid #000; padding: 3px;">៥.អានយល់ន័យ</th>
            <th style="border: 1px solid #000; padding: 3px;">៦.សំណេរ</th>
          </tr>
        </thead>
        <tbody>
          ${khRows}
        </tbody>
      </table>

      <!-- Math Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: center; margin-bottom: 6px; border: 1px solid #000;">
        <thead>
          <tr style="background: #f8fafc;">
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 65px; font-weight: bold;">កម្រិតថ្នាក់</th>
            <th colspan="5" style="border: 1px solid #000; padding: 4px; font-weight: bold;">កម្រិតសិក្សា គណិតវិទ្យា ដើមឆ្នាំសិក្សា</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 75px; font-weight: bold;">កម្រិតសិក្សា<br/>ដើមឆ្នាំ</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 75px; font-weight: bold;">កម្រិតសិក្សា<br/>ចុងត្រីមាសទី១</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 75px; font-weight: bold;">កម្រិតសិក្សា<br/>ចុងត្រីមាសទី២</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 75px; font-weight: bold;">កម្រិតសិក្សា<br/>ចុងត្រីមាសទី៣</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 75px; font-weight: bold;">កម្រិតសិក្សា<br/>ចុងត្រីមាសទី៤</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 75px; font-weight: bold;">កម្រិតសិក្សា<br/>ចុងឆ្នាំ</th>
          </tr>
          <tr style="background: #f8fafc; font-size: 10px;">
            <th style="border: 1px solid #000; padding: 3px;">ចំនួន</th>
            <th style="border: 1px solid #000; padding: 3px;">រង្វាស់រង្វាល់</th>
            <th style="border: 1px solid #000; padding: 3px;">ធរណីមាត្រ</th>
            <th style="border: 1px solid #000; padding: 3px;">ស្ថិតិ</th>
            <th style="border: 1px solid #000; padding: 3px;">ពិជគណិត</th>
          </tr>
        </thead>
        <tbody>
          ${mathRows}
        </tbody>
      </table>

      <div style="font-size: 10.5px; font-style: italic; margin-bottom: 20px; font-weight: 700;">
        បញ្ជាក់៖ សិស្សម្នាក់ៗអនុវត្តតាំងពីចាប់ផ្តើមថ្នាក់ទី១ បញ្ជូនបន្តទៅថ្នាក់ទី២និងបន្តរហូតដល់ថ្នាក់ទី៦
      </div>

      <div style="display: flex; justify-content: space-between; text-align: center; font-size: 11.5px; margin-top: 15px;">
        <div style="flex: 1; vertical-align: top;">
          បានឃើញ និងឯកភាព<br/>
          <strong style="font-size: 12px;">នាយកសាលា</strong>
        </div>
        <div style="flex: 1; vertical-align: top;">
          ${dates.d0.lunar}<br/>
          ${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d0.solar}<br/>
          <strong style="font-size: 12px;">គ្រូបន្ទុកថ្នាក់</strong>
          <div style="margin-top: 45px; font-weight: bold;">${tName}</div>
        </div>
      </div>
    </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <title>ការរៀបចំផែនការរៀនសូត្រប្រចាំឆ្នាំរបស់សិស្សម្នាក់ៗ</title>
  <link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;500;600;700;800;900&family=Hanuman:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Battambang', 'Hanuman', sans-serif; font-size: 12px; color: #0f172a; background: #fff; padding: 0.4cm; }
    @page { size: A4 portrait; margin: 0.4cm 0.5cm; }
    .sheet { background: #fff; }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { margin: 0; border-radius: 0; page-break-after: always; }
      .sheet:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>
  ${pagesHTML}
</body>
</html>`;
}
