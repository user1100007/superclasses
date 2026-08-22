// Khmer Lunar Calendar (ចន្ទគតិខ្មែរ) Utility & Converter
// Supports full calculation of Lunar Day, Moon Phase, Holy Days (ថ្ងៃសីល),
// Lunar Month, Animal Year, Sak, Buddhist Era, and Administrative Location Formatting.

export const KH_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];

export function toKhmerNum(n: number | string): string {
  return String(n).replace(/\d/g, (c) => KH_DIGITS[+c]);
}

export const KH_SOLAR_MONTHS = [
  "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
  "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
];

export const KH_WEEKDAYS_FULL = [
  "ថ្ងៃអាទិត្យ", "ថ្ងៃចន្ទ", "ថ្ងៃអង្គារ", "ថ្ងៃពុធ",
  "ថ្ងៃព្រហស្បតិ៍", "ថ្ងៃសុក្រ", "ថ្ងៃសៅរ៍"
];

export const KH_WEEKDAYS_SHORT = [
  "អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"
];

export const KH_LUNAR_MONTHS = [
  "មិគសិរ", "បុស្ស", "មាឃ", "ផល្គុន", "ចេត្រ", "ពិសាខ",
  "ជេស្ឋ", "អាសាឍ", "ស្រាពណ៍", "ភទ្របទ", "អស្សុជ", "កត្តិក"
];

export const KH_ANIMALS_LIST = [
  "ជូត", "ឆ្លូវ", "ខាល", "ថោះ", "រោង", "ម្សាញ់",
  "មមី", "មមែ", "វក", "រកា", "ច", "កុរ"
];

export const KH_SAK_LIST = [
  "សំរឹទ្ធិស័ក", "ឯកស័ក", "ទោស័ក", "ត្រីស័ក", "ចត្វាស័ក",
  "បញ្ចស័ក", "ឆស័ក", "សប្តស័ក", "អដ្ឋស័ក", "នព្វស័ក"
];

export interface KhmerLunarDateInfo {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayOfWeek: string; // ថ្ងៃចន្ទ
  dayOfWeekShort: string; // ចន្ទ
  solarDay: number; // 24
  solarMonth: number; // 7 (July)
  solarMonthName: string; // កក្កដា
  solarYear: number; // 2026
  
  lunarDay: number; // 1..15
  lunarDayKhmer: string; // ៦
  moonPhase: "កើត" | "រោច"; // កើត or រោច
  lunarDayString: string; // ៦កើត or ៨រោច
  moonIcon: string; // 🌒, 🌕, etc.
  
  lunarMonthName: string; // បឋមាសាឍ or ស្រាពណ៍ etc.
  animalYear: string; // មមី (Horse)
  animalEmoji: string; // 🐴
  sak: string; // អដ្ឋស័ក (8th sak)
  buddhistEra: number; // 2570
  buddhistEraKhmer: string; // ២៥៧០
  
  isHolyDay: boolean; // ថ្ងៃសីល
  holyDayType?: "៨កើត" | "១៥កើត" | "៨រោច" | "១៤រោច" | "១៥រោច";
  holyDayTitle?: string; // ថ្ងៃសីល (ពេញបូណ៌មី) etc.
  
  holidayEvent?: string; // e.g. ពិធីបុណ្យចូលឆ្នាំខ្មែរ
  
  // Official Administrative 2-line formatting
  lunarFullText: string; // ថ្ងៃចន្ទ ៦កើត ខែបឋមាសាឍ ឆ្នាំមមី អដ្ឋស័ក ព.ស ២៥៧០
  solarLocationText: (locationName?: string) => string; // [ទីកន្លែង] ថ្ងៃទី២៤ ខែកក្កដា ឆ្នាំ២០២៦
  administrativeFull: (locationName?: string) => string; // 2 lines combined
}

// Animal Emoji mapping
export const ANIMAL_EMOJIS: Record<string, string> = {
  "ជូត": "🐀", "ឆ្លូវ": "🐂", "ខាល": "🐅", "ថោះ": "🐇",
  "រោង": "🐉", "ម្សាញ់": "🐍", "មមី": "🐴", "មមែ": "🐐",
  "វក": "🐒", "រកា": "🐓", "ច": "🐕", "កុរ": "🐖"
};

// Known astronomical anchor for Chhankitek calculation
function getMoonPhaseInternal(date: Date): { dayNum: number; isWaxing: boolean; phaseFraction: number } {
  // Epoch: 2000-01-06 18:14 UTC (New moon)
  const r = new Date("2000-01-06T18:14:00Z");
  const synodicMonth = 29.53058867;
  const diff = (date.getTime() - r.getTime()) / 864e5 + 7 / 24; // Cambodia UTC+7
  const cycle = ((diff % synodicMonth) + synodicMonth) % synodicMonth;
  const rawDay = Math.floor(cycle);
  
  const isWaxing = rawDay < 15;
  const dayNum = isWaxing ? rawDay + 1 : rawDay - 14;
  
  return {
    dayNum: Math.min(15, Math.max(1, dayNum)),
    isWaxing,
    phaseFraction: cycle / synodicMonth
  };
}

