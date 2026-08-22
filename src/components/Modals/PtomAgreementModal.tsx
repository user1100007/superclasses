import React, { useState, useEffect } from "react";
import { Student, PtomRecord } from "../../types";

interface PtomAgreementModalProps {
  isOpen: boolean;
  selClass: string;
  students: Student[];
  initialStudentId?: string;
  ptomRecords: Record<string, PtomRecord>;
  onSaveRecord: (studentId: string, record: PtomRecord) => Promise<void>;
  onClose: () => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
  onPrintStudent?: (studentId: string) => void;
  onPrintPlan?: (studentId: string) => void;
}

const DEFAULT_PTOM: PtomRecord = {
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

export const PtomAgreementModal: React.FC<PtomAgreementModalProps> = ({
  isOpen,
  selClass,
  students,
  initialStudentId,
  ptomRecords,
  onSaveRecord,
  onClose,
  toast,
  onPrintStudent,
  onPrintPlan,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [formData, setFormData] = useState<PtomRecord>(DEFAULT_PTOM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialStudentId && students.some((s) => s.id === initialStudentId)) {
      setSelectedStudentId(initialStudentId);
    } else if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [isOpen, initialStudentId, students]);

  useEffect(() => {
    if (!selectedStudentId) return;
    const existing = ptomRecords[selectedStudentId];
    if (existing) {
      setFormData({
        familyStatus: existing.familyStatus || "រស់នៅជាមួយឪពុកម្ដាយ",
        khmerBaseline: existing.khmerBaseline || "F",
        mathBaseline: existing.mathBaseline || "F",

        khmerQ1Plan: existing.khmerQ1Plan || "",
        khmerQ1Actual: existing.khmerQ1Actual || "",
        khmerQ2Plan: existing.khmerQ2Plan || "",
        khmerQ2Actual: existing.khmerQ2Actual || "",
        khmerQ3Plan: existing.khmerQ3Plan || "",
        khmerQ3Actual: existing.khmerQ3Actual || "",
        khmerQ4Plan: existing.khmerQ4Plan || "",
        khmerQ4Actual: existing.khmerQ4Actual || "",

        mathQ1Plan: existing.mathQ1Plan || "",
        mathQ1Actual: existing.mathQ1Actual || "",
        mathQ2Plan: existing.mathQ2Plan || "",
        mathQ2Actual: existing.mathQ2Actual || "",
        mathQ3Plan: existing.mathQ3Plan || "",
        mathQ3Actual: existing.mathQ3Actual || "",
        mathQ4Plan: existing.mathQ4Plan || "",
        mathQ4Actual: existing.mathQ4Actual || "",
      });
    } else {
      setFormData(DEFAULT_PTOM);
    }
  }, [selectedStudentId, ptomRecords]);

  if (!isOpen) return null;

  const activeStudent = students.find((s) => s.id === selectedStudentId);

  const handleAutoFill = () => {
    setFormData({
      familyStatus: "រស់នៅជាមួយឪពុកម្ដាយ",
      khmerBaseline: "F",
      mathBaseline: "F",
      khmerQ1Plan: "E",
      khmerQ1Actual: "E",
      khmerQ2Plan: "D",
      khmerQ2Actual: "D",
      khmerQ3Plan: "D+",
      khmerQ3Actual: "D+",
      khmerQ4Plan: "C",
      khmerQ4Actual: "C",

      mathQ1Plan: "E",
      mathQ1Actual: "E",
      mathQ2Plan: "D",
      mathQ2Actual: "D",
      mathQ3Plan: "D+",
      mathQ3Actual: "D+",
      mathQ4Plan: "C",
      mathQ4Actual: "C",
    });
    toast("⚡ បានបំពេញគំរូទិន្នន័យ PTOM ដោយជោគជ័យ", "info");
  };

  const handleSave = async () => {
    if (!selectedStudentId) {
      toast("⚠️ សូមជ្រើសរើសសិស្ស!", "error");
      return;
    }
    setSaving(true);
    try {
      await onSaveRecord(selectedStudentId, {
        ...formData,
        updatedAt: Date.now(),
      });
      toast("✅ បានរក្សាទុកកិច្ចព្រមព្រៀងសិស្សដោយជោគជ័យ!", "success");
    } catch (e: any) {
      toast("❌ " + e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base">📜</span>
            <div>
              <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400">
                បញ្ចូល/កែប្រែកិច្ចព្រមព្រៀងរៀនសូត្រ (PTOM) - ថ្នាក់ទី {selClass}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Student Selector & Action Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700 mb-3 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex-1 min-w-[200px] flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              សិស្ស ៖
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.lastName} {s.firstName} ({s.gender}) {ptomRecords[s.id] ? "✓" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={handleAutoFill}
              type="button"
              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-[11px] font-bold rounded-md transition"
              title="បំពេញទិន្នន័យគំរូ"
            >
              ⚡ គំរូ
            </button>
            {onPrintStudent && activeStudent && (
              <button
                onClick={() => onPrintStudent(activeStudent.id)}
                type="button"
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-md shadow transition"
              >
                📜 កិច្ចព្រមព្រៀង
              </button>
            )}
            {onPrintPlan && activeStudent && (
              <button
                onClick={() => onPrintPlan(activeStudent.id)}
                type="button"
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-md shadow transition"
              >
                📋 ផែនការ
              </button>
            )}
          </div>
        </div>

        {activeStudent && (
          <div className="space-y-3 text-xs">
            {/* General Baseline Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-blue-50/50 dark:bg-slate-800/40 p-2 rounded-lg border border-blue-100 dark:border-slate-700">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                  ស្ថានភាពគ្រួសារ ៖
                </label>
                <input
                  type="text"
                  value={formData.familyStatus || ""}
                  onChange={(e) => setFormData({ ...formData, familyStatus: e.target.value })}
                  placeholder="រស់នៅជាមួយឪពុកម្ដាយ"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                  ដើមឆ្នាំ - ភាសាខ្មែរ ៖
                </label>
                <select
                  value={formData.khmerBaseline || "F"}
                  onChange={(e) => setFormData({ ...formData, khmerBaseline: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-bold text-red-600 dark:text-red-400"
                >
                  {["F", "E", "D", "C", "B", "A"].map((g) => (
                    <option key={g} value={g}>
                      កម្រិត {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                  ដើមឆ្នាំ - គណិតវិទ្យា ៖
                </label>
                <select
                  value={formData.mathBaseline || "F"}
                  onChange={(e) => setFormData({ ...formData, mathBaseline: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-bold text-purple-600 dark:text-purple-400"
                >
                  {["F", "E", "D", "C", "B", "A"].map((g) => (
                    <option key={g} value={g}>
                      កម្រិត {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Combined Subject Quarters Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-1.5 text-left pl-3">មុខវិជ្ជា / ត្រីមាស</th>
                    <th className="p-1.5 w-1/5">ត្រីមាសទី១</th>
                    <th className="p-1.5 w-1/5">ត្រីមាសទី២</th>
                    <th className="p-1.5 w-1/5">ត្រីមាសទី៣</th>
                    <th className="p-1.5 w-1/5">ត្រីមាសទី៤</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {/* Khmer Row */}
                  <tr>
                    <td className="p-2 text-left font-bold text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                      📘 ភាសាខ្មែរ
                    </td>
                    {[
                      { pKey: "khmerQ1Plan", aKey: "khmerQ1Actual" },
                      { pKey: "khmerQ2Plan", aKey: "khmerQ2Actual" },
                      { pKey: "khmerQ3Plan", aKey: "khmerQ3Actual" },
                      { pKey: "khmerQ4Plan", aKey: "khmerQ4Actual" },
                    ].map((q, idx) => (
                      <td key={idx} className="p-1.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-bold w-7 text-right">ផែន:</span>
                            <input
                              type="text"
                              value={(formData as any)[q.pKey] || ""}
                              onChange={(e) => setFormData({ ...formData, [q.pKey]: e.target.value })}
                              placeholder="E"
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-red-500 font-bold w-7 text-right">ជាក់:</span>
                            <input
                              type="text"
                              value={(formData as any)[q.aKey] || ""}
                              onChange={(e) => setFormData({ ...formData, [q.aKey]: e.target.value })}
                              placeholder="E"
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-red-600 dark:text-red-400"
                            />
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Math Row */}
                  <tr>
                    <td className="p-2 text-left font-bold text-purple-700 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/20">
                      📐 គណិតវិទ្យា
                    </td>
                    {[
                      { pKey: "mathQ1Plan", aKey: "mathQ1Actual" },
                      { pKey: "mathQ2Plan", aKey: "mathQ2Actual" },
                      { pKey: "mathQ3Plan", aKey: "mathQ3Actual" },
                      { pKey: "mathQ4Plan", aKey: "mathQ4Actual" },
                    ].map((q, idx) => (
                      <td key={idx} className="p-1.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-bold w-7 text-right">ផែន:</span>
                            <input
                              type="text"
                              value={(formData as any)[q.pKey] || ""}
                              onChange={(e) => setFormData({ ...formData, [q.pKey]: e.target.value })}
                              placeholder="E"
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold w-7 text-right">ជាក់:</span>
                            <input
                              type="text"
                              value={(formData as any)[q.aKey] || ""}
                              onChange={(e) => setFormData({ ...formData, [q.aKey]: e.target.value })}
                              placeholder="E"
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-center font-bold text-purple-600 dark:text-purple-400"
                            />
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10.5px] text-slate-400 dark:text-slate-500 italic text-center">
              កម្រិតនិទ្ទេសសមត្ថភាព ៖ F (ខ្សោយខ្លាំង), E/D (មធ្យម/បង្គួរ), D+/C (ល្អ), B/A (ល្អប្រសើរ)
            </p>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <button
            onClick={onClose}
            type="button"
            className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
          >
            បិទ
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            type="button"
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow transition disabled:opacity-50"
          >
            {saving ? "កំពុងរក្សាទុក..." : "💾 រក្សាទុកកិច្ចព្រមព្រៀង"}
          </button>
        </div>
      </div>
    </div>
  );
};
