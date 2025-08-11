// index.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { liveBrowse } from "./tools/webTool.js"; // Ruta corregida

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/web", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: "Falta el parámetro q" });
    }
    const data = await liveBrowse(query);
    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en la búsqueda web" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