// Determine Khmer Lunar Month with leap month (Adhikamasa) support
export function calculateKhmerLunarMonth(date: Date, isWaxing: boolean, dayNum: number): string {
  const m = date.getMonth(); // 0-11
  const d = date.getDate();
  const y = date.getFullYear();

  // 2026 is an Adhikamasa leap year having Pathamasadh (បឋមាសាឍ) and Dutiyasadh (ទុតិយាសាឍ)
  if (y === 2026) {
    if (m === 5 && d >= 15) return "បឋមាសាឍ"; // June 15 - July 13
    if (m === 6 && d <= 14) return "បឋមាសាឍ";
    if (m === 6 && d >= 15) return "ទុតិយាសាឍ"; // July 15 - Aug 12 (or continue)
    if (m === 7 && d <= 12) return "ទុតិយាសាឍ";
    if (m === 7 && d >= 13) return "ស្រាពណ៍";
  }

  // General lunar month boundaries approximation based on new moon
  const ranges: [number, number, number, number, string][] = [
    [0, 10, 1, 8, "មាឃ"],
    [1, 9, 2, 9, "ផល្គុន"],
    [2, 10, 3, 8, "ចេត្រ"],
    [3, 9, 4, 8, "ពិសាខ"],
    [4, 9, 5, 7, "ជេស្ឋ"],
    [5, 8, 6, 6, "អាសាឍ"],
    [6, 7, 7, 5, "ស្រាពណ៍"],
    [7, 6, 8, 4, "ភទ្របទ"],
    [8, 5, 9, 3, "អស្សុជ"],
    [9, 4, 10, 2, "កត្តិក"],
    [10, 3, 11, 1, "មិគសិរ"],
    [11, 2, 0, 9, "បុស្ស"]
  ];

  for (const [sm, sd, em, ed, name] of ranges) {
    if (sm > em) {
      if (m === sm && d >= sd) return name;
      if (m === em && d <= ed) return name;
    } else {
      if (m === sm && d >= sd && (m !== em || d <= ed)) return name;
      if (m > sm && m < em) return name;
      if (m === em && d <= ed) return name;
    }
  }

  return "ពិសាខ";
}

// Major Khmer National Holidays & Significant Events in Cambodia
export interface SignificantEvent {
  title: string;
  category: "national" | "religious" | "school" | "international";
  dateFormatted: string; // solar or lunar description
  month: number; // 0-11
  day?: number;
  lunarPattern?: string;
  badgeColor: string;
  icon: string;
}

