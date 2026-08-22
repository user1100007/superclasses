import QRCode from "qrcode";
import { Student, ScoreMap, AttendanceMap, TeacherProfile, InvigilatorData } from "../types";
import {
  MONTHS, SEMESTERS, SUBJECTS,
  fmtAvg, gradeOf, resultOf, getTotal, getAvg, getRank, buildRankedList,
  getThreeWorkingDates, KH_ORDER, MT_ORDER, truncate2, toKhNum, KH_MONTHS_SOLAR, fmtKhDate
} from "./constants";

export function printHTML(contentHtml: string) {
  const printWin = window.open("", "_blank");
  if (!printWin) {
    const frame = document.getElementById("printFrame") as HTMLIFrameElement;
    if (frame) {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(contentHtml);
        doc.close();
        setTimeout(() => {
          frame.style.display = "block";
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          setTimeout(() => { frame.style.display = "none"; }, 2000);
        }, 1500);
      }
    }
    return;
  }
  printWin.document.write(contentHtml);
  printWin.document.close();
  setTimeout(() => { printWin.focus(); printWin.print(); }, 1500);
}

export function buildInvigilatorBoxHTML(d: InvigilatorData): string {
  const sigTag = (sig: string) =>
    sig
      ? `<img src="${sig}" style="height:26px;max-width:140px;display:block;margin-top:0.5px;">`
      : `<div style="height:20px;border-bottom:0.5px dotted #94a3b8;margin-top:1px"></div>`;

  return `<div style="border:1.0px solid #1e3a5f;border-radius:7px;padding:6px 9px;font-size:10px;color:#1e3a5f;line-height:1.2;min-width:225px;max-width:255px">
    <div>អគារ : <strong>${d.building || "……"}</strong>
    <strong>បន្ទប់លេខ : <strong>${d.room || "……"}</strong> &nbsp; វេន: <strong>${d.shift || "……"}</strong></div>
    <div style="border-top:0.5px dashed #93b8d8;margin-top:4px;padding-top:4px">
      <div>១. អនុរក្សឈ្មោះ : <strong>${d.sup1?.name || "…………………"}</strong></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6px">${sigTag(d.sup1?.sig || "")}<span style="white-space:nowrap">☎ ${d.sup1?.phone || "……………"}</span></div>
    </div>
    <div style="border-top:0.5px dashed #93b8d8;margin-top:4px;padding-top:4px">
      <div>២. អនុរក្សឈ្មោះ : <strong>${d.sup2?.name || "…………………"}</strong></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6px">${sigTag(d.sup2?.sig || "")}<span style="white-space:nowrap">☎ ${d.sup2?.phone || "……………"}</span></div>
    </div>
  </div>`;
}

export function buildSignatureHtml(tName: string, selMonth: number, sig1Role: string = "គ្រូប្រចាំថ្នាក់", teacher?: TeacherProfile | null, reportType?: string) {
  let dates = getThreeWorkingDates(selMonth);
  let leftRole = "នាយក/នាយិកា";
  let middleRole = "ប្រធាន គ.គ.ថ.";

  if (reportType === "annual") {
    leftRole = "នាយកកម្រង";
    middleRole = "នាយកសាលា";

    const curYear = new Date().getFullYear();
    const d0 = new Date(curYear, 7, 14); // 14 Aug
    const d1 = new Date(curYear, 7, 17); // 17 Aug
    const d2 = new Date(curYear, 7, 18); // 18 Aug
    dates = {
      d0: fmtKhDate(d0),
      d1: fmtKhDate(d1),
      d2: fmtKhDate(d2),
    };
  }

  const isTeacherOrOrganizer = sig1Role === "គ្រូប្រចាំថ្នាក់" || sig1Role === "អ្នករៀបចំរបាយការណ៍";
  const locPrefix = (teacher?.village || teacher?.district || "រោគ") + " ";
  return `<div class="sig-section" style="display:flex;justify-content:space-between;margin-top:20px;font-size:10px;gap:4px">
    <div class="sig-col" style="text-align:center;flex:1">
      <div style="font-size:13px;font-weight:600;color:#1e3a5f">បានឃើញ និងឯកភាព</div>
      ${isTeacherOrOrganizer ? `
        <div style="font-size:9px;text-align:left;color:#374151;line-height:1.6">${dates.d2.lunar}</div>
        <div style="font-size:9px;text-align:left;color:#374151">${locPrefix}${dates.d2.solar}</div>
      ` : ''}
      <div style="font-weight:700;color:#1e3a5f;font-size:10.5px;margin-top:2px">${leftRole}</div>
    </div>
    <div class="sig-col" style="text-align:center;flex:1">
      <div style="font-size:13px;font-weight:600;color:#1e3a5f">បានឃើញ និងអនុម័ត</div>
      ${isTeacherOrOrganizer ? `
        <div style="font-size:9px;text-align:left;color:#374151;line-height:1.6">${dates.d1.lunar}</div>
        <div style="font-size:9px;text-align:left;color:#374151">${locPrefix}${dates.d1.solar}</div>
      ` : ''}
      <div style="font-weight:700;color:#1e3a5f;font-size:10.5px;margin-top:2px">${middleRole}</div>
    </div>
    <div class="sig-col" style="text-align:center;flex:1">
      <div style="font-size:9px;text-align:left;color:#374151;line-height:1.6">${dates.d0.lunar}</div>
      <div style="font-size:9px;text-align:left;color:#374151">${locPrefix}${dates.d0.solar}</div>
      <div style="font-weight:700;color:#1e3a5f;font-size:10.5px;margin-top:2px">${sig1Role}</div>
      <div style="font-weight:900;color:#1e3a5f;margin-top:20px;font-size:11px;padding-top:2px;border-top:1px dotted #94a3b8">${tName}</div>
    </div>
  </div>`;
}

export function khmerToLatin(text: string): string {
  if (!text) return "";
  if (/[a-zA-Z]/.test(text)) return text.trim().toUpperCase();

  const wordMap: Record<string, string> = {
    "កា": "KA", "បុប្ផា": "BUPHA", "ស៊ុច": "SUCH", "កុយ": "KUY", "ស្រៀប": "SRIEB", "ឡាំ": "LAM",
    "ចាន់": "CHAN", "សុខ": "SOK", "ដារ៉ា": "DARA", "ផល": "PHAL", "ផល្លា": "PHALLA",
    "វណ្ណ": "VANN", "វណ្ណា": "VANNA", "ស្រី": "SREY", "លី": "LY", "គឹម": "KIM", "ហេង": "HENG",
    "មករា": "MAKARA", "សុផាត": "SOPHAT", "វិចិត្រ": "VICHET", "សម្បត្តិ": "SAMBATH",
    "ពិសិដ្ឋ": "PISETH", "រតនៈ": "ROTHANAK", "សុជាតា": "SOCHEATA", "ស៊ីន": "SIN", "ភិសា": "PHISA",
    "ធី": "THY", "ម៉េង": "MENG", "ហុង": "HONG", "លៀង": "LEANG", "សៀង": "SEANG",
    "សុខា": "SOKHA", "សុជាតិ": "SOCHEAT", "រ៉ា": "RA", "នារី": "NEARY", "បុត្រ": "BOT"
  };

  const words = text.trim().split(/\s+/);
  const converted = words.map((w) => {
    if (wordMap[w]) return wordMap[w];

    // Char-by-char phonetic mapping
    let result = "";
    let i = 0;
    while (i < w.length) {
      const char = w[i];
      const charMap: Record<string, string> = {
        'ក': 'KA', 'ខ': 'KHA', 'គ': 'KO', 'ឃ': 'KHO', 'ង': 'NGA',
        'ច': 'CHA', 'ឆ': 'CHA', 'ជ': 'CHO', 'ឈ': 'CHO', 'ញ': 'NHO',
        'ដ': 'DA', 'ឋ': 'THA', 'ឌ': 'DO', 'ឍ': 'THO', 'ណ': 'NA',
        'ត': 'TA', 'ថ': 'THA', 'ទ': 'TO', 'ធ': 'THO', 'ន': 'NO',
        'ប': 'BA', 'ផ': 'PHA', 'ព': 'PO', 'ភ': 'PHO', 'ម': 'MO',
        'យ': 'YO', 'រ': 'RO', 'ល': 'LO', 'វ': 'VO', 'ស': 'SA', 'ហ': 'HA', 'ឡ': 'LA', 'អ': 'A',
        'ា': 'A', 'ិ': 'I', 'ី': 'I', 'ឹ': 'EU', 'ឺ': 'EU', 'ុ': 'U', 'ូ': 'OU', 'ួ': 'OU',
        'ើ': 'AE', 'ឿ': 'EA', 'ៀ': 'IA', 'េ': 'E', 'ែ': 'AE', 'ៃ': 'AI', 'ោ': 'O', 'ៅ': 'AO',
        'ំ': 'OM', 'ះ': 'AH', 'ៈ': 'AH', '័': 'A'
      };

      if (charMap[char]) {
        result += charMap[char];
      }
      i++;
    }

    return result || w;
  });

  return converted.join(" ").toUpperCase();
}

export function getLatinName(s: Student): string {
  if (s.latinName && /[a-zA-Z]/.test(s.latinName)) {
    return s.latinName.trim().toUpperCase();
  }
  const fullKhmer = `${s.lastName || ""} ${s.firstName || ""}`.trim();
  if (!fullKhmer) return "—";
  return khmerToLatin(fullKhmer);
}

