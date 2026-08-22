import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, getDoc, getDocs
} from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import {
  CLASSES, MONTHS, SEMESTERS, INNER_TABS, BLANK_STUDENT, calcAge, toKhNum
} from "./lib/constants";
import {
  Student, ScoreMap, AttendanceMap, TeacherProfile, InvigilatorData, InnerTab, ReportType, PtomRecord
} from "./types";

import { Auth } from "./components/Auth";
import { StudentTable } from "./components/StudentTable";
import { ScoresTable } from "./components/ScoresTable";
import { AttendanceTable } from "./components/AttendanceTable";
import { AttendanceTeacher } from "./components/AttendanceTeacher";
import { DetailTable } from "./components/DetailTable";
import { HonorRoll } from "./components/HonorRoll";
import { GradeAnalysis } from "./components/GradeAnalysis";
import { ReportsView } from "./components/ReportsView";
import { SchoolReport } from "./components/SchoolReport";
import { SchoolPriReport } from "./components/SchoolPriReport";
import { PerformanceSummary } from "./components/PerformanceSummary";
import { SeatingArrangement } from "./components/SeatingArrangement";

import { AddStudentModal } from "./components/Modals/AddStudentModal";
import { PhotoModal } from "./components/Modals/PhotoModal";
import { IOModal } from "./components/Modals/IOModal";
import { InvigilatorModal } from "./components/Modals/InvigilatorModal";
import { VerifyModal } from "./components/Modals/VerifyModal";
import { QRScannerModal } from "./components/Modals/QRScannerModal";
import { InactivityModal } from "./components/Modals/InactivityModal";
import { PtomAgreementModal } from "./components/Modals/PtomAgreementModal";
import { GmailModal } from "./components/GmailModal";
import { KhmerLunarDatePickerModal } from "./components/KhmerLunarDatePickerModal";
import { ScreenZoomControls } from "./components/ScreenZoomControls";
import { initGmailAuth } from "./lib/gmailService";
import { buildLearningAgreementPrintHTML, buildIndividualAnnualLearningPlanPrintHTML } from "./lib/printUtilsHelpers";
import { printHTML } from "./lib/printUtils";
import { SAMPLE_STUDENTS, generateSampleScores } from "./data/sampleStudents";

