"use strict";
const { clip, stripHtml } = require("../text");

module.exports = {
  id: "wikipedia",
  name: "Wikipedia",
  description: "Busca artículos de Wikipedia para contrastar datos generales.",
  needs: [],
  configured() { return true; },
  async search(q) {
    const lang = /^[a-z]{2,3}$/.test(process.env.WIKI_LANG || "") ? process.env.WIKI_LANG : "es";
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=4&format=json`;
    const r = await fetch(url, { headers: { "User-Agent": "Maquiavelo/0.1 (conector de Wikipedia)" } });
    if (!r.ok) throw new Error("Wikipedia respondió " + r.status);
    const j = await r.json();
    const hits = (j.query && j.query.search) || [];
    return {
      sources: hits.map((h) => ({ title: clip(h.title, 120), url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(String(h.title).replace(/ /g, "_"))}` })),
      text: hits.map((h) => `- ${clip(h.title, 120)}: ${clip(stripHtml(h.snippet), 240)}`).join("\n"),
    };
  },
};
