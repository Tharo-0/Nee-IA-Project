// tools/webTool.js
import fetch from "node-fetch";
import cheerio from "cheerio";
import pLimit from "p-limit";

const UA = "Mozilla/5.0 (compatible; New-IA/1.0; +https://render.com)";
const limit = pLimit(3);

// ---- Search via Tavily (mejor para calidad) ----
export async function webSearch(query) {
  if (!process.env.TAVILY_API_KEY) return { results: [], note: "TAVILY_API_KEY missing" };
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
  const data = await r.json();
  const items = (data.results || []).map(x => ({ url: x.url, title: x.title }));
  const answer = data.answer || "";
  return { results: items, answer };
}

// ---- Fallback: fetch HTML y limpiar texto ----
export async function fetchPageText(url) {
  try {
    if (!/^https?:\/\//i.test(url)) throw new Error("Invalid URL");
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script,style,noscript,svg,iframe,header,footer,nav").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();
    return text.slice(0, 8000); // límite sano
  } catch (e) {
    return `ERROR_FETCH: ${e.message}`;
  }
}

// ---- Orquesta: busca + visita top urls y devuelve briefing ----
export async function liveBrowse(query) {
  const s = await webSearch(query);
  const targets = (s.results || []).slice(0, 3).map(x => x.url);
  const pages = await Promise.all(
    targets.map(u => limit(() => fetchPageText(u)))
  );
  const bundle = targets.map((u, i) => `# ${u}\n${pages[i]}`).join("\n\n---\n\n");
  const preface = s.answer ? `Resumen inicial: ${s.answer}\n\n` : "";
  return preface + bundle;
}
