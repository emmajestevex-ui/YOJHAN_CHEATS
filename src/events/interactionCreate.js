const { Events } = require("discord.js");
const adminEmbedService = require("../services/adminEmbedService");
const ticketService = require("../services/ticketService");

async function sendInteractionError(interaction) {
  const payload = {
    content: "Ocurrio un error procesando esto. Revisa la consola del bot.",
    ephemeral: true
  };

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload).catch(() => {});
    return;
  }

  await interaction.reply(payload).catch(() => {});
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        if (adminEmbedService.canHandleButton(interaction)) {
          await adminEmbedService.handleButton(interaction);
          return;
        }

        if (ticketService.canHandleButton(interaction)) {
          await ticketService.handleButton(interaction);
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        if (adminEmbedService.canHandleModal(interaction)) {
          await adminEmbedService.handleModal(interaction);
        }
      }
    } catch (error) {
      console.error("[interaction]", error);
      await sendInteractionError(interaction);
    }
  }
};
