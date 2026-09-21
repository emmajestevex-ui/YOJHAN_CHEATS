const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const { assertRuntimeConfig, config } = require("./config");
const { deployCommands } = require("./deploy-commands");
const { startKeepAlive } = require("./keepAlive");
const { loadCommands } = require("./utils/loadCommands");

assertRuntimeConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

loadCommands(client);

// Eventos que utilizará el bot
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

async function start() {
  await deployCommands();
  startKeepAlive(config);
  await client.login(config.token);
}

start().catch((error) => {
  console.error("[start] Error iniciando YOJHAN_CHEATS:", error);
  process.exit(1);
});
