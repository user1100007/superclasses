import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Initialize Gemini AI client
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  // AI Remediation Plan endpoint
  app.post("/api/ai-plan", async (req, res) => {
    try {
      const { className, semesterName, defStudents } = req.body;

      if (!defStudents || !Array.isArray(defStudents) || defStudents.length === 0) {
        return res.status(400).json({ error: "No student data provided" });
      }

      if (!ai) {
        const fallbackText = generateFallbackPlan(className, semesterName, defStudents);
        return res.json({ plan: fallbackText });
      }

      const prompt = `
អ្នកគឺជាអ្នកជំនាញអប់រំបឋមសិក្សានៅប្រទេសកម្ពុជា។ សូមជួយរៀបចំ **ផែនការសកម្មភាពបំប៉ន និងកែលម្អលទ្ធផលសិក្សាសិស្សរៀនយឺត (និទ្ទេស D, E, F)** សម្រាប់ថ្នាក់ **${className || "៥A"}** ក្នុង **${semesterName || "ឆមាស១"}**។

បញ្ជីឈ្មោះសិស្សទទួលបាននិទ្ទេស D, E, F ក្នុងមុខវិជ្ជាភាសាខ្មែរ (៤ សមត្ថភាព: ស្ដាប់, អាន, និយាយ, សរសេរ) និង/ឬ គណិតវិទ្យា (៥ ដែន: ចំនួន, រង្វាស់រង្វាល់, ធរណីមាត្រ, ពីជគណិត, ស្ថិតិ) មានដូចតទៅ៖

${defStudents.map((s: any, idx: number) => `${idx + 1}. ឈ្មោះ: ${s.name} (ភេទ: ${s.gender}) | ខ្មែរ: មធ្យមភាគ ${s.khmerAvg || "—"} (និទ្ទេស ${s.khmerGrade || "—"}) | គណិត: មធ្យមភាគ ${s.mathAvg || "—"} (និទ្ទេស ${s.mathGrade || "—"})\n   មុខវិជ្ជា/ជំនាញខ្សោយ: ${s.weakSubjects?.join(", ") || "សរសេរ, ចំនួន"}`).join("\n")}

សូមរៀបចំផែនការលម្អិត ជាភាសាខ្មែរផ្លូវការ តាមទម្រង់ដូចខាងក្រោម៖
1. 🎯 **គោលបំណងនៃផែនការ** (Objectives)
2. 📋 **បញ្ជីឈ្មោះសិស្ស និងចំណុចខ្សោយសំខាន់ៗ** (Student Needs Breakdown)
3. 💡 **វិធានការ & វិធីសាស្ត្របង្រៀនបំប៉ន** សម្រាប់ភាសាខ្មែរ និង គណិតវិទ្យា (Actionable Teaching Strategies)
4. 📅 **កាលវិភាគបំប៉នប្រចាំសប្ដាហ៍** (Weekly Support Timetable)
5. 🤝 **ការសហការជាមួយអាណាព្យាបាល** (Parent-Teacher Collaboration)
6. 📈 **ការវាយតម្លៃ និងតាមដានលទ្ធផល** (Evaluation & Tracking)

សូមសរសេរឱ្យមានរបៀបរៀបរយ ច្បាស់លាស់ ងាយស្រួលអនុវត្ត និងសមស្របតាមកម្មវិធីសិក្សាក្រសួងអប់រំ យុវជន និងកីឡា។
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      const planText = response.text || "មិនអាចបង្កើតផែនការបានទេ។";
      res.json({ plan: planText });
    } catch (err: any) {
      console.error("AI Plan Generation error:", err);
      const { className, semesterName, defStudents } = req.body;
      const fallbackText = generateFallbackPlan(className, semesterName, defStudents || []);
      res.json({ plan: fallbackText });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function generateFallbackPlan(className: string, semesterName: string, defStudents: any[]) {
  return `
# 📘 ផែនការសកម្មភាពបំប៉ន និងកែលម្អលទ្ធផលសិក្សាសិស្សរៀនយឺត (និទ្ទេស D, E, F)
**ថ្នាក់ទី:** ${className || "—"} | **កាលបរិច្ឆេទ:** ${semesterName || "ឆមាស១"} | **ចំនួនសិស្សត្រូវបានស្រង់:** ${defStudents.length} នាក់

---

### 1. 🎯 គោលបំណងនៃផែនការ
* លើកកម្ពស់សមត្ថភាពសិស្សទទួលបាននិទ្ទេស D, E, F ក្នុងមុខវិជ្ជា **ភាសាខ្មែរ** (៤ សមត្ថភាព) និង **គណិតវិទ្យា** (៥ ដែន) ឱ្យឡើងដល់និទ្ទេស C ឬល្អជាងនេះ។
* បង្កើតបរិយាកាសសិក្សាគាំទ្រ រៀបចំម៉ោងបំប៉នបន្ថែម និងជួយសិស្សឱ្យយល់ដឹងពីមូលដ្ឋានគ្រឹះនៃមុខវិជ្ជានីមួយៗ។

---

### 2. 📋 បញ្ជីឈ្មោះសិស្ស និងចំណុចខ្សោយសំខាន់ៗ
${defStudents.map((s, i) => `${i + 1}. **${s.name}** (${s.gender}): ខ្មែរ [${s.khmerGrade || "—"}], គណិត [${s.mathGrade || "—"}] — *ចំណុចខ្សោយ:* ${s.weakSubjects?.join(", ") || "សមត្ថភាពសរសេរ, ផ្នែកចំនួន"}`).join("\n")}

---

### 3. 💡 វិធានការ & វិធីសាស្ត្របង្រៀនបំប៉ន
* **ភាសាខ្មែរ (៤ សមត្ថភាព):**
  - **អាន និង ស្ដាប់:** រៀបចំអត្ថបទខ្លីៗ មានរូបភាពគំនូរ ឱ្យសិស្សហាត់អានជាបុគ្គល និងជាក្រុម។
  - **សរសេរ:** អនុវត្តការហាត់សរសេរតាមអានពាក្យគន្លឹះ ឃ្លា និងល្បះខ្លីៗជារៀងរាល់ថ្ងៃ ២០ នាទី។
* **គណិតវិទ្យា (៥ ដែន):**
  - **ចំនួន និង លេខនព្វន្ត:** ប្រើប្រាស់សម្ភារឧបទេសជាក់ស្ដែង (ចង្កឹះ, គ្រាប់ឃ្លី) ហាត់បូក-ដក និងគុណ-ចែក លេខមូលដ្ឋាន។
  - **រង្វាស់រង្វាល់ & ធរណីមាត្រ:** ហាត់វាស់វែងជាក់ស្ដែងក្នុងថ្នាក់ និងស្គាល់រូបធរណីមាត្រគ្រឹះ។

---

### 4. 📅 កាលវិភាគបំប៉នប្រចាំសប្ដាហ៍
* **ថ្ងៃចន្ទ - ពុធ (ម៉ោង ១២:៣០ - ១:០០ រសៀល):** បំប៉នមុខវិជ្ជា **ភាសាខ្មែរ** (អាន និងសរសេរ)
* **ថ្ងៃអង្គារ - ព្រហស្បតិ៍ (ម៉ោង ១២:៣០ - ១:០០ រសៀល):** បំប៉នមុខវិជ្ជា **គណិតវិទ្យា** (គណនាលេខ និងដោះស្រាយចំណោទ)
* **ថ្ងៃសុក្រ:** ផ្គូផ្គងសិស្សពូកែជួយសិស្សខ្សោយ (Peer Tutoring) និងធ្វើតេស្តសាកល្បងខ្លី ១៥ នាទី។

---

### 5. 🤝 ការសហការជាមួយអាណាព្យាបាល
* ជួបពិភាក្សាផ្ទាល់ជាមួយអាណាព្យាបាលសិស្សទាំង ${defStudents.length} នាក់ ដើម្បីជំរុញការសិក្សានៅផ្ទះ។
* ប្រគល់កិច្ចការផ្ទះកម្រិតស្រាល (១៥ នាទី/ថ្ងៃ) និងសុំឱ្យអាណាព្យាបាលចុះហត្ថលេខាពិនិត្យរាល់ថ្ងៃ។

---

### 6. 📈 ការវាយតម្លៃ និងតាមដានលទ្ធផល
* ធ្វើការវាយតម្លៃវឌ្ឍនភាពរៀងរាល់ ២ សប្ដាហ៍ម្ដង ដោយកត់ត្រាពិន្ទុ និងនិទ្ទេសថ្មី។
* ផ្តល់ការលើកទឹកចិត្ត និងប័ណ្ណសរសើរតូចៗ នៅពេលសិស្សមានការរីកចម្រើន។
`;
}

startServer();
