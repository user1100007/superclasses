import React, { useState } from "react";
import { Student, AttendanceMap, TeacherProfile } from "../types";
import { KhmerLunarDatePickerModal } from "./KhmerLunarDatePickerModal";
import { getKhmerLunarDateInfo, toKhmerNum } from "../lib/khmerLunarCalendar";

interface AttendanceTableProps {
  students: Student[];
  attendanceMap: Record<string, AttendanceMap>;
  editMode: boolean;
  onToggleAttendance: (studentId: string, day: number) => void;
  onOpenPhotoModal: (id: string, name: string, gender: string) => void;
  honorPhotos: Record<string, string>;
  selMonth?: number;
  teacher?: TeacherProfile | null;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  students,
  attendanceMap,
  editMode,
  onToggleAttendance,
  onOpenPhotoModal,
  honorPhotos,
  selMonth = 0,
  teacher,
}) => {
  const [isLunarModalOpen, setIsLunarModalOpen] = useState<boolean>(false);
  const [modalDate, setModalDate] = useState<Date>(new Date());

  if (!students.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-3xl mb-2">✅</div>
        <div className="text-xs font-semibold">មិនទាន់មានសិស្ស</div>
      </div>
    );
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const getAtt = (sid: string, day: number) => attendanceMap[sid]?.[day] ?? "";
  const cntAtt = (sid: string, type: "P" | "A") =>
    days.filter((d) => getAtt(sid, d) === type).length;

  // Compute month calendar context for lunar phase tooltip
  const MONTH_MAP = [10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // Academic months: Nov(10), Dec(11), Jan(0)...
  const now = new Date();
  const calMonth = MONTH_MAP[selMonth] !== undefined ? MONTH_MAP[selMonth] : now.getMonth();
  const calYear = selMonth === 0 || selMonth === 1 ? (now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear()) : now.getFullYear();

  const handleOpenDayLunar = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    setModalDate(d);
    setIsLunarModalOpen(true);
  };

  const defaultLocation = teacher?.village || teacher?.district || teacher?.province || "រោគ";

  return (
    <div className="overflow-x-auto">
      {/* Attendance Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-emerald-700 dark:text-emerald-400">✅ P = មានច្បាប់ (Present)</span>
          <span className="text-red-600 dark:text-red-400">❌ A = ឥតច្បាប់ (Absent)</span>
          {editMode && <span className="text-slate-500 dark:text-slate-400">· ចុចលើប្រអប់ដើម្បីកែប្រែ</span>}
        </div>

        {/* Khmer Lunar Date Tool Popup Button */}
        <button
          type="button"
          onClick={() => {
            setModalDate(new Date());
            setIsLunarModalOpen(true);
          }}
          className="bg-indigo-900 hover:bg-indigo-800 text-amber-300 border border-indigo-700/80 rounded-lg px-2.5 py-1 text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          title="បើកផ្ទាំងពិនិត្យកាលបរិច្ឆេទចន្ទគតិ-សុរិយគតិ និងថ្ងៃសីល"
        >
          <span>🌙</span>
          <span>ពិនិត្យកាលបរិច្ឆេទចន្ទគតិ & ថ្ងៃសីល</span>
        </button>
      </div>

      <table className="w-full text-xs text-left text-slate-700 dark:text-slate-200 border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white font-bold text-[10px] whitespace-nowrap sticky top-0 z-20">
            <th className="py-3 px-2 text-center w-8 sticky left-0 z-30 bg-slate-800">ល.រ</th>
            <th className="py-3 px-2.5 text-left min-w-[140px] sticky left-8 z-30 bg-slate-800">គោត្តនាម-នាម</th>
            <th className="py-3 px-2 text-center w-10 sticky left-[172px] z-30 bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">ភេទ</th>
            {days.map((d) => {
              const dayDate = new Date(calYear, calMonth, d);
              const info = getKhmerLunarDateInfo(dayDate);
              const isSunday = dayDate.getDay() === 0;

              return (
                <th
                  key={d}
                  onClick={() => handleOpenDayLunar(d)}
                  className={`py-2 px-1 text-center w-6 text-[9px] cursor-pointer hover:bg-slate-700 transition select-none ${
                    info.isHolyDay ? "bg-amber-950/80 text-amber-300" : isSunday ? "text-red-400" : ""
                  }`}
                  title={`ថ្ងៃទី${toKhmerNum(d)}: ${info.lunarDayString} ខែ${info.lunarMonthName} ${info.isHolyDay ? " (ថ្ងៃសីល 🪷)" : ""}`}
                >
                  <div>{d}</div>
                  <div className="text-[7px] text-slate-400 font-normal leading-none mt-0.5">
                    {info.moonIcon}
                  </div>
                </th>
              );
            })}
            <th className="py-3 px-2 text-center bg-emerald-800 text-white w-12">ច្បាប់</th>
            <th className="py-3 px-2 text-center bg-red-800 text-white w-12">អត់</th>
            <th className="py-3 px-2 text-center bg-slate-700 text-white w-12">សរុប</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {students.map((s, idx) => {
            const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
            const photo = honorPhotos[s.id] || s.photoUrl;
            const p = cntAtt(s.id, "P");
            const a = cntAtt(s.id, "A");
            const cellBg = idx % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/40" : "bg-white dark:bg-slate-900";

            return (
              <tr
                key={s.id}
                className={idx % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/30 hover:bg-blue-50/30" : "bg-white dark:bg-slate-900 hover:bg-blue-50/30"}
              >
                <td className={`py-2.5 px-2 text-center text-slate-400 font-bold sticky left-0 z-10 ${cellBg}`}>{idx + 1}</td>

                <td className={`py-2.5 px-2.5 text-left whitespace-nowrap font-bold text-slate-800 dark:text-slate-100 sticky left-8 z-10 ${cellBg}`}>
                  <div
                    onClick={() => onOpenPhotoModal(s.id, fullName, s.gender)}
                    className="flex items-center justify-start gap-1.5 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-blue-400 bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      {photo ? (
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px]">{s.gender === "ស្រី" ? "👩" : "👨"}</span>
                      )}
                    </div>
                    <span className="text-left">{fullName}</span>
                  </div>
                </td>

                <td className={`py-2.5 px-1 text-center font-semibold text-slate-500 dark:text-slate-400 sticky left-[172px] z-10 ${cellBg} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                  {s.gender === "ស្រី" ? "👩" : "👨"}
                </td>

                {days.map((day) => {
                  const val = getAtt(s.id, day);
                  let bg = "bg-transparent";
                  let text = "text-slate-300 dark:text-slate-600";

                  if (val === "P") {
                    bg = "bg-emerald-100 dark:bg-emerald-950/60";
                    text = "text-emerald-700 dark:text-emerald-300 font-bold";
                  } else if (val === "A") {
                    bg = "bg-red-100 dark:bg-red-950/60";
                    text = "text-red-600 dark:text-red-300 font-bold";
                  }

                  return (
                    <td
                      key={day}
                      onClick={() => editMode && onToggleAttendance(s.id, day)}
                      className={`py-1 px-1 text-center transition ${bg} ${
                        editMode ? "cursor-pointer hover:opacity-75" : ""
                      }`}
                    >
                      <span className={text}>{val || "·"}</span>
                    </td>
                  );
                })}

                <td className="py-1.5 px-2 text-center bg-slate-100 dark:bg-slate-800 font-bold text-emerald-700 dark:text-emerald-400">
                  {p}
                </td>
                <td className="py-1.5 px-2 text-center bg-slate-100 dark:bg-slate-800 font-bold text-red-600 dark:text-red-400">
                  {a}
                </td>
                <td className="py-1.5 px-2 text-center bg-slate-200 dark:bg-slate-700 font-extrabold text-slate-800 dark:text-slate-100">
                  {p + a}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Khmer Lunar Date Picker Modal */}
      <KhmerLunarDatePickerModal
        isOpen={isLunarModalOpen}
        onClose={() => setIsLunarModalOpen(false)}
        initialDate={modalDate}
        location={defaultLocation}
      />
    </div>
  );
};
