import React, { useState, useEffect, useMemo } from "react";
import {
  getKhmerLunarDateInfo,
  generateKhmerMonthGrid,
  KhmerLunarDateInfo,
  SIGNIFICANT_KHMER_EVENTS,
  KH_SOLAR_MONTHS,
  toKhmerNum,
  KH_WEEKDAYS_SHORT
} from "../lib/khmerLunarCalendar";

interface KhmerLunarDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string | Date;
  location: string;
  onSelectDate?: (selected: {
    dateString: string;
    lunarFullText: string;
    solarLocationText: string;
    administrativeFull: string;
    lunarInfo: KhmerLunarDateInfo;
  }) => void;
  title?: string;
  description?: string;
}

export const KhmerLunarDatePickerModal: React.FC<KhmerLunarDatePickerModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  location,
  onSelectDate,
  title = "ឧបករណ៍ពិនិត្យកាលបរិច្ឆេទចន្ទគតិ-សុរិយគតិខ្មែរ",
  description = "មើលកាលបរិច្ឆេទចន្ទគតិ ថ្ងៃសីល ព្រឹត្តិការណ៍ និងចម្លងទម្រង់រដ្ឋបាលសម្រាប់បញ្ចូលវត្តមាន ឬរបាយការណ៍"
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialDate) {
      const d = typeof initialDate === "string" ? new Date(initialDate) : initialDate;
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  });

  const [viewYear, setViewYear] = useState<number>(() => selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => selectedDate.getMonth());
  const [activeCategory, setActiveCategory] = useState<"all" | "national" | "religious" | "school">("all");
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Sync when initialDate changes
  useEffect(() => {
    if (initialDate) {
      const d = typeof initialDate === "string" ? new Date(initialDate) : initialDate;
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [initialDate, isOpen]);

  const lunarInfo = useMemo(() => {
    return getKhmerLunarDateInfo(selectedDate);
  }, [selectedDate]);

  const monthDays = useMemo(() => {
    return generateKhmerMonthGrid(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const showCopyFeedback = (msg: string) => {
    setCopyToast(msg);
    setTimeout(() => setCopyToast(null), 2500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showCopyFeedback(`📋 បានចម្លង: ${label}`);
    });
  };

  const handleApplySelection = () => {
    if (onSelectDate) {
      onSelectDate({
        dateString: lunarInfo.dateString,
        lunarFullText: lunarInfo.lunarFullText,
        solarLocationText: lunarInfo.solarLocationText(location),
        administrativeFull: lunarInfo.administrativeFull(location),
        lunarInfo
      });
    }
    onClose();
  };

  // Filtered significant events
  const filteredEvents = SIGNIFICANT_KHMER_EVENTS.filter((ev) => {
    if (activeCategory === "all") return true;
    return ev.category === activeCategory;
  });

  return (
    <div
      id="khmer-lunar-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="khmer-lunar-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-indigo-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-lg shadow-inner">
              🌙
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-amber-200 flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                  ព.ស. {lunarInfo.buddhistEraKhmer}
                </span>
              </h2>
              <p className="text-[11px] text-slate-300 line-clamp-1">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleJumpToday}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 border border-white/20"
              title="ត្រឡប់ទៅថ្ងៃនេះ"
            >
              <span>📅</span>
              <span className="hidden sm:inline">ថ្ងៃនេះ</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-red-500/80 text-white flex items-center justify-center text-sm transition"
              title="បិទ"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {copyToast && (
          <div className="bg-emerald-600 text-white text-xs font-bold py-1.5 px-4 text-center animate-bounce">
            {copyToast}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {/* Main 2-Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Interactive Khmer Calendar Grid (7 Cols) */}
            <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
              <div>
                {/* Month/Year Navigation */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 px-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-600 transition shadow-2xs"
                  >
                    ◀ ខែមុន
                  </button>

                  <div className="flex items-center gap-2">
                    <select
                      value={viewMonth}
                      onChange={(e) => setViewMonth(parseInt(e.target.value))}
                      className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs font-extrabold text-blue-700 dark:text-blue-300 outline-none cursor-pointer"
                    >
                      {KH_SOLAR_MONTHS.map((m, idx) => (
                        <option key={idx} value={idx}>
                          ខែ{m}
                        </option>
                      ))}
                    </select>

                    <select
                      value={viewYear}
                      onChange={(e) => setViewYear(parseInt(e.target.value))}
                      className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs font-extrabold text-blue-700 dark:text-blue-300 outline-none cursor-pointer"
                    >
                      {Array.from({ length: 15 }, (_, i) => 2020 + i).map((y) => (
                        <option key={y} value={y}>
                          ឆ្នាំ {toKhmerNum(y)} ({y})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 px-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-600 transition shadow-2xs"
                  >
                    ខែបន្ទាប់ ▶
                  </button>
                </div>

                {/* Calendar Grid Headers */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] mb-1.5 text-slate-500 dark:text-slate-400">
                  {KH_WEEKDAYS_SHORT.map((w, idx) => (
                    <div
                      key={idx}
                      className={`py-1 rounded-md ${idx === 0 ? "text-red-500 font-extrabold" : ""}`}
                    >
                      {w}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid Cells */}
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((item, idx) => {
                    const isSelected = item.dateString === lunarInfo.dateString;
                    const isSunday = item.dayOfWeek === 0;

                    let bgClass = "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300";
                    let borderClass = "border-slate-200 dark:border-slate-700";

                    if (!item.isCurrentMonth) {
                      bgClass = "bg-slate-100/60 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500 opacity-60";
                    }

                    if (isSelected) {
                      bgClass = "bg-blue-600 text-white font-black shadow-md ring-2 ring-blue-400";
                      borderClass = "border-blue-700";
                    } else if (item.isToday) {
                      bgClass = "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold";
                      borderClass = "border-amber-400";
                    } else if (item.lunarInfo.isHolyDay) {
                      bgClass = "bg-amber-50 dark:bg-amber-900/20 text-amber-950 dark:text-amber-300";
                      borderClass = "border-amber-300 dark:border-amber-700/60";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(item.date)}
                        className={`min-h-[52px] sm:min-h-[58px] p-1 rounded-lg border flex flex-col justify-between items-center transition cursor-pointer hover:border-blue-500 hover:shadow-xs relative ${bgClass} ${borderClass}`}
                      >
                        {/* Solar Day Number */}
                        <div className="flex items-center justify-between w-full px-0.5">
                          <span
                            className={`text-xs font-bold leading-none ${
                              isSunday && !isSelected ? "text-red-500" : ""
                            }`}
                          >
                            {item.dayOfMonth}
                          </span>
                          <span className="text-[10px] leading-none" title={item.lunarInfo.lunarDayString}>
                            {item.lunarInfo.moonIcon}
                          </span>
                        </div>

                        {/* Lunar Day (e.g. ៦កើត or ៨រោច) */}
                        <div
                          className={`text-[9px] sm:text-[10px] leading-tight px-1 rounded-sm text-center truncate max-w-full font-semibold ${
                            isSelected
                              ? "text-blue-100"
                              : item.lunarInfo.isHolyDay
                              ? "text-amber-700 dark:text-amber-400 font-black"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {item.lunarInfo.lunarDayString}
                        </div>

                        {/* Holy Day or Holiday Indicator Dots */}
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {item.lunarInfo.isHolyDay && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-amber-500"
                              title={item.lunarInfo.holyDayTitle}
                            />
                          )}
                          {item.lunarInfo.holidayEvent && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-red-500"
                              title={item.lunarInfo.holidayEvent}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
                    ថ្ងៃជ្រើសរើស
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                    ថ្ងៃសីល (៨/១៥កើត & ៨/១៤-១៥រោច)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                    បុណ្យជាតិ / ថ្ងៃឈប់
                  </span>
                </div>
                <div className="font-semibold text-slate-600 dark:text-slate-300">
                  ខែចន្ទគតិបច្ចុប្បន្ន: <strong className="text-blue-600 dark:text-blue-400">{lunarInfo.lunarMonthName}</strong>
                </div>
              </div>
            </div>

            {/* Right Column: Detailed Card, Administrative Output & Actions (5 Cols) */}
            <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
              {/* Live Formatted Administrative Preview Card (Strictly Left-Aligned as requested) */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-slate-800 dark:to-slate-800/90 border-2 border-amber-300/80 dark:border-amber-700/60 rounded-xl p-3.5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-300 border-b border-amber-200/80 dark:border-amber-800/60 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>📜</span>
                    <span>ទម្រង់កាលបរិច្ឆេទរដ្ឋបាល (Administrative Format):</span>
                  </span>
                  <span className="text-xs">{lunarInfo.moonIcon} {lunarInfo.animalEmoji}</span>
                </div>

                {/* The 2-Line Administrative Format (Left-Aligned) */}
                <div
                  id="admin-date-preview"
                  className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-lg p-3 text-left space-y-1 select-all font-medium text-slate-900 dark:text-slate-100"
                  style={{ fontFamily: "'Kantumruy Pro', 'Khmer OS Siemreap', sans-serif" }}
                >
                  {/* Line 1: Lunar Date */}
                  <div className="text-xs sm:text-[13px] font-bold text-blue-950 dark:text-blue-300 leading-relaxed text-left">
                    {lunarInfo.lunarFullText}
                  </div>

                  {/* Line 2: Location + Solar Date */}
                  <div className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-300 leading-relaxed text-left">
                    {lunarInfo.solarLocationText(location)}
                  </div>
                </div>

                {/* Holy Day / Event Notice */}
                {(lunarInfo.isHolyDay || lunarInfo.holidayEvent) && (
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {lunarInfo.isHolyDay && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 flex items-center gap-1 text-[11px]">
                        <span>🪷</span>
                        <span>{lunarInfo.holyDayTitle || "ថ្ងៃសីល"}</span>
                      </span>
                    )}
                    {lunarInfo.holidayEvent && (
                      <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-1 text-[11px]">
                        <span>🎉</span>
                        <span>{lunarInfo.holidayEvent}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Quick Copy Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        lunarInfo.administrativeFull(location),
                        "ទម្រង់រដ្ឋបាល ២ជួរ (Full 2-Line)"
                      )
                    }
                    className="col-span-2 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>📋</span>
                    <span>ចម្លងទម្រង់រដ្ឋបាលពេញលេញ (២ជួរ)</span>
                  </button>

                  <button
                    onClick={() =>
                      copyToClipboard(lunarInfo.lunarFullText, "កាលបរិច្ឆេទចន្ទគតិ (Lunar only)")
                    }
                    className="px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 text-slate-800 dark:text-white"
                  >
                    <span>🌙</span>
                    <span>ចម្លងចន្ទគតិ</span>
                  </button>

                  <button
                    onClick={() =>
                      copyToClipboard(
                        lunarInfo.solarLocationText(location),
                        "កាលបរិច្ឆេទសុរិយគតិ (Solar only)"
                      )
                    }
                    className="px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 text-slate-800 dark:text-white"
                  >
                    <span>☀️</span>
                    <span>ចម្លងសុរិយគតិ</span>
                  </button>
                </div>
              </div>

              {/* Date Metadata Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">ខ្នើត/រនោច:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{lunarInfo.lunarDayString}</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">ឆ្នាំ/ស័ក:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">
                    ឆ្នាំ{lunarInfo.animalYear} {lunarInfo.sak}
                  </span>
                </div>
              </div>

              {/* Apply / Insert Selection Button (if callback provided) */}
              {onSelectDate && (
                <button
                  onClick={handleApplySelection}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md"
                >
                  <span>✅</span>
                  <span>បញ្ចូលកាលបរិច្ឆេទនេះ (Insert Date)</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Section: Significant Events & Holidays Quick Lookup */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                <span>🏮</span>
                <span>បុណ្យជាតិ ពិធីសាសនា & ព្រឹត្តិការណ៍សំខាន់ៗ (Significant Events & Attendance Markers)</span>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1">
                {[
                  { id: "all", label: "ទាំងអស់" },
                  { id: "religious", label: "🪷 ពិធីសាសនា" },
                  { id: "national", label: "🇰🇭 បុណ្យជាតិ" },
                  { id: "school", label: "🏫 សាលារៀន" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id as any)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                      activeCategory === tab.id
                        ? "bg-indigo-600 text-white"
                        : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Event List Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredEvents.map((ev, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs flex items-start justify-between gap-1.5 hover:border-blue-400 transition"
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <span>{ev.icon}</span>
                      <span className="truncate">{ev.title}</span>
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                      {ev.dateFormatted}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (ev.month !== undefined && ev.day !== undefined) {
                        const targetDate = new Date(viewYear, ev.month, ev.day);
                        setSelectedDate(targetDate);
                        setViewMonth(ev.month);
                      }
                      copyToClipboard(
                        `[${ev.title}] ${ev.dateFormatted}`,
                        `ស្លាកព្រឹត្តិការណ៍: ${ev.title}`
                      );
                    }}
                    className="p-1 px-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white text-[10px] rounded font-bold transition"
                    title="មើល ឬចម្លងព្រឹត្តិការណ៍នេះ"
                  >
                    មើល/ចម្លង
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
            💡 គណនាកាលបរិច្ឆេទចន្ទគតិត្រឹមត្រូវតាមក្បួនចន្ទគតិខ្មែរ (Chhankitek) សម្រាប់ប្រើប្រាស់ក្នុងលិខិតរដ្ឋបាល
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg font-bold transition"
          >
            បិទ
          </button>
        </div>
      </div>
    </div>
  );
};
