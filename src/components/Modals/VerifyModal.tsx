import React from "react";
import { Student, ScoreMap, TeacherProfile } from "../../types";
import { getAvg, getRank, gradeOf, resultOf, fmtAvg } from "../../lib/constants";
import { getLatinName } from "../../lib/printUtils";

interface VerifyModalProps {
  isOpen: boolean;
  student: Student | null;
  selClass: string;
  schoolName: string;
  students: Student[];
  scoresMap: Record<string, ScoreMap>;
  teacher?: TeacherProfile | null;
  onClose: () => void;
}

export const VerifyModal: React.FC<VerifyModalProps> = ({
  isOpen,
  student,
  selClass,
  schoolName,
  students,
  scoresMap,
  teacher,
  onClose,
}) => {
  if (!isOpen || !student) return null;

  const annualAvg = getAvg(student.id, students, scoresMap);
  const avgVal = annualAvg !== null 
    ? Number(fmtAvg(annualAvg)) 
    : (student._avgVal !== undefined && student._avgVal !== null ? Number(student._avgVal) : null);

  const grade = avgVal !== null 
    ? gradeOf(avgVal) 
    : (student._grade ? { l: student._grade, c: "#10b981" } : { l: "—", c: "#6b7280" });

  const calculatedRank = getRank(student.id, students, scoresMap);
  const rank = calculatedRank !== null ? calculatedRank : (student._rank || "—");

  const resultText = avgVal !== null 
    ? resultOf(avgVal) 
    : (student._resultText || "—");

  const displayClass = student._selClass || selClass || "—";
  const displaySchool = student._schoolName || schoolName || "សាលាបឋមសិក្សា";
  const displayTeacher = student._teacherName || (teacher ? `${teacher.title || ""} ${teacher.fullName || ""}`.trim() : "—");

  const latinName = getLatinName(student);
  const village = student.village || "រោគ";
  const commune = student.commune || "ស្ពានស្រែង";
  const district = student.district || "ភ្នំស្រុក";
  const province = student.province || "បន្ទាយមានជ័យ";
  const address = [student.village ? `ភូមិ${student.village}` : "", student.commune ? `ឃុំ${student.commune}` : "", student.district ? `ស្រុក${student.district}` : "", student.province ? `ខេត្ត${student.province}` : ""].filter(Boolean).join(", ") || `ភូមិ${village}, ឃុំ${commune}, ស្រុក${district}, ខេត្ត${province}`;

  const teacherPhone = teacher?.phone || "";
  const studentPhone = student.phone || "";
  const phoneStr = [teacherPhone ? `គ្រូ: ${teacherPhone}` : "", studentPhone ? `សិស្ស: ${studentPhone}` : ""].filter(Boolean).join(" | ") || "—";
  const gmailStr = teacher?.email || "—";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl border-2 border-emerald-500 text-center animate-fade-in max-h-[90vh] overflow-y-auto"
      >
        <div className="text-4xl mb-1">✅</div>
        <h3 className="text-emerald-700 font-black text-base mb-0.5">
          ព័ត៌មានផ្ទៀងផ្ទាត់ត្រឹមត្រូវ
        </h3>
        <p className="text-[10px] text-slate-500 font-medium mb-3">
          Credential Verification Status: Verified
        </p>

        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 text-left text-xs leading-relaxed text-slate-800 space-y-2 font-medium">
          <div>
            <strong>អត្តលេខ / ID ៖</strong> <span className="font-mono text-emerald-800 font-bold">{student.code || student.id}</span>
          </div>
          <div>
            <strong>ឈ្មោះសិស្ស ៖</strong> {student.lastName} {student.firstName} ({latinName})
          </div>
          <div>
            <strong>ភេទ ៖</strong> {student.gender || "—"} &nbsp;|&nbsp; <strong>កើត ៖</strong> {student.dob || "—"}
          </div>
          <div>
            <strong>អាសយដ្ឋាន ៖</strong> {address}
          </div>

          {(student.fatherName || student.fatherJob) && (
            <div>
              <strong>ឪពុក ៖</strong> {student.fatherName || "—"} {student.fatherJob ? `(${student.fatherJob})` : ""}
            </div>
          )}

          {(student.motherName || student.motherJob) && (
            <div>
              <strong>ម្ដាយ ៖</strong> {student.motherName || "—"} {student.motherJob ? `(${student.motherJob})` : ""}
            </div>
          )}

          <div>
            <strong>ថ្នាក់ទី ៖</strong> {displayClass} · {displaySchool}
          </div>

          <div>
            <strong>គ្រូបន្ទុកថ្នាក់ ៖</strong> {displayTeacher}
          </div>

          <div>
            <strong>លេខទូរស័ព្ទ ៖</strong> {phoneStr}
          </div>

          <div>
            <strong>Gmail / Email ៖</strong> {gmailStr}
          </div>

          <div className="border-t border-dashed border-emerald-300 my-2 pt-2 flex flex-wrap gap-2 text-xs">
            <span>
              <strong>មធ្យមភាគ ៖</strong> {avgVal !== null ? avgVal : "—"}
            </span>
            <span>|</span>
            <span>
              <strong>និទ្ទេស ៖</strong>{" "}
              <span className="font-black" style={{ color: grade.c }}>
                {grade.l}
              </span>
            </span>
            <span>|</span>
            <span>
              <strong>ចំណាត់ថ្នាក់ ៖</strong> #{rank !== null ? rank : "—"}
            </span>
          </div>

          <div>
            <strong>លទ្ធផលចុងក្រោយ ៖</strong>{" "}
            <span
              className={`font-extrabold ${
                resultText === "ជាប់" ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {resultText} (២០២៥-២០២៦)
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 bg-emerald-700 text-white font-extrabold text-xs px-6 py-2 rounded-xl hover:bg-emerald-800 transition cursor-pointer"
        >
          បិទ (Close)
        </button>
      </div>
    </div>
  );
};

