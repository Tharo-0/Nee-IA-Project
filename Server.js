// Server.js
import "dotenv/config.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY MISSING. Set it in Render → Environment.");
  process.exit(1);
}
// log de verificación (enmascarado, solo en logs de Render)
console.log(
  `🔐 OPENAI_API_KEY loaded: ${OPENAI_API_KEY.slice(0, 10)}... (len=${OPENAI_API_KEY.length})`
);

app.get("/healthz", (_, res) => res.status(200).send("ok"));
app.get("/env-ok", (_, res) => res.json({ ok: !!OPENAI_API_KEY })); // no expone la key

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const userText = (req.body?.message || "").trim() || "Hola";

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Responde directo, en español, breve y claro." },
          { role: "user", content: userText }
        ],
        temperature: 0.3
      })
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("OpenAI error:", data);
      return res.status(400).json({ error: data });
    }
    const reply = data?.choices?.[0]?.message?.content || "Sin respuesta.";
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server ON at ${PORT}`));
