const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const {
  assertRuntimeConfig,
  config
} = require("./config");

const {
  deployCommands
} = require("./deploy-commands");

const {
  startKeepAlive
} = require("./keepAlive");

const {
  loadCommands
} = require("./utils/loadCommands");

const {
  startTikTokLiveMonitor
} = require("./services/tiktokLiveService");


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
// CARGAR EVENTOS
// ==========================================

for (const event of [
  "ready",
  "interactionCreate",
  "guildMemberAdd"
]) {

  const handler =
    require(`./events/${event}`);

  if (handler.once) {

    client.once(
      handler.name,
      (...args) =>
        handler.execute(...args)
    );

  } else {

    client.on(
      handler.name,
      (...args) =>
        handler.execute(...args)
    );
  }
}


// ==========================================
// INICIAR BOT
// ==========================================

async function start() {

  console.log(
    "========================================"
  );

  console.log(
    "🚀 INICIANDO YOJHAN CHEATS"
  );

  console.log(
    "========================================"
  );


  // ========================================
  // 1. ABRIR PUERTO PRIMERO
  // ========================================

  console.log(
    "[START] Iniciando servidor HTTP..."
  );

  startKeepAlive(config);


  // ========================================
  // 2. REGISTRAR COMANDOS
  // ========================================

  console.log(
    "[START] Registrando comandos de Discord..."
  );

  try {

    await deployCommands();

    console.log(
      "[START] ✅ Comandos registrados."
    );

  } catch (error) {

    // El bot puede seguir arrancando aunque
    // falle temporalmente el registro.
    console.error(
      "[START] ⚠️ Error registrando comandos:",
      error
    );
  }


  // ========================================
  // 3. CONECTAR DISCORD
  // ========================================

  console.log(
    "[START] Conectando con Discord..."
  );

  await client.login(config.token);


  console.log(
    `[START] ✅ Discord conectado como ${client.user?.tag}`
  );


  // ========================================
  // 4. TIKTOK
  // ========================================

  console.log(
    "[START] Iniciando monitor de TikTok..."
  );

  try {

    startTikTokLiveMonitor(client);

  } catch (error) {

    console.error(
      "[START] ⚠️ No se pudo iniciar TikTok:",
      error
    );
  }


  console.log(
    "========================================"
  );

  console.log(
    "✅ YOJHAN CHEATS INICIADO"
  );

  console.log(
    "========================================"
  );
}


// ==========================================
// ARRANCAR
// ==========================================

start().catch((error) => {

  console.error(
    "[START] ❌ ERROR FATAL:",
    error
  );

  process.exit(1);

});
