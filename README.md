# Maquiavelo

Frontend (`public/index.html`) + backend de conectores (`api/`, `lib/`) en un solo repo, desplegado en Vercel.

## Idea clave
El backend es independiente del frontend. Puedes reemplazar `public/index.html` por otro diseño, hacer push y Vercel redespliega.
La app usa la misma URL (same-origin) y la clave guardada en tu navegador, así que los conectores se reconectan solos.
Mientras el nuevo index respete el contrato de abajo, no hay que tocar nada más.

## Puesta en marcha
1. Sube este repo a GitHub.
2. En Vercel: Add New → Project → importa el repo (sin framework; `vercel.json` ya apunta a `public`).
3. En Settings → Environment Variables añade:
   - `MAQ_ACCESS_KEY` (obligatoria): una clave larga y secreta, solo caracteres ASCII. Sin ella el servidor rechaza todo.
   - `NOTION_TOKEN` (opcional): token de una integración interna de Notion, compartida con las páginas que quieras consultar.
   - `TAVILY_API_KEY` (opcional): para el conector de búsqueda web.
   - `WIKI_LANG` (opcional, por defecto `es`).
4. Redespliega, abre la app → Conectores → Configurar servidor → pega la clave.

Los secretos viven solo en Vercel. Nunca los pongas en el repo.

## Contrato de la API
Todas las llamadas llevan la cabecera `x-maq-key: <MAQ_ACCESS_KEY>`.

- `GET /api/connectors` → `{ connectors: [{ id, name, description, configured, needs }] }`
- `POST /api/c/<id>` con `{ "query": "..." }` → `{ sources: [{ title, url }], text }`
- Errores: 401 clave incorrecta, 503 servidor sin `MAQ_ACCESS_KEY`, 404 conector desconocido, 400 petición inválida, 502 fallo del servicio externo.
- CORS abierto (`*`) con cabeceras `content-type, x-maq-key`; la protección es la clave.

## Añadir un conector
1. Copia `lib/connectors/_plantilla.js` a `lib/connectors/mi-conector.js` y rellénalo.
2. Regístralo en `lib/connectors/index.js`.
3. Push. Aparecerá solo en la app.

## Tests
`npm test`
