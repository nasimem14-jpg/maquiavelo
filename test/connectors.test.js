"use strict";
// Ejecutar con: npm test
const test = require("node:test");
const assert = require("node:assert");

const listHandler = require("../api/connectors");
const runHandler = require("../api/c/[id]");

function fakeRes() {
  const r = { statusCode: 200, headers: {}, body: "" };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (o) => { r.body = JSON.stringify(o); return r; };
  r.end = () => r;
  r.data = () => JSON.parse(r.body);
  return r;
}
const KEY = { "x-maq-key": "clave-de-prueba" };

test.beforeEach(() => {
  process.env.MAQ_ACCESS_KEY = "clave-de-prueba";
  process.env.NOTION_TOKEN = "ntn_prueba";
  delete process.env.TAVILY_API_KEY;
});

test("sin MAQ_ACCESS_KEY el backend se niega (503)", async () => {
  delete process.env.MAQ_ACCESS_KEY;
  const res = fakeRes();
  await listHandler({ method: "GET", headers: KEY }, res);
  assert.equal(res.statusCode, 503);
});

test("clave ausente o incorrecta devuelve 401", async () => {
  for (const headers of [{}, { "x-maq-key": "otra" }, { "x-maq-key": "clave-de-prueba-larga" }]) {
    const res = fakeRes();
    await listHandler({ method: "GET", headers }, res);
    assert.equal(res.statusCode, 401);
  }
});

test("OPTIONS responde 204 con CORS y permite la cabecera de la clave", async () => {
  const res = fakeRes();
  await runHandler({ method: "OPTIONS", headers: {}, query: { id: "notion" } }, res);
  assert.equal(res.statusCode, 204);
  assert.match(res.headers["access-control-allow-headers"], /x-maq-key/);
});

test("lista los conectores con su estado", async () => {
  const res = fakeRes();
  await listHandler({ method: "GET", headers: KEY }, res);
  assert.equal(res.statusCode, 200);
  const by = Object.fromEntries(res.data().connectors.map((c) => [c.id, c]));
  assert.equal(by.wikipedia.configured, true);
  assert.equal(by.notion.configured, true);
  assert.equal(by.web.configured, false);
  assert.deepEqual(by.web.needs, ["TAVILY_API_KEY"]);
});

test("validaciones de /api/c/<id>", async () => {
  const call = async (method, id, body) => {
    const res = fakeRes();
    await runHandler({ method, headers: KEY, query: { id }, body }, res);
    return res;
  };
  assert.equal((await call("GET", "notion")).statusCode, 405);
  assert.equal((await call("POST", "nada", { query: "x" })).statusCode, 404);
  assert.equal((await call("POST", "notion", { query: "   " })).statusCode, 400);
  assert.equal((await call("POST", "web", { query: "margen" })).statusCode, 400); // sin TAVILY_API_KEY
});

test("Notion devuelve fuentes y texto", async () => {
  const calls = [];
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    calls.push({ url: String(url), opts });
    if (String(url).endsWith("/v1/search")) {
      return { ok: true, status: 200, json: async () => ({ results: [
        { object: "page", id: "p1", url: "https://www.notion.so/p1", properties: { Nombre: { type: "title", title: [{ plain_text: "Plan de cafetería" }] } } },
        { object: "database", id: "d1", url: "https://www.notion.so/d1", title: [{ plain_text: "Ideas" }] },
      ] }) };
    }
    if (String(url).includes("/v1/blocks/p1/children")) {
      return { ok: true, status: 200, json: async () => ({ results: [
        { type: "paragraph", paragraph: { rich_text: [{ plain_text: "Margen objetivo 22%." }] } },
        { type: "divider", divider: {} },
      ] }) };
    }
    throw new Error("url inesperada " + url);
  };
  try {
    const res = fakeRes();
    await runHandler({ method: "POST", headers: KEY, query: { id: "notion" }, body: { query: "margen cafetería" } }, res);
    assert.equal(res.statusCode, 200);
    const out = res.data();
    assert.deepEqual(out.sources, [
      { title: "Plan de cafetería", url: "https://www.notion.so/p1" },
      { title: "Ideas", url: "https://www.notion.so/d1" },
    ]);
    assert.match(out.text, /Plan de cafetería: Margen objetivo 22%\./);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer ntn_prueba");
    assert.equal(JSON.parse(calls[0].opts.body).query, "margen cafetería");
  } finally { global.fetch = realFetch; }
});

test("Wikipedia y búsqueda web con respuestas simuladas", async () => {
  const realFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes("wikipedia.org")) {
      return { ok: true, status: 200, json: async () => ({ query: { search: [{ title: "Margen comercial", snippet: "El <span>margen</span> &amp; el precio" }] } }) };
    }
    if (String(url).includes("tavily.com")) {
      return { ok: true, status: 200, json: async () => ({ results: [{ title: "Guía de precios", url: "https://ejemplo.com/p", content: "Subir precios un 5% suele..." }] }) };
    }
    throw new Error("url inesperada " + url);
  };
  try {
    let res = fakeRes();
    await runHandler({ method: "POST", headers: KEY, query: { id: "wikipedia" }, body: { query: "margen" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.data().sources[0].url, "https://es.wikipedia.org/wiki/Margen_comercial");
    assert.match(res.data().text, /margen & el precio/);
    process.env.TAVILY_API_KEY = "tvly_prueba";
    res = fakeRes();
    await runHandler({ method: "POST", headers: KEY, query: { id: "web" }, body: { query: "precios" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.data().sources[0].url, "https://ejemplo.com/p");
  } finally { global.fetch = realFetch; }
});

test("un fallo del servicio externo devuelve 502 sin filtrar el token", async () => {
  const realFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
  try {
    const res = fakeRes();
    await runHandler({ method: "POST", headers: KEY, query: { id: "notion" }, body: { query: "x" } }, res);
    assert.equal(res.statusCode, 502);
    assert.ok(!res.body.includes("ntn_prueba"));
  } finally { global.fetch = realFetch; }
});
