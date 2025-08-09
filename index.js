import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// servir frontend
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/chat", async (req, res) => {
  try {
    const message = (req.body && req.body.message || "").toString().trim();
    if (!message) return res.status(400).json({ error: "Mensaje requerido" });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Falta OPENAI_API_KEY en variables de entorno" });
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
        temperature: 0.7
      })
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).json({ error: "OpenAI error", detail: text });
    }

    const data = JSON.parse(text);
    const reply = data?.choices?.[0]?.message?.content ?? "(sin respuesta del modelo)";
    return res.json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error interno" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 New-IA online en puerto ${PORT}`));
