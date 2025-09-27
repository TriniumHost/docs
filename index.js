// server.js
import express from "express";
import kkd from "kirito.db.remote";

const app = express();
const PORT = process.env.PORT || 3005;

// Conexão com a KiritoDB (coloque sua key secreta real!)
const db = new kkd.KiritoDB("th-triniumhost-th-docs-jenhf");

// Função que detecta de qual rede/plataforma veio a query
function detectarOrigem(query) {
  if (query.fbclid) return "facebook";
  if (query.gclid) return "google";
  if (query.twclid) return "twitter";
  if (query.igshid) return "instagram";
  if (query.utm_source) return query.utm_source;
  return "desconhecida";
}


app.use(express.static('public'))

// Middleware para salvar queries no banco
app.use(async (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    const origem = detectarOrigem(req.query);
    const id = Date.now().toString(); // chave única

    try {
      await db.set(`queries.${id}.origem`, origem);
      await db.set(`queries.${id}.url`, req.originalUrl);
      await db.set(`queries.${id}.data`, new Date().toISOString());

      // Salva cada query separada
      for (const [key, value] of Object.entries(req.query)) {
        await db.set(`queries.${id}.params.${key}`, value);
      }

      console.log("📌 Query salva no banco:", { origem, url: req.originalUrl, params: req.query });
    } catch (err) {
      console.error("❌ Erro ao salvar no banco:", err);
    }
  }
  next();
});

// Página principal
app.get("/", (req, res) => {
  res.status(200).sendFile("docs/index.html", { root: "." });
});

app.get("/api", (req, res) => {
  res.status(200).sendFile("docs/api.html", { root: "." });
});

// Rota de logs -> HTML ou JSON
app.get("/logs", async (req, res) => {
  const all = await db.all();
  const logs = all.queries || {};

  if (req.query.json === "true") {
    // Resposta JSON
    return res.json({ logs });
  }

  // Resposta HTML
  let html = "<h1>📋 Logs de Queries</h1><ul>";
  for (const [id, data] of Object.entries(logs)) {
    html += `<li><b>${id}</b> [${data.origem}] - ${data.url}<br>
             Params: ${JSON.stringify(data.params)}<br>
             <small>${data.data}</small></li><hr>`;
  }
  html += "</ul>";

  res.send(html);
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Servidor Docs rodando em http://localhost:${PORT}`);
});
