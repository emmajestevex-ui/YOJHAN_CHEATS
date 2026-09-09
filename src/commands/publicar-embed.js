const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const adminEmbedService = require("../services/adminEmbedService");
const { requireStaff } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("publicar-embed")
    .setDescription("Abre un formulario para crear y publicar un embed YOJHAN_CHEATS.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal donde se publicara el embed.")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    ),

  async execute(interaction) {
    const allowed = await requireStaff(interaction, "publicar embeds administrativos", PermissionFlagsBits.ManageGuild);
    if (!allowed) return;

    const channel = interaction.options.getChannel("canal", true);
    await adminEmbedService.showKnownChannelModal(interaction, channel.id);
  }
};