export default function App() {
  // Theme State with localStorage persistence
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved !== null) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  // Screen Zoom State (50% - 200%) with localStorage persistence
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("app_screen_zoom");
      return saved ? Math.min(200, Math.max(50, Number(saved))) : 100;
    } catch {
      return 100;
    }
  });

  // Apply Zoom directly to documentElement and persist
  useEffect(() => {
    try {
      (document.documentElement.style as any).zoom = `${zoomLevel / 100}`;
      localStorage.setItem("app_screen_zoom", String(zoomLevel));
    } catch (e) {
      console.error("Failed to apply zoom level", e);
    }
  }, [zoomLevel]);

  // Global Keyboard Shortcuts for Screen Zoom (Ctrl/Cmd + Plus/Minus/0)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          setZoomLevel((prev) => {
            const next = Math.min(200, Math.round((prev + 10) / 5) * 5);
            showToast(`🔍 ពង្រីកធំអេក្រង់: ${toKhNum(next)}%`, "info");
            return next;
          });
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          setZoomLevel((prev) => {
            const next = Math.max(50, Math.round((prev - 10) / 5) * 5);
            showToast(`🔍 ពង្រីកតូចអេក្រង់: ${toKhNum(next)}%`, "info");
            return next;
          });
        } else if (e.key === "0") {
          e.preventDefault();
          setZoomLevel(100);
          showToast("↺ កំណត់ទំហំអេក្រង់ដើម: ១០០%", "info");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    } catch (e) {
      console.error("Failed to save theme setting to localStorage", e);
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // Auth & Teacher State
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // App Navigation & Class State
  const [selClass, setSelClass] = useState<string | null>(null);
  const [semester, setSemester] = useState<string>("s1");
  const [selMonth, setSelMonth] = useState<number>(3); // Default March / មីនា
  const [innerTab, setInnerTab] = useState<InnerTab>("info");
  const [reportType, setReportType] = useState<ReportType>("monthly");

  // Mode & Auto-save
  const [editMode, setEditMode] = useState<boolean>(false);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "error">("synced");

  // Firestore Realtime Data
  const [students, setStudents] = useState<Student[]>([]);
  const [scoresMap, setScoresMap] = useState<Record<string, ScoreMap>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceMap>>({});
  const [honorPhotos, setHonorPhotos] = useState<Record<string, string>>({});
  const [allMonthsScores, setAllMonthsScores] = useState<Record<string, Record<string, ScoreMap>>>({});

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const toastTimerRef = useRef<any>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToastMsg({ text: msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isIOModalOpen, setIsIOModalOpen] = useState(false);
  const [isInvigilatorModalOpen, setIsInvigilatorModalOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [gmailModalParams, setGmailModalParams] = useState<{
    recipient?: string;
    subject?: string;
    htmlBody?: string;
  }>({});

  // Inactivity Auto-Logout State (30 minutes timeout for data security)
  const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 mins
  const INACTIVITY_WARNING_MS = 28 * 60 * 1000; // 28 mins
  const lastActivityRef = useRef<number>(Date.now());
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState(120);

  const handleAutoLogout = async () => {
    setShowInactivityWarning(false);
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Auto logout error:", e);
    } finally {
      setTeacher(null);
      setSelClass(null);
      showToast("🔒 បានចាកចេញដោយស្វ័យប្រវត្តិបន្ទាប់ពីអសកម្មភាព ៣០ នាទី ដើម្បីការពារទិន្នន័យសិស្ស!", "info");
    }
  };

  const handleManualLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Manual sign out error:", e);
    } finally {
      setTeacher(null);
      setSelClass(null);
      showToast("👋 បានចាកចេញពីគណនី", "info");
    }
  };

  const handleStayLoggedIn = () => {
    lastActivityRef.current = Date.now();
    setShowInactivityWarning(false);
  };

  // Activity detection event listeners
  useEffect(() => {
    if (!teacher) return;

    const handleUserActivity = () => {
      if (Date.now() - lastActivityRef.current > 1000) {
        lastActivityRef.current = Date.now();
        if (showInactivityWarning) {
          setShowInactivityWarning(false);
        }
      }
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [teacher, showInactivityWarning]);

  // Periodic check for 30 minutes inactivity
  useEffect(() => {
    if (!teacher) {
      setShowInactivityWarning(false);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_LIMIT_MS) {
        handleAutoLogout();
      } else if (elapsed >= INACTIVITY_WARNING_MS) {
        const remainingSeconds = Math.max(0, Math.ceil((INACTIVITY_LIMIT_MS - elapsed) / 1000));
        setInactivitySecondsLeft(remainingSeconds);
        setShowInactivityWarning(true);
      } else {
        if (showInactivityWarning) {
          setShowInactivityWarning(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [teacher]);

  useEffect(() => {
    const unsub = initGmailAuth();
    return () => {
      if (unsub) unsub();
    };
  }, []);
  const [photoModalState, setPhotoModalState] = useState<{
    isOpen: boolean;
    studentId: string | null;
    name: string;
    gender: string;
  }>({ isOpen: false, studentId: null, name: "", gender: "ប្រុស" });

  const [verifyStudent, setVerifyStudent] = useState<Student | null>(null);

  // PTOM Agreement / Learning Plan State
  const [ptomRecords, setPtomRecords] = useState<Record<string, PtomRecord>>({});
  const [isPtomModalOpen, setIsPtomModalOpen] = useState<boolean>(false);
  const [ptomModalStudentId, setPtomModalStudentId] = useState<string | undefined>(undefined);
  const [isLunarModalOpen, setIsLunarModalOpen] = useState<boolean>(false);

  // Invigilator State (local + sync)
  const [invigilatorData, setInvigilatorData] = useState<InvigilatorData>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("invigilatorData") || "null") || {
          building: "អគារ A",
          room: "01",
          shift: "ព្រឹក",
          sup1: { name: "", phone: "", sig: "" },
          sup2: { name: "", phone: "", sig: "" },
        }
      );
    } catch {
      return {
        building: "អគារ A",
        room: "01",
        shift: "ព្រឹក",
        sup1: { name: "", phone: "", sig: "" },
        sup2: { name: "", phone: "", sig: "" },
      };
    }
  });

  // 1. Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "teachers", user.uid));
          if (snap.exists()) {
            setTeacher({ uid: user.uid, ...snap.data() } as TeacherProfile);
          } else {
            setTeacher({
              uid: user.uid,
              email: user.email || "",
              fullName: user.email?.split("@")[0] || "គ្រូបង្រៀន",
              title: "លោក",
              phone: "",
              school: "សាលាបឋមសិក្សា",
              schoolID: "",
              level: "បឋមសិក្សា",
              province: "បន្ទាយមានជ័យ",
              district: "ភ្នំស្រុក",
              commune: "ស្ពានស្រែង",
              village: "រោគ",
              createdAt: Date.now(),
            });
          }
        } catch (e: any) {
          console.warn("Error/Offline fetching teacher profile, using default profile:", e);
          setTeacher({
            uid: user.uid,
            email: user.email || "",
            fullName: user.email?.split("@")[0] || "គ្រូបង្រៀន",
            title: "លោក",
            phone: "",
            school: "សាលាបឋមសិក្សា",
            schoolID: "",
            level: "បឋមសិក្សា",
            province: "បន្ទាយមានជ័យ",
            district: "ភ្នំស្រុក",
            commune: "ស្ពានស្រែង",
            village: "រោគ",
            createdAt: Date.now(),
          });
        }
      } else {
        setTeacher(null);
        setSelClass(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // 1b. Handle QR Code Verification Deep Link (e.g. ?verifyStudentId=xyz)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get("verifyStudentId") || params.get("studentId") || params.get("code");
    if (!verifyId) return;

    if (students.length > 0) {
      const found = students.find((s) => s.id === verifyId || s.code === verifyId);
      if (found) {
        setVerifyStudent(found);
        return;
      }
    }

    const code = params.get("code") || verifyId;
    const lastName = params.get("lastName") || "";
    const firstName = params.get("firstName") || "";
    const latinName = params.get("latinName") || "";
    const nameParam = params.get("name");
    let lName = lastName;
    let fName = firstName;
    if (!lName && !fName && nameParam) {
      const parts = nameParam.trim().split(" ");
      lName = parts[0] || nameParam;
      fName = parts.slice(1).join(" ") || "";
    }

    const gender = params.get("gender") || "—";
    const dob = params.get("dob") || "—";
    const village = params.get("village") || "";
    const commune = params.get("commune") || "";
    const district = params.get("district") || "";
    const province = params.get("province") || "";
    const fatherName = params.get("fatherName") || "";
    const fatherJob = params.get("fatherJob") || "";
    const motherName = params.get("motherName") || "";
    const motherJob = params.get("motherJob") || "";
    const studentPhone = params.get("studentPhone") || params.get("phone") || "";

    const avg = params.get("avg");
    const grade = params.get("grade");
    const rank = params.get("rank");
    const result = params.get("result");
    const selClassParam = params.get("selClass") || params.get("class");
    const schoolParam = params.get("school");
    const teacherParam = params.get("teacher");

    setVerifyStudent({
      id: verifyId,
      code,
      lastName: lName || "សិស្ស",
      firstName: fName,
      latinName: latinName || undefined,
      gender,
      dob,
      village: village || undefined,
      commune: commune || undefined,
      district: district || undefined,
      province: province || undefined,
      fatherName: fatherName || undefined,
      fatherJob: fatherJob || undefined,
      motherName: motherName || undefined,
      motherJob: motherJob || undefined,
      phone: studentPhone || undefined,
      _avgVal: avg || undefined,
      _grade: grade || undefined,
      _rank: rank || undefined,
      _resultText: result || undefined,
      _selClass: selClassParam || undefined,
      _schoolName: schoolParam || undefined,
      _teacherName: teacherParam || undefined,
    });
  }, [students]);

  // 2. Realtime Firestore Synchronization for Active Class
  useEffect(() => {
    if (!teacher || !selClass) {
      setStudents([]);
      setHonorPhotos({});
      setPtomRecords({});
      return;
    }

    setSyncStatus("saving");

    // a) Realtime Students listener
    const studentsCol = collection(db, "classes", selClass, "students");
    const unsubStudents = onSnapshot(
      studentsCol,
      (snapshot) => {
        const list: Student[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Student);
        });
        list.sort((a, b) => (a.lastName || "").localeCompare(b.lastName || "", "km"));
        setStudents(list);
        setSyncStatus("synced");
      },
      (err) => {
        console.warn("Students sync warning:", err);
        setSyncStatus("error");
      }
    );

    // b) Realtime Honor Photos listener
    const photosCol = collection(db, "classes", selClass, "honorPhotos");
    const unsubPhotos = onSnapshot(
      photosCol,
      (snapshot) => {
        const map: Record<string, string> = {};
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.photoUrl) map[docSnap.id] = d.photoUrl;
        });
        setHonorPhotos(map);
      },
      (err) => {
        console.warn("Honor photos sync warning:", err);
      }
    );

    // PTOM Records Listener
    const ptomCol = collection(db, "classes", selClass, "ptomRecords");
    const unsubPtom = onSnapshot(
      ptomCol,
      (snapshot) => {
        const map: Record<string, PtomRecord> = {};
        snapshot.forEach((docSnap) => {
          map[docSnap.id] = docSnap.data() as PtomRecord;
        });
        setPtomRecords(map);
      },
      (err) => {
        console.warn("PTOM records sync warning:", err);
      }
    );

    return () => {
      unsubStudents();
      unsubPhotos();
      unsubPtom();
    };
  }, [teacher, selClass]);

  // 3. Realtime Scores & Attendance for Active Semester + Month
  useEffect(() => {
    if (!teacher || !selClass || semester === "annual") {
      setScoresMap({});
      setAttendanceMap({});
      return;
    }

    // Scores Listener
    const scoresCol = collection(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "scores");
    const unsubScores = onSnapshot(
      scoresCol,
      (snapshot) => {
        const map: Record<string, ScoreMap> = {};
        snapshot.forEach((docSnap) => {
          map[docSnap.id] = docSnap.data().scores || {};
        });
        setScoresMap(map);
        setAllMonthsScores((prev) => ({
          ...prev,
          [`${semester}_${selMonth}`]: map,
        }));
      },
      (err) => {
        console.warn("Scores sync warning:", err);
      }
    );

    // Attendance Listener
    const attCol = collection(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "attendance");
    const unsubAtt = onSnapshot(
      attCol,
      (snapshot) => {
        const map: Record<string, AttendanceMap> = {};
        snapshot.forEach((docSnap) => {
          map[docSnap.id] = docSnap.data().days || {};
        });
        setAttendanceMap(map);
      },
      (err) => {
        console.warn("Attendance sync warning:", err);
      }
    );

    return () => {
      unsubScores();
      unsubAtt();
    };
  }, [teacher, selClass, semester, selMonth]);

  // Fetch all months for detail breakdown if needed
  const fetchAllMonthsData = async (semId: string) => {
    if (!selClass) return;
    
    // Always fetch both s1 and s2 for complete reports (like PRI end-of-year)
    const allMonths = [
      ...SEMESTERS.find(s => s.id === "s1")!.months.map(m => ({ sId: "s1", mIdx: m })),
      ...SEMESTERS.find(s => s.id === "s2")!.months.map(m => ({ sId: "s2", mIdx: m }))
    ];

    for (const { sId, mIdx } of allMonths) {
      const key = `${sId}_${mIdx}`;
      try {
        const colRef = collection(db, "classes", selClass, "semesters", sId, "months", String(mIdx), "scores");
        const snap = await getDocs(colRef);
        const mScores: Record<string, ScoreMap> = {};
        snap.forEach((docSnap) => {
          mScores[docSnap.id] = docSnap.data().scores || {};
        });
        setAllMonthsScores((prev) => ({ ...prev, [key]: mScores }));
      } catch (err) {
        console.warn(`Could not fetch score data for month ${mIdx}:`, err);
      }
    }
  };

  // Firestore Write Operations
  const handleAddStudent = async (newStu: Omit<Student, "id">, photoDataUrl?: string) => {
    if (!selClass) return;
    setSyncStatus("saving");
    const stuRef = doc(collection(db, "classes", selClass, "students"));
    const ageVal = newStu.dob ? calcAge(newStu.dob) : newStu.age;
    await setDoc(stuRef, { ...newStu, age: ageVal });

    if (photoDataUrl) {
      await setDoc(doc(db, "classes", selClass, "honorPhotos", stuRef.id), {
        photoUrl: photoDataUrl,
      });
    }
    setSyncStatus("synced");
    showToast("✅ បានបន្ថែមសិស្សក្នុង Firestore! 🔥", "success");
  };

  const handleUpdateStudent = async (id: string, updated: Partial<Student>) => {
    if (!selClass) return;
    setSyncStatus("saving");
    await setDoc(doc(db, "classes", selClass, "students", id), updated, { merge: true });
    setSyncStatus("synced");
  };

  const handleDeleteStudent = async (id: string) => {
    if (!selClass) return;
    const targetStu = students.find((s) => s.id === id);
    const stuName = targetStu ? `${targetStu.lastName || ""} ${targetStu.firstName || ""}`.trim() : "";
    if (!confirm(`តើអ្នកពិតជាចង់លុបសិស្ស ${stuName || "នេះ"} ចេញពីបញ្ជីថ្នាក់ ${selClass}?`)) return;
    setSyncStatus("saving");
    try {
      await deleteDoc(doc(db, "classes", selClass, "students", id));
      // Try cleaning up photo doc if exists
      try {
        await deleteDoc(doc(db, "classes", selClass, "honorPhotos", id));
      } catch {
        // ignore photo cleanup failure
      }
      setSyncStatus("synced");
      showToast(`🗑️ បានលុបសិស្ស ${stuName} ដោយជោគជ័យ`, "info");
    } catch (err: any) {
      setSyncStatus("error");
      showToast("❌ មិនអាចលុបបានទេ: " + err.message, "error");
    }
  };

  const handleUpdateScore = async (studentId: string, subject: string, value: number | "") => {
    if (!selClass || semester === "annual") return;
    setSyncStatus("saving");
    const docRef = doc(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "scores", studentId);
    const existing = scoresMap[studentId] || {};
    const updated = { ...existing, [subject]: value };
    await setDoc(docRef, { scores: updated }, { merge: true });
    setSyncStatus("synced");
  };

  const handleBulkUpdateScore = async (subject: string, value: number | "") => {
    if (!selClass || semester === "annual") return;
    setSyncStatus("saving");
    for (const s of students) {
      const docRef = doc(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "scores", s.id);
      const existing = scoresMap[s.id] || {};
      const updated = { ...existing, [subject]: value };
      await setDoc(docRef, { scores: updated }, { merge: true });
    }
    setSyncStatus("synced");
    showToast(`✅ បានធ្វើបច្ចុប្បន្នភាពពិន្ទុ ${subject} សម្រាប់សិស្សទាំងអស់!`, "success");
  };

  const handleToggleAttendance = async (studentId: string, day: number) => {
    if (!selClass || semester === "annual") return;
    setSyncStatus("saving");
    const docRef = doc(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "attendance", studentId);
    const existing = attendanceMap[studentId] || {};
    const cur = existing[day] || "";
    const nxt = cur === "" ? "P" : cur === "P" ? "A" : "";
    const updated = { ...existing, [day]: nxt };
    await setDoc(docRef, { days: updated }, { merge: true });
    setSyncStatus("synced");
  };

  const handleSavePhoto = async (studentId: string, photoUrl: string | null) => {
    if (!selClass) return;
    setSyncStatus("saving");
    const photoRef = doc(db, "classes", selClass, "honorPhotos", studentId);
    if (photoUrl) {
      await setDoc(photoRef, { photoUrl });
    } else {
      await deleteDoc(photoRef);
    }
    setSyncStatus("synced");
  };

  const handleImportStudents = async (
    stus: Omit<Student, "id">[],
    targetClass?: string,
    mode: "add" | "replace_all" | "update_matching" = "add"
  ) => {
    const destClass = targetClass || selClass;
    if (!destClass) return;
    setSyncStatus("saving");
    try {
      if (mode === "replace_all") {
        const existingSnap = await getDocs(collection(db, "classes", destClass, "students"));
        for (const d of existingSnap.docs) {
          await deleteDoc(d.ref);
        }
        for (const stu of stus) {
          const ref = doc(collection(db, "classes", destClass, "students"));
          await setDoc(ref, stu);
        }
      } else if (mode === "update_matching") {
        const existingSnap = await getDocs(collection(db, "classes", destClass, "students"));
        const existingList: { id: string; name: string }[] = [];
        existingSnap.forEach((d) => {
          const data = d.data();
          existingList.push({
            id: d.id,
            name: `${data.lastName || ""} ${data.firstName || ""}`.trim().toLowerCase(),
          });
        });

        for (const stu of stus) {
          const fullName = `${stu.lastName || ""} ${stu.firstName || ""}`.trim().toLowerCase();
          const match = existingList.find((e) => e.name === fullName);
          if (match) {
            await setDoc(doc(db, "classes", destClass, "students", match.id), stu, { merge: true });
          } else {
            const ref = doc(collection(db, "classes", destClass, "students"));
            await setDoc(ref, stu);
          }
        }
      } else {
        // "add"
        for (const stu of stus) {
          const ref = doc(collection(db, "classes", destClass, "students"));
          await setDoc(ref, stu);
        }
      }
      setSyncStatus("synced");
      if (selClass !== destClass) {
        setSelClass(destClass);
        showToast(`✅ បាននាំចូលសិស្ស ${stus.length} នាក់ ទៅកាន់ ថ្នាក់ ${destClass}!`, "success");
      } else {
        showToast(`✅ បាននាំចូលសិស្ស ${stus.length} នាក់ រួចរាល់!`, "success");
      }
    } catch (err: any) {
      setSyncStatus("error");
      showToast("❌ បរាជ័យក្នុងការនាំចូល: " + err.message, "error");
    }
  };

  const handleImportScores = async (newScoresMap: Record<string, ScoreMap>) => {
    if (!selClass || semester === "annual") return;
    setSyncStatus("saving");
    for (const [sid, scoreObj] of Object.entries(newScoresMap)) {
      const docRef = doc(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "scores", sid);
      await setDoc(docRef, { scores: scoreObj }, { merge: true });
    }
    setSyncStatus("synced");
  };

  const handleSaveCoreGrades = async () => {
    if (!selClass || !students.length) return;
    setSyncStatus("saving");
    for (const s of students) {
      const khRaw = ["សមត្ថភាពស្ដាប់", "សមត្ថភាពអាន", "សមត្ថភាពនិយាយ", "សមត្ថភាពសរសេរ"].map((subj) => scoresMap[s.id]?.[subj] ?? null);
      const mtRaw = ["ចំនួន", "រង្វាស់រង្វាល់", "ពីជគណិត", "ធរណីមាត្រ", "ស្ថិតិ"].map((subj) => scoresMap[s.id]?.[subj] ?? null);

      const docRef = doc(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "coreGrades", s.id);
      await setDoc(docRef, {
        khmerComponents: khRaw,
        mathComponents: mtRaw,
        savedAt: new Date().toISOString(),
      });
    }
    setSyncStatus("synced");
    showToast("💾 រក្សាទុកនិទ្ទេសគោលក្នុង Firestore រួចរាល់! 🔥");
  };

  const handleSavePtomRecord = async (studentId: string, record: PtomRecord) => {
    if (!selClass) return;
    setSyncStatus("saving");
    const docRef = doc(db, "classes", selClass, "ptomRecords", studentId);
    await setDoc(docRef, { ...record, updatedAt: Date.now() }, { merge: true });
    setPtomRecords((prev) => ({ ...prev, [studentId]: record }));
    setSyncStatus("synced");
    showToast("💾 បានរក្សាទុកទិន្នន័យកិច្ចព្រមព្រៀង/ផែនការ រួចរាល់! 🔥");
  };

  const handleLoadSampleData = async (targetCls?: string) => {
    const destClass = targetCls || selClass || "3A";
    setSyncStatus("saving");
    try {
      showToast("⏳ កំពុងបញ្ចូលទិន្នន័យគំរូទៅក្នុង Firestore...", "info");
      const createdStudents: Student[] = [];
      for (let i = 0; i < SAMPLE_STUDENTS.length; i++) {
        const sData = SAMPLE_STUDENTS[i];
        const stuRef = doc(collection(db, "classes", destClass, "students"));
        const stuObj = {
          ...sData,
          code: sData.code?.replace("2026-03", `2026-${destClass}`) || `2026-${destClass}-${String(i + 1).padStart(2, "0")}`,
        };
        await setDoc(stuRef, stuObj);
        createdStudents.push({ id: stuRef.id, ...stuObj } as Student);

        // Generate sample scores for Semester 1 (months 0..3) and Semester 2 (months 6..8)
        const allMonths = [
          { sId: "s1", mIdx: 0 }, { sId: "s1", mIdx: 1 }, { sId: "s1", mIdx: 2 }, { sId: "s1", mIdx: 3 },
          { sId: "s2", mIdx: 6 }, { sId: "s2", mIdx: 7 }, { sId: "s2", mIdx: 8 },
        ];

        for (const { sId, mIdx } of allMonths) {
          const scDocRef = doc(db, "classes", destClass, "semesters", sId, "months", String(mIdx), "scores", stuRef.id);
          const scoreData = generateSampleScores(i + mIdx);
          await setDoc(scDocRef, { scores: scoreData });
        }

        // Generate sample attendance for Month 3
        const attDocRef = doc(db, "classes", destClass, "semesters", "s1", "months", "3", "attendance", stuRef.id);
        const daysMap: Record<number, string> = {};
        for (let d = 1; d <= 28; d++) {
          daysMap[d] = (d + i) % 13 === 0 ? "A" : "P";
        }
        await setDoc(attDocRef, { days: daysMap });
      }

      setSelClass(destClass);
      setSyncStatus("synced");
      showToast(`🎉 បានបញ្ចូលទិន្នន័យគំរូសិស្ស ${createdStudents.length} នាក់ និងពិន្ទុពេញលេញសម្រាប់ថ្នាក់ ${destClass} ដោយជោគជ័យ! 🔥`, "success");
    } catch (err: any) {
      setSyncStatus("error");
      showToast("❌ បរាជ័យក្នុងការបញ្ចូលទិន្នន័យគំរូ: " + err.message, "error");
    }
  };

  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-xs">⏳ កំពុងភ្ជាប់ទៅកាន់ Firebase...</p>
      </div>
    );
  }

  if (!teacher || !selClass) {
    return (
      <Auth
        teacher={teacher}
        setTeacher={setTeacher}
        onSelectClass={(cls) => {
          setSelClass(cls);
          showToast(`📂 ថ្នាក់ ${cls} - ភ្ជាប់ទៅ Firestore 🔥`, "info");
        }}
        toast={showToast}
        onLoadSampleData={handleLoadSampleData}
      />
    );
  }

  const curSem = SEMESTERS.find((s) => s.id === semester) || SEMESTERS[0];
  const totalStudents = students.length;
  const maleCount = students.filter((s) => s.gender === "ប្រុស").length;
  const femaleCount = students.filter((s) => s.gender === "ស្រី").length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-2xl z-50 animate-bounce ${
            toastMsg.type === "error"
              ? "bg-red-600"
              : toastMsg.type === "info"
              ? "bg-blue-600"
              : "bg-emerald-600"
          }`}
        >
          {toastMsg.text}
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-slate-900 dark:bg-slate-950 text-white px-3 py-2 no-print shadow-md text-[11px] border-b border-slate-800 space-y-2">
        {/* Top Row: App Title & Status Badges */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-black shrink-0 shadow-xs">
              🎓
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-xs sm:text-sm text-white leading-tight truncate tracking-wide">
                PLP ២០២៦ · ថ្នាក់ {selClass}
              </h1>
              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[140px] sm:max-w-none">
                {teacher.title} {teacher.fullName}
              </p>
            </div>
          </div>

          {/* Right: Status Badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-800/90 rounded-lg px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 whitespace-nowrap shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              🔥 Realtime
            </span>

            <span className="bg-amber-950/80 text-amber-300 border border-amber-800/80 rounded-lg px-2 py-0.5 text-[10px] font-bold whitespace-nowrap shadow-2xs hidden sm:inline-flex">
              📅 {MONTHS[selMonth]}
            </span>
          </div>
        </div>

        {/* Bottom Row: Grouped Action Toolbar Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
          {/* Group 1: ឧបករណ៍ & បង្ហាញ (Tools & Display) */}
          <div className="flex items-center gap-1 bg-slate-800/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shadow-2xs">
            {/* Camera QR Code Scanner Tool */}
            <button
              onClick={() => setIsQrScannerOpen(true)}
              className="bg-emerald-700/90 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/80 rounded-lg px-2 py-1 text-[10px] font-black transition flex items-center gap-1 whitespace-nowrap shadow-xs cursor-pointer active:scale-95"
              title="ស្កែន QR Code ផ្ទៀងផ្ទាត់សិស្សតាមកាមេរ៉ា (Live Camera Scanner)"
            >
              <span>📷</span>
              <span className="hidden xs:inline">ស្កែន QR</span>
            </button>

            {/* Khmer Lunar Calendar Quick Lookup Tool */}
            <button
              onClick={() => setIsLunarModalOpen(true)}
              className="bg-indigo-900/90 hover:bg-indigo-800 text-amber-300 border border-indigo-700/80 rounded-lg px-2 py-1 text-[10px] font-black transition flex items-center gap-1 whitespace-nowrap shadow-xs cursor-pointer active:scale-95"
              title="ឧបករណ៍ពិនិត្យកាលបរិច្ឆេទចន្ទគតិ-សុរិយគតិខ្មែរ"
            >
              <span>🌙</span>
              <span className="hidden xs:inline">ចន្ទគតិ</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="bg-slate-700/80 hover:bg-slate-700 text-amber-300 dark:text-amber-200 border border-slate-600/80 rounded-lg px-2 py-1 text-[10px] font-bold transition flex items-center gap-1 whitespace-nowrap shadow-xs cursor-pointer active:scale-95"
              title="ប្តូរប្រធានបទ (Light / Dark Mode)"
            >
              {isDark ? "☀️ ភ្លឺ" : "🌙 ងងឹត"}
            </button>

            {/* Screen Zoom In / Out Controls & Fullscreen */}
            <ScreenZoomControls
              zoomLevel={zoomLevel}
              setZoomLevel={setZoomLevel}
              onShowToast={showToast}
              variant="both"
            />
          </div>

          {/* Group 2: គណនី & ថ្នាក់ (Account & Class Actions) */}
          <div className="flex items-center gap-1 bg-slate-800/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shadow-2xs">
            <button
              onClick={() => {
                setGmailModalParams({});
                setIsGmailModalOpen(true);
              }}
              className="bg-red-600 hover:bg-red-700 text-white border border-red-500 rounded-lg px-2 py-1 text-[10px] font-bold transition flex items-center gap-1 shadow-xs whitespace-nowrap active:scale-95 cursor-pointer"
              title="ប្រព័ន្ធអ៊ីមែល Gmail"
            >
              <span>✉️</span>
              <span>Gmail</span>
            </button>

            <button
              onClick={() => setSelClass(null)}
              className="bg-amber-950/90 hover:bg-amber-900 text-amber-200 border border-amber-800/90 rounded-lg px-2 py-1 text-[10px] font-bold transition flex items-center gap-1 whitespace-nowrap active:scale-95 cursor-pointer"
              title="ប្តូរថ្នាក់"
            >
              <span>⛔️</span>
              <span>ប្តូរថ្នាក់</span>
            </button>

            <button
              onClick={handleManualLogout}
              className="bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 rounded-lg px-2 py-1 text-[10px] font-bold transition flex items-center gap-1 shadow-xs whitespace-nowrap active:scale-95 cursor-pointer"
              title="ចាកចេញពីប្រព័ន្ធ (Sign Out)"
            >
              <span>🚪</span>
              <span>ចាកចេញ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Teacher sub-bar & Stats */}
      <div className="bg-blue-50 dark:bg-slate-900 border-b border-blue-200 dark:border-slate-800 px-3 py-1 flex items-center justify-between text-[11px] no-print text-slate-700 dark:text-slate-300 flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs">
            {teacher.title === "លោកស្រី" || teacher.title === "អ្នកគ្រូ" ? "👩‍🏫" : "👨‍🏫"}
          </span>
          <span className="font-extrabold text-blue-950 dark:text-blue-300">
            {teacher.title} {teacher.fullName}
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-600 dark:text-slate-400">{teacher.level}</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px] sm:max-w-none">🏫 {teacher.school}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold">
          <span>👥 សរុប: <strong className="text-blue-900 dark:text-blue-300">{totalStudents}</strong></span>
          <span>👨 ប្រុស: <strong className="text-blue-600 dark:text-blue-400">{maleCount}</strong></span>
          <span>👩 ស្រី: <strong className="text-pink-600 dark:text-pink-400">{femaleCount}</strong></span>
        </div>
      </div>

      {/* Main Grouped Controls Bar (Dropdown Selectors for Mobile/Desktop) */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 no-print space-y-2">
        {/* Row 1: Dropdown Selectors Group */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {/* Class Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 shadow-2xs text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">🏫 ថ្នាក់:</span>
              <select
                value={selClass || ""}
                onChange={(e) => setSelClass(e.target.value)}
                className="bg-transparent font-extrabold text-blue-700 dark:text-blue-400 focus:outline-none cursor-pointer text-xs"
              >
                {CLASSES.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 shadow-2xs text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">📚 ឆមាស:</span>
              <select
                value={semester}
                onChange={(e) => {
                  const smId = e.target.value;
                  setSemester(smId);
                  if (smId === "s1") setSelMonth(0);
                  else if (smId === "s2") setSelMonth(6);
                  showToast(`📚 ${SEMESTERS.find((s) => s.id === smId)?.label}`, "info");
                }}
                className="bg-transparent font-extrabold text-blue-700 dark:text-blue-400 focus:outline-none cursor-pointer text-xs"
              >
                {SEMESTERS.map((sm) => (
                  <option key={sm.id} value={sm.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {sm.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Dropdown */}
            {semester !== "annual" && (
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 shadow-2xs text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">📅 ខែ:</span>
                <select
                  value={selMonth}
                  onChange={(e) => {
                    const mIdx = Number(e.target.value);
                    setSelMonth(mIdx);
                    showToast(`📅 ខែ${MONTHS[mIdx]}`, "info");
                  }}
                  className="bg-transparent font-extrabold text-emerald-700 dark:text-emerald-400 focus:outline-none cursor-pointer text-xs"
                >
                  {curSem.months.map((mIdx) => (
                    <option key={mIdx} value={mIdx} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                      {MONTHS[mIdx]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tab View Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 shadow-2xs text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">📊 ម៉ឺនុយ:</span>
              <select
                value={innerTab}
                onChange={(e) => {
                  const tId = e.target.value as InnerTab;
                  setInnerTab(tId);
                  if (tId === "detail" || tId === "report" || tId === "performance") {
                    fetchAllMonthsData("s1");
                    fetchAllMonthsData("s2");
                  }
                }}
                className="bg-transparent font-extrabold text-purple-700 dark:text-purple-300 focus:outline-none cursor-pointer text-xs"
              >
                {INNER_TABS.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grouped Actions */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {editMode ? (
              <button
                onClick={() => {
                  setEditMode(false);
                  showToast("✅ បានរក្សាទុកការកែប្រែក្នុង Firestore!");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1"
              >
                💾 Save 🔥
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditMode(true);
                  showToast("✏️ ម៉ូតកែសម្រួល (Edit Mode) - រាល់ការកែប្រែនឹង Sync ដោយស្វ័យប្រវត្តិ", "info");
                }}
                className="bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-xs px-2.5 py-1 rounded-lg"
              >
                ✏️ កែ
              </button>
            )}

            {students.length === 0 && (
              <button
                onClick={() => handleLoadSampleData(selClass || "3A")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1 transition active:scale-95 animate-pulse"
                title="បញ្ចូលទិន្នន័យគំរូសិស្ស ១០ នាក់ និងពិន្ទុពេញលេញ"
              >
                <span>⚡</span>
                <span>បញ្ចូលទិន្នន័យគំរូ</span>
              </button>
            )}

            {innerTab === "info" && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1"
              >
                ➕ បន្ថែមសិស្ស
              </button>
            )}

            <button
              onClick={() => setIsIOModalOpen(true)}
              className="bg-purple-100 dark:bg-purple-950/80 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
            >
              📦 IO Excel/CSV
            </button>
          </div>
        </div>

        {/* Tab Buttons Pills (Horizontal scroll for larger screens) */}
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800 scrollbar-none">
          {INNER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setInnerTab(tab.id as InnerTab);
                if (tab.id === "detail" || tab.id === "report" || tab.id === "performance") {
                  fetchAllMonthsData("s1");
                  fetchAllMonthsData("s2");
                }
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition border ${
                innerTab === tab.id
                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Edit Mode Warning Banner */}
      {editMode && (
        <div className="bg-amber-50 dark:bg-amber-950/90 border-b border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-2 py-1 text-[11px] font-bold no-print flex justify-between items-center gap-2">
          <span className="truncate">⚠️ ម៉ូតកែសម្រួលសកម្ម — រាល់ការកែប្រែ Sync ទៅកាន់ Firestore Realtime!</span>
          <button
            onClick={() => setEditMode(false)}
            className="bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 px-1.5 py-0.5 rounded text-[10px] shrink-0"
          >
            បិទម៉ូតកែ
          </button>
        </div>
      )}

      {/* Tab Content Display */}
      <main className="flex-1 overflow-y-auto">
        {innerTab === "info" && (
          <StudentTable
            students={students}
            editMode={editMode}
            selClass={selClass}
            honorPhotos={honorPhotos}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onOpenPhotoModal={(id, name, gender) =>
              setPhotoModalState({ isOpen: true, studentId: id, name, gender })
            }
            onTriggerAutoSave={() => setSyncStatus("saving")}
            onLoadSampleData={() => handleLoadSampleData(selClass || "3A")}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenIOModal={() => setIsIOModalOpen(true)}
          />
        )}

        {innerTab === "scores" && (
          <ScoresTable
            students={students}
            scoresMap={scoresMap}
            editMode={editMode}
            onUpdateScore={handleUpdateScore}
            onBulkUpdateScore={handleBulkUpdateScore}
            onOpenPhotoModal={(id, name, gender) =>
              setPhotoModalState({ isOpen: true, studentId: id, name, gender })
            }
            honorPhotos={honorPhotos}
            onLoadSampleData={() => handleLoadSampleData(selClass || "3A")}
          />
        )}

        {innerTab === "attendance" && (
          <AttendanceTable
            students={students}
            attendanceMap={attendanceMap}
            editMode={editMode}
            onToggleAttendance={handleToggleAttendance}
            onOpenPhotoModal={(id, name, gender) =>
              setPhotoModalState({ isOpen: true, studentId: id, name, gender })
            }
            honorPhotos={honorPhotos}
            selMonth={selMonth}
            teacher={teacher}
          />
        )}

        {innerTab === "attendance-teacher" && (
          <AttendanceTeacher />
        )}

        {innerTab === "detail" && (
          <DetailTable
            students={students}
            semesterId={semester !== "annual" ? semester : "s1"}
            onSemesterChange={(sId) => {
              setSemester(sId);
              fetchAllMonthsData(sId);
            }}
            allMonthsScores={allMonthsScores}
            className={selClass || "ថ្នាក់"}
            teacher={teacher}
          />
        )}

        
        {innerTab === "schoolreport" && (
          <SchoolReport 
            teacher={teacher} 
            selClass={selClass}
            currentStudents={students}
            currentScoresMap={scoresMap}
            allMonthsScores={allMonthsScores}
          />
        )}
        {innerTab === "prischool" && (
          <SchoolPriReport 
            teacher={teacher} 
            selClass={selClass}
            currentScoresMap={scoresMap}
            currentStudents={students}
            semester={semester}
            selMonth={selMonth}
            allMonthsScores={allMonthsScores}
          />
        )}

        {(innerTab === "report" || innerTab === "candidate" || innerTab === "certificate") && (
          <ReportsView
            students={students}
            scoresMap={scoresMap}
            attendanceMap={attendanceMap}
            honorPhotos={honorPhotos}
            selClass={selClass}
            semester={semester}
            selMonth={selMonth}
            teacher={teacher}
            invigilatorData={invigilatorData}
            reportType={
              innerTab === "candidate"
                ? "candidate"
                : innerTab === "certificate"
                ? "certificate"
                : reportType
            }
            onReportTypeChange={setReportType}
            onOpenInvigilatorModal={() => setIsInvigilatorModalOpen(true)}
            onOpenVerifyModal={(s) => setVerifyStudent(s)}
            onSaveCoreGrades={handleSaveCoreGrades}
            toast={showToast}
            allMonthsScores={allMonthsScores}
            ptomRecords={ptomRecords}
            onOpenPtomModal={(studentId) => {
              setPtomModalStudentId(studentId);
              setIsPtomModalOpen(true);
            }}
            onOpenGmailModal={(params) => {
              if (params) setGmailModalParams(params);
              else setGmailModalParams({});
              setIsGmailModalOpen(true);
            }}
          />
        )}

        {innerTab === "honor" && (
          <HonorRoll
            students={students}
            scoresMap={scoresMap}
            honorPhotos={honorPhotos}
            selClass={selClass}
            semester={semester}
            selMonth={selMonth}
            teacher={teacher}
            onOpenPhotoModal={(id, name, gender) =>
              setPhotoModalState({ isOpen: true, studentId: id, name, gender })
            }
          />
        )}

        {innerTab === "gradeanalysis" && (
          <GradeAnalysis
            students={students}
            scoresMap={scoresMap}
            selClass={selClass}
            semester={semester}
            selMonth={selMonth}
          />
        )}

        {innerTab === "performance" && (
          <PerformanceSummary
            students={students}
            allMonthsScores={allMonthsScores}
            scoresMap={scoresMap}
            selClass={selClass}
            teacher={teacher}
            honorPhotos={honorPhotos}
            onFetchAllMonths={() => {
              fetchAllMonthsData("s1");
              fetchAllMonthsData("s2");
            }}
          />
        )}
        {innerTab === "seating" && (
          <SeatingArrangement students={students} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 px-4 py-2 flex flex-wrap items-center justify-between text-xs no-print border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span>🔥 {teacher.fullName}</span>
          <span>·</span>
          <span>
            ថ្នាក់ {selClass} · {curSem.label} {semester !== "annual" && `· ខែ${MONTHS[selMonth]}`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-0.5 rounded-full">
            <span className="text-white text-[11px] font-bold">⚡ Auto-save</span>
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
            />
          </div>

          <span
            className={`font-extrabold ${
              syncStatus === "saving"
                ? "text-blue-400 animate-pulse"
                : syncStatus === "error"
                ? "text-red-400"
                : "text-emerald-400"
            }`}
          >
            {syncStatus === "saving"
              ? "⚡ Auto-saving..."
              : syncStatus === "error"
              ? "❌ Sync Error"
              : "✅ Synced Firestore"}
          </span>
        </div>
      </footer>

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        selClass={selClass}
        studentsCount={students.length}
        onClose={() => setIsAddModalOpen(false)}
        onAddStudent={handleAddStudent}
        toast={showToast}
      />

      <PhotoModal
        isOpen={photoModalState.isOpen}
        studentId={photoModalState.studentId}
        studentName={photoModalState.name}
        studentGender={photoModalState.gender}
        currentPhoto={photoModalState.studentId ? honorPhotos[photoModalState.studentId] || null : null}
        onClose={() =>
          setPhotoModalState({ isOpen: false, studentId: null, name: "", gender: "ប្រុស" })
        }
        onSavePhoto={handleSavePhoto}
        toast={showToast}
      />

      <IOModal
        isOpen={isIOModalOpen}
        onClose={() => setIsIOModalOpen(false)}
        students={students}
        scoresMap={scoresMap}
        attendanceMap={attendanceMap}
        selClass={selClass}
        semester={semester}
        selMonth={selMonth}
        teacher={teacher}
        onImportStudents={handleImportStudents}
        onImportScores={handleImportScores}
        toast={showToast}
      />

      <InvigilatorModal
        isOpen={isInvigilatorModalOpen}
        onClose={() => setIsInvigilatorModalOpen(false)}
        invigilatorData={invigilatorData}
        onSave={(data) => {
          setInvigilatorData(data);
          try {
            localStorage.setItem("invigilatorData", JSON.stringify(data));
          } catch {}
        }}
        toast={showToast}
      />

      <PtomAgreementModal
        isOpen={isPtomModalOpen}
        selClass={selClass}
        students={students}
        initialStudentId={ptomModalStudentId}
        ptomRecords={ptomRecords}
        onSaveRecord={handleSavePtomRecord}
        onClose={() => setIsPtomModalOpen(false)}
        toast={showToast}
        onPrintStudent={(sid) => {
          const s = students.filter((st) => st.id === sid);
          if (s.length > 0) {
            const html = buildLearningAgreementPrintHTML(s, selClass, teacher, allMonthsScores, ptomRecords);
            printHTML(html);
          }
        }}
        onPrintPlan={(sid) => {
          const s = students.filter((st) => st.id === sid);
          if (s.length > 0) {
            const html = buildIndividualAnnualLearningPlanPrintHTML(s, selClass, teacher, ptomRecords);
            printHTML(html);
          }
        }}
      />

      <VerifyModal
        isOpen={!!verifyStudent}
        student={verifyStudent}
        selClass={selClass}
        schoolName={teacher?.school || "សាលាបឋមសិក្សា"}
        students={students}
        scoresMap={scoresMap}
        teacher={teacher}
        onClose={() => setVerifyStudent(null)}
      />

      <QRScannerModal
        isOpen={isQrScannerOpen}
        students={students}
        scoresMap={scoresMap}
        selClass={selClass || ""}
        schoolName={teacher?.school || "សាលាបឋមសិក្សា"}
        teacher={teacher}
        onClose={() => setIsQrScannerOpen(false)}
        onVerifyStudent={(scannedStu) => {
          setIsQrScannerOpen(false);
          setVerifyStudent(scannedStu);
        }}
        toast={showToast}
      />

      <GmailModal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
        defaultRecipient={gmailModalParams.recipient}
        defaultSubject={gmailModalParams.subject}
        defaultHtmlBody={gmailModalParams.htmlBody}
        toast={showToast}
      />

      <InactivityModal
        isOpen={showInactivityWarning}
        secondsRemaining={inactivitySecondsLeft}
        onStayLoggedIn={handleStayLoggedIn}
        onLogoutNow={handleAutoLogout}
      />

      <KhmerLunarDatePickerModal
        isOpen={isLunarModalOpen}
        onClose={() => setIsLunarModalOpen(false)}
        location={teacher?.village || teacher?.district || teacher?.province || "រោគ"}
      />

      <iframe id="printFrame" className="hidden" title="Print Frame" />
    </div>
  );
}
