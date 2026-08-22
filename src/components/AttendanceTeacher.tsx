import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot, setDoc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { getKhmerLunarDateInfo, toKhmerNum } from "../lib/khmerLunarCalendar";
import { KhmerLunarDatePickerModal } from "./KhmerLunarDatePickerModal";

interface StaffMember {
  id: string;
  name: string;
  gender: "ប្រុស" | "ស្រី";
  position: string;
  cls: string;
  phone: string;
  role: "director" | "admin" | "teacher";
}

interface SigRecord {
  sig: string;
  time: string;
  lat?: number;
  lng?: number;
  distance?: number;
}

interface DailyAttendanceRecord {
  m_in?: SigRecord;
  m_out?: SigRecord;
  a_in?: SigRecord;
  a_out?: SigRecord;
  note?: string;
  updatedAt?: number;
}

const STAFF_LIST: StaffMember[] = [
  { id: "01", name: "សុខ សារើន", gender: "ស្រី", position: "នាយិកា", cls: "-", phone: "+85589663966", role: "director" },
  { id: "02", name: "យ៉េន សារី", gender: "ប្រុស", position: "នាយករង", cls: "-", phone: "+85585246698", role: "teacher" },
  { id: "03", name: "អ៊ុន ប៊ុនទុង", gender: "ប្រុស", position: "លេខាធិការ", cls: "-", phone: "+85592272005", role: "admin" },
  { id: "04", name: "រ៉ែម សុភក្ដិ", gender: "ស្រី", position: "គ្រូបង្រៀន", cls: "1A", phone: "+855883435566", role: "teacher" },
  { id: "05", name: "ស្វាង មនោរម្យ", gender: "ស្រី", position: "គ្រូបង្រៀន", cls: "5A", phone: "+855976858898", role: "teacher" },
  { id: "06", name: "ប៉ោង ស្រីពេជ្រ", gender: "ស្រី", position: "គ្រូបង្រៀន", cls: "2A", phone: "+855889304103", role: "teacher" },
  { id: "07", name: "លេង ចាន់លាវ", gender: "ស្រី", position: "គ្រូបង្រៀន", cls: "2B", phone: "+855884661856", role: "teacher" },
  { id: "08", name: "អែង ផល្លែន", gender: "ស្រី", position: "គ្រូបង្រៀន", cls: "3B", phone: "+85592620771", role: "teacher" },
  { id: "09", name: "ប៊ី ពិសី", gender: "ស្រី", position: "គ្រូបង្រៀន", cls: "3A", phone: "+855889339499", role: "teacher" },
  { id: "10", name: "អឿន សុខៀប", gender: "ស្រី", position: "គ្រូបង្រៀន", cls: "4B", phone: "+8550977075979", role: "teacher" },
  { id: "11", name: "ឆេន សាវដា", gender: "ស្រី", position: "គ្រូបង្រៀន", cls: "4A", phone: "+855974611580", role: "teacher" },
  { id: "12", name: "រ៉ោម សម្ផស្ស", gender: "ប្រុស", position: "គ្រូបង្រៀន", cls: "5B", phone: "+855314234466", role: "teacher" },
  { id: "13", name: "ឈួត សេរ៉ូម", gender: "ស្រី", position: "គ្រូបង្រៀន", cls: "6A", phone: "+855976700999", role: "teacher" },
  { id: "14", name: "កែវ ខន", gender: "ប្រុស", position: "កសិកម្ម", cls: "-", phone: "+85590887118", role: "teacher" },
  { id: "15", name: "លន់ ចាន់នឹក", gender: "ស្រី", position: "បណ្ណារក្ស", cls: "-", phone: "+855972424423", role: "teacher" },
  { id: "16", name: "ពាន ណូរ៉ា", gender: "ស្រី", position: "គ្រូបង្រៀន", cls: "ម.ត", phone: "+855978680864", role: "teacher" },
  { id: "17", name: "ឡុក ម៉ាក់តី", gender: "ស្រី", position: "គ្រូបង្រៀន", cls: "ម.ត", phone: "+855886534343", role: "teacher" },
];

