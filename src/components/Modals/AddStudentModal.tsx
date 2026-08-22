import React, { useState } from "react";
import { Student } from "../../types";
import { BLANK_STUDENT, calcAge } from "../../lib/constants";

interface AddStudentModalProps {
  isOpen: boolean;
  selClass?: string;
  studentsCount?: number;
  onClose: () => void;
  onAddStudent: (newStudent: Omit<Student, "id">, photoDataUrl?: string) => Promise<void>;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  selClass = "6A",
  studentsCount = 0,
  onClose,
  onAddStudent,
  toast,
}) => {
  const [formData, setFormData] = useState<Omit<Student, "id">>({ ...BLANK_STUDENT });
  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoDataUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!formData.lastName.trim() || !formData.firstName.trim()) {
      toast("⚠️ សូមបំពេញ គោត្តនាម និងនាម!", "error");
      return;
    }
    setLoading(true);
    try {
      const ageVal = formData.dob ? calcAge(formData.dob) : formData.age;
      await onAddStudent({ ...formData, age: ageVal }, photoDataUrl);
      setFormData({ ...BLANK_STUDENT });
      setPhotoDataUrl("");
      onClose();
    } catch (e: any) {
      toast("❌ " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-fade-in">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
          <h3 className="font-extrabold text-blue-950 text-base flex items-center gap-1.5">
            <span>➕</span> បន្ថែមសិស្សថ្មី (Add Student)
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Photo Upload Ring */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <div
            onClick={() => document.getElementById("addModalFileInput")?.click()}
            className="w-20 h-20 rounded-full border-2 border-dashed border-blue-400 bg-blue-50/50 flex items-center justify-center overflow-hidden cursor-pointer relative group"
          >
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">📷</span>
            )}
            <div className="absolute inset-0 bg-black/40 text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              ជ្រើសរូប
            </div>
          </div>

          <div className="flex gap-2">
            <label className="bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-3 py-1 text-[11px] font-bold cursor-pointer hover:bg-blue-100">
              📁 Upload
              <input
                id="addModalFileInput"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <label className="bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-3 py-1 text-[11px] font-bold cursor-pointer hover:bg-emerald-100">
              📷 Camera
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {photoDataUrl && (
              <button
                onClick={() => setPhotoDataUrl("")}
                className="bg-red-50 text-red-600 border border-red-200 rounded-full px-3 py-1 text-[11px] font-bold hover:bg-red-100"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold text-slate-700">អត្តលេខ (Student ID)</label>
              <button
                type="button"
                onClick={() => {
                  const year = new Date().getFullYear();
                  const cls = selClass || "6A";
                  const num = String(studentsCount + 1).padStart(2, "0");
                  setFormData({ ...formData, code: `${year}-${cls}-${num}` });
                }}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer"
                title="បង្កើតអត្តលេខស្វ័យប្រវត្តិ"
              >
                ⚡ ស្វ័យប្រវត្តិ
              </button>
            </div>
            <input
              type="text"
              value={formData.code || ""}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder={`ឧ. ${new Date().getFullYear()}-${selClass || "6A"}-${String(studentsCount + 1).padStart(2, "0")}`}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">គោត្តនាម *</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="ស្វាង"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">នាម *</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="មនោរម្យ"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ភេទ</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600 bg-white"
            >
              <option value="ប្រុស">ប្រុស</option>
              <option value="ស្រី">ស្រី</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ថ្ងៃខែឆ្នាំកំណើត</label>
            <input
              type="date"
              value={formData.dob || ""}
              onChange={(e) => {
                const dob = e.target.value;
                const age = calcAge(dob);
                setFormData({ ...formData, dob, age });
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">អាយុ</label>
            <input
              type="text"
              value={formData.age || ""}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              placeholder="គិតស្វ័យប្រវត្តិ"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600 bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ទូរស័ព្ទ</label>
            <input
              type="text"
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="0xx xxx xxx"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ឈ្មោះឪពុក</label>
            <input
              type="text"
              value={formData.fatherName || ""}
              onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">មុខរបរឪពុក</label>
            <input
              type="text"
              value={formData.fatherJob || ""}
              onChange={(e) => setFormData({ ...formData, fatherJob: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ឈ្មោះម្តាយ</label>
            <input
              type="text"
              value={formData.motherName || ""}
              onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">មុខរបរម្តាយ</label>
            <input
              type="text"
              value={formData.motherJob || ""}
              onChange={(e) => setFormData({ ...formData, motherJob: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ភូមិ</label>
            <input
              type="text"
              value={formData.village || ""}
              onChange={(e) => setFormData({ ...formData, village: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ឃុំ</label>
            <input
              type="text"
              value={formData.commune || ""}
              onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ស្រុក</label>
            <input
              type="text"
              value={formData.district || ""}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ខេត្ត</label>
            <input
              type="text"
              value={formData.province || ""}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            ✕ បោះបង់
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {loading ? "⏳ កំពុងរក្សាទុក..." : "✅ រក្សាទុក → Firestore 🔥"}
          </button>
        </div>
      </div>
    </div>
  );
};
