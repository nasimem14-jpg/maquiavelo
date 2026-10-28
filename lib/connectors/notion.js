"use strict";
const { clip } = require("../text");

const API = "https://api.notion.com/v1";
const VERSION = "2022-06-28";

function headers() {
  return { Authorization: "Bearer " + process.env.NOTION_TOKEN, "Notion-Version": VERSION, "content-type": "application/json" };
}
function plain(rich) { return (rich || []).map((t) => t.plain_text || "").join(""); }

function titleOf(obj) {
  if (obj.object === "database") return plain(obj.title);
  const props = obj.properties || {};
  for (const k of Object.keys(props)) if (props[k] && props[k].type === "title") return plain(props[k].title);
  return "";
}

async function pageText(id) {
  const r = await fetch(`${API}/blocks/${id}/children?page_size=25`, { headers: headers() });
  if (!r.ok) return "";
  const j = await r.json();
  const out = [];
  for (const b of j.results || []) {
    const body = b[b.type];
    if (body && body.rich_text) out.push(plain(body.rich_text));
  }
  return clip(out.filter(Boolean).join(" "), 600);
}

module.exports = {
  id: "notion",
  name: "Notion",
  description: "Busca en las páginas de Notion que hayas compartido con la integración.",
  needs: ["NOTION_TOKEN"],
  configured() { return !!process.env.NOTION_TOKEN; },
  async search(q) {
    const r = await fetch(`${API}/search`, { method: "POST", headers: headers(), body: JSON.stringify({ query: q, page_size: 4 }) });
    if (!r.ok) throw new Error("Notion respondió " + r.status);
    const j = await r.json();
    const hits = (j.results || []).filter((h) => h && h.url);
    const texts = await Promise.all(hits.slice(0, 3).map((h) => (h.object === "page" ? pageText(h.id).catch(() => "") : "")));
    return {
      sources: hits.map((h) => ({ title: clip(titleOf(h) || "Sin título", 120), url: h.url })),
      text: hits.map((h, i) => `- ${clip(titleOf(h) || "Sin título", 120)}${texts[i] ? ": " + texts[i] : ""}`).join("\n"),
    };
  },
};
