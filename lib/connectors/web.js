"use strict";
const { clip } = require("../text");

// Búsqueda web con Tavily (https://tavily.com).
module.exports = {
  id: "web",
  name: "Búsqueda web",
  description: "Busca en internet y cita las páginas encontradas.",
  needs: ["TAVILY_API_KEY"],
  configured() { return !!process.env.TAVILY_API_KEY; },
  async search(q) {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer " + process.env.TAVILY_API_KEY },
      body: JSON.stringify({ query: q, max_results: 5, search_depth: "basic" }),
    });
    if (!r.ok) throw new Error("Tavily respondió " + r.status);
    const j = await r.json();
    const hits = (j.results || []).filter((h) => h && h.url);
    return {
      sources: hits.map((h) => ({ title: clip(h.title || h.url, 120), url: h.url })),
      text: hits.map((h) => `- ${clip(h.title || h.url, 120)}: ${clip(h.content, 300)}`).join("\n"),
    };
  },
};