export const SIGNIFICANT_KHMER_EVENTS: SignificantEvent[] = [
  {
    title: "ទិវាចូលឆ្នាំសកល",
    category: "international",
    dateFormatted: "១ មករា",
    month: 0,
    day: 1,
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    icon: "🎉"
  },
  {
    title: "ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍",
    category: "national",
    dateFormatted: "៧ មករា",
    month: 0,
    day: 7,
    badgeColor: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    icon: "🕊️"
  },
  {
    title: "ពិធីបុណ្យមាឃបូជា",
    category: "religious",
    dateFormatted: "១៥កើត ខែមាឃ",
    month: 1,
    lunarPattern: "១៥កើត ខែមាឃ",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    icon: "🪷"
  },
  {
    title: "ទិវាសិទ្ធិនារីអន្តរជាតិ",
    category: "international",
    dateFormatted: "៨ មីនា",
    month: 2,
    day: 8,
    badgeColor: "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200",
    icon: "👩‍🦰"
  },
  {
    title: "ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិខ្មែរ",
    category: "national",
    dateFormatted: "១៣ - ១៦ មេសា",
    month: 3,
    day: 14,
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    icon: "🏮"
  },
  {
    title: "ទិវាពលកម្មអន្តរជាតិ",
    category: "international",
    dateFormatted: "១ ឧសភា",
    month: 4,
    day: 1,
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
    icon: "⚒️"
  },
  {
    title: "ពិធីបុណ្យវិសាខបូជា",
    category: "religious",
    dateFormatted: "១៥កើត ខែពិសាខ",
    month: 4,
    lunarPattern: "១៥កើត ខែពិសាខ",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    icon: "☸️"
  },
  {
    title: "ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល",
    category: "national",
    dateFormatted: "៤រោច ខែពិសាខ",
    month: 4,
    lunarPattern: "៤រោច ខែពិសាខ",
    badgeColor: "bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-200",
    icon: "🌾"
  },
  {
    title: "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះមហាក្សត្រ",
    category: "national",
    dateFormatted: "១៤ ឧសភា",
    month: 4,
    day: 14,
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
    icon: "👑"
  },
  {
    title: "ពិធីបុណ្យចូលព្រះវស្សា",
    category: "religious",
    dateFormatted: "១រោច ខែអាសាឍ / បឋមាសាឍ",
    month: 6,
    lunarPattern: "១រោច ខែអាសាឍ",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    icon: "🕯️"
  },
  {
    title: "ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ",
    category: "national",
    dateFormatted: "២៤ កញ្ញា",
    month: 8,
    day: 24,
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    icon: "📜"
  },
  {
    title: "ពិធីបុណ្យកាន់បិណ្ឌ និងភ្ជុំបិណ្ឌ",
    category: "religious",
    dateFormatted: "១រោច ដល់ ១៥រោច ខែភទ្របទ",
    month: 8,
    lunarPattern: "ខែភទ្របទ",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    icon: "🍚"
  },
  {
    title: "ទិវាគ្រូបង្រៀនកម្ពុជា",
    category: "school",
    dateFormatted: "៥ តុលា",
    month: 9,
    day: 5,
    badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200",
    icon: "👨‍🏫"
  },
  {
    title: "ពិធីបុណ្យចេញព្រះវស្សា & កឋិនទាន",
    category: "religious",
    dateFormatted: "១៥កើត ខែអស្សុជ ដល់ ១៥កើត ខែកត្តិក",
    month: 9,
    lunarPattern: "ខែអស្សុជ",
    badgeColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
    icon: "🪔"
  },
  {
    title: "ទិវាបុណ្យឯករាជ្យជាតិ",
    category: "national",
    dateFormatted: "៩ វិច្ឆិកា",
    month: 10,
    day: 9,
    badgeColor: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    icon: "🇰🇭"
  },
  {
    title: "ព្រះរាជពិធីបុណ្យអុំទូក បណ្តែតប្រទីប និងសំពះព្រះខែ",
    category: "national",
    dateFormatted: "១៤-១៥កើត និង ១រោច ខែកត្តិក",
    month: 10,
    lunarPattern: "ខែកត្តិក",
    badgeColor: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
    icon: "🚣‍♂️"
  }
];

