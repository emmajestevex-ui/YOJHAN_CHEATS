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
const DISCORD_API_TIMEOUT_MS =
  Number(process.env.DISCORD_API_TIMEOUT_MS) ||
  15 * 1000;

function logEnvironmentPresence() {
  console.log(`[ENV] DISCORD_TOKEN presente: ${config.token ? "sí" : "no"}`);
  console.log(`[ENV] CLIENT_ID presente: ${config.clientId ? "sí" : "no"}`);
  console.log(`[ENV] GUILD_ID presente: ${config.guildId ? "sí" : "no"}`);
  console.log(`[RUNTIME] Node.js: ${process.version}`);
  console.log(`[RUNTIME] Plataforma: ${process.platform} ${process.arch}`);
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
  client.on("debug", (message) => {
    const safeMessage = String(message).replace(
      /Provided token:.*/i,
      "Provided token: [redacted]"
    );

    console.log(`[DISCORD:DEBUG] ${safeMessage}`);
  });

  client.on("warn", (message) => {
    console.warn(`[DISCORD:WARN] ${message}`);
  });

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

  client.on("shardResume", (shardId, replayedEvents) => {
    console.log(`[DISCORD] Shard ${shardId} resumido; eventos recuperados: ${replayedEvents}`);
  });
}

async function fetchDiscordJson(path, token, label) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DISCORD_API_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `https://discord.com/api/v10${path}`,
      {
        headers: {
          Authorization: `Bot ${token}`,
          "User-Agent": "YOJHAN_CHEATS diagnostics"
        },
        signal: controller.signal
      }
    );

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 200) };
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      label
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runDiscordPreflight() {
  console.log("[DISCORD:REST] Verificando token con /users/@me...");

  try {
    const me = await fetchDiscordJson(
      "/users/@me",
      config.token,
      "users/@me"
    );

    if (!me.ok) {
      console.error(
        `[DISCORD:REST] Token rechazado por Discord. status=${me.status} code=${me.data?.code || "n/a"} message=${me.data?.message || "n/a"}`
      );
      return false;
    }

    console.log(
      `[DISCORD:REST] Token aceptado. Bot ID: ${me.data?.id || "desconocido"}`
    );
  } catch (error) {
    console.error("[DISCORD:REST] Falló /users/@me:", error);
    return false;
  }

  console.log("[DISCORD:GATEWAY] Verificando /gateway/bot...");

  try {
    const gateway = await fetchDiscordJson(
      "/gateway/bot",
      config.token,
      "gateway/bot"
    );

    if (!gateway.ok) {
      console.error(
        `[DISCORD:GATEWAY] Discord rechazó /gateway/bot. status=${gateway.status} code=${gateway.data?.code || "n/a"} message=${gateway.data?.message || "n/a"}`
      );
      return false;
    }

    console.log(
      `[DISCORD:GATEWAY] URL recibida: ${gateway.data?.url || "sin-url"} | shards sugeridos: ${gateway.data?.shards || "n/a"}`
    );
    return true;
  } catch (error) {
    console.error("[DISCORD:GATEWAY] Falló /gateway/bot:", error);
    return false;
  }
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

  await runDiscordPreflight();

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
