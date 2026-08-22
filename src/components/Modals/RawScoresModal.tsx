import React from "react";
import { Student, ScoreMap } from "../../types";
import { MONTHS, KH_ORDER, MT_ORDER, SEMESTERS } from "../../lib/constants";

interface RawScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  allMonthsScores: Record<string, Record<string, ScoreMap>>;
  semesterId: string;
}

export const RawScoresModal: React.FC<RawScoresModalProps> = ({
  isOpen,
  onClose,
  student,
  allMonthsScores,
  semesterId,
}) => {
  if (!isOpen || !student) return null;

  const components = [...KH_ORDER, ...MT_ORDER];
  const semConfig = SEMESTERS.find((s) => s.id === semesterId);
  const monthsInSem = semConfig?.months || (semesterId === "s1" ? [0, 1, 2, 3] : [6, 7, 8]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <h3 className="text-sm font-black">📊 ពិន្ទុសមាសភាគលម្អិត៖ {student.lastName} {student.firstName}</h3>
          <button onClick={onClose} className="text-white font-bold">✕</button>
        </div>
        <div className="p-4 overflow-y-auto">
          <table className="w-full text-[11px] border-collapse border border-slate-300 dark:border-slate-700">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800">
                <th className="border p-2">មុខវិជ្ជា/សមាសភាគ</th>
                {monthsInSem.map(m => <th key={m} className="border p-2">ខែ{MONTHS[m]}</th>)}
              </tr>
            </thead>
            <tbody>
              {components.map(comp => (
                <tr key={comp} className="border-b">
                  <td className="border p-2 font-bold">{comp}</td>
                  {monthsInSem.map(m => {
                    const key = `${semesterId}_${m}`;
                    const score = allMonthsScores[key]?.[student.id]?.[comp];
                    return <td key={m} className="border p-2 text-center">{score ?? "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