const KH_NUMS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
const toKh = (n: number | string) => String(n).replace(/[0-9]/g, (d) => KH_NUMS[parseInt(d)]);

const KH_MONTHS_SOLAR = [
  "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
  "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
];

const KH_WEEKDAYS_LONG = [
  "ថ្ងៃអាទិត្យ", "ថ្ងៃច័ន្ទ", "ថ្ងៃអង្គារ", "ថ្ងៃពុធ",
  "ថ្ងៃព្រហស្បតិ៍", "ថ្ងៃសុក្រ", "ថ្ងៃសៅរ៍"
];

const KH_MONTHS_LUNAR: Record<number, string> = {
  0: "មាឃ", 1: "ផល្គុន", 2: "ចេត្រ", 3: "ពិសាខ", 4: "ជេស្ឋ", 5: "អាសាឍ",
  6: "ស្រាពណ៍", 7: "ភទ្របទ", 8: "អស្សុជ", 9: "កត្តិក", 10: "មិគសិរ", 11: "បុស្ស"
};

const KH_ANIMALS = ["ជូត", "ឆ្លូវ", "ខាល", "ថោះ", "រោង", "ម្សាញ់", "មមី", "មមែ", "វក", "រកា", "ច", "កុរ"];
const KH_SAK = ["សំរឹទ្ធិស័ក", "ឯកស័ក", "ទោស័ក", "ត្រីស័ក", "ចត្វាស័ក", "បញ្ចស័ក", "ឆស័ក", "សប្តស័ក", "អដ្ឋស័ក", "នព្វស័ក"];

function getSolarKhmerDate(d: Date) {
  const info = getKhmerLunarDateInfo(d);
  return info.solarLocationText("រោគ");
}

function getLunarKhmerDate(d: Date) {
  const info = getKhmerLunarDateInfo(d);
  return info.lunarFullText;
}

// School Coordinates (សាលាបឋមសិក្សា រោគ)
const SCHOOL_LAT = 13.7000257;
const SCHOOL_LNG = 103.4108298;
const SCHOOL_RADIUS_METERS = 5000;

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type SlotKey = "m_in" | "m_out" | "a_in" | "a_out";
const SLOT_CONFIG: { key: SlotKey; label: string; icon: string }[] = [
  { key: "m_in", label: "ព្រឹក-ចូល", icon: "🌅" },
  { key: "m_out", label: "ព្រឹក-ចេញ", icon: "☀️" },
  { key: "a_in", label: "រសៀល-ចូល", icon: "🌇" },
  { key: "a_out", label: "រសៀល-ចេញ", icon: "🌙" },
];

