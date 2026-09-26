const {
  Client,
  Events,
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
const DISCORD_LOGIN_TIMEOUT_MS =
  Number(process.env.DISCORD_LOGIN_TIMEOUT_MS) ||
  45 * 1000;

function logEnvironmentPresence() {
  console.log(`[ENV] DISCORD_TOKEN presente: ${config.token ? "sí" : "no"}`);
  console.log(`[ENV] CLIENT_ID presente: ${config.clientId ? "sí" : "no"}`);
  console.log(`[ENV] GUILD_ID presente: ${config.guildId ? "sí" : "no"}`);
}

function withTimeout(promise, ms, label) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} no respondió después de ${ms}ms`)),
      ms
    );
  });

  return Promise.race([promise, timeout])
    .finally(() => clearTimeout(timeoutId));
}

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

function registerDiscordDiagnostics(client) {
  client.on("error", (error) => {
    console.error("[DISCORD] Client error:", error);
  });

  client.on("shardError", (error, shardId) => {
    console.error(`[DISCORD] Shard ${shardId} error:`, error);
  });

  client.on("shardDisconnect", (event, shardId) => {
    console.warn(
      `[DISCORD] Shard ${shardId} desconectado: code=${event?.code} reason=${event?.reason || "sin razón"}`
    );
  });

  client.on("shardReconnecting", (shardId) => {
    console.warn(`[DISCORD] Shard ${shardId} reconectando...`);
  });

  client.on("shardReady", (shardId) => {
    console.log(`[DISCORD] Shard ${shardId} listo.`);
  });
}

function startSecondaryServicesAfterReady(client) {
  client.once(Events.ClientReady, () => {
    setImmediate(() => {
      try {
        console.log("[START] Iniciando servicios secundarios después de ready...");

        const {
          startTikTokLiveMonitor
        } = require("./services/tiktokLiveService");

        startTikTokLiveMonitor(client);
      } catch (error) {
        console.error("[START] ⚠️ No se pudo iniciar TikTok:", error);
      }
    });
  });
}

// ==========================================
// INICIAR BOT
// ==========================================
async function start() {

  console.log("========================================");
  console.log("🚀 INICIANDO YOJHAN CHEATS");
  console.log("========================================");
  console.log("[START] HTTP listo para Render antes de Discord.");

  logEnvironmentPresence();
  assertRuntimeConfig();

  const client = createClient();
  registerDiscordDiagnostics(client);

  loadCommands(client);
  console.log(`[START] Comandos cargados: ${client.commands.size}`);

  loadEvents(client);
  console.log("[START] Eventos cargados: ready, interactionCreate, guildMemberAdd");
  startSecondaryServicesAfterReady(client);

  // Conectar a Discord
  console.log("[DISCORD] Iniciando login...");

  await withTimeout(
    client.login(config.token),
    DISCORD_LOGIN_TIMEOUT_MS,
    "[DISCORD] client.login"
  );

  console.log("[DISCORD] Login completado; esperando evento ready si aún no llegó.");

  console.log(
    `[START] Discord conectado como ${client.user?.tag}`
  );

  console.log("========================================");
  console.log("✅ YOJHAN CHEATS INICIADO");
  console.log("========================================");
}

// ==========================================
// ARRANCAR YOJHAN CHEATS
// ==========================================
start().catch((error) => {

  console.error(
    "[START] Error iniciando YOJHAN CHEATS:",
    error
  );

  if (httpServer) {
    console.error("[START] HTTP sigue activo para /health; Discord no quedó conectado.");
  }

  process.exitCode = 1;

});

process.on("unhandledRejection", (reason) => {
  console.error("[PROCESS] Promesa rechazada sin manejar:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[PROCESS] Excepción no capturada:", error);
  process.exitCode = 1;
});
