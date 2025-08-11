// tools/webTool.js
import fetch from "node-fetch";
import cheerio from "cheerio";
import pLimit from "p-limit";

const UA = "Mozilla/5.0 (New-IA; +https://render.com)";
const limit = pLimit(3);

// Detecta si la respuesta es JSON
async function readSmart(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    try { return await res.json(); } catch { /* cae a texto */ }
  }
  return await res.text();
}

// Limpia HTML a texto
function htmlToText(html) {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg,iframe,header,footer,nav").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

// ====== SEARCH (opcional Tavily) ======
export async function webSearch(query) {
  if (!process.env.TAVILY_API_KEY) return { results: [], answer: "" };
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      include_answer: true,
      max_results: 5
    })
  });
  const data = await r.json().catch(() => ({}));
  const items = (data.results || []).map(x => ({ url: x.url, title: x.title }));
  return { results: items, answer: data.answer || "" };
}

// ====== FETCH de páginas (HTML o JSON) ======
export async function fetchPageSmart(url) {
  try {
    if (!/^https?:\/\//i.test(url)) throw new Error("Invalid URL");
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    const body = await readSmart(res);

    if (typeof body === "string") {
      // HTML o texto
      const text = body.startsWith("<") ? htmlToText(body) : body;
      return text.slice(0, 8000);
    } else {
      // JSON → conviértelo a texto compacto
      return JSON.stringify(body).slice(0, 8000);
    }
  } catch (e) {
    return `ERROR_FETCH: ${e.message}`;
  }
}

// ====== Orquesta: busca, visita y resume ======
export async function liveBrowse(query) {
  const s = await webSearch(query);
  const targets = (s.results?.length ? s.results.map(r => r.url) : [ // si no hay Tavily, prueba con web básico
    `https://r.jina.ai/http://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  ]).slice(0, 3);

  const pages = await Promise.all(targets.map(u => limit(() => fetchPageSmart(u))));
  const bundle = targets.map((u, i) => `# ${u}\n${pages[i]}`).join("\n\n---\n\n");
  const preface = s.answer ? `Resumen inicial: ${s.answer}\n\n` : "";
  return preface + bundle;
}
