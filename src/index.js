const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const { assertRuntimeConfig, config } = require("./config");
const { startKeepAlive } = require("./keepAlive");
const { loadCommands } = require("./utils/loadCommands");

// ==========================================
// COMPROBAR CONFIGURACIÓN
// ==========================================

const httpServer = startKeepAlive(config);

function createClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers
    ],

    partials: [
      Partials.Channel
    ]
  });
}

function loadEvents(client) {
  for (const event of [
    "ready",
    "interactionCreate",
    "guildMemberAdd"
  ]) {

    const handler = require(`./events/${event}`);

    if (handler.once) {

      client.once(
        handler.name,
        (...args) => handler.execute(...args)
      );

    } else {

      client.on(
        handler.name,
        (...args) => handler.execute(...args)
      );

    }
  }
}

// ==========================================
// INICIAR BOT
// ==========================================
async function start() {

  console.log("========================================");
  console.log("🚀 INICIANDO YOJHAN CHEATS");
  console.log("========================================");
  console.log("[START] HTTP listo para Render antes de Discord.");

  assertRuntimeConfig();

  const client = createClient();

  loadCommands(client);
  console.log(`[START] Comandos cargados: ${client.commands.size}`);

  loadEvents(client);
  console.log("[START] Eventos cargados: ready, interactionCreate, guildMemberAdd");

  // Conectar a Discord
  await client.login(config.token);

  console.log(
    `[START] Discord conectado como ${client.user?.tag}`
  );

  // ========================================
  // INICIAR MONITOR DE TIKTOK LIVE
  // ========================================
  try {
    const {
      startTikTokLiveMonitor
    } = require("./services/tiktokLiveService");

    startTikTokLiveMonitor(client);
  } catch (error) {
    console.error("[START] ⚠️ No se pudo iniciar TikTok:", error);
  }

  console.log("========================================");
  console.log("✅ YOJHAN CHEATS INICIADO");
  console.log("========================================");
}

// ==========================================
// ARRANCAR YOJHAN CHEATS
// ==========================================
start().catch((error) => {

  console.error(
    "[Start] Error iniciando YOJHAN CHEATS:",
    error
  );

  if (httpServer) {
    console.error("[Start] HTTP sigue activo para /health; revisa variables de Discord.");
  }

  process.exit(1);

});