export const AttendanceTeacher: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"daily" | "report-detail" | "report-summary">("daily");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const [selectedStaff, setSelectedStaff] = useState<StaffMember>(STAFF_LIST[0]);
  const [dayAttendance, setDayAttendance] = useState<Record<string, DailyAttendanceRecord>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saveStatus, setSyncStatus] = useState<string>("connected");

  // GPS State
  const [gpsStatus, setGpsStatus] = useState<"loading" | "ok" | "bad" | "denied" | "bypassed">("ok");
  const [gpsDistance, setGpsDistance] = useState<number>(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(10);
  const [bypassGps, setBypassGps] = useState<boolean>(true); // Default true so teachers can always test/sign

  // Signature Modal State
  const [sigModal, setSigModal] = useState<{
    isOpen: boolean;
    staff: StaffMember | null;
    slot: SlotKey | null;
    slotLabel: string;
  }>({
    isOpen: false,
    staff: null,
    slot: null,
    slotLabel: "",
  });

  // Canvas Drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isLunarModalOpen, setIsLunarModalOpen] = useState(false);

  // Monthly Report State
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [monthData, setMonthData] = useState<Record<string, Record<string, DailyAttendanceRecord>>>({});
  const [reportLoading, setReportLoading] = useState(false);

  // Realtime attendance listener for selectedDate
  useEffect(() => {
    if (!selectedDate || !auth.currentUser) return;
    setLoading(true);
    const dateDocRef = doc(db, "attendance", selectedDate);
    const unsubscribe = onSnapshot(
      dateDocRef,
      (snapshot) => {
        const val = snapshot.exists() ? snapshot.data() : {};
        setDayAttendance(val || {});
        setLoading(false);
        setSyncStatus("synced");
      },
      (err) => {
        console.warn("Firestore attendance sync warning (using offline state):", err);
        setLoading(false);
        setSyncStatus("offline");
      }
    );
    return () => unsubscribe();
  }, [selectedDate]);

  // GPS Watcher
  useEffect(() => {
    if (bypassGps) {
      setGpsStatus("bypassed");
      return;
    }
    if (!navigator.geolocation) {
      setGpsStatus("denied");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const dist = haversineDist(pos.coords.latitude, pos.coords.longitude, SCHOOL_LAT, SCHOOL_LNG);
        const distM = Math.round(dist);
        setGpsDistance(distM);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsStatus(distM <= SCHOOL_RADIUS_METERS ? "ok" : "bad");
      },
      (err) => {
        setGpsStatus(err.code === 1 ? "denied" : "bad");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [bypassGps]);

  // Handle signature canvas setup
  useEffect(() => {
    if (!sigModal.isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, [sigModal.isOpen]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Open signature modal
  const handleOpenSig = (staff: StaffMember, slot: SlotKey, slotLabel: string) => {
    setSigModal({
      isOpen: true,
      staff,
      slot,
      slotLabel,
    });
  };

  // Save Signature to Firebase RTDB
  const handleSaveSignature = async () => {
    if (!sigModal.staff || !sigModal.slot || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const record: SigRecord = {
      sig: dataUrl,
      time: timeStr,
      distance: gpsDistance,
    };

    const staffName = sigModal.staff.name;
    const currentStaffData = dayAttendance[staffName] || {};
    const updatedStaffData: DailyAttendanceRecord = {
      ...currentStaffData,
      [sigModal.slot]: record,
      updatedAt: Date.now(),
    };

    // Optimistic UI update
    setDayAttendance((prev) => ({
      ...prev,
      [staffName]: updatedStaffData,
    }));

    setSigModal({ isOpen: false, staff: null, slot: null, slotLabel: "" });

    try {
      await setDoc(doc(db, "attendance", selectedDate), {
        [staffName]: updatedStaffData
      }, { merge: true });
    } catch (e) {
      console.warn("Firestore write error:", e);
    }
  };

  // Delete/Clear Signature Slot
  const handleClearSlot = async (staffName: string, slot: SlotKey) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបវត្តមាន ${slot} របស់ ${staffName}?`)) return;
    const currentStaffData = { ...(dayAttendance[staffName] || {}) };
    delete currentStaffData[slot];

    setDayAttendance((prev) => ({
      ...prev,
      [staffName]: currentStaffData,
    }));

    try {
      await updateDoc(doc(db, "attendance", selectedDate), {
        [`${staffName}.${slot}`]: deleteField()
      });
    } catch (e) {
      console.warn("Firestore delete error:", e);
    }
  };

  // Update Note
  const handleUpdateNote = async (staffName: string, noteText: string) => {
    const currentStaffData = dayAttendance[staffName] || {};
    const updated = { ...currentStaffData, note: noteText, updatedAt: Date.now() };

    setDayAttendance((prev) => ({
      ...prev,
      [staffName]: updated,
    }));

    try {
      await setDoc(doc(db, "attendance", selectedDate), {
        [staffName]: updated
      }, { merge: true });
    } catch (e) {
      console.warn("Firestore note write error:", e);
    }
  };

  // Fetch Full Month Data for Reports
  const handleGenerateReport = async () => {
    setReportLoading(true);
    const newData: Record<string, Record<string, DailyAttendanceRecord>> = {};
    const daysInM = new Date(reportYear, reportMonth, 0).getDate();
    
    try {
      for (let d = 1; d <= daysInM; d++) {
        const dateKey = `${reportYear}-${String(reportMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const snapshot = await getDoc(doc(db, "attendance", dateKey));
        if (snapshot.exists()) {
          newData[dateKey] = snapshot.data();
        }
      }
      setMonthData(newData);
    } catch (e) {
      console.error("Error fetching report data:", e);
    } finally {
      setReportLoading(false);
    }
  };

  const currDateObj = new Date(selectedDate || new Date().toISOString().split("T")[0]);

  // Statistics calculation for the day
  const stats = STAFF_LIST.reduce(
    (acc, s) => {
      const rec = dayAttendance[s.name];
      const hasSigned = rec && (rec.m_in?.sig || rec.m_out?.sig || rec.a_in?.sig || rec.a_out?.sig);
      const note = (rec?.note || "").trim();

      if (hasSigned) {
        acc.present++;
      } else if (note.includes("អត់ច្បាប់")) {
        acc.unexcused++;
      } else if (note.includes("ច្បាប់")) {
        acc.leave++;
      } else if (note.length > 0) {
        acc.other++;
      } else {
        acc.none++;
      }
      return acc;
    },
    { present: 0, leave: 0, unexcused: 0, other: 0, none: 0 }
  );

  return (
    <div id="attendance-teacher-root" className="min-h-screen bg-slate-900 text-slate-100 p-2 sm:p-4 print:p-0 print:bg-white print:text-black">
      {/* Official Print Styles */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 1cm; }
          #attendance-teacher-root { padding: 0 !important; background: white !important; color: black !important; }
          .no-print { display: none !important; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000 !important; padding: 4px !important; font-size: 10px !important; }
        }
      `}</style>

      {/* Official Header */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-xl mb-4 backdrop-blur-md print:bg-white print:border-0 print:shadow-none print:mb-2">
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold">ព្រះរាជាណាចក្រកម្ពុជា</h2>
          <h2 className="text-xl font-bold">ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
          <div className="h-0.5 bg-black w-24 mx-auto my-1"></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3 print:border-black">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-black text-white print:text-black flex items-center gap-2">
                បញ្ជីវត្តមានបុគ្គលិកអប់រំ
              </h1>
              <p className="text-xs text-amber-300 font-bold print:text-black">
                សាលាបឋមសិក្សា រោគ · ឃុំស្ពានស្រែង ស្រុកភ្នំស្រុក ខេត្តបន្ទាយមានជ័យ
              </p>
            </div>
          </div>
          
          <div className="no-print flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700 flex-wrap">
            <button onClick={() => setActiveTab("daily")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === "daily" ? "bg-blue-600 text-white" : "text-slate-400"}`}>📅 វត្តមានប្រចាំថ្ងៃ</button>
            <button onClick={() => { setActiveTab("report-detail"); handleGenerateReport(); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === "report-detail" ? "bg-blue-600 text-white" : "text-slate-400"}`}>📊 តារាងលម្អិតខែ</button>
            <button onClick={() => { setActiveTab("report-summary"); handleGenerateReport(); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === "report-summary" ? "bg-blue-600 text-white" : "text-slate-400"}`}>📋 តារាងសង្ខេបខែ</button>
            <button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">🖨️ បោះពុម្ព</button>
          </div>
        </div>

        {/* Date Selector & Solar / Lunar Khmer Date Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-bold">📆 កាលបរិច្ឆេទ:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500 font-bold"
            />
            <button
              onClick={() => {
                const now = new Date();
                setSelectedDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
              }}
              className="bg-slate-700 hover:bg-slate-600 text-amber-200 px-2 py-1 rounded-lg text-[11px] font-bold transition"
            >
              ថ្ងៃនេះ
            </button>
            <button
              onClick={() => setIsLunarModalOpen(true)}
              className="bg-indigo-900/80 hover:bg-indigo-800 text-amber-300 border border-indigo-700/80 px-2.5 py-1 rounded-lg text-[11px] font-black transition flex items-center gap-1 shadow-xs"
              title="ពិនិត្យកាលបរិច្ឆេទចន្ទគតិខ្មែរ"
            >
              <span>🌙</span>
              <span>ចន្ទគតិ (Khmer Lunar)</span>
            </button>
          </div>

          {/* Full Khmer Lunar & Solar Date Display (Left-aligned text within card) */}
          <div
            onClick={() => setIsLunarModalOpen(true)}
            className="text-left bg-slate-950/60 hover:bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 cursor-pointer transition"
            title="ចុចដើម្បីបើកឧបករណ៍ពិនិត្យកាលបរិច្ឆេទចន្ទគតិពេញលេញ"
          >
            <div className="text-amber-300 font-bold text-xs leading-relaxed text-left">
              {getLunarKhmerDate(currDateObj)}
            </div>
            <div className="text-slate-300 text-[11px] font-medium leading-relaxed text-left">
              {getSolarKhmerDate(currDateObj)}
            </div>
          </div>
        </div>
      </div>

      {/* GPS Status & Quick Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {/* GPS Widget */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full ${
                gpsStatus === "ok" || gpsStatus === "bypassed" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            ></span>
            <div>
              <div className="text-xs font-bold text-white">
                {bypassGps ? "✅ GPS ត្រូវបានបើកជាទូទៅ" : gpsStatus === "ok" ? "✅ នៅក្នុងសាលា (GPS OK)" : "⚠️ នៅក្រៅបរិវេណសាលា"}
              </div>
              <div className="text-[10px] text-slate-400">
                {bypassGps ? "អនុញ្ញាតឱ្យចុះហត្ថលេខាគ្រប់ទីកន្លែង" : `ចម្ងាយ ${gpsDistance}m (±${gpsAccuracy}m)`}
              </div>
            </div>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-amber-300 bg-slate-900 px-2 py-1 rounded-md border border-slate-700">
            <input
              type="checkbox"
              checked={bypassGps}
              onChange={(e) => setBypassGps(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            Bypass
          </label>
        </div>

        {/* Present Stats */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-400 flex items-center justify-center font-bold text-lg">
            ✓
          </div>
          <div>
            <div className="text-lg font-black text-emerald-400">{toKh(stats.present)} នាក់</div>
            <div className="text-[11px] text-slate-400 font-bold">វត្តមាន (មកបំពេញការងារ)</div>
          </div>
        </div>

        {/* Leave Stats */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-700 text-amber-400 flex items-center justify-center font-bold text-lg">
            ច
          </div>
          <div>
            <div className="text-lg font-black text-amber-400">{toKh(stats.leave)} នាក់</div>
            <div className="text-[11px] text-slate-400 font-bold">សុំច្បាប់ (មានច្បាប់អនុញ្ញាត)</div>
          </div>
        </div>

        {/* Total Staff */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-700 text-blue-400 flex items-center justify-center font-bold text-lg">
            👥
          </div>
          <div>
            <div className="text-lg font-black text-blue-400">{toKh(STAFF_LIST.length)} នាក់</div>
            <div className="text-[11px] text-slate-400 font-bold">បុគ្គលិក-គ្រូសរុបទាំងអស់</div>
          </div>
        </div>
      </div>

      {/* VIEW 1: DAILY ATTENDANCE TABLE */}
      {activeTab === "daily" && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white font-extrabold border-b border-slate-700 text-center">
                  <th className="p-3 w-10">ល.រ</th>
                  <th className="p-3 text-left min-w-[130px]">គោត្តនាម និងនាម</th>
                  <th className="p-3 w-14">ភេទ</th>
                  <th className="p-3 w-28">មុខតំណែង/ថ្នាក់</th>
                  <th className="p-3 min-w-[105px]">🌅 ព្រឹក-ចូល</th>
                  <th className="p-3 min-w-[105px]">☀️ ព្រឹក-ចេញ</th>
                  <th className="p-3 min-w-[105px]">🌇 រសៀល-ចូល</th>
                  <th className="p-3 min-w-[105px]">🌙 រសៀល-ចេញ</th>
                  <th className="p-3 min-w-[100px]">📞 ទូរស័ព្ទ</th>
                  <th className="p-3 min-w-[150px]">📝 ចំណាំ/មូលហេតុ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 bg-slate-900/60">
                {STAFF_LIST.map((staff, idx) => {
                  const rec = dayAttendance[staff.name] || {};
                  return (
                    <tr key={staff.id} className="hover:bg-slate-800/80 transition text-slate-200">
                      <td className="p-2.5 text-center font-bold text-slate-400">{toKh(idx + 1)}</td>
                      <td className="p-2.5 font-black text-white text-sm whitespace-nowrap">
                        {staff.name}
                        {staff.role === "director" && (
                          <span className="ml-1.5 text-[9px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.2 rounded font-bold">
                            នាយិកា
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-semibold">{staff.gender}</td>
                      <td className="p-2.5 font-medium whitespace-nowrap">
                        {staff.position} {staff.cls !== "-" && <strong className="text-amber-400">{staff.cls}</strong>}
                      </td>

                      {/* 4 Attendance Slots */}
                      {SLOT_CONFIG.map(({ key, label }) => {
                        const sigData = rec[key];
                        return (
                          <td key={key} className="p-1.5 text-center">
                            {sigData?.sig ? (
                              <div className="relative group bg-emerald-950/80 border border-emerald-600 rounded-lg p-1 flex flex-col items-center justify-center min-h-[50px]">
                                <img
                                  src={sigData.sig}
                                  alt="signature"
                                  className="max-h-7 object-contain drop-shadow"
                                />
                                <span className="text-[10px] text-emerald-300 font-extrabold mt-0.5">
                                  {sigData.time}
                                </span>
                                <button
                                  onClick={() => handleClearSlot(staff.name, key)}
                                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center transition shadow"
                                  title="លុបហត្ថលេខានេះ"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenSig(staff, key, label)}
                                className="w-full bg-slate-800 hover:bg-blue-900/60 border border-slate-700 hover:border-blue-500 rounded-lg p-2 flex flex-col items-center justify-center min-h-[50px] transition active:scale-95 text-slate-400 hover:text-blue-300"
                              >
                                <span className="text-xs">✍️</span>
                                <span className="text-[10px] font-bold mt-0.5">ចុះហត្ថលេខា</span>
                              </button>
                            )}
                          </td>
                        );
                      })}

                      <td className="p-2 text-center text-[11px] text-slate-400 font-mono">{staff.phone}</td>

                      <td className="p-1.5">
                        <input
                          type="text"
                          defaultValue={rec.note || ""}
                          onBlur={(e) => handleUpdateNote(staff.name, e.target.value)}
                          placeholder="ឧ. ច្បាប់, អត់ច្បាប់..."
                          className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 text-white rounded px-2 py-1 text-xs outline-none transition"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: MONTHLY DETAIL REPORT */}
      {activeTab === "report-detail" && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">ខែ:</span>
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold"
              >
                {KH_MONTHS_SOLAR.map((m, idx) => (
                  <option key={idx} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold"
              >
                {[reportYear - 1, reportYear, reportYear + 1].map((y) => (
                  <option key={y} value={y}>
                    {toKh(y)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerateReport}
                disabled={reportLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow"
              >
                {reportLoading ? "⏳ កំពុងទាញ..." : "🔄 បង្កើតរបាយការណ៍"}
              </button>
            </div>

            <div className="text-xs text-amber-300 font-bold">
              របាយការណ៍វត្តមានលម្អិតប្រចាំខែ {KH_MONTHS_SOLAR[reportMonth - 1]} ឆ្នាំ {toKh(reportYear)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-[11px]">
              <thead>
                <tr className="bg-blue-900 text-white font-bold">
                  <th className="p-2 border border-slate-700">ល.រ</th>
                  <th className="p-2 border border-slate-700 text-left min-w-[120px]">ឈ្មោះ</th>
                  <th className="p-2 border border-slate-700">ភេទ</th>
                  {Array.from({ length: new Date(reportYear, reportMonth, 0).getDate() }, (_, i) => i + 1).map((d) => (
                    <th key={d} className="p-1 border border-slate-700 w-6">
                      {toKh(d)}
                    </th>
                  ))}
                  <th className="p-2 border border-slate-700 bg-emerald-950 text-emerald-300">វត្តមាន</th>
                  <th className="p-2 border border-slate-700 bg-amber-950 text-amber-300">ច្បាប់</th>
                  <th className="p-2 border border-slate-700 bg-red-950 text-red-300">អត់ច្បាប់</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 bg-slate-900">
                {STAFF_LIST.map((staff, idx) => {
                  const daysInM = new Date(reportYear, reportMonth, 0).getDate();
                  let pCount = 0;
                  let lCount = 0;
                  let uCount = 0;

                  return (
                    <tr key={staff.id} className="hover:bg-slate-800/80">
                      <td className="p-1.5 border border-slate-700 text-slate-400">{toKh(idx + 1)}</td>
                      <td className="p-1.5 border border-slate-700 text-left font-bold text-white whitespace-nowrap">
                        {staff.name}
                      </td>
                      <td className="p-1.5 border border-slate-700">{staff.gender}</td>

                      {Array.from({ length: daysInM }, (_, i) => i + 1).map((d) => {
                        const dateKey = `${reportYear}-${String(reportMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                        const dayRec = monthData[dateKey]?.[staff.name];
                        const dow = new Date(reportYear, reportMonth - 1, d).getDay();
                        const isSunday = dow === 0;

                        let symbol = "-";
                        let colorClass = "text-slate-600";

                        if (isSunday) {
                          symbol = "–";
                          colorClass = "text-slate-600 bg-slate-950/40";
                        } else if (dayRec && (dayRec.m_in?.sig || dayRec.m_out?.sig || dayRec.a_in?.sig || dayRec.a_out?.sig)) {
                          symbol = "✓";
                          colorClass = "text-emerald-400 font-bold bg-emerald-950/30";
                          pCount++;
                        } else if (dayRec?.note?.includes("អត់ច្បាប់")) {
                          symbol = "អ";
                          colorClass = "text-red-400 font-bold bg-red-950/30";
                          uCount++;
                        } else if (dayRec?.note?.includes("ច្បាប់")) {
                          symbol = "ច";
                          colorClass = "text-amber-400 font-bold bg-amber-950/30";
                          lCount++;
                        }

                        return (
                          <td key={d} className={`p-1 border border-slate-700 ${colorClass}`}>
                            {symbol}
                          </td>
                        );
                      })}

                      <td className="p-1.5 border border-slate-700 font-extrabold text-emerald-400 bg-emerald-950/40">
                        {toKh(pCount)}
                      </td>
                      <td className="p-1.5 border border-slate-700 font-extrabold text-amber-400 bg-amber-950/40">
                        {toKh(lCount)}
                      </td>
                      <td className="p-1.5 border border-slate-700 font-extrabold text-red-400 bg-red-950/40">
                        {toKh(uCount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: MONTHLY SUMMARY REPORT */}
      {activeTab === "report-summary" && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-extrabold text-white">
              📋 តារាងសង្ខេបវត្តមានប្រចាំខែ {KH_MONTHS_SOLAR[reportMonth - 1]} ឆ្នាំ {toKh(reportYear)}
            </h2>
            <button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow"
            >
              🖨️ បោះពុម្ពតារាងសង្ខេប
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="bg-indigo-900 text-white font-extrabold border border-slate-700">
                  <th className="p-2.5 border border-slate-700">ល.រ</th>
                  <th className="p-2.5 border border-slate-700 text-left min-w-[140px]">គោត្តនាម និងនាម</th>
                  <th className="p-2.5 border border-slate-700">ភេទ</th>
                  <th className="p-2.5 border border-slate-700">មុខតំណែង</th>
                  <th className="p-2.5 border border-slate-700 text-emerald-300">ថ្ងៃមកធ្វើការ (✓)</th>
                  <th className="p-2.5 border border-slate-700 text-amber-300">សុំច្បាប់ (ច)</th>
                  <th className="p-2.5 border border-slate-700 text-red-300">អត់ច្បាប់ (អ)</th>
                  <th className="p-2.5 border border-slate-700 text-purple-300">ផ្សេងៗ</th>
                  <th className="p-2.5 border border-slate-700 text-blue-300">ភាគរយវត្តមាន</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 bg-slate-900">
                {STAFF_LIST.map((staff, idx) => {
                  const daysInM = new Date(reportYear, reportMonth, 0).getDate();
                  let pCount = 0;
                  let lCount = 0;
                  let uCount = 0;
                  let oCount = 0;
                  let workDays = 0;

                  for (let d = 1; d <= daysInM; d++) {
                    const dow = new Date(reportYear, reportMonth - 1, d).getDay();
                    if (dow !== 0) {
                      workDays++;
                      const dateKey = `${reportYear}-${String(reportMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const dayRec = monthData[dateKey]?.[staff.name];
                      if (dayRec && (dayRec.m_in?.sig || dayRec.m_out?.sig || dayRec.a_in?.sig || dayRec.a_out?.sig)) {
                        pCount++;
                      } else if (dayRec?.note?.includes("អត់ច្បាប់")) {
                        uCount++;
                      } else if (dayRec?.note?.includes("ច្បាប់")) {
                        lCount++;
                      } else if (dayRec?.note && dayRec.note.length > 0) {
                        oCount++;
                      }
                    }
                  }

                  const pct = workDays > 0 ? ((pCount / workDays) * 100).toFixed(1) : "0.0";

                  return (
                    <tr key={staff.id} className="hover:bg-slate-800">
                      <td className="p-2 border border-slate-700 text-slate-400">{toKh(idx + 1)}</td>
                      <td className="p-2 border border-slate-700 text-left font-bold text-white whitespace-nowrap">
                        {staff.name}
                      </td>
                      <td className="p-2 border border-slate-700">{staff.gender}</td>
                      <td className="p-2 border border-slate-700">{staff.position}</td>
                      <td className="p-2 border border-slate-700 font-extrabold text-emerald-400">{toKh(pCount)}</td>
                      <td className="p-2 border border-slate-700 font-extrabold text-amber-400">{toKh(lCount)}</td>
                      <td className="p-2 border border-slate-700 font-extrabold text-red-400">{toKh(uCount)}</td>
                      <td className="p-2 border border-slate-700 font-extrabold text-purple-400">{toKh(oCount)}</td>
                      <td className="p-2 border border-slate-700 font-black text-blue-400">{toKh(pct)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SIGNATURE MODAL (CANVAS) */}
      {sigModal.isOpen && sigModal.staff && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-fade-in text-center">
            <h3 className="text-base font-extrabold text-white mb-1">✍️ គូសហត្ថលេខាចុះវត្តមាន</h3>
            <p className="text-xs text-amber-400 font-bold mb-2">
              {sigModal.staff.name} · {sigModal.slotLabel}
            </p>

            <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[11px] rounded-lg p-1.5 mb-3 font-semibold">
              {bypassGps ? "✅ GPS Ready · អាចចុះហត្ថលេខាបាន" : `📍 GPS ក្នុងសាលា (${gpsDistance}m)`}
            </div>

            <canvas
              ref={canvasRef}
              width={280}
              height={130}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="border-2 border-blue-500 rounded-xl bg-white mx-auto mb-3 cursor-crosshair touch-none shadow-inner"
            />

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={clearCanvas}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition"
              >
                🧹 សម្អាត
              </button>
              <button
                onClick={handleSaveSignature}
                disabled={!hasDrawn}
                className={`text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow ${
                  hasDrawn ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-600 opacity-50 cursor-not-allowed"
                }`}
              >
                💾 រក្សាទុក
              </button>
              <button
                onClick={() => setSigModal({ isOpen: false, staff: null, slot: null, slotLabel: "" })}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs px-3 py-2 rounded-xl transition"
              >
                ✕ បោះបង់
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Khmer Lunar Date Picker Modal */}
      <KhmerLunarDatePickerModal
        isOpen={isLunarModalOpen}
        onClose={() => setIsLunarModalOpen(false)}
        initialDate={currDateObj}
        location="រោគ"
        onSelectDate={(sel) => {
          setSelectedDate(sel.dateString);
        }}
      />
    </div>
  );
};

