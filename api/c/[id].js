"use strict";
const { guard } = require("../../lib/auth");
const registry = require("../../lib/connectors");

// POST /api/c/<id>  { "query": "..." }  →  { sources: [{title, url}], text: "..." }
module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "method", message: "Usa POST." });
  const c = registry.find((x) => x.id === req.query.id);
  if (!c) return res.status(404).json({ error: "notfound", message: "No existe ese conector." });
  if (!c.configured()) return res.status(400).json({ error: "unconfigured", message: "Falta configurar: " + c.needs.join(", ") });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const query = String((body && body.query) || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!query) return res.status(400).json({ error: "badrequest", message: "Falta la consulta." });
  try {
    const out = await c.search(query);
    res.status(200).json({ sources: out.sources || [], text: out.text || "" });
  } catch (e) {
    res.status(502).json({ error: "upstream", message: String((e && e.message) || e).slice(0, 200) });
  }
};
