"use strict";
const { guard } = require("../lib/auth");
const registry = require("../lib/connectors");

// GET /api/connectors → { connectors: [{ id, name, description, configured, needs }] }
module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "method", message: "Usa GET." });
  res.status(200).json({
    connectors: registry.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || "",
      configured: !!c.configured(),
      needs: c.needs || [],
    })),
  });
};