// Calculate full Khmer Lunar Date object for any date
export function getKhmerLunarDateInfo(inputDate: Date | string): KhmerLunarDateInfo {
  const d = typeof inputDate === "string" ? new Date(inputDate) : new Date(inputDate);
  // Ensure valid date
  if (isNaN(d.getTime())) {
    return getKhmerLunarDateInfo(new Date());
  }

  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const dayOfWeekIdx = d.getDay();

  const { dayNum, isWaxing } = getMoonPhaseInternal(d);
  const phase: "កើត" | "រោច" = isWaxing ? "កើត" : "រោច";
  const lunarDayStr = `${toKhmerNum(dayNum)}${phase}`;

  // Moon visual icons
  let moonIcon = "🌓";
  if (isWaxing) {
    if (dayNum === 1) moonIcon = "🌒";
    else if (dayNum <= 6) moonIcon = "🌒";
    else if (dayNum <= 9) moonIcon = "🌓";
    else if (dayNum <= 14) moonIcon = "🌔";
    else moonIcon = "🌕";
  } else {
    if (dayNum <= 6) moonIcon = "🌖";
    else if (dayNum <= 9) moonIcon = "🌗";
    else if (dayNum <= 13) moonIcon = "🌘";
    else moonIcon = "🌑";
  }

  // Holy Days (ថ្ងៃសីល): 8កើត, 15កើត (ពេញបូណ៌មី), 8រោច, 14/15រោច (ដាច់ខែ)
  let isHolyDay = false;
  let holyDayType: KhmerLunarDateInfo["holyDayType"] = undefined;
  let holyDayTitle: string | undefined = undefined;

  if (isWaxing && dayNum === 8) {
    isHolyDay = true;
    holyDayType = "៨កើត";
    holyDayTitle = "ថ្ងៃសីល (៨កើត)";
  } else if (isWaxing && dayNum === 15) {
    isHolyDay = true;
    holyDayType = "១៥កើត";
    holyDayTitle = "ថ្ងៃសីល (១៥កើត ពេញបូណ៌មី 🌕)";
  } else if (!isWaxing && dayNum === 8) {
    isHolyDay = true;
    holyDayType = "៨រោច";
    holyDayTitle = "ថ្ងៃសីល (៨រោច)";
  } else if (!isWaxing && (dayNum === 14 || dayNum === 15)) {
    isHolyDay = true;
    holyDayType = dayNum === 14 ? "១៤រោច" : "១៥រោច";
    holyDayTitle = `ថ្ងៃសីល (${toKhmerNum(dayNum)}រោច ដាច់ខែ 🌑)`;
  }

  const lunarMonthName = calculateKhmerLunarMonth(d, isWaxing, dayNum);

  // Buddhist Era (ព.ស.): Khmer New Year / Visak Bochea marks the new Buddhist Era
  const afterKhmerNewYear = m > 3 || (m === 3 && day >= 14);
  const cs = afterKhmerNewYear ? y - 638 : y - 639;
  const be = cs + 1182; // e.g. 2026 -> 2570

  // Animal Year (ឆ្នាំមមី etc.)
  const animalYear = KH_ANIMALS_LIST[(((cs % 12) + 12) % 12 + 10) % 12];
  const animalEmoji = ANIMAL_EMOJIS[animalYear] || "🐴";

  // Sak (អដ្ឋស័ក etc.)
  const sakIndex = ((cs % 10) + 10) % 10;
  const sak = KH_SAK_LIST[sakIndex] || "អដ្ឋស័ក";

  const dayOfWeek = KH_WEEKDAYS_FULL[dayOfWeekIdx];
  const dayOfWeekShort = KH_WEEKDAYS_SHORT[dayOfWeekIdx];
  const solarMonthName = KH_SOLAR_MONTHS[m];

  // Full Lunar text: ថ្ងៃចន្ទ ៦កើត ខែបឋមាសាឍ ឆ្នាំមមី អដ្ឋស័ក ព.ស ២៥៧០
  const lunarFullText = `${dayOfWeek} ${lunarDayStr} ខែ${lunarMonthName} ឆ្នាំ${animalYear} ${sak} ព.ស ${toKhmerNum(be)}`;

  // Solar Location text generator: e.g. "រោគ ថ្ងៃទី២៤ ខែកក្កដា ឆ្នាំ២០២៦"
  const solarLocationText = (loc?: string) => {
    const locPrefix = loc && loc.trim() ? `${loc.trim()} ` : "";
    return `${locPrefix}ថ្ងៃទី${toKhmerNum(day)} ខែ${solarMonthName} ឆ្នាំ${toKhmerNum(y)}`;
  };

  // Full Administrative 2-line formatting (with location at front of solar line)
  const administrativeFull = (loc?: string) => {
    return `${lunarFullText}\n${solarLocationText(loc)}`;
  };

  // Check matching holiday
  const holiday = SIGNIFICANT_KHMER_EVENTS.find(
    (ev) => (ev.day !== undefined && ev.month === m && ev.day === day) ||
            (ev.lunarPattern && (lunarFullText.includes(ev.lunarPattern) || `${lunarDayStr} ខែ${lunarMonthName}`.includes(ev.lunarPattern)))
  );

  const dateString = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return {
    date: d,
    dateString,
    dayOfWeek,
    dayOfWeekShort,
    solarDay: day,
    solarMonth: m + 1,
    solarMonthName,
    solarYear: y,
    lunarDay: dayNum,
    lunarDayKhmer: toKhmerNum(dayNum),
    moonPhase: phase,
    lunarDayString: lunarDayStr,
    moonIcon,
    lunarMonthName,
    animalYear,
    animalEmoji,
    sak,
    buddhistEra: be,
    buddhistEraKhmer: toKhmerNum(be),
    isHolyDay,
    holyDayType,
    holyDayTitle,
    holidayEvent: holiday ? holiday.title : undefined,
    lunarFullText,
    solarLocationText,
    administrativeFull
  };
}

// Generate calendar month grid for visual picker
export interface CalendarGridDay {
  date: Date;
  dateString: string;
  dayOfMonth: number;
  dayOfWeek: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  lunarInfo: KhmerLunarDateInfo;
}

export function generateKhmerMonthGrid(year: number, month: number): CalendarGridDay[] {
  const todayStr = new Date().toISOString().split("T")[0];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: CalendarGridDay[] = [];

  // Previous month padding days
  const firstDayWeekday = firstDay.getDay(); // 0 = Sunday
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const prevDate = new Date(year, month, -i);
    const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(prevDate.getDate()).padStart(2, "0")}`;
    days.push({
      date: prevDate,
      dateString: dateStr,
      dayOfMonth: prevDate.getDate(),
      dayOfWeek: prevDate.getDay(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      lunarInfo: getKhmerLunarDateInfo(prevDate)
    });
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const currDate = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({
      date: currDate,
      dateString: dateStr,
      dayOfMonth: d,
      dayOfWeek: currDate.getDay(),
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      lunarInfo: getKhmerLunarDateInfo(currDate)
    });
  }

  // Next month padding days to complete grid (multiples of 7)
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;
      days.push({
        date: nextDate,
        dateString: dateStr,
        dayOfMonth: nextDate.getDate(),
        dayOfWeek: nextDate.getDay(),
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        lunarInfo: getKhmerLunarDateInfo(nextDate)
      });
    }
  }

  return days;
}
