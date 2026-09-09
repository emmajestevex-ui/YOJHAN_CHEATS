const { Client, GatewayIntentBits, Partials } = require("discord.js");

const { assertRuntimeConfig, config } = require("./config");
const { startKeepAlive } = require("./keepAlive");
const { loadCommands } = require("./utils/loadCommands");

assertRuntimeConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Channel]
});

loadCommands(client);

for (const event of ["ready", "interactionCreate"]) {
  const handler = require(`./events/${event}`);
  if (handler.once) {
    client.once(handler.name, (...args) => handler.execute(...args));
  } else {
    client.on(handler.name, (...args) => handler.execute(...args));
  }
}

startKeepAlive(config);

client.login(config.token);
