const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const ticketService = require("../services/ticketService");
const { TICKET_TYPES } = require("../constants");
const { resolveSendableChannel } = require("../utils/channels");
const { readImageOption } = require("../utils/images");
const { requireStaff } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("key-panel")
    .setDescription("Publica un panel para tickets de key gratis.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal donde se publicara el panel. Si lo omites, usa el canal actual.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("canal_id")
        .setDescription("ID del canal si no aparece en la lista.")
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
    const allowed = await requireStaff(interaction, "publicar paneles de keys gratis", PermissionFlagsBits.ManageChannels);
    if (!allowed) return;

    const target = await resolveSendableChannel(interaction);
    if (target.error) {
      await interaction.reply({
        content: target.error,
        ephemeral: true
      });
      return;
    }

    const image = readImageOption(interaction, "foto", "imagen_url");
    const thumbnail = readImageOption(interaction, "logo", "logo_url");

    if (image.error || thumbnail.error) {
      await interaction.reply({
        content: image.error || thumbnail.error,
        ephemeral: true
      });
      return;
    }

    await ticketService.sendTicketPanel(interaction, target.channel, TICKET_TYPES.FREE_KEY, {
      title: interaction.options.getString("titulo"),
      description: interaction.options.getString("descripcion"),
      imageUrl: image.url,
      thumbnailUrl: thumbnail.url,
      buttonLabel: interaction.options.getString("boton")
    });
  }
};
