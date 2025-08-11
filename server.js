import "dotenv/config.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import fetch from "node-fetch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
if (!OPENAI_API_KEY) { console.error("❌ Falta OPENAI_API_KEY"); process.exit(1); }
console.log(`🔐 OPENAI_API_KEY: ${OPENAI_API_KEY.slice(0,10)}... (len=${OPENAI_API_KEY.length})`);

// --- IMPORT WEB TOOL (src/tools o tools) ---
let liveBrowse;
try {
  ({ liveBrowse } = await import("./src/tools/webTool.js"));
} catch {
  ({ liveBrowse } = await import("./tools/webTool.js"));
}

app.get("/healthz", (_, res) => res.send("ok"));
app.get("/env-ok", (_, res) => res.json({ ok: !!OPENAI_API_KEY }));

app.get("/api/web", async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  if (!q) return res.status(400).json({ error: "missing q" });
  const data = await liveBrowse(q);
  res.json({ data });
});

app.post("/api/chat", async (req, res) => {
  try {
    const userText = (req.body?.message || "").trim();
    let webContext = "";
    const m = userText.match(/^!web\s+(.+)/i);
    if (m) webContext = await liveBrowse(m[1]);

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Modo web con !web. Sé directo." },
          webContext ? { role: "system", content: `Contexto web:\n${webContext}` } : null,
          { role: "user", content: userText }
        ].filter(Boolean),
        temperature: 0.3
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(400).json({ error: data });
    res.json({ reply: data?.choices?.[0]?.message?.content || "Sin respuesta." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server ON ${PORT}`));
