require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { commands } = require('./commands');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('Faltan DISCORD_TOKEN o CLIENT_ID en el entorno.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    const body = commands.map((command) => command.toJSON());
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
      console.log(`✅ ${body.length} comandos registrados en el servidor ${guildId}.`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body });
      console.log(`✅ ${body.length} comandos globales registrados.`);
    }
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
    process.exit(1);
  }
})();
