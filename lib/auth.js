"use strict";
const crypto = require("crypto");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-maq-key");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

// Devuelve true si la petición puede continuar. Si devuelve false, ya respondió.
function guard(req, res) {
  cors(res);
  if (req.method === "OPTIONS") { res.status(204).end(); return false; }
  const expected = process.env.MAQ_ACCESS_KEY;
  if (!expected) {
    res.status(503).json({ error: "unconfigured", message: "Falta la variable de entorno MAQ_ACCESS_KEY." });
    return false;
  }
  const given = Buffer.from(String(req.headers["x-maq-key"] || ""));
  const want = Buffer.from(expected);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    res.status(401).json({ error: "auth", message: "Clave de acceso incorrecta." });
    return false;
  }
  return true;
}

module.exports = { guard };
