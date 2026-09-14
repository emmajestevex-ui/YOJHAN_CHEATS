const { REST, Routes } = require("discord.js");

const { assertRuntimeConfig, config } = require("./config");
const { getCommandData } = require("./utils/loadCommands");

async function deployCommands() {
  assertRuntimeConfig();

  const commands = getCommandData();
  const rest = new REST({ version: "10" }).setToken(config.token);

  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  console.log(`[deploy] Registrando ${commands.length} comandos ${config.guildId ? "en el servidor" : "globalmente"}...`);
  await rest.put(route, { body: commands });
  console.log("[deploy] Comandos registrados correctamente.");
}

if (require.main === module) {
  deployCommands().catch((error) => {
    console.error("[deploy] Error registrando comandos:", error);
    process.exit(1);
  });
}

module.exports = {
  deployCommands
};
