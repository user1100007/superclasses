import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Student, ScoreMap, AttendanceMap, TeacherProfile } from "../../types";
import { CLASSES, SUBJECTS, SEMESTERS, MONTHS, calcAge, getTotal, getAvg, gradeOf, resultOf, fmtAvg, buildRankedList } from "../../lib/constants";
import { SAMPLE_STUDENTS } from "../../data/sampleStudents";
import * as XLSX from "xlsx";

export interface VerificationRow {
  student: Omit<Student, "id">;
  isDuplicateInFile: boolean;
  isDuplicateInClass: boolean;
  existingMatchId?: string;
  selected: boolean;
}

export interface StudentVerificationState {
  rows: VerificationRow[];
  targetClass: string;
  expectedTotal: number;
  expectedFemale: number;
  actualTotal: number;
  actualFemale: number;
  strategy: "add" | "replace_all" | "update_matching";
}

interface IOModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  scoresMap: Record<string, ScoreMap>;
  attendanceMap: Record<string, AttendanceMap>;
  selClass: string;
  semester: string;
  selMonth: number;
  teacher?: TeacherProfile | null;
  onImportStudents: (
    stus: Omit<Student, "id">[],
    targetClass?: string,
    mode?: "add" | "replace_all" | "update_matching"
  ) => Promise<void>;
  onImportScores: (scores: Record<string, ScoreMap>) => Promise<void>;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const IOModal: React.FC<IOModalProps> = ({
  isOpen,
  onClose,
  students,
  scoresMap,
  attendanceMap,
  selClass,
  semester,
  selMonth,
  teacher,
  onImportStudents,
  onImportScores,
  toast,
}) => {
  const [tab, setTab] = useState<"stu" | "sco">("stu");
  const [logMsg, setLogMsg] = useState<string>("រង់ចាំ...");
  const [targetClass, setTargetClass] = useState<string>(selClass || CLASSES[0] || "1A");
  const [importMode, setImportMode] = useState<"file" | "text" | "url">("file");
  const [pastedText, setPastedText] = useState<string>("");
  const [urlOrCodeInput, setUrlOrCodeInput] = useState<string>("");
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Student verification modal state
  const [verificationState, setVerificationState] = useState<StudentVerificationState | null>(null);
  const [expectedTotalInput, setExpectedTotalInput] = useState<number>(() => teacher?.expectedTotalStudents || 0);
  const [expectedFemaleInput, setExpectedFemaleInput] = useState<number>(() => teacher?.expectedFemaleStudents || 0);

  useEffect(() => {
    if (teacher?.expectedTotalStudents) setExpectedTotalInput(teacher.expectedTotalStudents);
    if (teacher?.expectedFemaleStudents) setExpectedFemaleInput(teacher.expectedFemaleStudents);
  }, [teacher]);

  useEffect(() => {
    if (selClass) setTargetClass(selClass);
  }, [selClass]);

  if (!isOpen) return null;

  const STU_HEADERS = ["គោត្តនាម", "នាម", "ភេទ", "ថ្ងៃខែឆ្នាំកំណើត", "អាយុ", "ឈ្មោះឪពុក", "មុខរបរឪពុក", "ឈ្មោះម្តាយ", "មុខរបរម្តាយ", "ភូមិ", "ឃុំ", "ស្រុក", "ខេត្ត", "ទូរស័ព្ទ"];
  const STU_FIELDS = ["lastName", "firstName", "gender", "dob", "age", "fatherName", "fatherJob", "motherName", "motherJob", "village", "commune", "district", "province", "phone"] as const;

  const downloadCSV = (filename: string, rows: string[]) => {
    const bom = "\uFEFF";
    const content = bom + rows.join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
    return lines.map((line) => {
      const cols: string[] = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQ && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQ = !inQ;
        } else if (c === "," && !inQ) {
          cols.push(cur.trim());
          cur = "";
        } else cur += c;
      }
      cols.push(cur.trim());
      return cols;
    });
  };

  // Helper to parse individual JSON object to Student
  const parseStudentFromObject = (item: any): Omit<Student, "id"> | null => {
    if (!item || typeof item !== "object") return null;
    let lastName = String(item.lastName || item.last_name || item.family_name || item["គោត្តនាម"] || "").trim();
    let firstName = String(item.firstName || item.first_name || item.given_name || item["នាម"] || "").trim();

    if (!lastName || !firstName || lastName === firstName) {
      const fullName = String(item.fullName || item.full_name || item.name || item["ឈ្មោះ"] || item["ឈ្មោះពេញ"] || item["គោត្តនាម និងនាម"] || "").trim();
      if (fullName) {
        const parts = fullName.split(/\s+/);
        if (parts.length >= 2) {
          lastName = parts[0];
          firstName = parts.slice(1).join(" ");
        } else if (parts.length === 1) {
          lastName = parts[0];
          firstName = "";
        }
      } else if (lastName && firstName && lastName === firstName) {
        // If lastName and firstName are stored as identical strings e.g. "កា" and "កា" but item has no fullName,
        // or if lastName/firstName were extracted identically from duplicate fields
        // Keep as is unless there's a space inside
        if (lastName.includes(" ")) {
          const parts = lastName.split(/\s+/);
          lastName = parts[0];
          firstName = parts.slice(1).join(" ");
        }
      }
    }

    if (!lastName && !firstName) return null;

    let genderStr = String(item.gender || item.sex || item["ភេទ"] || "").trim();
    let gender: "ប្រុស" | "ស្រី" = "ប្រុស";
    if (genderStr.includes("ស្រី") || genderStr.toLowerCase().includes("f") || genderStr.includes("female")) {
      gender = "ស្រី";
    }

    const dob = String(item.dob || item.birth || item["ថ្ងៃខែឆ្នាំកំណើត"] || item["ថ្ងៃកំណើត"] || "").trim();
    let age = String(item.age || item["អាយុ"] || "").trim();
    if (dob && !age) age = String(calcAge(dob));

    return {
      lastName,
      firstName,
      gender,
      dob,
      age,
      fatherName: String(item.fatherName || item.father || item["ឈ្មោះឪពុក"] || item["ឪពុក"] || "").trim(),
      fatherJob: String(item.fatherJob || item["មុខរបរឪពុក"] || "").trim(),
      motherName: String(item.motherName || item.mother || item["ឈ្មោះម្តាយ"] || item["ម្តាយ"] || item["ឈ្មោះម្ដាយ"] || item["ម្ដាយ"] || "").trim(),
      motherJob: String(item.motherJob || item["មុខរបរម្តាយ"] || item["មុខរបរម្ដាយ"] || "").trim(),
      village: String(item.village || item["ភូមិ"] || "").trim(),
      commune: String(item.commune || item["ឃុំ"] || "").trim(),
      district: String(item.district || item["ស្រុក"] || "").trim(),
      province: String(item.province || item["ខេត្ត"] || "").trim(),
      phone: String(item.phone || item["ទូរស័ព្ទ"] || "").trim(),
    };
  };

  // Helper to parse 2D string rows to Student array
  const parseRowsToStudents = (rawRows: string[][]): Omit<Student, "id">[] => {
    if (rawRows.length < 2) return [];

    let headerRowIdx = -1;
    const keywords = ["គោត្តនាម", "នាម", "ឈ្មោះ", "ភេទ", "lastname", "firstname", "gender", "dob", "ថ្ងៃខែឆ្នាំកំណើត"];

    for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
      const rowStr = rawRows[r].join(" ").toLowerCase();
      if (keywords.some((kw) => rowStr.includes(kw))) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) headerRowIdx = 0;

    const header = rawRows[headerRowIdx].map((h) => h.toLowerCase().trim());

    const findColIdx = (aliases: string[]) => {
      // Try exact match first
      for (const alias of aliases) {
        const idx = header.findIndex((h) => h === alias.toLowerCase());
        if (idx >= 0) return idx;
      }
      // Fallback to substring match
      for (const alias of aliases) {
        const idx = header.findIndex((h) => h.includes(alias.toLowerCase()));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const codeIdx = findColIdx(["អត្តលេខ", "code", "studentid", "student_id", " id"]);
    const lastNameIdx = findColIdx(["គោត្តនាម", "lastname", "last_name", "family_name"]);
    const firstNameIdx = findColIdx(["នាម", "firstname", "first_name", "given_name"]);
    const fullNameIdx = findColIdx(["គោត្តនាម និងនាម", "គោត្តនាម-នាម", "ឈ្មោះ", "ឈ្មោះពេញ", "ឈ្មោះសិស្ស", "fullname", "full_name", "name"]);
    const genderIdx = findColIdx(["ភេទ", "gender", "sex"]);
    const dobIdx = findColIdx(["ថ្ងៃខែឆ្នាំកំណើត", "ថ្ងៃកំណើត", "dob", "birth"]);
    const ageIdx = findColIdx(["អាយុ", "age"]);
    const fNameIdx = findColIdx(["ឈ្មោះឪពុក", "ឪពុក", "fathername", "father"]);
    const fJobIdx = findColIdx(["មុខរបរឪពុក", "fatherjob"]);
    const mNameIdx = findColIdx(["ឈ្មោះម្តាយ", "ម្តាយ", "mothername", "mother"]);
    const mJobIdx = findColIdx(["មុខរបរម្តាយ", "motherjob"]);
    const vilIdx = findColIdx(["ភូមិ", "village"]);
    const comIdx = findColIdx(["ឃុំ", "commune", "sangkat"]);
    const disIdx = findColIdx(["ស្រុក", "district", "khan"]);
    const provIdx = findColIdx(["ខេត្ត", "province", "city"]);
    const phoneIdx = findColIdx(["ទូរស័ព្ទ", "phone", "tel"]);

    const parsedStudents: Omit<Student, "id">[] = [];

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.every((c) => !c)) continue;

      let lastName = lastNameIdx >= 0 ? row[lastNameIdx] || "" : "";
      let firstName = firstNameIdx >= 0 ? row[firstNameIdx] || "" : "";

      if ((!lastName || !firstName) && fullNameIdx >= 0 && row[fullNameIdx]) {
        const full = row[fullNameIdx].trim();
        const parts = full.split(/\s+/);
        if (parts.length >= 2) {
          lastName = lastName || parts[0];
          firstName = firstName || parts.slice(1).join(" ");
        } else if (parts.length === 1) {
          lastName = lastName || parts[0];
          firstName = firstName || "";
        }
      }

      if (!lastName && !firstName) continue;

      let gender = genderIdx >= 0 ? row[genderIdx] || "" : "ប្រុស";
      if (gender.includes("ស្រី") || gender.toLowerCase().includes("f") || gender.includes("female")) {
        gender = "ស្រី";
      } else {
        gender = "ប្រុស";
      }

      const dob = dobIdx >= 0 ? row[dobIdx] || "" : "";
      let age = ageIdx >= 0 ? row[ageIdx] || "" : "";
      if (dob && !age) age = String(calcAge(dob));

      const rawCode = codeIdx >= 0 ? row[codeIdx] || "" : "";
      const year = new Date().getFullYear();
      const cls = targetClass || "6A";
      const autoCode = rawCode || `${year}-${cls}-${String(parsedStudents.length + 1).padStart(2, "0")}`;

      parsedStudents.push({
        code: autoCode,
        lastName,
        firstName,
        gender,
        dob,
        age,
        fatherName: fNameIdx >= 0 ? row[fNameIdx] || "" : "",
        fatherJob: fJobIdx >= 0 ? row[fJobIdx] || "" : "",
        motherName: mNameIdx >= 0 ? row[mNameIdx] || "" : "",
        motherJob: mJobIdx >= 0 ? row[mJobIdx] || "" : "",
        village: vilIdx >= 0 ? row[vilIdx] || "" : "",
        commune: comIdx >= 0 ? row[comIdx] || "" : "",
        district: disIdx >= 0 ? row[disIdx] || "" : "",
        province: provIdx >= 0 ? row[provIdx] || "" : "",
        phone: phoneIdx >= 0 ? row[phoneIdx] || "" : "",
      });
    }

    return parsedStudents;
  };

  // Student Export CSV
  const handleExportStudentsCSV = () => {
    if (!students.length) {
      toast("⚠️ មិនមានសិស្ស", "error");
      return;
    }
    const rows = [STU_HEADERS.join(",")];
    students.forEach((s) => {
      const row = STU_FIELDS.map((f) => {
        const val = s[f] || "";
        return val.includes(",") ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(",");
      rows.push(row);
    });
    downloadCSV(`students_${selClass}_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    setLogMsg(`✅ Export សិស្ស ${students.length}នាក់ រួចរាល់`);
    toast("📤 Export CSV ដោយជោគជ័យ");
  };

  // Student Export XLSX
  const handleExportStudentsXLSX = () => {
    if (!students.length) {
      toast("⚠️ មិនមានសិស្ស", "error");
      return;
    }
    const wb = XLSX.utils.book_new();
    const rows = [STU_HEADERS];
    students.forEach((s) => {
      const row = STU_FIELDS.map((f) => s[f] || "");
      rows.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "ព័ត៌មានសិស្ស");
    XLSX.writeFile(wb, `students_${selClass}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setLogMsg(`✅ Export សិស្ស ${students.length}នាក់ ជា XLSX រួចរាល់`);
    toast("📊 Export XLSX ដោយជោគជ័យ");
  };

  // Trigger Student Verification modal before saving
  const triggerStudentVerification = async (parsedList: Omit<Student, "id">[], destClass: string) => {
    if (!parsedList.length) {
      setLogMsg("⚠️ រកមិនឃើញទិន្នន័យសិស្សទេ");
      toast("⚠️ រកមិនឃើញទិន្នន័យសិស្សទេ", "error");
      return;
    }

    setLogMsg("⏳ កំពុងផ្ទៀងផ្ទាត់ និងត្រួតពិនិត្យភាពស្ទួន...");

    // Get existing students in destination class
    let classStudents: Student[] = [];
    if (destClass === selClass && students && students.length > 0) {
      classStudents = students;
    } else {
      try {
        const snap = await getDocs(collection(db, "classes", destClass, "students"));
        snap.forEach((d) => {
          classStudents.push({ id: d.id, ...d.data() } as Student);
        });
      } catch (err) {
        console.warn("Could not fetch target class students for comparison", err);
      }
    }

    const existingMap = new Map<string, string>();
    classStudents.forEach((s) => {
      const key = `${s.lastName || ""} ${s.firstName || ""}`.trim().toLowerCase();
      if (key) existingMap.set(key, s.id);
    });

    const seenInFile = new Set<string>();
    const rows: VerificationRow[] = [];
    let femaleCount = 0;

    for (let i = 0; i < parsedList.length; i++) {
      const s = parsedList[i];
      if (s.gender === "ស្រី") femaleCount++;

      const fullNameKey = `${s.lastName || ""} ${s.firstName || ""}`.trim().toLowerCase();
      const isDupInFile = fullNameKey ? seenInFile.has(fullNameKey) : false;
      if (fullNameKey) seenInFile.add(fullNameKey);

      const existingMatchId = fullNameKey ? existingMap.get(fullNameKey) : undefined;
      const isDupInClass = !!existingMatchId;

      rows.push({
        student: s,
        isDuplicateInFile: isDupInFile,
        isDuplicateInClass: isDupInClass,
        existingMatchId,
        selected: true,
      });
    }

    const expTotal = expectedTotalInput > 0 ? expectedTotalInput : (teacher?.expectedTotalStudents || parsedList.length);
    const expFemale = expectedFemaleInput > 0 ? expectedFemaleInput : (teacher?.expectedFemaleStudents || femaleCount);

    const hasClassDuplicates = rows.some((r) => r.isDuplicateInClass);

    setVerificationState({
      rows,
      targetClass: destClass,
      expectedTotal: expTotal,
      expectedFemale: expFemale,
      actualTotal: parsedList.length,
      actualFemale: femaleCount,
      strategy: hasClassDuplicates ? "update_matching" : "add",
    });

    setLogMsg(`🔍 បានផ្ទៀងផ្ទាត់សិស្ស ${parsedList.length} នាក់ (ស្រី ${femaleCount}) សម្រាប់ថ្នាក់ ${destClass}`);
  };

  const handleConfirmImport = async () => {
    if (!verificationState) return;
    const selectedStudents = verificationState.rows.filter((r) => r.selected).map((r) => r.student);
    if (!selectedStudents.length) {
      toast("⚠️ សូមជ្រើសរើសសិស្សយ៉ាងហោចណាស់ម្នាក់ដើម្បីនាំចូល", "error");
      return;
    }
    setIsSubmitting(true);
    setLogMsg("⏳ កំពុងដំណើរការនាំចូលទិន្នន័យសិស្សទៅ Firebase...");
    try {
      await onImportStudents(selectedStudents, verificationState.targetClass, verificationState.strategy);
      const stratLabel =
        verificationState.strategy === "replace_all"
          ? "ជំនួសទិន្នន័យចាស់ទាំងអស់"
          : verificationState.strategy === "update_matching"
          ? "ជំនួសអ្នកស្ទួន + បន្ថែមអ្នកថ្មី"
          : "បន្ថែមទាំងអស់";
      setLogMsg(`✅ នាំចូលសិស្ស ${selectedStudents.length} នាក់ (${stratLabel}) ទៅកាន់ ថ្នាក់ ${verificationState.targetClass} ដោយជោគជ័យ!`);
      toast(`✅ បាននាំចូលសិស្ស ${selectedStudents.length} នាក់ (${stratLabel}) រួចរាល់!`, "success");
      setVerificationState(null);
      onClose();
    } catch (err: any) {
      setLogMsg("❌ " + err.message);
      toast("❌ Import Error: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Student Import CSV/XLSX/JSON File
  const handleImportStudentsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogMsg("⏳ កំពុងអានទិន្នន័យពី File...");
    try {
      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const jsonObj = JSON.parse(text);

        // Helper function to extract student objects from nested JSON structures (e.g. Firebase backups)
        const extractStudentList = (obj: any): any[] => {
          if (!obj || typeof obj !== "object") return [];
          if (Array.isArray(obj)) return obj;

          // Check if object itself is a single student
          if ((obj.lastName || obj.firstName || obj["គោត្តនាម"] || obj["នាម"] || obj.fullName) && !obj.students) {
            return [obj];
          }

          // Check direct keys like students or data
          if (Array.isArray(obj.students)) return obj.students;
          if (Array.isArray(obj.data)) return obj.data;

          // Check if obj is a map of student objects (e.g. { "-OvuiHK...": { firstName: "...", lastName: "..." } })
          const values = Object.values(obj);
          const isStudentMap = values.some(
            (v: any) => v && typeof v === "object" && (v.lastName || v.firstName || v["គោត្តនាម"] || v["នាម"] || v.gender || v["ភេទ"])
          );
          if (isStudentMap) {
            return values.filter((v) => v && typeof v === "object");
          }

          // Recursive search for student lists or student maps
          let found: any[] = [];
          for (const val of values) {
            if (val && typeof val === "object") {
              const subList = extractStudentList(val);
              if (subList.length > 0) {
                found.push(...subList);
              }
            }
          }
          return found;
        };

        const list = extractStudentList(jsonObj);
        const parsedStudents: Omit<Student, "id">[] = [];
        for (const item of list) {
          const s = parseStudentFromObject(item);
          if (s) parsedStudents.push(s);
        }
        if (parsedStudents.length === 0) {
          setLogMsg("⚠️ រកមិនឃើញទិន្នន័យសិស្សក្នុង File JSON នេះទេ");
          toast("⚠️ រកមិនឃើញទិន្នន័យសិស្សទេ", "error");
          e.target.value = "";
          return;
        }
        await triggerStudentVerification(parsedStudents, targetClass);
        e.target.value = "";
        return;
      }

      let rawRows: string[][] = [];

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        rawRows = jsonRows.map((r) => r.map((c) => String(c ?? "").trim()));
      } else {
        const text = await file.text();
        if (text.includes(";") && !text.includes(",")) {
          rawRows = text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n")
            .filter((l) => l.trim())
            .map((l) => l.split(";").map((c) => c.replace(/^"|"$/g, "").trim()));
        } else {
          rawRows = parseCSV(text);
        }
      }

      const parsedStudents = parseRowsToStudents(rawRows);

      if (parsedStudents.length === 0) {
        setLogMsg("⚠️ រកមិនឃើញទិន្នន័យសិស្សក្នុង File នេះទេ (សូមពិនិត្យមើល Header ឈ្មោះ/គោត្តនាម/ភេទ)");
        toast("⚠️ រកមិនឃើញទិន្នន័យសិស្សទេ", "error");
        e.target.value = "";
        return;
      }

      await triggerStudentVerification(parsedStudents, targetClass);
      e.target.value = "";
    } catch (err: any) {
      setLogMsg("❌ " + err.message);
      toast("❌ Import Error: " + err.message, "error");
      e.target.value = "";
    }
  };

  // Student Import from Pasted Text (JSON / CSV / TSV)
  const handleImportStudentsText = async () => {
    if (!pastedText.trim()) {
      toast("⚠️ សូមបញ្ចូល/បិទអត្ថបទ JSON ឬ CSV ជាមុនសិន", "error");
      return;
    }
    setLogMsg("⏳ កំពុងវិភាគអត្ថបទ...");

    let parsedStudents: Omit<Student, "id">[] = [];
    const trimmed = pastedText.trim();
    let isJson = false;

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const jsonObj = JSON.parse(trimmed);
        isJson = true;
        const list = Array.isArray(jsonObj) ? jsonObj : jsonObj.students || jsonObj.data || [jsonObj];
        for (const item of list) {
          const s = parseStudentFromObject(item);
          if (s) parsedStudents.push(s);
        }
      } catch (e) {
        isJson = false;
      }
    }

    if (!isJson) {
      let rawRows: string[][] = [];
      if (trimmed.includes(";") && !trimmed.includes(",")) {
        rawRows = trimmed
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .split("\n")
          .filter((l) => l.trim())
          .map((l) => l.split(";").map((c) => c.replace(/^"|"$/g, "").trim()));
      } else {
        rawRows = parseCSV(trimmed);
      }
      parsedStudents = parseRowsToStudents(rawRows);
    }

    if (parsedStudents.length === 0) {
      setLogMsg("❌ រកមិនឃើញទិន្នន័យសិស្សត្រឹមត្រូវក្នុងអត្ថបទឡើយ (សូមពិនិត្យមើល Format ឈ្មោះ/គោត្តនាម)");
      toast("❌ រកមិនឃើញទិន្នន័យសិស្សទេ", "error");
      return;
    }

    await triggerStudentVerification(parsedStudents, targetClass);
  };

  // Helper to parse Candidate string or URL payload into Student object
  const parseCandidateString = (rawStr: string, fallbackClass: string): Omit<Student, "id"> | null => {
    if (!rawStr) return null;
    let text = rawStr.trim();
    try {
      if (text.includes("%")) {
        text = decodeURIComponent(text);
      }
    } catch {}

    // Extract query parameter if it's a Google or web URL e.g. https://...?q=PLP2026_CANDIDATE...
    if (text.includes("q=")) {
      const qMatch = text.match(/q=([^&]+)/);
      if (qMatch) {
        try {
          text = decodeURIComponent(qMatch[1]);
        } catch {
          text = qMatch[1];
        }
      }
    }

    const fields: Record<string, string> = {};
    const parts = text.split(/[|\n&]/);
    for (const part of parts) {
      const colonIdx = part.indexOf(":");
      if (colonIdx > 0) {
        const key = part.slice(0, colonIdx).trim().toUpperCase();
        const val = part.slice(colonIdx + 1).trim();
        fields[key] = val;
      }
    }

    let lastName = fields["LASTNAME"] || fields["LAST_NAME"] || fields["FAMILY_NAME"] || fields["គោត្តនាម"] || "";
    let firstName = fields["FIRSTNAME"] || fields["FIRST_NAME"] || fields["GIVEN_NAME"] || fields["នាម"] || "";

    if ((!lastName || !firstName) && (fields["NAME"] || fields["FULLNAME"] || fields["FULL_NAME"] || fields["ឈ្មោះ"] || fields["ឈ្មោះសិស្ស"])) {
      const full = (fields["NAME"] || fields["FULLNAME"] || fields["FULL_NAME"] || fields["ឈ្មោះ"] || fields["ឈ្មោះសិស្ស"]).trim();
      const tokens = full.split(/\s+/);
      if (tokens.length >= 2) {
        lastName = lastName || tokens[0];
        firstName = firstName || tokens.slice(1).join(" ");
      } else if (tokens.length === 1) {
        lastName = lastName || tokens[0];
        firstName = firstName || "";
      }
    }

    if (!lastName && !firstName) return null;

    let genderStr = fields["GENDER"] || fields["SEX"] || fields["ភេទ"] || "ប្រុស";
    let gender: "ប្រុស" | "ស្រី" = "ប្រុស";
    if (genderStr.includes("ស្រី") || genderStr.toLowerCase().includes("f") || genderStr.includes("female")) {
      gender = "ស្រី";
    }

    const dob = fields["DOB"] || fields["BIRTH"] || fields["ថ្ងៃខែឆ្នាំកំណើត"] || fields["ថ្ងៃកំណើត"] || "";
    let age = fields["AGE"] || fields["អាយុ"] || "";
    if (dob && !age) age = String(calcAge(dob));

    const cls = fields["CLASS"] || fields["ថ្នាក់"] || fallbackClass;
    const code = fields["ID"] || fields["STUDENTID"] || fields["CODE"] || fields["អត្តលេខ"] || `${new Date().getFullYear()}-${cls}-01`;

    return {
      code,
      lastName,
      firstName,
      gender,
      dob,
      age,
      fatherName: fields["FATHER"] || fields["FATHERNAME"] || fields["ឈ្មោះឪពុក"] || fields["ឪពុក"] || "",
      fatherJob: fields["FATHERJOB"] || fields["មុខរបរឪពុក"] || "",
      motherName: fields["MOTHER"] || fields["MOTHERNAME"] || fields["ឈ្មោះម្តាយ"] || fields["ឈ្មោះម្ដាយ"] || fields["ម្តាយ"] || "",
      motherJob: fields["MOTHERJOB"] || fields["មុខរបរម្តាយ"] || "",
      village: fields["VILLAGE"] || fields["ភូមិ"] || "",
      commune: fields["COMMUNE"] || fields["ឃុំ"] || "",
      district: fields["DISTRICT"] || fields["ស្រុក"] || "",
      province: fields["PROVINCE"] || fields["ខេត្ត"] || "",
      phone: fields["PHONE"] || fields["TEL"] || fields["ទូរស័ព្ទ"] || "",
    };
  };

  // Student Import from URL or Identification Code (Auto-fetches & saves to Firebase)
  const handleImportStudentsUrlOrCode = async () => {
    const trimmed = urlOrCodeInput.trim();
    if (!trimmed) {
      toast("⚠️ សូមបញ្ចូល URL ឬ កូដសម្គាល់សិស្សជាមុនសិន", "error");
      return;
    }

    setIsFetchingUrl(true);
    setLogMsg("⏳ កំពុងទាញយកព័ត៌មានសិស្សពីប្រព័ន្ធខាងក្រៅ/URL...");

    try {
      let parsedStudents: Omit<Student, "id">[] = [];
      let destClass = targetClass;

      // Check if class is embedded in payload e.g. CLASS:5A
      const classMatch = trimmed.match(/(?:CLASS|ថ្នាក់)[:=]([0-9][A-Z]?)/i);
      if (classMatch && CLASSES.includes(classMatch[1].toUpperCase())) {
        destClass = classMatch[1].toUpperCase();
      }

      // 1. Try parsing candidate string payload
      const candidate = parseCandidateString(trimmed, destClass);
      if (candidate) {
        parsedStudents.push(candidate);
      }

      // 2. If no student parsed or if it's an HTTP URL, attempt fetch
      if (parsedStudents.length === 0 && (trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
        try {
          const resp = await fetch(trimmed, { mode: "cors" });
          if (resp.ok) {
            const textData = await resp.text();
            if (textData.trim().startsWith("[") || textData.trim().startsWith("{")) {
              const jsonObj = JSON.parse(textData);
              const list = Array.isArray(jsonObj) ? jsonObj : jsonObj.students || jsonObj.data || [jsonObj];
              for (const item of list) {
                const s = parseStudentFromObject(item);
                if (s) parsedStudents.push(s);
              }
            } else {
              const rawRows = parseCSV(textData);
              parsedStudents = parseRowsToStudents(rawRows);
            }
          }
        } catch (fetchErr) {
          console.warn("Direct HTTP fetch failed or was blocked by CORS:", fetchErr);
        }
      }

      if (parsedStudents.length === 0) {
        setLogMsg("❌ ពុំអាចបំប្លែងទិន្នន័យសិស្សពី URL ឬ កូដនេះបានទេ។ សូមពិនិត្យមើល Format ឡើងវិញ។");
        toast("❌ រកមិនឃើញទិន្នន័យសិស្សទេ", "error");
        setIsFetchingUrl(false);
        return;
      }

      // Trigger verification before saving
      await triggerStudentVerification(parsedStudents, destClass);
      setUrlOrCodeInput("");
    } catch (err: any) {
      setLogMsg("❌ " + err.message);
      toast("❌ Import Error: " + err.message, "error");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Helper to parse Scores from JSON, Excel, or CSV
  const parseScoresFromInput = (
    input: any,
    studentsList: Student[],
    existingScoresMap: Record<string, ScoreMap>
  ): { newScoresMap: Record<string, ScoreMap>; updatedCount: number } => {
    const newScoresMap: Record<string, ScoreMap> = { ...existingScoresMap };
    let updatedCount = 0;

    if (!studentsList.length) return { newScoresMap, updatedCount: 0 };

    const nameToStudentMap: Record<string, Student> = {};
    studentsList.forEach((s, idx) => {
      nameToStudentMap[`${s.lastName}_${s.firstName}`.trim().toLowerCase()] = s;
      nameToStudentMap[`${s.lastName} ${s.firstName}`.trim().toLowerCase()] = s;
      nameToStudentMap[`${s.firstName} ${s.lastName}`.trim().toLowerCase()] = s;
      nameToStudentMap[s.id] = s;
      nameToStudentMap[String(idx)] = s;
      nameToStudentMap[String(idx + 1)] = s;
    });

    let jsonParsed: any = null;
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          jsonParsed = JSON.parse(trimmed);
        } catch (e) {
          jsonParsed = null;
        }
      }
    } else if (typeof input === "object" && !Array.isArray(input)) {
      jsonParsed = input;
    } else if (Array.isArray(input) && input.length > 0 && typeof input[0] === "object" && !Array.isArray(input[0])) {
      jsonParsed = input;
    }

    // 1. Process JSON
    if (jsonParsed) {
      // Check if it's a deep Firebase export (e.g., plp2026 -> 1A -> scores -> s1 -> [monthIndex] -> { studentId: { subject: score } })
      let scoreObjectsToSearch: any[] = [jsonParsed];

      // Recursively unnest if object has keys like "plp2026", "1A", "scores", "s1"
      let depth = 0;
      let candidates: any[] = [jsonParsed];
      while (depth < 6) {
        const nextCandidates: any[] = [];
        for (const cand of candidates) {
          if (cand && typeof cand === "object" && !Array.isArray(cand)) {
            Object.values(cand).forEach((v) => {
              if (v && typeof v === "object") {
                nextCandidates.push(v);
              }
            });
          } else if (Array.isArray(cand)) {
            cand.forEach((v) => {
              if (v && typeof v === "object") nextCandidates.push(v);
            });
          }
        }
        if (nextCandidates.length > 0) {
          scoreObjectsToSearch.push(...nextCandidates);
          candidates = nextCandidates;
        } else {
          break;
        }
        depth++;
      }

      // Find the object or array that contains student scores (keys starting with "-" like Firebase push ID, or matching student IDs/names or index numbers)
      let items: { key?: string; data: any }[] = [];

      for (const obj of scoreObjectsToSearch) {
        if (!obj || typeof obj !== "object") continue;

        if (Array.isArray(obj)) {
          // Check if array elements contain score objects
          const valid = obj.some(
            (item) =>
              item &&
              typeof item === "object" &&
              Object.values(item).some(
                (val) => val && typeof val === "object" && Object.keys(val).some((k) => SUBJECTS.includes(k) || k.includes("សមត្ថភាព") || k.includes("ចំនួន"))
              )
          );
          if (valid) {
            obj.forEach((item, idx) => {
              if (item && typeof item === "object") {
                Object.entries(item).forEach(([k, v]) => {
                  items.push({ key: k, data: v });
                });
              }
            });
            break;
          }
        } else {
          // Object map
          const entries = Object.entries(obj);
          const looksLikeScoreMap = entries.some(([k, v]) => {
            if (v && typeof v === "object") {
              const subKeys = Object.keys(v);
              return subKeys.some((sk) => SUBJECTS.includes(sk) || sk.includes("សមត្ថភាព") || sk.includes("ចំនួន") || sk.includes("អាន") || sk.includes("សរសេរ"));
            }
            return false;
          });

          if (looksLikeScoreMap) {
            entries.forEach(([k, v]) => {
              if (v && typeof v === "object") {
                items.push({ key: k, data: v });
              }
            });
            break;
          }
        }
      }

      // Fallback if generic items mapping
      if (items.length === 0) {
        if (Array.isArray(jsonParsed)) {
          items = jsonParsed.map((item, idx) => ({ key: String(idx), data: item }));
        } else if (typeof jsonParsed === "object") {
          if (Array.isArray(jsonParsed.scores)) {
            items = jsonParsed.scores.map((item: any, idx: number) => ({ key: String(idx), data: item }));
          } else if (Array.isArray(jsonParsed.data)) {
            items = jsonParsed.data.map((item: any, idx: number) => ({ key: String(idx), data: item }));
          } else {
            items = Object.entries(jsonParsed).map(([k, v]) => ({ key: k, data: v }));
          }
        }
      }

      items.forEach((itemObj, index) => {
        const data = itemObj.data;
        if (!data || typeof data !== "object") return;

        let targetStu: Student | undefined;

        const ln = String(data.lastName || data.last_name || data["គោត្តនាម"] || "").trim();
        const fn = String(data.firstName || data.first_name || data["នាម"] || "").trim();
        const full = String(data.fullName || data.full_name || data.name || data["ឈ្មោះ"] || "").trim();

        if (ln && fn) {
          targetStu = nameToStudentMap[`${ln}_${fn}`.toLowerCase()] || nameToStudentMap[`${ln} ${fn}`.toLowerCase()];
        }
        if (!targetStu && full) {
          targetStu = nameToStudentMap[full.toLowerCase()];
        }
        if (!targetStu && itemObj.key) {
          targetStu = nameToStudentMap[itemObj.key.toLowerCase()] || nameToStudentMap[itemObj.key];
        }
        // Match by index order (if Firebase student push IDs match student order)
        if (!targetStu && index < studentsList.length) {
          targetStu = studentsList[index];
        }

        if (!targetStu) return;

        const sid = targetStu.id;
        if (!newScoresMap[sid]) newScoresMap[sid] = {};

        const scoresDict = data.scores && typeof data.scores === "object" ? data.scores : data;

        let scoreSetCount = 0;
        Object.entries(scoresDict).forEach(([key, val]) => {
          if (["lastName", "firstName", "fullName", "name", "gender", "dob", "age", "id", "key", "គោត្តនាម", "នាម", "ឈ្មោះ", "ភេទ", "អាយុ", "savedAt", "khmerAvg", "mathAvg"].includes(key)) return;
          const numVal = typeof val === "number" ? val : parseFloat(String(val));
          if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
            newScoresMap[sid][key] = numVal;
            scoreSetCount++;
          }
        });

        if (scoreSetCount > 0) updatedCount++;
      });

      return { newScoresMap, updatedCount };
    }

    // 2. Process CSV / Excel rows
    if (Array.isArray(input) && (input.length === 0 || Array.isArray(input[0]))) {
      const rawRows = input as string[][];
      if (rawRows.length < 2) return { newScoresMap, updatedCount: 0 };

      let headerRowIdx = 0;
      for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
        const rowStr = rawRows[r].join(" ").toLowerCase();
        if (rowStr.includes("គោត្តនាម") || rowStr.includes("នាម") || rowStr.includes("ឈ្មោះ") || rowStr.includes("lastname")) {
          headerRowIdx = r;
          break;
        }
      }

      const header = rawRows[headerRowIdx].map((h) => h.trim());
      let lastIdx = header.findIndex((h) => h === "គោត្តនាម" || h.toLowerCase() === "lastname");
      if (lastIdx === -1) lastIdx = header.findIndex((h) => h.includes("គោត្តនាម") || h.toLowerCase().includes("lastname"));

      let firstIdx = header.findIndex((h) => h === "នាម" || h.toLowerCase() === "firstname");
      if (firstIdx === -1) firstIdx = header.findIndex((h) => (h.includes("នាម") && !h.includes("គោត្តនាម")) || h.toLowerCase().includes("firstname"));

      let fullIdx = header.findIndex((h) => h === "ឈ្មោះ" || h === "គោត្តនាម-នាម" || h === "គោត្តនាម និងនាម" || h.toLowerCase() === "fullname" || h.toLowerCase() === "name");
      if (fullIdx === -1) fullIdx = header.findIndex((h) => h.includes("ឈ្មោះ") || h.toLowerCase().includes("fullname") || h.toLowerCase().includes("name"));

      const colSubjectMap: { colIdx: number; subjectName: string }[] = [];
      header.forEach((hName, idx) => {
        if (idx === lastIdx || idx === firstIdx || idx === fullIdx) return;
        if (["ល.រ", "រៀង", "id", "gender", "ភេទ", "អាយុ", "age", "មធ្យមភាគ", "ចំណាត់ថ្នាក់", "និទ្ទេស", "លទ្ធផល", "ពិន្ទុសរុប"].some((k) => hName.toLowerCase().includes(k))) return;
        if (hName) {
          colSubjectMap.push({ colIdx: idx, subjectName: hName });
        }
      });

      for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.every((c) => !c)) continue;

        let targetStu: Student | undefined;
        const ln = lastIdx >= 0 ? row[lastIdx] : "";
        const fn = firstIdx >= 0 ? row[firstIdx] : "";
        const full = fullIdx >= 0 ? row[fullIdx] : "";

        if (ln && fn) {
          targetStu = nameToStudentMap[`${ln}_${fn}`.trim().toLowerCase()] || nameToStudentMap[`${ln} ${fn}`.trim().toLowerCase()];
        }
        if (!targetStu && full) {
          targetStu = nameToStudentMap[full.trim().toLowerCase()];
        }

        const stuIdx = r - headerRowIdx - 1;
        if (!targetStu && stuIdx < studentsList.length) {
          targetStu = studentsList[stuIdx];
        }

        if (!targetStu) continue;
        const sid = targetStu.id;
        if (!newScoresMap[sid]) newScoresMap[sid] = {};

        let hasScored = false;
        colSubjectMap.forEach(({ colIdx, subjectName }) => {
          const valStr = row[colIdx];
          if (valStr !== undefined && valStr !== "") {
            const numVal = parseFloat(valStr);
            if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
              newScoresMap[sid][subjectName] = numVal;
              hasScored = true;
            }
          }
        });

        if (hasScored) updatedCount++;
      }

      return { newScoresMap, updatedCount };
    }

    return { newScoresMap, updatedCount };
  };

  // Scores Export CSV
  const handleExportScoresCSV = () => {
    if (!students.length) {
      toast("⚠️ មិនមានសិស្ស", "error");
      return;
    }
    const headers = ["គោត្តនាម", "នាម", "ភេទ", ...SUBJECTS];
    const rows = [headers.join(",")];
    students.forEach((s) => {
      const subScores = SUBJECTS.map((subj) => scoresMap[s.id]?.[subj] ?? "");
      rows.push([s.lastName, s.firstName, s.gender, ...subScores].join(","));
    });
    const semLabel = SEMESTERS.find((s) => s.id === semester)?.label || semester;
    downloadCSV(`scores_${selClass}_${semLabel}_${MONTHS[selMonth]}.csv`, rows);
    setLogMsg(`✅ Export ពិន្ទុ ${students.length}នាក់`);
    toast("📤 Export ពិន្ទុ CSV រួចរាល់");
  };

  // Scores Import File (.json / .xlsx / .xls / .csv)
  const handleImportScoresFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogMsg("⏳ កំពុងនាំចូលពិន្ទុពី File...");
    try {
      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const { newScoresMap, updatedCount } = parseScoresFromInput(text, students, scoresMap);
        if (updatedCount === 0) {
          setLogMsg("⚠️ មិនអាចនាំចូលពិន្ទុបានទេ (សូមពិនិត្យមើលឈ្មោះសិស្ស ឬ Format មុខវិជ្ជា)");
          toast("⚠️ មិនអាចនាំចូលពិន្ទុបានទេ", "error");
          e.target.value = "";
          return;
        }
        await onImportScores(newScoresMap);
        setLogMsg(`✅ នាំចូលពិន្ទុសិស្ស ${updatedCount} នាក់ ដោយជោគជ័យ!`);
        toast(`✅ នាំចូលពិន្ទុសិស្ស ${updatedCount} នាក់ រួចរាល់!`);
        e.target.value = "";
        return;
      }

      let rawRows: string[][] = [];
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        rawRows = jsonRows.map((r) => r.map((c) => String(c ?? "").trim()));
      } else {
        const text = await file.text();
        if (text.includes(";") && !text.includes(",")) {
          rawRows = text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n")
            .filter((l) => l.trim())
            .map((l) => l.split(";").map((c) => c.replace(/^"|"$/g, "").trim()));
        } else {
          rawRows = parseCSV(text);
        }
      }

      const { newScoresMap, updatedCount } = parseScoresFromInput(rawRows, students, scoresMap);

      if (updatedCount === 0) {
        setLogMsg("⚠️ មិនអាចនាំចូលពិន្ទុបានទេ (សូមពិនិត្យមើល Header មុខវិជ្ជា)");
        toast("⚠️ មិនអាចនាំចូលពិន្ទុបានទេ", "error");
        e.target.value = "";
        return;
      }

      await onImportScores(newScoresMap);
      setLogMsg(`✅ នាំចូលពិន្ទុសិស្ស ${updatedCount} នាក់ ដោយជោគជ័យ!`);
      toast(`✅ នាំចូលពិន្ទុសិស្ស ${updatedCount} នាក់ រួចរាល់!`);
      e.target.value = "";
    } catch (err: any) {
      setLogMsg("❌ " + err.message);
      toast("❌ Import Error: " + err.message, "error");
      e.target.value = "";
    }
  };

  // Scores Import Text (Pasted JSON / CSV)
  const handleImportScoresText = async () => {
    if (!pastedText.trim()) {
      toast("⚠️ សូមបញ្ចូល/បិទអត្ថបទ JSON ឬ CSV ពិន្ទុជាមុនសិន", "error");
      return;
    }
    setLogMsg("⏳ កំពុងវិភាគពិន្ទុពីអត្ថបទ...");

    const trimmed = pastedText.trim();
    let { newScoresMap, updatedCount } = parseScoresFromInput(trimmed, students, scoresMap);

    if (updatedCount === 0 && !trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      // Try parsing CSV rows
      let rawRows: string[][] = [];
      if (trimmed.includes(";") && !trimmed.includes(",")) {
        rawRows = trimmed
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .split("\n")
          .filter((l) => l.trim())
          .map((l) => l.split(";").map((c) => c.replace(/^"|"$/g, "").trim()));
      } else {
        rawRows = parseCSV(trimmed);
      }
      const res = parseScoresFromInput(rawRows, students, scoresMap);
      newScoresMap = res.newScoresMap;
      updatedCount = res.updatedCount;
    }

    if (updatedCount === 0) {
      setLogMsg("❌ មិនអាចរកឃើញទិន្នន័យពិន្ទុក្នុងអត្ថបទឡើយ");
      toast("❌ មិនអាចនាំចូលពិន្ទុបានទេ", "error");
      return;
    }

    await onImportScores(newScoresMap);
    setLogMsg(`✅ នាំចូលពិន្ទុសិស្ស ${updatedCount} នាក់ ដោយជោគជ័យ!`);
    toast(`✅ នាំចូលពិន្ទុសិស្ស ${updatedCount} នាក់ រួចរាល់!`);
    setPastedText("");
  };

  // Export XLSX Scores
  const handleExportScoresXLSX = () => {
    const ranked = buildRankedList(students, scoresMap);
    const semLabel = SEMESTERS.find((s) => s.id === semester)?.label || semester;
    const wb = XLSX.utils.book_new();
    const headers = ["ល.រ", "ចំណាត់ថ្នាក់", "គោត្តនាម", "នាម", "ភេទ", "អាយុ", ...SUBJECTS, "ពិន្ទុសរុប", "មធ្យមភាគ", "លទ្ធផល", "និទ្ទេស"];
    const rows: (string | number)[][] = [headers];

    ranked.forEach((s, i) => {
      const avg = getAvg(s.id, students, scoresMap);
      const total = getTotal(s.id, scoresMap);
      const g = gradeOf(avg);
      const subScores = SUBJECTS.map((subj) => {
        const v = scoresMap[s.id]?.[subj];
        return v !== "" && v !== undefined ? Number(v) : "";
      });
      rows.push([i + 1, s._rank || i + 1, s.lastName, s.firstName, s.gender, s.age || "", ...subScores, total, Number(fmtAvg(avg)), resultOf(avg), g.l]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `ពិន្ទុ_${MONTHS[selMonth]}`);
    XLSX.writeFile(wb, `scores_${selClass}_${semLabel}_${MONTHS[selMonth]}.xlsx`);
    setLogMsg(`✅ Export XLSX ${students.length}នាក់`);
    toast("📊 Export XLSX ដោយជោគជ័យ");
  };

  // Export All Data XLSX
  const handleExportAllXLSX = () => {
    const ranked = buildRankedList(students, scoresMap);
    const wb = XLSX.utils.book_new();

    // Sheet 1: Students
    const hStu = ["ល.រ", "គោត្តនាម", "នាម", "ភេទ", "ថ្ងៃខែឆ្នាំកំណើត", "អាយុ", "ឈ្មោះឪពុក", "មុខរបរឪពុក", "ឈ្មោះម្តាយ", "មុខរបរម្តាយ", "ភូមិ", "ឃុំ", "ស្រុក", "ខេត្ត", "ទូរស័ព្ទ"];
    const rStu: (string | number)[][] = [hStu];
    students.forEach((s, i) => {
      rStu.push([i + 1, s.lastName, s.firstName, s.gender, s.dob || "", s.age || "", s.fatherName || "", s.fatherJob || "", s.motherName || "", s.motherJob || "", s.village || "", s.commune || "", s.district || "", s.province || "", s.phone || ""]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rStu), "ព័ត៌មានសិស្ស");

    // Sheet 2: Scores
    const hSco = ["ល.រ", "ចំណាត់ថ្នាក់", "គោត្តនាម", "នាម", "ភេទ", ...SUBJECTS, "ពិន្ទុសរុប", "មធ្យមភាគ", "លទ្ធផល", "និទ្ទេស"];
    const rSco: (string | number)[][] = [hSco];
    ranked.forEach((s, i) => {
      const avg = getAvg(s.id, students, scoresMap);
      const g = gradeOf(avg);
      rSco.push([i + 1, s._rank || i + 1, s.lastName, s.firstName, s.gender, ...SUBJECTS.map((subj) => scoresMap[s.id]?.[subj] ?? ""), getTotal(s.id, scoresMap), Number(fmtAvg(avg)), resultOf(avg), g.l]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rSco), `ពិន្ទុ_${MONTHS[selMonth]}`);

    // Sheet 3: Attendance
    const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
    const hAtt = ["ល.រ", "គោត្តនាម-នាម", "ភេទ", ...days, "ច្បាប់(P)", "អត់(A)"];
    const rAtt: (string | number)[][] = [hAtt];
    students.forEach((s, i) => {
      const p = days.filter((d) => attendanceMap[s.id]?.[+d] === "P").length;
      const a = days.filter((d) => attendanceMap[s.id]?.[+d] === "A").length;
      rAtt.push([i + 1, `${s.lastName} ${s.firstName}`, s.gender, ...days.map((d) => attendanceMap[s.id]?.[+d] || ""), p, a]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rAtt), "វត្តមាន");

    XLSX.writeFile(wb, `plp2026_full_backup_${selClass}.xlsx`);
    setLogMsg(`✅ Export All Data XLSX រួចរាល់`);
    toast("📋 Export ទាំងអស់ XLSX រួចរាល់");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl p-5 w-full shadow-2xl border border-slate-100 animate-fade-in max-h-[92vh] overflow-y-auto ${verificationState ? "max-w-3xl" : "max-w-lg"}`}>
        
        {/* Verification Screen Modal View */}
        {verificationState ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-blue-950 text-base flex items-center gap-2">
                  <span>🔍</span> ផ្ទៀងផ្ទាត់ទិន្នន័យសិស្ស និងត្រួតពិនិត្យភាពស្ទួន
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  សម្រាប់ <strong>ថ្នាក់ទី {verificationState.targetClass}</strong> • ពិនិត្យចំនួនសិស្ស និងជ្រើសរើសជម្រើសនាំចូល
                </p>
              </div>
              <button
                onClick={() => setVerificationState(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* 1. Comparison & Target Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Total Card */}
              <div className={`p-3.5 rounded-2xl border ${
                verificationState.actualTotal === verificationState.expectedTotal
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                  : "bg-amber-50/70 border-amber-200 text-amber-950"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span>👥</span> ចំនួនសិស្សសរុប (Total)
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    verificationState.actualTotal === verificationState.expectedTotal
                      ? "bg-emerald-200 text-emerald-800"
                      : "bg-amber-200 text-amber-900"
                  }`}>
                    {verificationState.actualTotal === verificationState.expectedTotal ? "✅ ត្រឹមត្រូវ" : "⚠️ មិនស៊ីគ្នា"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <div className="text-2xl font-black text-slate-900">
                    {verificationState.actualTotal} <span className="text-xs font-medium text-slate-500">នាក់ក្នុង File</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    (រំពឹងទុក៖ <strong>{verificationState.expectedTotal}</strong> នាក់)
                  </div>
                </div>
              </div>

              {/* Female Card */}
              <div className={`p-3.5 rounded-2xl border ${
                verificationState.actualFemale === verificationState.expectedFemale
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                  : "bg-amber-50/70 border-amber-200 text-amber-950"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span>👧</span> ចំនួនសិស្សស្រី (Female)
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    verificationState.actualFemale === verificationState.expectedFemale
                      ? "bg-emerald-200 text-emerald-800"
                      : "bg-amber-200 text-amber-900"
                  }`}>
                    {verificationState.actualFemale === verificationState.expectedFemale ? "✅ ត្រឹមត្រូវ" : "⚠️ មិនស៊ីគ្នា"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <div className="text-2xl font-black text-slate-900">
                    {verificationState.actualFemale} <span className="text-xs font-medium text-slate-500">នាក់ក្នុង File</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    (រំពឹងទុក៖ <strong>{verificationState.expectedFemale}</strong> នាក់)
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Anomaly Alerts */}
            {(() => {
              const classDupCount = verificationState.rows.filter((r) => r.isDuplicateInClass).length;
              const fileDupCount = verificationState.rows.filter((r) => r.isDuplicateInFile).length;
              const isCountMismatch =
                verificationState.actualTotal !== verificationState.expectedTotal ||
                verificationState.actualFemale !== verificationState.expectedFemale;

              if (classDupCount > 0 || fileDupCount > 0 || isCountMismatch) {
                return (
                  <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-amber-900 text-xs space-y-1">
                    <div className="font-extrabold flex items-center gap-1.5 text-amber-950">
                      <span>⚠️</span> រកឃើញចំណុចគួរកត់សម្គាល់ ឬភាពមិនប្រក្រតី៖
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 pl-1">
                      {classDupCount > 0 && (
                        <li>
                          រកឃើញឈ្មោះដូចគ្នានឹងសិស្សមានស្រាប់ក្នុងថ្នាក់ <strong>{classDupCount}</strong> នាក់
                        </li>
                      )}
                      {fileDupCount > 0 && (
                        <li>
                          រកឃើញឈ្មោះស្ទួនគ្នាក្នុង File ខ្លួនឯង <strong>{fileDupCount}</strong> នាក់
                        </li>
                      )}
                      {isCountMismatch && (
                        <li>
                          ចំនួនសិស្សក្នុង File មិនត្រូវគ្នានឹងចំនួនរំពឹងទុក (សរុប {verificationState.actualTotal}/{verificationState.expectedTotal} នាក់, ស្រី {verificationState.actualFemale}/{verificationState.expectedFemale} នាក់)
                        </li>
                      )}
                    </ul>
                  </div>
                );
              }
              return (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-emerald-900 text-xs flex items-center gap-2">
                  <span>✅</span> ព័ត៌មានផ្ទៀងផ្ទាត់ត្រឹមត្រូវល្អ! មិនមានឈ្មោះស្ទួនក្នុងថ្នាក់ឡើយ។
                </div>
              );
            })()}

            {/* 3. Strategy Selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <span>🎛️</span> ជ្រើសរើសវិធីសាស្ត្រនាំចូល (Import Mode) ៖
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* Mode 1: Update matching */}
                <label
                  onClick={() => setVerificationState((prev) => (prev ? { ...prev, strategy: "update_matching" } : null))}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    verificationState.strategy === "update_matching"
                      ? "bg-blue-50 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-500"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="strategy"
                      checked={verificationState.strategy === "update_matching"}
                      onChange={() => {}}
                      className="text-blue-600"
                    />
                    <span className="text-xs font-extrabold">🛠️ ជំនួសអ្នកស្ទួន + បន្ថែម</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 leading-tight">
                    ធ្វើបច្ចុប្បន្នភាពលើសិស្សដែលមានឈ្មោះដូចគ្នា និងបន្ថែមសិស្សថ្មី
                  </span>
                </label>

                {/* Mode 2: Add all */}
                <label
                  onClick={() => setVerificationState((prev) => (prev ? { ...prev, strategy: "add" } : null))}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    verificationState.strategy === "add"
                      ? "bg-blue-50 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-500"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="strategy"
                      checked={verificationState.strategy === "add"}
                      onChange={() => {}}
                      className="text-blue-600"
                    />
                    <span className="text-xs font-extrabold">➕ បន្ថែមទាំងអស់ (Add)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 leading-tight">
                    បន្ថែមទិន្នន័យទាំងអស់ជាសិស្សថ្មី ដោយមិនលុបទិន្នន័យចាស់
                  </span>
                </label>

                {/* Mode 3: Replace all */}
                <label
                  onClick={() => setVerificationState((prev) => (prev ? { ...prev, strategy: "replace_all" } : null))}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    verificationState.strategy === "replace_all"
                      ? "bg-rose-50 border-rose-500 text-rose-950 shadow-xs ring-1 ring-rose-500"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="strategy"
                      checked={verificationState.strategy === "replace_all"}
                      onChange={() => {}}
                      className="text-rose-600"
                    />
                    <span className="text-xs font-extrabold text-rose-800">🔄 ជំនួសសិស្សទាំងអស់</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 leading-tight">
                    លុបទិន្នន័យសិស្សចាស់ទាំងអស់ក្នុងថ្នាក់នេះ ហើយដាក់ទិន្នន័យថ្មីជំនួស
                  </span>
                </label>
              </div>
            </div>

            {/* 4. Student Table Preview */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-700">
                  📋 បញ្ជីសិស្សត្រូវនាំចូល ({verificationState.rows.filter((r) => r.selected).length}/{verificationState.rows.length} នាក់)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = verificationState.rows.every((r) => r.selected);
                      setVerificationState((prev) =>
                        prev
                          ? {
                              ...prev,
                              rows: prev.rows.map((r) => ({ ...r, selected: !allSelected })),
                            }
                          : null
                      );
                    }}
                    className="text-[11px] text-blue-600 hover:underline font-bold"
                  >
                    {verificationState.rows.every((r) => r.selected) ? "ដោះការជ្រើសរើសទាំងអស់" : "ជ្រើសរើសទាំងអស់"}
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 font-bold text-[11px]">
                    <tr>
                      <th className="p-2 w-8 text-center">✓</th>
                      <th className="p-2 w-10 text-center">ល.រ</th>
                      <th className="p-2">គោត្តនាម-នាម</th>
                      <th className="p-2 w-14 text-center">ភេទ</th>
                      <th className="p-2">ថ្ងៃកំណើត</th>
                      <th className="p-2">ទីកន្លែង/ភូមិ</th>
                      <th className="p-2 text-center">ស្ថានភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {verificationState.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-blue-50/50 transition ${
                          !row.selected ? "opacity-40 bg-slate-50" : ""
                        } ${row.isDuplicateInClass ? "bg-amber-50/40" : ""}`}
                      >
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setVerificationState((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      rows: prev.rows.map((r, rIdx) => (rIdx === idx ? { ...r, selected: checked } : r)),
                                    }
                                  : null
                              );
                            }}
                            className="rounded text-blue-600"
                          />
                        </td>
                        <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900">
                          {row.student.lastName} {row.student.firstName}
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.student.gender === "ស្រី" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {row.student.gender}
                          </span>
                        </td>
                        <td className="p-2 text-slate-600 font-mono text-[11px]">{row.student.dob || "-"}</td>
                        <td className="p-2 text-slate-600 text-[11px]">
                          {row.student.village || teacher?.village || "-"}
                        </td>
                        <td className="p-2 text-center">
                          {row.isDuplicateInClass ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold">
                              ⚠️ ស្ទួនក្នុងថ្នាក់
                            </span>
                          ) : row.isDuplicateInFile ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-extrabold">
                              🔄 ស្ទួនក្នុង File
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold">
                              ✨ ថ្មី
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Verification Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVerificationState(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ← ត្រឡប់ក្រោយ
              </button>
              <button
                type="button"
                disabled={isSubmitting || verificationState.rows.filter((r) => r.selected).length === 0}
                onClick={handleConfirmImport}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-extrabold py-2.5 text-xs rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">⏳</span> កំពុងនាំចូលទិន្នន័យ...
                  </>
                ) : (
                  <>
                    🚀 បញ្ជាក់នាំចូលសិស្ស ({verificationState.rows.filter((r) => r.selected).length} នាក់) ទៅកាន់ ថ្នាក់ {verificationState.targetClass}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Normal Import/Export View */
          <>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-blue-950 text-base flex items-center gap-2">
                <span>📦</span> Import / Export Data
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1">
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setTab("stu")}
                className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition ${
                  tab === "stu"
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                👤 នាំចូលសិស្ស (Students)
              </button>
              <button
                onClick={() => setTab("sco")}
                className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition ${
                  tab === "sco"
                    ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                📝 ពិន្ទុ (Scores)
              </button>
            </div>

            {tab === "stu" ? (
              <div className="space-y-3">
                {/* Target Class Selector */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-3 rounded-2xl shadow-inner">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                      <span>🏫</span> ជ្រើសរើសថ្នាក់ដែលត្រូវបញ្ចូលទិន្នន័យ៖
                    </label>
                    <span className="text-[10px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded-full font-bold">
                      {targetClass ? `ថ្នាក់ទី ${targetClass}` : "មិនទាន់ជ្រើស"}
                    </span>
                  </div>
                  <select
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    className="w-full mt-1.5 bg-slate-950 border border-slate-700 text-white font-extrabold text-sm rounded-xl p-2.5 outline-none focus:border-blue-400 cursor-pointer"
                  >
                    {CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        🎓 ថ្នាក់ទី {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Expected Counts Card */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span>👥</span> កំណត់ផ្ទៀងផ្ទាត់ចំនួនសិស្ស (Target Student Counts)
                    </span>
                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                      ស្វ័យប្រវត្តិតាម Profile គ្រូ
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">សិស្សសរុប (នាក់)</label>
                      <input
                        type="number"
                        min="0"
                        value={expectedTotalInput || ""}
                        onChange={(e) => setExpectedTotalInput(Number(e.target.value) || 0)}
                        placeholder="ឧ. 35"
                        className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-xl focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">សិស្សស្រី (នាក់)</label>
                      <input
                        type="number"
                        min="0"
                        value={expectedFemaleInput || ""}
                        onChange={(e) => setExpectedFemaleInput(Number(e.target.value) || 0)}
                        placeholder="ឧ. 18"
                        className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-xl focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Import Mode Toggle */}
                <div className="flex rounded-xl bg-slate-100 p-1 text-[11px] font-bold gap-1">
                  <button
                    type="button"
                    onClick={() => setImportMode("file")}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      importMode === "file" ? "bg-white text-blue-700 shadow-xs font-extrabold" : "text-slate-600"
                    }`}
                  >
                    📁 Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("text")}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      importMode === "text" ? "bg-white text-blue-700 shadow-xs font-extrabold" : "text-slate-600"
                    }`}
                  >
                    📋 បិទអត្ថបទ (Paste)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("url")}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      importMode === "url" ? "bg-white text-blue-700 shadow-xs font-extrabold" : "text-slate-600"
                    }`}
                  >
                    🌐 URL / កូដសិស្ស
                  </button>
                </div>

                {importMode === "file" && (
                  <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    <div className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      💡 គាំទ្រ File Excel <strong>(.xlsx, .xls)</strong>, <strong>CSV</strong>, និង <strong>JSON</strong> ។
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExportStudentsCSV}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2.5 rounded-xl text-xs transition"
                      >
                        📤 Export CSV
                      </button>
                      <button
                        onClick={handleExportStudentsXLSX}
                        className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold py-2.5 rounded-xl text-xs transition"
                      >
                        📊 Export XLSX
                      </button>
                      <label className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs text-center cursor-pointer shadow-md shadow-emerald-500/20 transition">
                        📥 ជ្រើសរើស File...
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls,.json"
                          onChange={handleImportStudentsFile}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerStudentVerification(SAMPLE_STUDENTS, targetClass)}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span>⚡</span>
                      <span>បញ្ចូលទិន្នន័យគំរូសិស្ស ១០ នាក់ភ្លាមៗ (Sample Data)</span>
                    </button>
                  </div>
                )}

                {importMode === "text" && (
                  <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">📋 ចម្លង & បិទអត្ថបទ JSON ឬ CSV ៖</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPastedText(`[
  {
    "lastName": "កា",
    "firstName": "បូប្ផា",
    "gender": "ស្រី",
    "dob": "1/9/2015",
    "fatherName": "អ៊ុច កុយ",
    "motherName": "ស្រិប ឡាំ",
    "village": "ភូមិរោគ",
    "commune": "ឃុំស្ពានស្រែង",
    "district": "ស្រុកភ្នំស្រុក",
    "province": "ខេត្តបន្ទាយមានជ័យ"
  }
]`);
                        }}
                        className="text-[10px] text-blue-600 hover:underline font-extrabold"
                      >
                        + គំរូ JSON
                      </button>
                    </div>

                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={`បិទអត្ថបទ JSON ឬ CSV នៅទីនេះ...

ឧទាហរណ៍ CSV ៖
គោត្តនាម,នាម,ភេទ,ថ្ងៃខែឆ្នាំកំណើត,ឈ្មោះឪពុក,ឈ្មោះម្តាយ,ភូមិ,ឃុំ,ស្រុក,ខេត្ត
កា,បូប្ផា,ស្រី,1/9/2015,អ៊ុច កុយ,ស្រិប ឡាំ,ភូមិរោគ,ឃុំស្ពានស្រែង,ស្រុកភ្នំស្រុក,ខេត្តបន្ទាយមានជ័យ`}
                      rows={6}
                      className="w-full font-mono text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:border-blue-500 outline-none leading-relaxed text-slate-800"
                    />

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPastedText("")}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                      >
                        សម្អាត
                      </button>
                      <button
                        type="button"
                        onClick={handleImportStudentsText}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 text-xs rounded-xl shadow-md shadow-blue-500/20 transition"
                      >
                        📥 ពិនិត្យ & ផ្ទៀងផ្ទាត់សិស្ស (ថ្នាក់ {targetClass})
                      </button>
                    </div>
                  </div>
                )}

                {importMode === "url" && (
                  <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">🌐 ដាក់ URL ឬ កូដសម្គាល់សិស្ស ៖</span>
                      <button
                        type="button"
                        onClick={() => {
                          setUrlOrCodeInput(
                            `https://www.google.com/search?q=PLP2026_CANDIDATE%7CID:gO9cLNbg2rDRepZRUc5Y%7CNAME:%E1%9E%87%E1%9E%BF%E1%9E%93+%E1%9E%9F%E1%9F%8A%E1%9E%B8%E1%9E%90%E1%9E%B6%7CCLASS:5A%7CAVG:7.5%7CGRADE:C%7CRANK:4`
                          );
                        }}
                        className="text-[10px] text-blue-600 hover:underline font-extrabold"
                      >
                        + គំរូ URL Google
                      </button>
                    </div>

                    <textarea
                      value={urlOrCodeInput}
                      onChange={(e) => setUrlOrCodeInput(e.target.value)}
                      placeholder={`ដាក់ URL ឬ កូដសម្គាល់សិស្ស នៅទីនេះ...

ឧទាហរណ៍ ៖
• https://www.google.com/search?q=PLP2026_CANDIDATE|ID:2026-5A-01|NAME:ជឿន ស៊ីថា|CLASS:5A
• PLP2026_CANDIDATE|ID:gO9cLNbg2rDRepZRUc5Y|NAME:ជឿន ស៊ីថា|CLASS:5A
• https://my-school.com/api/students.json`}
                      rows={5}
                      className="w-full font-mono text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:border-blue-500 outline-none leading-relaxed text-slate-800"
                    />

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setUrlOrCodeInput("")}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        សម្អាត
                      </button>
                      <button
                        type="button"
                        disabled={isFetchingUrl}
                        onClick={handleImportStudentsUrlOrCode}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-extrabold py-2 text-xs rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isFetchingUrl ? (
                          <>
                            <span className="animate-spin">⏳</span> កំពុងទាញយក & ផ្ទៀងផ្ទាត់...
                          </>
                        ) : (
                          <>📥 ទាញយក & ផ្ទៀងផ្ទាត់ (ថ្នាក់ {targetClass})</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-purple-50 border border-purple-200 text-purple-900 text-xs rounded-xl p-2.5 font-medium flex justify-between items-center">
                  <span>📤 Export & Import ពិន្ទុ ខែ{MONTHS[selMonth]} (ថ្នាក់ {selClass})</span>
                  <span className="font-bold bg-purple-200 text-purple-800 px-2 py-0.5 rounded-md text-[10px]">
                    {students.length} សិស្ស
                  </span>
                </div>

                {/* Import Mode Toggle for Scores */}
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold gap-1">
                  <button
                    type="button"
                    onClick={() => setImportMode("file")}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      importMode === "file" ? "bg-white text-purple-700 shadow-xs font-extrabold" : "text-slate-600"
                    }`}
                  >
                    📁 Upload File (Excel / CSV / JSON)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("text")}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      importMode === "text" ? "bg-white text-purple-700 shadow-xs font-extrabold" : "text-slate-600"
                    }`}
                  >
                    📋 បិទអត្ថបទ JSON / CSV (Paste)
                  </button>
                </div>

                {importMode === "file" ? (
                  <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    <div className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      💡 គាំទ្រ File <strong>.JSON</strong>, <strong>Excel (.xlsx, .xls)</strong>, និង <strong>CSV</strong>
                    </div>

                    <label className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs text-center cursor-pointer block shadow-md shadow-purple-500/20 transition">
                      📥 ជ្រើសរើស File ពិន្ទុ (JSON / Excel / CSV)...
                      <input
                        type="file"
                        accept=".json,.csv,.xlsx,.xls"
                        onChange={handleImportScoresFile}
                        className="hidden"
                      />
                    </label>

                    <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2">
                      <button
                        onClick={handleExportScoresCSV}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 rounded-xl text-[11px] transition"
                      >
                        📤 Export CSV
                      </button>
                      <button
                        onClick={handleExportScoresXLSX}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-[11px] transition shadow-xs"
                      >
                        📊 Export XLSX
                      </button>
                      <button
                        onClick={handleExportAllXLSX}
                        className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-2 rounded-xl text-[11px] transition shadow-xs"
                      >
                        📋 Backup All
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">📋 ចម្លង & បិទអត្ថបទ JSON ឬ CSV ពិន្ទុ ៖</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPastedText(`{
  "-OvuiHSULoTgnm9b6jCn": {
    "គេហ-សិល្បៈ": 6,
    "ចំនួន": 5,
    "បំណិន": 6,
    "សមត្ថភាពនិយាយ": 5,
    "សមត្ថភាពសរសេរ": 5,
    "សមត្ថភាពស្តាប់": 6,
    "សមត្ថភាពអាន": 5,
    "សិក្សាសង្គម": 6,
    "អប់រំកាយ-សុខភាព": 7
  },
  "-OvuiHTrE_blmLYPwsbD": {
    "គេហ-សិល្បៈ": 7,
    "ចំនួន": 6,
    "បំណិន": 7,
    "សមត្ថភាពនិយាយ": 8,
    "សមត្ថភាពសរសេរ": 8,
    "សមត្ថភាពស្តាប់": 10,
    "សមត្ថភាពអាន": 8,
    "សិក្សាសង្គម": 8,
    "អប់រំកាយ-សុខភាព": 8
  }
}`);
                        }}
                        className="text-[10px] text-purple-600 hover:underline font-extrabold"
                      >
                        + គំរូ JSON ពិន្ទុ
                      </button>
                    </div>

                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={`បិទអត្ថបទ JSON ឬ CSV ពិន្ទុនៅទីនេះ...

ឧទាហរណ៍ JSON ៖
{
  "0": { "អក្សរសាស្ត្រខ្មែរ": 8, "គណិតវិទ្យា": 9 },
  "1": { "អក្សរសាស្ត្រខ្មែរ": 7, "គណិតវិទ្យា": 6 }
}`}
                      rows={6}
                      className="w-full font-mono text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:border-purple-500 outline-none leading-relaxed text-slate-800"
                    />

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPastedText("")}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                      >
                        សម្អាត
                      </button>
                      <button
                        type="button"
                        onClick={handleImportScoresText}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-2 text-xs rounded-xl shadow-md shadow-purple-500/20 transition"
                      >
                        📥 នាំចូលពិន្ទុ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 font-medium">
              {logMsg}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
