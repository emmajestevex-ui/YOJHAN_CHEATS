const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const { assertRuntimeConfig, config } = require("./config");
const { deployCommands } = require("./deploy-commands");
const { startKeepAlive } = require("./keepAlive");
const { loadCommands } = require("./utils/loadCommands");

// 🔴 TIKTOK LIVE
const { startTikTokLiveMonitor } = require("./tiktokLive");


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
// EVENTOS QUE UTILIZARÁ EL BOT
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

  // Registrar comandos de Discord
  await deployCommands();

  // Mantener Render activo
  startKeepAlive(config);

  // Iniciar sesión en Discord
  await client.login(config.token);

  console.log(
    `[START] Discord conectado como ${client.user?.tag}`
  );

  // 🔴 INICIAR MONITOR DE TIKTOK
  startTikTokLiveMonitor(client);
}


// ==========================================
// ARRANCAR
// ==========================================

start().catch((error) => {

  console.error(
    "[Start] Error iniciando YOJHAN CHEATS:",
    error
  );

  process.exit(1);

});
