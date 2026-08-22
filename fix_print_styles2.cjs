const fs = require('fs');

const cssStyles = `
      .space-y-6 > * + * { margin-top: 1.5rem; }
      .max-w-4xl { max-width: 56rem; }
      .mx-auto { margin-left: auto; margin-right: auto; }
      .p-2 { padding: 0.5rem; }
      .text-center { text-align: center; }
      .mb-6 { margin-bottom: 1.5rem; }
      .font-black { font-weight: 900; }
      .text-sm { font-size: 0.875rem; }
      .mb-1 { margin-bottom: 0.25rem; }
      .text-slate-900 { color: #0f172a; }
      .leading-tight { line-height: 1.25; }
      .text-\\[10px\\] { font-size: 10px; }
      .text-amber-800 { color: #92400e; }
      .font-normal { font-weight: 400; }
      .font-extrabold { font-weight: 800; }
      .text-\\[15px\\] { font-size: 15px; }
      .text-\\[14px\\] { font-size: 14px; }
      .leading-relaxed { line-height: 1.625; }
      .text-\\[12px\\] { font-size: 12px; }
      .font-bold { font-weight: 700; }
      .text-slate-800 { color: #1e293b; }
      .mb-4 { margin-bottom: 1rem; }
      .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
      .leading-8 { line-height: 2rem; }
      .leading-6 { line-height: 1.5rem; }
      .flex { display: flex; }
      .flex-wrap { flex-wrap: wrap; }
      .items-center { align-items: center; }
      .items-start { align-items: flex-start; }
      .justify-between { justify-content: space-between; }
      .gap-2 { gap: 0.5rem; }
      .border-b { border-bottom-width: 1px; }
      .border-dotted { border-style: dotted; }
      .border-slate-500 { border-color: #64748b; }
      .flex-1 { flex: 1 1 0%; }
      .w-24 { width: 6rem; }
      .h-24 { height: 6rem; }
      .text-blue-900 { color: #1e3a8a; }
      .w-full { width: 100%; }
      .border-collapse { border-collapse: collapse; }
      .border { border-width: 1px; }
      .border-2 { border-width: 2px; }
      .border-black { border-color: #000; }
      .border-slate-400 { border-color: #94a3b8; }
      .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
      .bg-slate-200\\/60 { background-color: rgba(226, 232, 240, 0.6); }
      .p-2 { padding: 0.5rem; }
      .w-28 { width: 7rem; }
      .w-12 { width: 3rem; }
      .w-10 { width: 2.5rem; }
      .w-14 { width: 3.5rem; }
      .w-6 { width: 1.5rem; }
      .p-1\\.5 { padding: 0.375rem; }
      .p-1 { padding: 0.25rem; }
      .w-16 { width: 4rem; }
      .text-\\[11px\\] { font-size: 11px; }
      .w-20 { width: 5rem; }
      .w-7 { width: 1.75rem; }
      .w-64 { width: 16rem; }
      .justify-end { justify-content: flex-end; }
      .justify-center { justify-content: center; }
      .mt-12 { margin-top: 3rem; }
      .mt-2 { margin-top: 0.5rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .text-left { text-align: left; }
      .space-y-2 > * + * { margin-top: 0.5rem; }
      .border-slate-300 { border-color: #cbd5e1; }
      .bg-blue-50\\/50 { background-color: rgba(239, 246, 255, 0.5); }
      .bg-emerald-50\\/50 { background-color: rgba(236, 253, 245, 0.5); }
      .text-emerald-900 { color: #064e3b; }
      .font-semibold { font-weight: 600; }
      .absolute { position: absolute; }
      .relative { position: relative; }
      .right-0 { right: 0px; }
      .top-0 { top: 0px; }
      .rounded-full { border-radius: 9999px; }
      .text-lg { font-size: 1.125rem; }
      .italic { font-style: italic; }
      .text-red-600 { color: #dc2626; }
      .mb-2 { margin-bottom: 0.5rem; }
      .text-slate-400 { color: #94a3b8; }
      .mx-auto { margin-left: auto; margin-right: auto; }
`;

let spr = fs.readFileSync('src/components/SchoolPriReport.tsx', 'utf-8');
spr = spr.replace(
  /th,td\{border:1px solid #000;padding:4px\}/,
  "th,td{border:1px solid #000;padding:4px}\n" + cssStyles
);
fs.writeFileSync('src/components/SchoolPriReport.tsx', spr);
