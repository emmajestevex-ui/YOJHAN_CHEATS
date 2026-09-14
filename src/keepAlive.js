const http = require("node:http");

function startKeepAlive(config) {
  if (!config.enableKeepAlive) return null;

  const server = http.createServer((request, response) => {
    if (request.url === "/health" || request.url === "/") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        ok: true,
        service: "YOJHAN_CHEATS",
        version: "publicar-embed-foto-ticket-sync-20260914",
        uptime: process.uptime(),
        path: request.url
      }));
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: false }));
  });

  server.listen(config.port, () => {
    console.log(`[keep-alive] Servidor activo en puerto ${config.port}`);
  });

  return server;
}

module.exports = {
  startKeepAlive
};
