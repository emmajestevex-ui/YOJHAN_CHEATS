const fs = require("node:fs");
const path = require("node:path");
const { Collection } = require("discord.js");

const commandsPath = path.join(__dirname, "..", "commands");

function readCommandFiles() {
  if (!fs.existsSync(commandsPath)) return [];
  return fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"))
    .map((file) => path.join(commandsPath, file));
}

function loadCommands(client) {
  client.commands = new Collection();

  for (const filePath of readCommandFiles()) {
    delete require.cache[require.resolve(filePath)];
    const command = require(filePath);
    if (!command?.data?.name || typeof command.execute !== "function") {
      throw new Error(`Comando invalido: ${filePath}`);
    }
    client.commands.set(command.data.name, command);
  }

  return client.commands;
}

function getCommandData() {
  return readCommandFiles().map((filePath) => {
    delete require.cache[require.resolve(filePath)];
    const command = require(filePath);
    return command.data.toJSON();
  });
}

module.exports = {
  loadCommands,
  getCommandData
};
