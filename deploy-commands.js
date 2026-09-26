const { deployCommands } = require("./src/deploy-commands");

if (require.main === module) {
  deployCommands().catch((error) => {
    console.error("[deploy] Error registrando comandos:", error);
    process.exit(1);
  });
}

module.exports = {
  deployCommands
};
