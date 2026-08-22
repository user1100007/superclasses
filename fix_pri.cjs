const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsView.tsx', 'utf8');

// Undo the wrong injection
const wrongCode = `{reportType === "pri" && (
          <div dangerouslySetInnerHTML={{ __html: renderPriReport() }} />
        )}

        {reportType === "coregrade" && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">`;

if (code.includes(wrongCode)) {
  code = code.replace(wrongCode, `{reportType === "coregrade" && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">`);
}

// Target the correct place
const correctTarget = `{reportType === "coregrade" && (
          <div className="space-y-4">`;

if (code.includes(correctTarget)) {
  code = code.replace(correctTarget, `{reportType === "pri" && (
          <div dangerouslySetInnerHTML={{ __html: renderPriReport() }} />
        )}

        ${correctTarget}`);
}

fs.writeFileSync('src/components/ReportsView.tsx', code);
console.log("Fixed PRI report position");