export function buildComprehensiveStudentQRPayload(
  s: Student,
  selClass: string,
  schoolName: string,
  stuList: Student[],
  scoresMap: Record<string, ScoreMap>,
  allMonthsScores?: Record<string, Record<string, ScoreMap>>,
  teacher?: TeacherProfile | null
): string {
  const annualAvg = getAvg(s.id, stuList, scoresMap);
  const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
  const grade = avgVal !== null ? gradeOf(avgVal).l : "—";
  const rank = getRank(s.id, stuList, scoresMap);
  const resultText = avgVal !== null ? (avgVal >= 5 ? "ជាប់" : "ធ្លាក់") : "—";
  const latinName = getLatinName(s);
  const teacherName = teacher ? `${teacher.title || ""} ${teacher.fullName || ""}`.trim() : "";

  let baseUrl = typeof window !== "undefined" && window.location && window.location.origin
    ? window.location.origin
    : "https://ais-pre-t4htfasm4d362sdsmq3exc-385779612530.asia-southeast1.run.app";

  if (baseUrl.includes("ais-dev-")) {
    baseUrl = baseUrl.replace("ais-dev-", "ais-pre-");
  }

  const params = new URLSearchParams();
  params.set("verifyStudentId", s.id);
  if (s.code) params.set("code", s.code);
  if (s.lastName) params.set("lastName", s.lastName);
  if (s.firstName) params.set("firstName", s.firstName);
  if (latinName) params.set("latinName", latinName);
  if (s.gender) params.set("gender", s.gender);
  if (s.dob) params.set("dob", s.dob);
  if (s.village) params.set("village", s.village);
  if (s.commune) params.set("commune", s.commune);
  if (s.district) params.set("district", s.district);
  if (s.province) params.set("province", s.province);
  if (s.fatherName) params.set("fatherName", s.fatherName);
  if (s.fatherJob) params.set("fatherJob", s.fatherJob);
  if (s.motherName) params.set("motherName", s.motherName);
  if (s.motherJob) params.set("motherJob", s.motherJob);
  if (s.phone) params.set("studentPhone", s.phone);
  if (selClass) params.set("selClass", selClass);
  if (schoolName) params.set("school", schoolName);
  if (avgVal !== null) params.set("avg", String(avgVal));
  if (grade && grade !== "—") params.set("grade", grade);
  if (rank !== null) params.set("rank", String(rank));
  if (resultText && resultText !== "—") params.set("result", resultText);
  if (teacherName) params.set("teacher", teacherName);

  return `${baseUrl}/?${params.toString()}`;
}

export function buildCandidateDocHTML(
  s: Student,
  selClass: string,
  teacher: TeacherProfile | null,
  stuList: Student[],
  scoresMap: Record<string, ScoreMap>,
  honorPhotos: Record<string, string>,
  allMonthsScores?: Record<string, Record<string, ScoreMap>>,
  customQrUrl?: string
): string {
  const annualAvg = getAvg(s.id, stuList, scoresMap);
  const avgDisp = annualAvg !== null ? fmtAvg(annualAvg) : "—";
  const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
  const grade = avgVal !== null ? gradeOf(avgVal) : { l: "—", c: "#6b7280" };
  const rank = getRank(s.id, stuList, scoresMap);
  const photoUrl = honorPhotos[s.id] || s.photoUrl || null;
  const schoolName = teacher?.school || "សាលាបឋមសិក្សា";
  const latinName = getLatinName(s);
  const districtName = s.district || "ភ្នំស្រុក";
  const provinceName = s.province || "បន្ទាយមានជ័យ";
  const communeName = s.commune || "ស្ពានស្រែង";
  const villageName = s.village || "ឆាត";

  const qrPayload = buildComprehensiveStudentQRPayload(s, selClass, schoolName, stuList, scoresMap, allMonthsScores, teacher);
  const qrUrl = customQrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrPayload)}`;
  const candDate = fmtKhDate(new Date(2026, 11, 28));

  return `
  <div class="candidate-doc-page" style="width:100%;max-width:210mm;padding:5mm 10mm;background:#fff;font-family:'Hanuman','Battambang',sans-serif;box-sizing:border-box;color:#000;margin:0 auto;border:1px solid #e2e8f0;border-radius:4px;position:relative;">
    
    <!-- Country Header -->
    <div style="text-align:center;margin-bottom:4px;">
      <h2 style="font-size:14px;font-weight:900;margin:0;line-height:1.3;color:#000;">ព្រះរាជាណាចក្រកម្ពុជា<br>ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
      <div style="font-size:10px;margin-top:2px;">꧁ ༺ ༻ ꧂</div>
    </div>

    <!-- Title and Photo Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:6px;margin-bottom:8px;">
      <div style="width:2.5cm;visibility:hidden;"></div>

      <div style="flex:1;text-align:center;padding-top:8px;">
        <h3 style="font-size:18.5px;font-weight:900;margin:0;color:#000;letter-spacing:0.5px;">សលាកបត្រសិស្ស</h3>
      </div>

      <div style="width:2.4cm;height:3.1cm;border:1px solid #000;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;background:#f9fafb;flex-shrink:0;position:relative;border-radius:2px;">
        ${photoUrl ? `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;" />` : `<div style="text-align:center;font-size:9.5px;color:#475569;font-weight:700;">រូបថត 3x4</div>`}
      </div>
    </div>

    <!-- Student Detail Fields -->
    <div style="font-size:11.5px;line-height:1.65;color:#000;margin-top:2px;">
      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;">
        <div style="text-align:left;">
          <strong>គោត្តនាម - នាម ៖</strong> <span style="font-size:12.5px;font-weight:bold;">${s.lastName || ""} ${s.firstName || ""}</span>
        </div>
        <div style="text-align:center;padding:0 8px;">
          <strong>អក្សរឡាតាំង ៖</strong> <span style="font-weight:bold;">${latinName}</span>
        </div>
        <div style="text-align:right;">
          <strong>ភេទ ៖</strong> <span>${s.gender || "—"}</span>
        </div>
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <span><strong>ជាតិសាសន៍ ៖</strong> <span>ខ្មែរ</span></span>
        <span>, <strong>សញ្ជាតិ ៖</strong> <span>ខ្មែរ</span></span>
        <span>, <strong>កើតថ្ងៃទី ៖</strong> <span>${s.dob || '១២ ខែតុលា ឆ្នាំ២០១៣'}</span></span>
      </div>

      <div>
        <span><strong>ភូមិ ៖</strong> <span>${villageName}</span> , <strong>ឃុំ ៖</strong> <span>${communeName}</span> , <strong>ស្រុក ៖</strong> <span>${districtName}</span> , <strong>ខេត្ត ៖</strong> <span>${provinceName}</span></span>
      </div>

      <div>
        <span><strong>ជាសិស្ស ថ្នាក់ទី ៖</strong> <span style="font-weight:bold;">${selClass}</span> , <strong>នៃ</strong> <span style="font-weight:bold;">${schoolName}</span></span>
      </div>

      <div style="display:grid;grid-template-columns:55% 45%;">
        <div><strong>ឪពុកឈ្មោះ ៖</strong> <span>${s.fatherName || '………………………………'}</span></div>
        <div><strong>មុខរបរ ៖</strong> <span>${s.fatherJob || '………………………………'}</span></div>
      </div>

      <div style="display:grid;grid-template-columns:55% 45%;">
        <div><strong>ម្ដាយឈ្មោះ ៖</strong> <span>${s.motherName || '………………………………'}</span></div>
        <div><strong>មុខរបរ ៖</strong> <span>${s.motherJob || '………………………………'}</span></div>
      </div>

      <div>
        <span><strong>អាសយដ្ឋានបច្ចុប្បន្ន នៅភូមិ ៖</strong> <span>${villageName}</span> , <strong>ឃុំ ៖</strong> <span>${communeName}</span> , <strong>ស្រុក ៖</strong> <span>${districtName}</span> , <strong>ខេត្ត ៖</strong> <span>${provinceName}</span></span>
      </div>

      <div style="margin-top:2px;">
        <span><strong>ត្រូវបានបានឡើងថ្នាក់ទី ៖</strong> <span style="font-weight:bold;">៧</span> <strong>នៃអនុវិទ្យាល័យ ៖</strong> <span style="font-weight:bold;">ស្ពានមេត្រី</span> , <strong>មធ្យមភាគប្រចាំឆ្នាំសិក្សា ៖</strong> <span style="font-weight:bold;font-size:12.5px;">${avgDisp}</span> , <strong>និទ្ទេស</strong> <span style="font-size:13px;font-weight:900;color:${grade.c};">${grade.l}</span> .</span>
      </div>
    </div>

    <!-- Signatures for Top Part -->
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px;font-size:10.5px;line-height:1.4;">
      
      <!-- Left: Approval Box -->
      <div style="width:53%;text-align:center;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="border:1.5px solid #2563eb;width:1.6cm;height:1.6cm;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#fff;">
            <img src="${qrUrl}" style="width:100%;height:100%;border-radius:4px;" alt="QR" />
          </div>
          <div style="text-align:center;flex:1;min-width:0;">
            <div style="font-weight:700;font-size:11px;color:#000;">បានឃើញ និងឯកភាព</div>
            <div style="font-size:9.5px;color:#1e293b;margin-top:2px;white-space:nowrap;">ថ្ងៃទី................... ខែ................... ឆ្នាំ............ ព.ស. ២៥៧០</div>
            <div style="font-size:9.5px;color:#1e293b;margin-top:2px;white-space:nowrap;">${villageName}, ថ្ងៃទី................... ខែ................... គ.ស. ២០២៦</div>
            <div style="font-weight:700;font-size:10.5px;margin-top:2px;color:#000;">ប្រធានគណៈកម្មការជ្រើសរើសសិស្ស</div>
            <div style="margin-top:34px;font-weight:700;color:#475569;">............................................................</div>
          </div>
        </div>
      </div>

      <!-- Right: Candidate Signature -->
      <div style="width:45%;text-align:center;">
        <div style="font-size:10px;color:#1e293b;white-space:nowrap;">${candDate.lunar}</div>
        <div style="font-size:10px;color:#1e293b;white-space:nowrap;">${villageName} ថ្ងៃទី២៨ ខែធ្នូ គ.ស ២០២៦</div>
        <div style="font-weight:700;font-size:10.5px;margin-top:2px;">ហត្ថលេខា ឬស្នាមមេដៃសិស្ស</div>
        <div style="margin-top:34px;font-weight:700;color:#475569;">............................................................</div>
        <div style="margin-top:3px;font-weight:700;font-size:12px;">${s.lastName || ""} ${s.firstName || ""}</div>
      </div>
    </div>

    <!-- Cut Line Divider -->
    <div style="margin:16px 0 12px;border-top:1.5px dashed #64748b;position:relative;">
      <span style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#fff;padding:0 10px;font-size:9.5px;color:#64748b;font-weight:700;">✂️ កាត់ត្រឹមនេះ</span>
    </div>

    <!-- Lower Section: Guardian Confirmation -->
    <div style="text-align:center;margin-bottom:2px;margin-top:4px;">
      <h2 style="font-size:14px;font-weight:900;margin:0;line-height:1.3;color:#000;">ព្រះរាជាណាចក្រកម្ពុជា<br>ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
      <div style="font-size:10px;margin-top:2px;">꧁ ༺ ༻ ꧂</div>
    </div>

    <div style="text-align:center;margin-bottom:6px;margin-top:5px;">
      <h3 style="font-size:16px;font-weight:900;margin:0;color:#000;">លិខិតបញ្ជាក់ពីឪពុក ឬ អាណាព្យាបាល</h3>
    </div>

    <div style="font-size:11.5px;line-height:1.7;text-align:justify;color:#000;margin-top:4px;">
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;យើងខ្ញុំឈ្មោះ ៖ <strong>${s.fatherName || s.motherName || '………………………………………………'}</strong> ត្រូវជាឪពុក/ម្ដាយ និងអាណាព្យាបាលរបស់សិស្សឈ្មោះ ៖ <strong>${s.lastName || ""} ${s.firstName || ""}</strong> ភេទ <strong>${s.gender || "—"}</strong> កើតថ្ងៃទី <strong>${s.dob || '១២ ខែតុលា ឆ្នាំ២០១៣'}</strong> នៅភូមិ <strong>${villageName}</strong> ឃុំ <strong>${communeName}</strong> ស្រុក <strong>${districtName}</strong> ខេត្ត <strong>${provinceName}</strong>
      <br>
      ជាសិស្ស ថ្នាក់ទី <strong>${selClass}</strong> នៃ <strong>${schoolName}</strong> ក្នុងឆ្នាំសិក្សា <strong>២០២៥ - ២០២៦</strong>
      <br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;សូមបញ្ជាក់ថារបស់សិស្ស ឈ្មោះ ថ្ងៃ ខែ ឆ្នាំ កំណើត និងទីកន្លែងកំណើត ខាងលើនេះ ៖ ពិតជាកូនរបស់យើងខ្ញុំ និងត្រឹមត្រូវតាម តារាង បុត្រកុលសារ និងតាមប្រវត្តិរូប ពិតប្រាកដមែន។
    </div>

    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px;font-size:10.5px;line-height:1.4;">
      
      <!-- Bottom-Left Frame / QR Code -->
      <div style="width:28%;text-align:center;display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
        <div style="border:1.5px solid #2563eb;width:1.6cm;height:1.6cm;border-radius:6px;display:flex;align-items:center;justify-content:center;background:#fff;">
          <img src="${qrUrl}" style="width:100%;height:100%;border-radius:4px;" alt="QR" />
        </div>
      </div>

      <!-- Right: Guardian Signature -->
      <div style="width:68%;text-align:center;">
        <div style="font-size:10px;color:#1e293b;">${candDate.lunar}</div>
        <div style="font-size:10px;color:#1e293b;">${villageName} ថ្ងៃទី២៨ ខែធ្នូ គ.ស ២០២៦</div>
        <div style="font-weight:700;font-size:10.5px;margin-top:2px;">ហត្ថលេខាឪពុក/ម្ដាយ ឬជាអាណាព្យាបាលរបស់សិស្ស</div>
        <div style="margin-top:38px;font-weight:700;color:#475569;">............................................................</div>
      </div>
    </div>

  </div>
  `;
}

export async function generateStudentQRCodeDataUrl(
  s: Student,
  selClass: string,
  schoolName: string,
  arg4?: any,
  arg5?: any,
  arg6?: any,
  teacherParam?: TeacherProfile | null
): Promise<string> {
  let stuList: Student[] = [];
  let scoresMap: Record<string, ScoreMap> = {};
  let teacher: TeacherProfile | null = teacherParam || null;

  if (Array.isArray(arg4)) {
    stuList = arg4 as Student[];
    scoresMap = (arg5 || {}) as Record<string, ScoreMap>;
    if (arg6 && typeof arg6 === "object" && !Array.isArray(arg6)) {
      teacher = arg6 as TeacherProfile;
    }
  } else if (arg6 && typeof arg6 === "object" && !Array.isArray(arg6)) {
    teacher = arg6 as TeacherProfile;
  }

  const qrPayload = buildComprehensiveStudentQRPayload(s, selClass, schoolName, stuList, scoresMap, undefined, teacher);

  try {
    return await QRCode.toDataURL(qrPayload, {
      margin: 2,
      width: 320,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch (err) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=2&data=${encodeURIComponent(qrPayload)}`;
  }
}

