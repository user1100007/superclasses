import React from "react";
import { Student } from "../types";

interface SeatingArrangementProps {
  students: Student[];
}

export const SeatingArrangement: React.FC<SeatingArrangementProps> = ({ students }) => {
  // Simple grid based on class size
  const totalStudents = students.length;
  const cols = 5; // Fixed number of columns for seating
  const rows = Math.ceil(totalStudents / cols);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg print:shadow-none print:p-0">
      <h2 className="text-xl font-black text-slate-800 mb-6 text-center print:text-black">
        គម្រោងកន្លែងអង្គុយ (Seating Arrangement)
      </h2>
      
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {students.map((student, index) => (
          <div 
            key={student.id} 
            className="border-2 border-slate-300 rounded-lg p-3 text-center text-xs font-bold text-slate-700 min-h-[60px] flex items-center justify-center bg-slate-50"
          >
            {student.lastName} {student.firstName}
          </div>
        ))}
      </div>
      
      <div className="mt-8 pt-4 border-t border-slate-200 text-center text-slate-500 text-xs">
        គ្រូ៖ ____________________ | កាលបរិច្ឆេទ៖ {new Date().toLocaleDateString('km-KH')}
      </div>
    </div>
  );
};
