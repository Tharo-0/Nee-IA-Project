// index.js — versión robusta con fallback y debug
import "dotenv/config.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===== Import del webTool con fallback =====
let liveBrowse;
try {
  // Ruta esperada: ./tools/webTool.js (raíz del repo)
  ({ liveBrowse } = await import("./tools/webTool.js"));
  console.log("✅ Cargado: ./tools/webTool.js");
} catch (e1) {
  console.warn("⚠️ No encontré ./tools/webTool.js, probando ./src/tools/webTool.js");
  try {
    ({ liveBrowse } = await import("./src/tools/webTool.js"));
    console.log("✅ Cargado: ./src/tools/webTool.js");
  } catch (e2) {
    console.error("❌ No pude cargar webTool.js en ninguna ruta.");
    console.error("Error 1:", e1?.message);
    console.error("Error 2:", e2?.message);
    process.exit(1);
  }
}

// ===== Health & debug =====
app.get("/healthz", (_, res) => res.status(200).send("ok"));
app.get("/debug/where", async (_, res) => {
  try {
    const root = await fs.readdir(__dirname);
    const toolsA = await fs.readdir(path.join(__dirname, "tools")).catch(() => []);
    const toolsB = await fs.readdir(path.join(__dirname, "src", "tools")).catch(() => []);
    res.json({
      cwd: __dirname,
      root,
      "tools/": toolsA,
      "src/tools/": toolsB
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ===== API WEB =====
app.get("/api/web", async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  if (!q) return res.status(400).json({ error: "missing q" });
  try {
    const data = await liveBrowse(q);
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "web browse failed" });
  }
});

// ===== Chat (si usas tu frontend) =====
app.post("/api/chat", async (req, res) => {
  try {
    const text = (req.body?.message || "").trim();
    let ctx = "";
    const m = text.match(/^!web\s+(.+)/i);
    if (m) ctx = await liveBrowse(m[1]);
    res.json({ reply: ctx ? `OK web (${ctx.length} chars)` : "OK" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "chat failed" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server ON ${PORT}`));
