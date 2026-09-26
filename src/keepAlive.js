const http = require("node:http");

// ==========================================
// KEEP ALIVE / SERVIDOR HTTP PARA RENDER
// ==========================================

function startKeepAlive(config = {}) {

  // ========================================
  // PUERTO
  // Render proporciona process.env.PORT
  // ========================================

  const port =
    Number(process.env.PORT) ||
    Number(config.port) ||
    3000;


  // ========================================
  // CREAR SERVIDOR
  // ========================================

  const server = http.createServer(
    (request, response) => {

      // ====================================
      // HEALTH CHECK
      // ====================================

      if (
        request.url === "/" ||
        request.url === "/health"
      ) {

        response.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        });

        response.end(
          JSON.stringify({
            ok: true,
            service: "YOJHAN_CHEATS",
            status: "online",
            uptime: Math.floor(process.uptime()),
            path: request.url
          })
        );

        return;
      }


      // ====================================
      // RUTA NO ENCONTRADA
      // ====================================

      response.writeHead(404, {
        "Content-Type": "application/json"
      });

      response.end(
        JSON.stringify({
          ok: false,
          error: "Not Found"
        })
      );
    }
  );


  // ========================================
  // ERRORES DEL SERVIDOR
  // ========================================

  server.on("error", (error) => {

    console.error(
      "[keep-alive] ❌ Error del servidor HTTP:",
      error
    );

  });


  // ========================================
  // ABRIR PUERTO PARA RENDER
  // ========================================

  server.listen(
    port,
    "0.0.0.0",
    () => {

      console.log(
        "========================================"
      );

      console.log(
        "🌐 YOJHAN CHEATS - HTTP SERVER"
      );

      console.log(
        "========================================"
      );

      console.log(
        `[keep-alive] ✅ Servidor activo`
      );

      console.log(
        `[keep-alive] Puerto: ${port}`
      );

      console.log(
        `[keep-alive] Host: 0.0.0.0`
      );

      console.log(
        `[keep-alive] Health: /health`
      );

      console.log(
        "========================================"
      );
    }
  );


  return server;
}


// ==========================================
// EXPORTAR
// ==========================================

module.exports = {
  startKeepAlive
};
