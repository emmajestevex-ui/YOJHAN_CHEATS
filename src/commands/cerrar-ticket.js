const { SlashCommandBuilder } = require("discord.js");

const ticketService = require("../services/ticketService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cerrar-ticket")
    .setDescription("Cierra el ticket actual.")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("razon")
        .setDescription("Razon del cierre.")
        .setRequired(false)
    ),

  async execute(interaction) {
    await ticketService.closeTicket(interaction, interaction.options.getString("razon") || "Cerrado con comando.");
  }
};
