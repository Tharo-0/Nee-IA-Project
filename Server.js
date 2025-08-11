// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// sirve frontend si lo tienes en /public o /dist
app.use(express.static(path.join(__dirname, "public")));
app.get("/healthz", (req, res) => res.status(200).send("ok")); // para health check

// tu endpoint de chat (ejemplo)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ¡IMPORTANTE! usar el PORT de Render y 0.0.0.0
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listo en puerto ${PORT}`);
});