export function buildCertificateHTML(
  s: Student,
  selClass: string,
  teacher: TeacherProfile | null,
  stuList: Student[],
  scoresMap: Record<string, ScoreMap>,
  customQrUrl?: string,
  allMonthsScores?: Record<string, Record<string, ScoreMap>>
): string {
  const annualAvg = getAvg(s.id, stuList, scoresMap);
  const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
  const grade = avgVal !== null ? gradeOf(avgVal) : { l: "—", c: "#6b7280" };
  const rank = getRank(s.id, stuList, scoresMap);
  const resultText = avgVal !== null ? resultOf(avgVal) : "—";
  const schoolName = teacher?.school || "សាលាបឋមសិក្សា";
  const latinName = getLatinName(s);
  const districtName = s.district || "ភ្នំស្រុក";
  const provinceName = s.province || "បន្ទាយមានជ័យ";
  const communeName = s.commune || "ស្ពានស្រែង";
  const villageName = s.village || "រោគ";

  const qrPayload = buildComprehensiveStudentQRPayload(s, selClass, schoolName, stuList, scoresMap, allMonthsScores, teacher);
  const qrUrl = customQrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrPayload)}`;

  return `
  <div class="cert-page" style="width:100%;max-width:210mm;min-height:297mm;padding:15mm 12mm;background:#fff;border:10px double #1e3a5f;box-sizing:border-box;margin:0 auto;position:relative;font-family:'Hanuman','Battambang',sans-serif;color:#1e3a5f;border-radius:4px;page-break-after:always;">
    
    <div style="border:2px solid #b45309;padding:18px 22px;min-height:260mm;display:flex;flex-direction:column;justify-content:space-between;position:relative;background:#fafcfb;">
      
      <div style="line-height:1.6;font-weight:700;">
        <h2 style="text-align:center;font-size:15px;font-weight:900;margin:0;color:#1e3a5f;letter-spacing:0.3px;">ព្រះរាជាណាចក្រកម្ពុជា<br>ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
        <div style="text-align:center;font-size:12px;color:#b45309;margin-top:2px;">꧁ ༺ ༻ ꧂</div>
        <div style="text-align:left;font-size:14px;font-weight:700;margin-top:8px;color:#1e3a5f;line-height:1.6;">
          ក្រសួងអប់រំ យុវជន និងកីឡា<br>
          មន្ទីរអប់រំ យុវជន និងកីឡា${provinceName}<br>
          <strong>${schoolName}</strong>
        </div>
      </div>

      <div style="text-align:center;margin:16px 0 10px;">
        <h1 style="font-size:22px;font-weight:900;color:#1e3a5f;letter-spacing:0.5px;margin:0;">វិញ្ញាបនបត្របញ្ជាក់ការសិក្សា</h1>
        <div style="font-size:12px;font-weight:800;color:#b45309;margin-top:4px;letter-spacing:1px;">CERTIFICATE OF EDUCATION</div>
      </div>

      <div style="font-size:14px;font-weight:700;line-height:2.3;color:#111827;text-align:center;padding:0 10px;">
        នាយក <strong>${schoolName}</strong><br> សូមបញ្ជាក់ថា ៖<br>
        សិស្សឈ្មោះ ៖ <strong style="font-size:17px;color:#1e3a5f;">${s.lastName || ""} ${s.firstName || ""}</strong> &nbsp;&nbsp;&nbsp;&nbsp; អក្សរឡាតាំង ៖ <strong style="font-size:15px;color:#1e3a5f;">${latinName}</strong><br>
        ភេទ ៖ <strong>${s.gender || "—"}</strong> &nbsp;&nbsp;&nbsp;&nbsp; ថ្ងៃខែឆ្នាំកំណើត ៖ <strong>${s.dob || '……/……/……'}</strong><br>
        ទីកន្លែងកំណើត ៖ <strong>ភូមិ ${villageName} ឃុំ ${communeName} ស្រុក ${districtName} ខេត្ត ${provinceName}</strong><br>
        បានសិក្សានៅ <strong>${schoolName}</strong> ថ្នាក់ទី <strong>${selClass}</strong> ក្នុងឆ្នាំសិក្សា <strong>២០២៥-២០២៦</strong><br>
        ដោយទទួលបានលទ្ធផលប្រឡងប្រចាំឆ្នាំ ៖
      </div>

      <div style="display:flex;justify-content:center;gap:14px;margin:15px 0;text-align:center;flex-wrap:wrap;">
        <div style="background:#f0f9ff;border:2px solid #3b82f6;border-radius:12px;padding:10px 16px;min-width:110px;">
          <div style="font-size:11px;color:#1d4ed8;font-weight:700;">មធ្យមភាគ</div>
          <div style="font-size:22px;font-weight:900;color:#1e3a5f;">${avgVal !== null ? avgVal : '—'}</div>
        </div>
        <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:10px 16px;min-width:110px;">
          <div style="font-size:11px;color:#15803d;font-weight:700;">និទ្ទេស</div>
          <div style="font-size:22px;font-weight:900;color:${grade.c};">${grade.l}</div>
        </div>
        <div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:12px;padding:10px 16px;min-width:110px;">
          <div style="font-size:11px;color:#b45309;font-weight:700;">ចំណាត់ថ្នាក់</div>
          <div style="font-size:22px;font-weight:900;color:#b45309;"> ${rank !== null ? rank : '—'}</div>
        </div>
        <div style="background:${resultText === 'ជាប់' ? '#f0fdf4' : '#fef2f2'};border:2px solid ${resultText === 'ជាប់' ? '#16a34a' : '#dc2626'};border-radius:12px;padding:10px 16px;min-width:110px;">
          <div style="font-size:11px;color:${resultText === 'ជាប់' ? '#15803d' : '#dc2626'};font-weight:700;">លទ្ធផល</div>
          <div style="font-size:22px;font-weight:900;color:${resultText === 'ជាប់' ? '#15803d' : '#dc2626'};">${resultText}</div>
        </div>
      </div>

      <!-- Bottom Row with QR code placed on bottom-left and Date/Signature Block on bottom-right -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;padding:0 12px;">
        <div style="text-align:center;border:1.5px solid #1e3a5f;padding:8px 12px;border-radius:12px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.05);width:155px;flex-shrink:0;">
          <img src="${qrUrl}" style="width:115px;height:115px;display:block;margin:0 auto;border:1px solid #cbd5e1;border-radius:6px;" alt="QR Code" />
          <div style="font-size:10px;font-weight:900;color:#1e3a5f;margin-top:5px;line-height:1.2;">🔍 QR ផ្ទៀងផ្ទាត់ព័ត៌មាន</div>
          <div style="font-size:8.5px;color:#475569;margin-top:1px;font-weight:700;">រួមទាំងនិទ្ទេសគ្រប់ខែ ២០២៥-២០២៦</div>
        </div>

        <!-- Date & Signature Block: Left-aligned date lines, no pre-printed director name for official seal stamping -->
        <div style="text-align:left;font-size:12.5px;line-height:1.7;color:#1e3a5f;font-weight:700;">
          <div>${fmtKhDate(new Date(2026, 7, 28)).lunar}</div>
          <div>${villageName}, ថ្ងៃទី២៨ ខែសីហា គ.ស ២០២៦</div>
          <div style="font-weight:900;font-size:14px;margin-top:6px;text-align:center;">នាយកសាលា</div>
          <div style="margin-top:65px;"></div>
        </div>
      </div>

      <div style="text-align:center;font-size:10px;color:#6b7280;margin-top:10px;border-top:1px solid #e2e8f0;padding-top:6px;">
        វិញ្ញាបនបត្រនេះត្រូវបានចេញផ្សាយតាមប្រព័ន្ធគ្រប់គ្រងសិស្ស PLP2026 · ផ្ទៀងផ្ទាត់ដោយ QR Code (ឆ្នាំសិក្សា ២០២៥-២០២៦)
      </div>

    </div>
  </div>
  `;
}

export function buildStudentCardHTML(
  s: Student,
  selClass: string,
  teacher: TeacherProfile | null,
  scoresMap: Record<string, ScoreMap>,
  attendanceMap: Record<string, AttendanceMap>,
  selMonth: number,
  semester: string,
  stuList: Student[]
): string {
  const school = teacher?.school || "សាលាបឋមសិក្សា";
  const tName2 = `${teacher?.title || ""} ${teacher?.fullName || ""}`.trim();
  const tchPhone = teacher?.phone || "—";

  const cleanStudentId = (s.code && String(s.code).trim()) 
    ? toKhNum(s.code) 
    : (s.id && !s.id.includes('-') && s.id.length <= 8 && !isNaN(Number(s.id))) 
      ? toKhNum(s.id) 
      : toKhNum(String((stuList.findIndex(st => st.id === s.id) >= 0 ? stuList.findIndex(st => st.id === s.id) : 0) + 1).padStart(2, '0'));

  let allVals: number[] = [];
  const subjectRowsHtml = SUBJECTS.map((subj, ri) => {
    const raw = scoresMap[s.id]?.[subj];
    const val = (raw !== undefined && raw !== "" && raw !== null && !isNaN(Number(raw))) ? Number(raw) : null;
    if (val !== null) allVals.push(val);
    const g = gradeOf(val !== null ? val : -1);
    const gc = val === null ? "color: red; font-weight: 700;" : val >= 9.5 ? "color: #15803d; font-weight: 700;" : val >= 8.0 ? "color: #1d4ed8; font-weight: 700;" : val >= 7.0 ? "color: #b45309; font-weight: 700;" : val >= 6.5 ? "color: #c2410c; font-weight: 700;" : val >= 5.0 ? "color: #cc6600; font-weight: 700;" : "color: red; font-weight: 700;";
    return `<tr><td style="border: 1px solid #003366; padding: 4px; text-align: center;">${ri + 1}</td><td style="border: 1px solid #003366; padding: 4px 6px; text-align: left;">${subj}</td><td style="border: 1px solid #003366; padding: 4px; text-align: center; font-weight: 700;">${val !== null ? fmtAvg(val) : "0.00"}</td><td style="border: 1px solid #003366; padding: 4px; text-align: center; ${gc}">${val !== null ? g.l : "F"}</td><td style="border: 1px solid #003366;"></td></tr>`;
  }).join("");

  const overallAvg = allVals.length > 0 ? truncate2(allVals.reduce((a, b) => a + b, 0) / allVals.length) : null;
  const overallDisp = overallAvg !== null ? fmtAvg(overallAvg) : "0.00";
  const overallG = gradeOf(overallAvg !== null ? overallAvg : -1);
  const overallGC = overallAvg === null ? "color: red; font-weight: 700;" : overallAvg >= 9.5 ? "color: #15803d; font-weight: 700;" : overallAvg >= 8.0 ? "color: #1d4ed8; font-weight: 700;" : overallAvg >= 7.0 ? "color: #b45309; font-weight: 700;" : overallAvg >= 6.5 ? "color: #c2410c; font-weight: 700;" : overallAvg >= 5.0 ? "color: #cc6600; font-weight: 700;" : "color: red; font-weight: 700;";

  const stuRank = getRank(s.id, stuList, scoresMap) ?? "—";

  const stuAtt = attendanceMap[s.id] || {};
  const attAbs = Object.values(stuAtt).filter(v => v === "A").length;
  const attPres = Object.values(stuAtt).filter(v => v === "P").length;

  let dob = "—";
  if (s.dob) {
    try {
      const d = new Date(s.dob);
      dob = toKhNum(d.getDate()) + " " + KH_MONTHS_SOLAR[d.getMonth()] + " " + toKhNum(d.getFullYear());
    } catch (e) {
      dob = s.dob;
    }
  }

  const addr = [s.village, s.commune, s.district, s.province].filter(Boolean).join(" ") || "—";

  const remarkMap: Record<string, string> = {
    A: "ទទួលបាននិទ្ទេស <strong>A</strong> — លទ្ធផលល្អប្រសើរ!",
    B: "ទទួលបាននិទ្ទេស <strong>B</strong> — លទ្ធផលល្អ!",
    C: "ទទួលបាននិទ្ទេស <strong>C</strong> — ត្រូវខំប្រឹងបន្ថែម!",
    D: "ទទួលបាននិទ្ទេស <strong>D</strong> — ត្រូវខំប្រឹងរៀន!",
    E: "ទទួលបាននិទ្ទេស <strong>E</strong> — ត្រូវខិតខំប្រឹងរៀន!",
    F: "ទទួលបាននិទ្ទេស <strong>F</strong> — ត្រូវខំប្រឹងពិសេស!",
  };
  const remarkText = remarkMap[overallG.l] || remarkMap.F;
  const dates = getThreeWorkingDates(selMonth);

  return `
  <div class="sc-wrap" style="border: 2px solid #003366; padding: 12px 14px; background: #fff; font-size: 11px; min-height: 520px; display: flex; flex-direction: column; font-family: 'Hanuman','Battambang',sans-serif; color: #1e293b; box-sizing: border-box; width: 100%; border-radius: 4px;">
    <div class="sc-main" style="display: flex; gap: 12px; width: 100%; flex: 1;">
      <div class="sc-left" style="width: 50%; padding-right: 12px; border-right: 2px dashed #003366; box-sizing: border-box;">
        <div class="sc-header-kh" style="text-align: center; line-height: 1.4; margin-bottom: 8px; color: #003366;">
          <h3 style="font-size: 13px; font-weight: 700; margin: 2px 0; color: #003366;">ព្រះរាជាណាចក្រកម្ពុជា<br>ជាតិ សាសនា ព្រះមហាក្សត្រ<br>---------</h3>
          <h3 style="text-align: left; font-size: 12px; font-weight: 700; margin-top: 4px; color: #003366;">${school}</h3>
          <div style="text-align: center; margin: 6px 0; font-size: 11px; font-weight: 700;">តាមដានការសិក្សារបស់សិស្សសម្រាប់ខែ${MONTHS[selMonth]}<br>ថ្នាក់ទី<strong>${selClass}</strong></div>
        </div>
        <table class="sc-info-tbl" style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.6;">
          <tbody>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">អត្តលេខ :</td><td style="padding: 3px 6px;"><strong>${cleanStudentId}</strong></td><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">ឆ្នាំសិក្សា :</td><td style="padding: 3px 6px;"><strong>២០២៥-២០២៦</strong></td></tr>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">ឈ្មោះសិស្ស :</td><td colspan="2" style="padding: 3px 6px;"><strong>${s.lastName || ""} ${s.firstName || ""}</strong></td><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">ភេទ :</td><td style="padding: 3px 6px;"><strong>${s.gender || "—"}</strong></td></tr>
            <tr><td colspan="4" style="padding: 3px 6px;">ថ្ងៃខែឆ្នាំកំណើត : <strong>${dob}</strong></td></tr>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">ឈ្មោះឪពុក :</td><td style="padding: 3px 6px;"><strong>${s.fatherName || "—"}</strong></td><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">មុខរបរ :</td><td style="padding: 3px 6px;"><strong>${s.fatherJob || "-"}</strong></td></tr>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">ឈ្មោះម្តាយ :</td><td style="padding: 3px 6px;"><strong>${s.motherName || "—"}</strong></td><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">មុខរបរ :</td><td style="padding: 3px 6px;"><strong>${s.motherJob || "-"}</strong></td></tr>
            <tr><td colspan="4" style="padding: 3px 6px;">ទីលំនៅ : ${addr}</td></tr>
            <tr><td colspan="2" style="padding: 3px 6px;">☎ គ្រូប្រចាំថ្នាក់ :</td><td colspan="2" style="padding: 3px 6px;"><strong>${tchPhone}</strong></td></tr>
            <tr><td colspan="2" style="padding: 3px 6px;">ចំនួនអវត្តមាន :</td><td colspan="2" style="padding: 3px 6px;">មានច្បាប់ <strong>${attPres}</strong> ដង ឥតច្បាប់ <strong>${attAbs}</strong> ដង</td></tr>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">មធ្យមភាគ :</td><td colspan="3" style="padding: 3px 6px;"><strong style="font-size: 13px; color: #1e3a5f;">${overallDisp}</strong></td></tr>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">ចំណាត់ថ្នាក់ :</td><td colspan="3" style="padding: 3px 6px;"><strong style="font-size: 13px; color: #1e3a5f;">${stuRank}</strong></td></tr>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">និទ្ទេស :</td><td colspan="3" style="padding: 3px 6px;"><strong style="font-size: 14px; ${overallGC}">${overallG.l}</strong></td></tr>
          </tbody>
        </table>
        <div class="sc-remark" style="margin-top: 10px; padding: 8px 10px; border: 1px solid #003366; line-height: 1.7; font-size: 11px; background: #fefefe; border-radius: 6px;">
          <strong>មូលវិចារគ្រូប្រចាំថ្នាក់ :</strong><br>សិស្ស ${s.lastName || ""} ${s.firstName || ""} ${remarkText}
        </div>
      </div>
      <div class="sc-right" style="width: 50%; padding-left: 12px; box-sizing: border-box;">
        <h2 style="text-align: center; color: #b30000; font-size: 14px; font-weight: 800; margin: 0 0 8px;">លទ្ធផលសិក្សាសម្រាប់ ខែ${MONTHS[selMonth]}</h2>
        <table class="sc-main-tbl" style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #003366; color: #fff;">
              <th style="border: 1px solid #003366; padding: 5px 4px; text-align: center; width: 30px;">ល.រ</th>
              <th style="border: 1px solid #003366; padding: 5px 4px; text-align: left;">មុខវិជ្ជា</th>
              <th style="border: 1px solid #003366; padding: 5px 4px; text-align: center; width: 45px;">ពិន្ទុ</th>
              <th style="border: 1px solid #003366; padding: 5px 4px; text-align: center; width: 45px;">និទ្ទេស</th>
              <th style="border: 1px solid #003366; padding: 5px 4px; text-align: center; width: 45px;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRowsHtml}
            <tr style="background: #f1f5f9; font-weight: 800;">
              <td colspan="2" style="border: 1px solid #003366; padding: 5px 6px; text-align: left; color: #1e3a5f;">មធ្យមភាគរួម</td>
              <td style="border: 1px solid #003366; padding: 5px 4px; text-align: center; color: #1e3a5f; font-size: 12px;">${overallDisp}</td>
              <td style="border: 1px solid #003366; padding: 5px 4px; text-align: center; ${overallGC} font-size: 13px;">${overallG.l}</td>
              <td style="border: 1px solid #003366;"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="sc-footer" style="margin-top: 16px; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; line-height: 1.6; border: none;">
      <!-- Left: Principal (បានឃើញ និងឯកភាព / នាយកសាលា) -->
      <div class="sc-foot-col" style="width: 32%; text-align: center;">
        <div style="font-weight: 700; color: #000; font-size: 11.5px; margin-bottom: 2px;">បានឃើញ និងឯកភាព</div>
        <div style="text-align: left; font-size: 9.5px; color: #374151; line-height: 1.5; padding: 0 2px;">
          <div>${dates.d2.lunar}</div>
          <div>${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d2.solar}</div>
        </div>
        <div style="font-weight: 700; color: #000; font-size: 11px; margin-top: 4px;">នាយកសាលា</div>
      </div>

      <!-- Center: Guardian Feedback (មតិរបស់អាណាព្យាបាល) -->
      <div class="sc-foot-col" style="width: 32%; text-align: center;">
        <div style="font-weight: 700; color: #000; font-size: 11.5px;">មតិរបស់អាណាព្យាបាល</div>
        <div style="margin-top: 34px; color: #64748b;">.......................................................................</div>
      </div>

      <!-- Right: Class Teacher (គ្រូបន្ទុកថ្នាក់) -->
      <div class="sc-foot-col" style="width: 32%; text-align: center;">
        <div style="text-align: left; font-size: 9.5px; color: #374151; line-height: 1.5; padding: 0 2px;">
          <div>${dates.d0.lunar}</div>
          <div>${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d0.solar}</div>
        </div>
        <div style="font-weight: 700; color: #000; font-size: 11px; margin-top: 4px;">គ្រូបន្ទុកថ្នាក់</div>
        <div style="margin-top: 26px; font-weight: 700; color: #1e3a5f; font-size: 11.5px;">${tName2}</div>
      </div>
    </div>
  </div>`;
}

export function buildTraineeBookHTML(
  s: Student,
  sIdx: number,
  selClass: string,
  teacher: TeacherProfile | null,
  scoresMap: Record<string, ScoreMap>,
  attendanceMap: Record<string, AttendanceMap>,
  stuList: Student[],
  allMonthsScores?: Record<string, Record<string, ScoreMap>>,
  semester?: string
): string {
  const school = teacher?.school || "សាលាបឋមសិក្សា រោគ";
  const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`.trim();
  const dates = getThreeWorkingDates(0);

  const cleanStudentId = (s.code && String(s.code).trim()) 
    ? toKhNum(s.code) 
    : (s.id && !s.id.includes('-') && s.id.length <= 8 && !isNaN(Number(s.id))) 
      ? toKhNum(s.id) 
      : toKhNum(String(sIdx + 1).padStart(2, '0'));

  const TRAINEE_SUBJECTS = [
    { no: 1, name: "ការស្ដាប់-និយាយ", keys: ["សមត្ថភាពស្ដាប់", "សមត្ថភាពនិយាយ", "ស្ដាប់", "និយាយ"] },
    { no: 2, name: "តែងសេចក្ដី", keys: ["សមត្ថភាពសរសេរ", "តែងសេចក្តី", "សរសេរតាមអាន", "សរសេរ"] },
    { no: 3, name: "អំណាន", keys: ["សមត្ថភាពអាន", "អំណាន", "អាន"] },
    { no: 4, name: "ចំនួន", keys: ["ចំនួន"] },
    { no: 5, name: "រង្វាស់រង្វាល់", keys: ["រង្វាស់រង្វាល់"] },
    { no: 6, name: "ធរណីមាត្រ", keys: ["ធរណីមាត្រ"] },
    { no: 7, name: "ពីជគណិត", keys: ["ពីជគណិត"] },
    { no: 8, name: "ស្ថិតិ", keys: ["ស្ថិតិ"] },
    { no: 9, name: "វិទ្យាសាស្ត្រ", keys: ["វិទ្យាសាស្ត្រ", "វិទ្យាសាស្រ្ត"] },
    { no: 10, name: "សិក្សាសង្គម", keys: ["សិក្សាសង្គម", "សង្គម"] },
    { no: 11, name: "គេហ-សិល្បៈ", keys: ["គេហ-សិល្បៈ", "គេហៈ-សិល្បៈ"] },
    { no: 12, name: "អប់រំកាយ-សុខភាព", keys: ["អប់រំកាយ-សុខភាព", "អប់រំកាយ"] },
    { no: 13, name: "បំណិន", keys: ["បំណិន", "បំណិនជីវិត"] },
    { no: 14, name: "ភាសាបរទេស", keys: ["ភាសាបរទេស", "អង់គ្លេស"] },
  ];

  // Resolve S1 scores: Preference Month 3 (s1_3)
  let s1StuScores: ScoreMap | undefined = allMonthsScores?.["s1_3"]?.[s.id];
  if (!s1StuScores || Object.keys(s1StuScores).length === 0) {
    if (semester === "s1" && scoresMap[s.id]) {
      s1StuScores = scoresMap[s.id];
    } else {
      for (let m = 0; m <= 3; m++) {
        if (allMonthsScores?.[`s1_${m}`]?.[s.id] && Object.keys(allMonthsScores[`s1_${m}`][s.id]).length > 0) {
          s1StuScores = allMonthsScores[`s1_${m}`][s.id];
          break;
        }
      }
    }
  }

  // Resolve S2 scores: Preference Month 8 (s2_8) or Month 7 (s2_7)
  let s2StuScores: ScoreMap | undefined = allMonthsScores?.["s2_8"]?.[s.id] || allMonthsScores?.["s2_7"]?.[s.id];
  if (!s2StuScores || Object.keys(s2StuScores).length === 0) {
    if (semester === "s2" && scoresMap[s.id]) {
      s2StuScores = scoresMap[s.id];
    } else {
      for (let m = 6; m <= 8; m++) {
        if (allMonthsScores?.[`s2_${m}`]?.[s.id] && Object.keys(allMonthsScores[`s2_${m}`][s.id]).length > 0) {
          s2StuScores = allMonthsScores[`s2_${m}`][s.id];
          break;
        }
      }
    }
  }

  // If both missing, fallback to scoresMap[s.id] for active view
  if (!s1StuScores && !s2StuScores && scoresMap[s.id]) {
    if (semester === "s2") s2StuScores = scoresMap[s.id];
    else s1StuScores = scoresMap[s.id];
  }

  const getSubScore = (stuSc: ScoreMap | undefined, keys: string[]): number | null => {
    if (!stuSc) return null;
    const validVals: number[] = [];
    for (const k of keys) {
      if (stuSc[k] !== undefined && stuSc[k] !== "" && stuSc[k] !== null && !isNaN(Number(stuSc[k]))) {
        validVals.push(Number(stuSc[k]));
      }
    }
    if (validVals.length === 0) return null;
    return validVals.reduce((a, b) => a + b, 0) / validVals.length;
  };

  const getStudentMonthAvg = (mScoresMap: ScoreMap | undefined): number | null => {
    if (!mScoresMap) return null;
    let tot = 0;
    let cnt = 0;
    TRAINEE_SUBJECTS.forEach((sub) => {
      const val = getSubScore(mScoresMap, sub.keys);
      if (val !== null) {
        tot += val;
        cnt++;
      }
    });
    return cnt > 0 ? tot / cnt : null;
  };

  let s1Total = 0, s1ActiveCount = 0;
  let s2Total = 0, s2ActiveCount = 0;
  let annTotal = 0, annActiveCount = 0;

  TRAINEE_SUBJECTS.forEach((sub) => {
    const s1Val = getSubScore(s1StuScores, sub.keys);
    const s2Val = getSubScore(s2StuScores, sub.keys);

    if (s1Val !== null) {
      s1Total += s1Val;
      s1ActiveCount++;
    }
    if (s2Val !== null) {
      s2Total += s2Val;
      s2ActiveCount++;
    }

    let annVal: number | null = null;
    if (s1Val !== null && s2Val !== null) annVal = (s1Val + s2Val) / 2;
    else if (s1Val !== null) annVal = s1Val;
    else if (s2Val !== null) annVal = s2Val;

    if (annVal !== null) {
      annTotal += annVal;
      annActiveCount++;
    }
  });

  // 1. Exam Average (មធ្យមភាគប្រឡង)
  const s1Avg = s1ActiveCount > 0 ? truncate2(s1Total / s1ActiveCount) : 0;
  const s1Grade = s1Avg > 0 ? gradeOf(s1Avg).l : "-";

  const s2Avg = s2ActiveCount > 0 ? truncate2(s2Total / s2ActiveCount) : 0;
  const s2Grade = s2Avg > 0 ? gradeOf(s2Avg).l : "-";

  const annExamAvg = s1Avg > 0 && s2Avg > 0 ? truncate2((s1Avg + s2Avg) / 2) : (s1Avg || s2Avg || 0);
  const annExamGrade = annExamAvg > 0 ? gradeOf(annExamAvg).l : "-";

  const annTotalDisp = annTotal > 0 ? truncate2(annTotal) : 0;

  // 2. Monthly Average (មធ្យមភាគប្រឡងខែ)
  const s1MonthAvgs: number[] = [];
  for (let m = 0; m <= 3; m++) {
    const mSc = allMonthsScores?.[`s1_${m}`]?.[s.id];
    const mAvg = getStudentMonthAvg(mSc);
    if (mAvg !== null && mAvg > 0) {
      s1MonthAvgs.push(mAvg);
    }
  }
  const s1MonthlyAvg = s1MonthAvgs.length > 0
    ? truncate2(s1MonthAvgs.reduce((a, b) => a + b, 0) / s1MonthAvgs.length)
    : s1Avg;
  const s1MonthlyGrade = s1MonthlyAvg > 0 ? gradeOf(s1MonthlyAvg).l : "-";

  const s2MonthAvgs: number[] = [];
  for (let m = 6; m <= 8; m++) {
    const mSc = allMonthsScores?.[`s2_${m}`]?.[s.id];
    const mAvg = getStudentMonthAvg(mSc);
    if (mAvg !== null && mAvg > 0) {
      s2MonthAvgs.push(mAvg);
    }
  }
  const s2MonthlyAvg = s2MonthAvgs.length > 0
    ? truncate2(s2MonthAvgs.reduce((a, b) => a + b, 0) / s2MonthAvgs.length)
    : s2Avg;
  const s2MonthlyGrade = s2MonthlyAvg > 0 ? gradeOf(s2MonthlyAvg).l : "-";

  const annMonthlyAvg = s1MonthlyAvg > 0 && s2MonthlyAvg > 0
    ? truncate2((s1MonthlyAvg + s2MonthlyAvg) / 2)
    : (s1MonthlyAvg || s2MonthlyAvg || 0);
  const annMonthlyGrade = annMonthlyAvg > 0 ? gradeOf(annMonthlyAvg).l : "-";

  // 3. Semester Final Average (មធ្យមភាគប្រចាំឆមាស = (ម.ប្រឡង + ម.ប្រឡងខែ) / 2)
  const s1SemAvg = s1Avg > 0 && s1MonthlyAvg > 0
    ? truncate2((s1Avg + s1MonthlyAvg) / 2)
    : (s1Avg || s1MonthlyAvg || 0);
  const s1SemGrade = s1SemAvg > 0 ? gradeOf(s1SemAvg).l : "-";

  const s2SemAvg = s2Avg > 0 && s2MonthlyAvg > 0
    ? truncate2((s2Avg + s2MonthlyAvg) / 2)
    : (s2Avg || s2MonthlyAvg || 0);
  const s2SemGrade = s2SemAvg > 0 ? gradeOf(s2SemAvg).l : "-";

  const annSemAvg = s1SemAvg > 0 && s2SemAvg > 0
    ? truncate2((s1SemAvg + s2SemAvg) / 2)
    : (s1SemAvg || s2SemAvg || 0);
  const annSemGrade = annSemAvg > 0 ? gradeOf(annSemAvg).l : "-";

  const stuAtt = attendanceMap[s.id] || {};
  const attAbs = Object.values(stuAtt).filter((v) => v === "A").length;
  const attPres = Object.values(stuAtt).filter((v) => v === "P").length;

  let dob = "—";
  if (s.dob) {
    try {
      const d = new Date(s.dob);
      dob = toKhNum(d.getDate()) + "/" + toKhNum(d.getMonth() + 1) + "/" + toKhNum(d.getFullYear());
    } catch (e) {
      dob = s.dob;
    }
  }

  const subjectRowsHTML = TRAINEE_SUBJECTS.map((sub) => {
    const s1Val = getSubScore(s1StuScores, sub.keys);
    const s2Val = getSubScore(s2StuScores, sub.keys);
    let annVal: number | null = null;
    if (s1Val !== null && s2Val !== null) annVal = (s1Val + s2Val) / 2;
    else if (s1Val !== null) annVal = s1Val;
    else if (s2Val !== null) annVal = s2Val;

    const formatGradeColor = (g: string): string => {
      if (g === "A") return `<span style="color: #047857; font-weight: 800;">A</span>`;
      if (g === "B") return `<span style="color: #1d4ed8; font-weight: 800;">B</span>`;
      if (g === "C") return `<span style="color: #b45309; font-weight: 800;">C</span>`;
      if (g === "D") return `<span style="color: #c2410c; font-weight: 800;">D</span>`;
      if (g === "E") return `<span style="color: #d97706; font-weight: 800;">E</span>`;
      if (g === "F") return `<span style="color: #dc2626; font-weight: 800;">F</span>`;
      return `<span style="color: #94a3b8;">${g}</span>`;
    };

    const s1Disp = s1Val !== null ? fmtAvg(s1Val) : "—";
    const s1G = s1Val !== null ? formatGradeColor(gradeOf(s1Val).l) : formatGradeColor("-");

    const s2Disp = s2Val !== null ? fmtAvg(s2Val) : "—";
    const s2G = s2Val !== null ? formatGradeColor(gradeOf(s2Val).l) : formatGradeColor("-");

    const annDisp = annVal !== null ? fmtAvg(annVal) : "—";
    const annG = annVal !== null ? formatGradeColor(gradeOf(annVal).l) : formatGradeColor("-");

    return `
      <tr>
        <td>${sub.no}</td>
        <td style="text-align: left; padding-left: 6px; font-weight: 600;">${sub.name}</td>
        <td>${s1Disp}</td>
        <td>${s1G}</td>
        <td>${s2Disp}</td>
        <td>${s2G}</td>
        <td style="font-weight: 700; color: #0f172a;">${annDisp}</td>
        <td style="font-weight: 700;">${annG}</td>
        <td></td>
      </tr>
    `;
  }).join("");

  let extraRowsHTML = "";
  for (let r = 15; r <= 17; r++) {
    extraRowsHTML += `<tr><td>${r}</td><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  }

  const formatGradeColor = (g: string): string => {
    if (g === "A") return `<span style="color: #047857; font-weight: 800;">A</span>`;
    if (g === "B") return `<span style="color: #1d4ed8; font-weight: 800;">B</span>`;
    if (g === "C") return `<span style="color: #b45309; font-weight: 800;">C</span>`;
    if (g === "D") return `<span style="color: #c2410c; font-weight: 800;">D</span>`;
    if (g === "E") return `<span style="color: #d97706; font-weight: 800;">E</span>`;
    if (g === "F") return `<span style="color: #dc2626; font-weight: 800;">F</span>`;
    return `<span style="color: #94a3b8;">${g}</span>`;
  };

  return `
  <div class="trainee-card-wrap" style="border: 2px solid #334155; padding: 10px 12px; background: #fff; font-size: 11px; min-height: 520px; display: flex; flex-direction: column; font-family: 'Hanuman','Battambang',sans-serif; color: #0f172a; box-sizing: border-box; width: 100%; border-radius: 4px;">
    <style>
      .tb-tbl { border-collapse: collapse; width: 100%; border: 1px solid #334155; font-size: 10.5px; }
      .tb-tbl td, .tb-tbl th { border: 1px solid #334155; padding: 4px 5px; text-align: center; vertical-align: middle; line-height: 1.3; }
      .tb-hdr { background: #f8fafc; font-weight: 700; color: #0f172a; }
    </style>

    <div style="display: flex; gap: 12px; width: 100%; flex: 1;">
      <!-- LEFT SIDE (50%) -->
      <div style="width: 50%; padding-right: 12px; border-right: 2px dashed #003366; box-sizing: border-box; display: flex; flex-direction: column;">
        <table class="tb-tbl" style="margin-bottom: 6px;">
          <tbody>
            <tr class="tb-hdr">
              <td style="width:35px;">ល.រ</td>
              <td style="width:80px;">អត្តលេខ</td>
              <td style="text-align: left; padding-left: 6px;">គោត្តនាម និងនាម</td>
              <td style="width:40px;">ភេទ</td>
              <td style="width:95px;">ថ្ងៃខែឆ្នាំកំណើត</td>
            </tr>
            <tr>
              <td>${toKhNum(sIdx + 1)}</td>
              <td style="font-weight: 700; color: #1e3a5f;">${cleanStudentId}</td>
              <td style="text-align: left; padding-left: 6px; font-weight: 800; color: #1e3a5f;">${s.lastName} ${s.firstName}</td>
              <td>${s.gender}</td>
              <td>${dob}</td>
            </tr>
          </tbody>
        </table>

        <div style="font-weight: 700; text-align: center; padding: 4px; background: #f1f5f9; border: 1px solid #334155; border-bottom: none; font-size: 11px; color: #1e3a5f;">
          លទ្ធផលនៃការសិក្សា
        </div>

        <table class="tb-tbl">
          <thead>
            <tr class="tb-hdr">
              <th rowspan="2" style="width:28px;">ល.រ</th>
              <th rowspan="2" style="text-align: left; padding-left: 6px;">មុខវិជ្ជា</th>
              <th colspan="2">ឆមាសទី ១</th>
              <th colspan="2">ឆមាសទី ២</th>
              <th colspan="2">ប្រចាំឆ្នាំ</th>
              <th rowspan="2" style="width:75px;">មូលវិចារ/ហត្ថលេខា</th>
            </tr>
            <tr class="tb-hdr">
              <th style="width:38px;">ពិន្ទុ</th>
              <th style="width:35px;">និទ្ទេស</th>
              <th style="width:38px;">ពិន្ទុ</th>
              <th style="width:35px;">និទ្ទេស</th>
              <th style="width:38px;">ពិន្ទុ</th>
              <th style="width:35px;">និទ្ទេស</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRowsHTML}
            ${extraRowsHTML}

            <!-- Summary rows -->
            <tr style="font-weight: 700; background: #eff6ff;">
              <td style="color: #1e40af;">18</td>
              <td style="text-align: left; padding-left: 6px; color: #1e40af;">ពិន្ទុសរុប</td>
              <td style="color: #1e40af;">${s1Total > 0 ? fmtAvg(s1Total) : "—"}</td>
              <td>&nbsp;</td>
              <td style="color: #1e40af;">${s2Total > 0 ? fmtAvg(s2Total) : "—"}</td>
              <td>&nbsp;</td>
              <td style="color: #1e40af; font-size: 11.5px;">${annTotalDisp > 0 ? fmtAvg(annTotalDisp) : "—"}</td>
              <td>&nbsp;</td>
              <td rowspan="4" style="vertical-align: middle; padding: 4px; font-size: 10px; background: #ffffff;">
                <strong style="color: #0f172a;">គ្រូប្រចាំថ្នាក់:</strong><br>
                <span style="color: #1e3a5f; font-weight: 700;">${tName}</span>
              </td>
            </tr>
            <tr style="font-weight: 700; background: #f0f9ff;">
              <td style="color: #0284c7;">19</td>
              <td style="text-align: left; padding-left: 6px; color: #0284c7;">មធ្យមភាគប្រឡង</td>
              <td style="color: #0284c7;">${s1Avg > 0 ? fmtAvg(s1Avg) : "—"}</td>
              <td>${formatGradeColor(s1Grade)}</td>
              <td style="color: #0284c7;">${s2Avg > 0 ? fmtAvg(s2Avg) : "—"}</td>
              <td>${formatGradeColor(s2Grade)}</td>
              <td style="color: #0284c7; font-size: 11.5px;">${annExamAvg > 0 ? fmtAvg(annExamAvg) : "—"}</td>
              <td>${formatGradeColor(annExamGrade)}</td>
            </tr>
            <tr style="font-weight: 700; background: #f0fdf4;">
              <td style="color: #15803d;">20</td>
              <td style="text-align: left; padding-left: 6px; color: #15803d;">មធ្យមភាគប្រឡងខែ</td>
              <td style="color: #15803d;">${s1MonthlyAvg > 0 ? fmtAvg(s1MonthlyAvg) : "—"}</td>
              <td>${formatGradeColor(s1MonthlyGrade)}</td>
              <td style="color: #15803d;">${s2MonthlyAvg > 0 ? fmtAvg(s2MonthlyAvg) : "—"}</td>
              <td>${formatGradeColor(s2MonthlyGrade)}</td>
              <td style="color: #15803d; font-size: 11.5px;">${annMonthlyAvg > 0 ? fmtAvg(annMonthlyAvg) : "—"}</td>
              <td>${formatGradeColor(annMonthlyGrade)}</td>
            </tr>
            <tr style="font-weight: 700; background: #faf5ff;">
              <td style="color: #6d28d9;">21</td>
              <td style="text-align: left; padding-left: 6px; color: #6d28d9;">មធ្យមភាគប្រចាំឆមាស</td>
              <td style="color: #6d28d9;">${s1SemAvg > 0 ? fmtAvg(s1SemAvg) : "—"}</td>
              <td>${formatGradeColor(s1SemGrade)}</td>
              <td style="color: #6d28d9;">${s2SemAvg > 0 ? fmtAvg(s2SemAvg) : "—"}</td>
              <td>${formatGradeColor(s2SemGrade)}</td>
              <td style="color: #6d28d9; font-size: 12px;">${annSemAvg > 0 ? fmtAvg(annSemAvg) : "—"}</td>
              <td>${formatGradeColor(annSemGrade)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Absence Table -->
        <div style="margin-top: 8px;">
          <div style="font-weight: 700; text-align: center; padding: 3px; background: #f1f5f9; border: 1px solid #334155; border-bottom: none; font-size: 10.5px;">
            ចំនួនអវត្តមានក្នុងឆ្នាំសិក្សា
          </div>
          <table class="tb-tbl">
            <thead>
              <tr class="tb-hdr">
                <th style="text-align: left; padding-left: 6px;">អវត្តមាន</th>
                <th style="width: 60px;">ឆមាសទី ១</th>
                <th style="width: 60px;">ឆមាសទី ២</th>
                <th style="width: 60px;">ប្រចាំឆ្នាំ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: left; padding-left: 6px;">- មានច្បាប់</td>
                <td>${attPres}</td>
                <td>${attPres}</td>
                <td>${attPres * 2}</td>
              </tr>
              <tr>
                <td style="text-align: left; padding-left: 6px;">- អត់ច្បាប់</td>
                <td>${attAbs}</td>
                <td>${attAbs}</td>
                <td>${attAbs * 2}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- RIGHT SIDE (50%) -->
      <div style="width: 50%; padding-left: 12px; box-sizing: border-box; display: flex; flex-direction: column;">
        <table class="tb-tbl" style="margin-bottom: 6px;">
          <tbody>
            <tr class="tb-hdr">
              <td style="font-weight: 800; color: #1e3a5f; text-align: center;">${school}</td>
              <td style="width: 140px; font-weight: 700;">សិស្សសរុប ${stuList.length} នាក់</td>
            </tr>
            <tr>
              <td colspan="2" style="font-weight: 700; color: #1e3a5f; text-align: center;">
                ថ្នាក់ទី${selClass} ឆ្នាំសិក្សា២០២៥-២០២៦
              </td>
            </tr>
          </tbody>
        </table>

        <div style="font-weight: 700; text-align: center; padding: 4px; background: #f1f5f9; border: 1px solid #334155; border-bottom: none; font-size: 11px; color: #1e3a5f;">
          ការវាយតម្លៃ
        </div>

        <table class="tb-tbl">
          <thead>
            <tr class="tb-hdr">
              <th style="text-align: left; padding-left: 6px;">ផ្នែកទាំង ៤</th>
              <th style="width: 65px;">ឆមាសទី១</th>
              <th style="width: 65px;">ឆមាសទី២</th>
              <th style="width: 65px;">ប្រចាំឆ្នាំ</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="text-align: left; padding-left: 6px;">១- ការសិក្សា</td><td></td><td></td><td></td></tr>
            <tr><td style="text-align: left; padding-left: 6px;">២- សីលធម៌រស់នៅ</td><td></td><td></td><td></td></tr>
            <tr><td style="text-align: left; padding-left: 6px;">៣- ពលកម្ម-បង្កបង្កើនផល</td><td></td><td></td><td></td></tr>
            <tr><td style="text-align: left; padding-left: 6px;">៤- សុខភាព-អនាម័យ</td><td></td><td></td><td></td></tr>
          </tbody>
        </table>

        <!-- លទ្ធផលប្រចាំឆ្នាំ Box -->
        <div style="border: 1px solid #334155; margin-top: 6px; padding: 6px 8px; font-size: 10.5px; line-height: 1.6;">
          <div style="font-weight: 700; color: #1e3a5f; margin-bottom: 2px;">លទ្ធផលប្រចាំឆ្នាំ</div>
          <div>- ត្រូវបានឡើងថ្នាក់ទី.............................................................................................</div>
          <div>- ត្រូវប្រឡងឡើងថ្នាក់៖ មុខវិជ្ជាដែលត្រូវប្រឡង.............................................................</div>
          <div>- ត្រូវរៀនត្រួតថ្នាក់ទី.............................................................................................</div>
        </div>

        <!-- ការសរសើរ និង កំណែលំអ Box -->
        <div style="border: 1px solid #334155; margin-top: 6px; font-size: 10.5px;">
          <div style="font-weight: 700; background: #f1f5f9; border-bottom: 1px solid #334155; padding: 3px 6px; text-align: center;">
            ការសរសើរ និង កំណែលំអ
          </div>
          <div style="display: flex; min-height: 50px;">
            <div style="width: 50%; border-right: 1px solid #334155; padding: 4px 6px;">
              <strong>ការសរសើរ:</strong>
            </div>
            <div style="width: 50%; padding: 4px 6px;">
              <strong>កំណែលំអ:</strong>
            </div>
          </div>
        </div>

        <div style="flex: 1;"></div>

        <!-- SIGNATURE AREA (NO BORDERS inside, TWO DATES: LUNAR TOP, SOLAR BOTTOM) -->
        <div style="margin-top: 10px; padding: 6px 4px; font-size: 11px; line-height: 1.7; border: none;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; text-align: center;">
            <!-- Principal Signature Column (LEFT) -->
            <div style="flex: 1; text-align: center;">
              <div style="font-weight: 800; color: #1e3a5f; margin-bottom: 2px;">មូលវិចារ នាយិកា</div>
              <div style="text-align: left; font-size: 9.5px; color: #374151; line-height: 1.5; padding: 0 4px;">
                <div>${dates.d2.lunar}</div>
                <div>${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d2.solar}</div>
              </div>
              <div style="font-weight: 800; color: #1e3a5f; margin-top: 4px;">នាយកសាលា</div>
            </div>

            <!-- Teacher Signature Column (RIGHT) -->
            <div style="flex: 1; text-align: center;">
              <div style="text-align: left; font-size: 9.5px; color: #374151; line-height: 1.5; padding: 0 4px;">
                <div>${dates.d0.lunar}</div>
                <div>${(teacher?.village || teacher?.district || "រោគ") + " "}${dates.d0.solar}</div>
              </div>
              <div style="font-weight: 800; color: #1e3a5f; margin-top: 4px;">គ្រូបន្ទុកថ្នាក់</div>
              <div style="margin-top: 28px; font-weight: 800; color: #1e3a5f;">${tName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

export function buildStudentQRCardsTablePrintHTML(
  students: Student[],
  selClass: string,
  teacher: TeacherProfile | null,
  scoresMap: Record<string, ScoreMap>,
  qrDataUrls: Record<string, string>,
  layoutMode: "cards" | "table" = "cards",
  allMonthsScores?: Record<string, Record<string, ScoreMap>>
): string {
  const schoolName = teacher?.school || "សាលាបឋមសិក្សា";
  const teacherName = teacher ? `${teacher.title || ""} ${teacher.fullName || ""}`.trim() : "";
  const tPhone = teacher?.phone || "";

  if (layoutMode === "table") {
    // TABLE ROSTER MODE WITH DASHED CUT LINES
    let rowsHtml = "";
    students.forEach((s, idx) => {
      const annualAvg = getAvg(s.id, students, scoresMap);
      const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
      const g = avgVal !== null ? gradeOf(avgVal) : { l: "—", c: "#6b7280" };
      const rank = getRank(s.id, students, scoresMap);
      const latinName = getLatinName(s);
      const qrUrl = qrDataUrls[s.id] || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(s.id)}`;

      rowsHtml += `
      <tr style="border-bottom: 1.5px dashed #94a3b8; height: 60px;">
        <td style="text-align: center; font-weight: 700; border: 1px solid #cbd5e1; padding: 4px;">${idx + 1}</td>
        <td style="text-align: center; font-family: monospace; font-weight: 700; border: 1px solid #cbd5e1; padding: 4px; font-size: 10px; color: #1e3a8a;">${s.code || s.id}</td>
        <td style="border: 1px solid #cbd5e1; padding: 4px 6px; font-weight: 700; font-size: 11px; color: #0f172a;">${s.lastName} ${s.firstName}</td>
        <td style="border: 1px solid #cbd5e1; padding: 4px 6px; font-size: 10px; color: #1e3a8a; text-transform: uppercase; font-weight: 600;">${latinName || "—"}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 4px; font-size: 10.5px;">${s.gender}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 4px; font-size: 10px;">${s.dob || "—"}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 4px; font-size: 10px; line-height: 1.3;">
          <div style="font-weight: 700;">ម.ភាគ: ${avgVal !== null ? avgVal : "—"}</div>
          <div style="color: ${g.c}; font-weight: 800;">និទ្ទេស: ${g.l} (ចំណាត់ថ្នាក់ #${rank !== null ? rank : "—"})</div>
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 3px; background: #f8fafc;">
          <img src="${qrUrl}" alt="QR" style="width: 48px; height: 48px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px; background: #fff; display: inline-block;" />
          <div style="font-size: 7.5px; color: #0284c7; font-weight: 700;">ស្កែនផ្ទៀងផ្ទាត់</div>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-size: 9px; color: #94a3b8;">
          <div style="border-bottom: 1px dotted #cbd5e1; height: 26px;"></div>
          <div>ហត្ថលេខា/កាលបរិច្ឆេទ</div>
        </td>
      </tr>`;
    });

    return `<!DOCTYPE html>
    <html lang="km">
    <head>
      <meta charset="utf-8">
      <title>តារាងបញ្ជី QR Code សិស្សទាំងថ្នាក់ - ថ្នាក់ទី ${selClass}</title>
      <link href="https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700;900&family=Battambang:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Hanuman', 'Battambang', sans-serif; font-size: 11px; line-height: 1.4; color: #0f172a; background: #fff; padding: 10mm; }
        @page { size: A4 landscape; margin: 8mm; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 4px; font-weight: 800; font-size: 11px; text-align: center; color: #1e293b; }
        td { font-size: 10.5px; }
        .header-title { text-align: center; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div style="font-size: 11px; line-height: 1.5; font-weight: 700; color: #1e3a8a;">
          <div>ក្រសួងអប់រំ យុវជន និងកីឡា</div>
          <div>${schoolName}</div>
          <div>គ្រូបន្ទុកថ្នាក់ ៖ <strong>${teacherName || "—"}</strong> ${tPhone ? `(Tel: ${tPhone})` : ""}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 13px; font-weight: 900; color: #0f172a;">ព្រះរាជាណាចក្រកម្ពុជា</div>
          <div style="font-size: 11px; color: #475569;">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
          <div style="font-size: 10px; color: #92400e; margin-top: 1px;">꧁ ༺ ༻ ꧂</div>
        </div>
      </div>

      <div style="text-align: center; margin: 8px 0 14px;">
        <h2 style="font-size: 16px; font-weight: 900; color: #1e3a8a; margin-bottom: 2px;">តារាងបញ្ជី QR Code ផ្ទៀងផ្ទាត់សិស្សទាំងថ្នាក់ (QR Code Master Sheet)</h2>
        <div style="font-size: 12px; font-weight: 700; color: #334155;">
          ថ្នាក់ទី <strong>${selClass}</strong> · ចំនួនសិស្សសរុប <strong>${students.length}</strong> នាក់ (ស្រី <strong>${students.filter(s => s.gender === 'ស្រី').length}</strong> នាក់) · ឆ្នាំសិក្សា ២០២៥-២០២៦
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
          ✂️ បន្ទាត់ដាច់អាចកាត់ជាជួរចែកជូនសិស្ស ឬរក្សាទុកក្នុងសៀវភៅតាមដាន
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 36px;">ល.រ</th>
            <th style="width: 75px;">អត្តលេខ</th>
            <th style="width: 140px; text-align: left; padding-left: 6px;">គោត្តនាម-នាម</th>
            <th style="width: 120px; text-align: left; padding-left: 6px;">អក្សរឡាតាំង</th>
            <th style="width: 44px;">ភេទ</th>
            <th style="width: 85px;">ថ្ងៃខែឆ្នាំកំណើត</th>
            <th style="width: 125px;">លទ្ធផលសិក្សា</th>
            <th style="width: 70px;">QR Code</th>
            <th style="width: 100px;">ហត្ថលេខាទទួល</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 11px; padding: 0 20px;">
        <div style="text-align: center;">
          <div style="font-weight: 700; color: #475569;">បានឃើញ និងឯកភាព</div>
          <div style="font-weight: 800; color: #1e3a8a; margin-top: 2px;">នាយកសាលា</div>
        </div>
        <div style="text-align: center;">
          <div style="color: #475569;">ថ្ងៃ..................ខែ.........ឆ្នាំ២០២៦</div>
          <div style="font-weight: 800; color: #1e3a8a; margin-top: 2px;">គ្រូបន្ទុកថ្នាក់</div>
          <div style="margin-top: 35px; font-weight: 800; color: #0f172a;">${teacherName}</div>
        </div>
      </div>
    </body>
    </html>`;
  }

  // 8 CARDS PER A4 PAGE MODE (GRID FOR EASY CUTTING & DISTRIBUTION)
  const pageSize = 8;
  const pagesCount = Math.ceil(students.length / pageSize) || 1;
  let pagesHtml = "";

  for (let p = 0; p < pagesCount; p++) {
    const chunk = students.slice(p * pageSize, (p + 1) * pageSize);
    let cardsHtml = "";

    chunk.forEach((s, idxWithinPage) => {
      const overallIndex = p * pageSize + idxWithinPage;
      const annualAvg = getAvg(s.id, students, scoresMap);
      const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
      const g = avgVal !== null ? gradeOf(avgVal) : { l: "—", c: "#6b7280" };
      const rank = getRank(s.id, students, scoresMap);
      const latinName = getLatinName(s);
      const qrUrl = qrDataUrls[s.id] || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(s.id)}`;
      const guardian = s.fatherName || s.motherName || "";

      cardsHtml += `
      <div style="width: 100%; height: 66mm; box-sizing: border-box; border: 1.5px dashed #475569; border-radius: 8px; padding: 6px 8px; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
        <!-- Card Top Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 4px;">
          <div style="font-size: 9px; font-weight: 800; color: #1e3a8a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60mm;">
            🏫 ${schoolName} · ថ្នាក់ ${selClass}
          </div>
          <div style="font-size: 8.5px; font-weight: 900; background: #f1f5f9; color: #0f172a; padding: 1px 6px; border-radius: 4px; border: 1px solid #cbd5e1;">
            ល.រ: ${overallIndex + 1}
          </div>
        </div>

        <!-- Card Body (Left Details + Right QR) -->
        <div style="display: flex; gap: 6px; align-items: center; justify-content: space-between; flex: 1;">
          <!-- Left Details Column -->
          <div style="flex: 1; min-width: 0; line-height: 1.45;">
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${s.lastName} ${s.firstName}
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #1e40af; text-transform: uppercase; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${latinName || "STUDENT"}
            </div>
            
            <div style="font-size: 9.5px; color: #334155;">
              <strong>អត្តលេខ ៖</strong> <span style="font-family: monospace; font-weight: 700; color: #1e3a8a;">${s.code || s.id}</span>
            </div>
            <div style="font-size: 9.5px; color: #334155;">
              <strong>ភេទ ៖</strong> ${s.gender} &nbsp;|&nbsp; <strong>ថ្ងៃកំណើត ៖</strong> ${s.dob || "—"}
            </div>
            ${guardian ? `<div style="font-size: 9px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>អាណាព្យាបាល ៖</strong> ${guardian}</div>` : ""}

            <div style="margin-top: 3px; font-size: 9.5px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 4px; display: inline-block;">
              <strong>ម.ភាគ ៖</strong> <span style="font-weight: 800; color: #0f172a;">${avgVal !== null ? avgVal : "—"}</span>
              &nbsp;|&nbsp; <strong>និទ្ទេស ៖</strong> <span style="font-weight: 900; color: ${g.c};">${g.l}</span>
              &nbsp;|&nbsp; <strong>ចំណាត់ថ្នាក់ ៖</strong> <span style="font-weight: 800; color: #1e3a8a;">#${rank !== null ? rank : "—"}</span>
            </div>
          </div>

          <!-- Right QR Column -->
          <div style="width: 25mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; flex-shrink: 0;">
            <img src="${qrUrl}" alt="QR" style="width: 21mm; height: 21mm; object-fit: contain; border: 1px solid #94a3b8; border-radius: 6px; padding: 2px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.08);" />
            <div style="font-size: 8px; font-weight: 800; color: #0284c7; margin-top: 2px; line-height: 1.1;">
              📲 ស្កែនផ្ទៀងផ្ទាត់
            </div>
            <div style="font-size: 7px; color: #64748b; line-height: 1;">
              (Online Profile)
            </div>
          </div>
        </div>

        <!-- Card Bottom Cut Guide -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #cbd5e1; padding-top: 2px; margin-top: 3px; font-size: 7.5px; color: #94a3b8;">
          <span>✂️ កាត់តាមបន្ទាត់ដាច់ចែកជូនសិស្ស</span>
          <span>ឆ្នាំសិក្សា ២០២៥-២០២៦</span>
        </div>
      </div>`;
    });

    const isLastPage = p === pagesCount - 1;
    pagesHtml += `
    <div class="a4-page" style="width: 210mm; min-height: 297mm; box-sizing: border-box; padding: 8mm 6mm; margin: 0 auto; background: #ffffff; ${isLastPage ? "" : "page-break-after: always;"}">
      <!-- Page Title & Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5mm; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 2mm;">
        <div>
          <h1 style="font-size: 13px; font-weight: 900; color: #1e3a8a; margin: 0;">🏷️ ប័ណ្ណ QR Code សិស្សសម្រាប់កាត់ចែកជូនសិស្ស (Student QR Code Cards)</h1>
          <div style="font-size: 10px; font-weight: 700; color: #475569;">
            ${schoolName} · ថ្នាក់ទី ${selClass} · គ្រូបន្ទុកថ្នាក់: ${teacherName || "—"}
          </div>
        </div>
        <div style="text-align: right; font-size: 9.5px; font-weight: 700; color: #64748b;">
          ទំព័រទី ${p + 1}/${pagesCount} · (សិស្ស ${overallCountText(chunk.length, students.length)})
        </div>
      </div>

      <!-- 2 Columns x 4 Rows Grid of 8 Cards -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4.5mm; width: 100%;">
        ${cardsHtml}
      </div>
    </div>`;
  }

  function overallCountText(cur: number, total: number) {
    return `${cur}/${total} នាក់`;
  }

  return `<!DOCTYPE html>
  <html lang="km">
  <head>
    <meta charset="utf-8">
    <title>ប័ណ្ណ QR Code សិស្សទាំងថ្នាក់ - ថ្នាក់ទី ${selClass} (${students.length} នាក់)</title>
    <link href="https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700;900&family=Battambang:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Hanuman', 'Battambang', sans-serif; font-size: 10.5px; line-height: 1.4; color: #0f172a; background: #f8fafc; }
      @page { size: A4 portrait; margin: 4mm 2mm; }
      @media print {
        body { background: #fff !important; padding: 0 !important; }
        .a4-page { width: 100% !important; min-height: 290mm !important; margin: 0 !important; padding: 6mm 4mm !important; box-shadow: none !important; }
      }
    </style>
  </head>
  <body>
    ${pagesHtml}
  </body>
  </html>`;
}

