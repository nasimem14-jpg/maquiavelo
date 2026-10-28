"use strict";
// Plantilla de conector. Un conector es un objeto con esta forma:
//
//   id           identificador corto, sin espacios (sale en la URL: /api/c/<id>)
//   name         nombre que se ve en la app
//   description  una frase que se ve en la app
//   needs        variables de entorno que necesita (puede ser [])
//   configured() true si tiene todo lo necesario para funcionar
//   search(q)    busca y devuelve { sources: [{ title, url }], text: "..." }
//                - sources: enlaces que la app muestra como fuentes
//                - text:    fragmentos que el modelo recibe como contexto
//
const { clip } = require("../text");

module.exports = {
  id: "ejemplo",
  name: "Ejemplo",
  description: "Plantilla de conector.",
  needs: ["EJEMPLO_TOKEN"],
  configured() { return !!process.env.EJEMPLO_TOKEN; },
  async search(q) {
    // const r = await fetch("https://api.ejemplo.com/search?q=" + encodeURIComponent(q), {
    //   headers: { Authorization: "Bearer " + process.env.EJEMPLO_TOKEN },
    // });
    // const j = await r.json();
    return { sources: [], text: clip("", 0) };
  },
};
