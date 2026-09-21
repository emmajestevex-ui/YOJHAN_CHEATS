const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const { assertRuntimeConfig, config } = require("./config");
const { deployCommands } = require("./deploy-commands");
const { startKeepAlive } = require("./keepAlive");
const { loadCommands } = require("./utils/loadCommands");

// ==========================================
// TIKTOK LIVE
// ==========================================
const {
  startTikTokLiveMonitor
} = require("./tiktokLiveService");


// ==========================================
// COMPROBAR CONFIGURACIÓN
// ==========================================
assertRuntimeConfig();


// ==========================================
// CREAR CLIENTE DE DISCORD
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ],

  partials: [
    Partials.Channel
  ]
});


// ==========================================
// CARGAR COMANDOS
// ==========================================
loadCommands(client);


// ==========================================
// EVENTOS QUE UTILIZA EL BOT
// ==========================================
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


// ==========================================
// INICIAR BOT
// ==========================================
async function start() {

  // Registrar comandos
  await deployCommands();

  // Mantener servicio de Render activo
  startKeepAlive(config);

  // Conectar bot a Discord
  await client.login(config.token);

  console.log(
    `[START] Discord conectado como ${client.user?.tag}`
  );

  // ========================================
  // INICIAR MONITOR DE TIKTOK LIVE
  // ========================================
  startTikTokLiveMonitor(client);
}


// ==========================================
// ARRANCAR YOJHAN CHEATS
// ==========================================
start().catch((error) => {

  console.error(
    "[Start] Error iniciando YOJHAN CHEATS:",
    error
  );

  process.exit(1);

});
