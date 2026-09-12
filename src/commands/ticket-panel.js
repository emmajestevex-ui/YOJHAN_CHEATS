const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const ticketService = require("../services/ticketService");
const { TICKET_TYPES } = require("../constants");
const { requireStaff } = require("../utils/permissions");
const { readImageOption } = require("../utils/images");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Publica un panel de tickets normal o de keys gratis.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option) =>
      option
        .setName("tipo")
        .setDescription("Tipo de ticket que abrira el boton.")
        .addChoices(
          { name: "normal", value: TICKET_TYPES.NORMAL },
          { name: "keys gratis", value: TICKET_TYPES.FREE_KEY }
        )
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal donde se publicara el panel. Si lo omites, usa el canal actual.")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("titulo")
        .setDescription("Titulo del panel.")
        .setMaxLength(256)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("descripcion")
        .setDescription("Texto del panel.")
        .setMaxLength(1800)
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName("foto")
        .setDescription("Imagen/banner del panel.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("imagen_url")
        .setDescription("URL de imagen/banner si no subes archivo.")
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName("logo")
        .setDescription("Miniatura/logo del panel.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("logo_url")
        .setDescription("URL de miniatura/logo si no subes archivo.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("boton")
        .setDescription("Texto del boton.")
        .setMaxLength(80)
        .setRequired(false)
    ),

  async execute(interaction) {
    const allowed = await requireStaff(interaction, "publicar paneles de tickets", PermissionFlagsBits.ManageChannels);
    if (!allowed) return;

    const type = interaction.options.getString("tipo", true);
    const channel = interaction.options.getChannel("canal") || interaction.channel;
    const image = readImageOption(interaction, "foto", "imagen_url");
    const thumbnail = readImageOption(interaction, "logo", "logo_url");

    if (image.error || thumbnail.error) {
      await interaction.reply({
        content: image.error || thumbnail.error,
        ephemeral: true
      });
      return;
    }

    await ticketService.sendTicketPanel(interaction, channel, type, {
      title: interaction.options.getString("titulo"),
      description: interaction.options.getString("descripcion"),
      imageUrl: image.url,
      thumbnailUrl: thumbnail.url,
      buttonLabel: interaction.options.getString("boton")
    });
  }
};
