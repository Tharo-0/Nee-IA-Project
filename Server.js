// server.js
import "dotenv/config.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import fetch from "node-fetch";
import { liveBrowse } from "./tools/webTool.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/healthz", (_, res) => res.status(200).send("ok"));

// 🔌 WEB LIVE (endpoint opcional para pruebas desde navegador)
app.get("/api/web", async (req, res) => {
  const q = req.query.q || "";
  if (!q) return res.status(400).json({ error: "missing q" });
  const data = await liveBrowse(q);
  res.json({ data });
});

// ====== LLM CHAT ROUTE ======
app.post("/api/chat", async (req, res) => {
  try {
    const userText = (req.body?.message || "").trim();

    // 🔌 Si el usuario escribe "!web ..." hacemos browsing antes del LLM
    let webContext = "";
    const webMatch = userText.match(/^!web\s+(.+)/i);
    if (webMatch) {
      const q = webMatch[1];
      webContext = await liveBrowse(q);
    }

    // ---- LLM (OpenAI Responses API estilo JSON) ----
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres una IA con acceso web cuando el usuario usa !web. Sé directo, cita las fuentes por dominio si el usuario las pide." },
          webContext
            ? { role: "system", content: `Contexto web fresco:\n${webContext}` }
            : null,
          { role: "user", content: userText }
        ].filter(Boolean),
        temperature: 0.3
      })
    });

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "Sin respuesta.";
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ====== START ======
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server on ${PORT}`));
