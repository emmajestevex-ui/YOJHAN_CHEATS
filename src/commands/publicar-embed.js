const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const adminEmbedService = require("../services/adminEmbedService");
const { TICKET_TYPES } = require("../constants");
const { captureImageOption } = require("../utils/images");
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
    )
    .addAttachmentOption((option) =>
      option
        .setName("foto")
        .setDescription("Imagen/banner para que salga abajo dentro del embed.")
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
        .setDescription("Miniatura/logo del embed.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("logo_url")
        .setDescription("URL de miniatura/logo si no subes archivo.")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("everyone")
        .setDescription("Mencionar @everyone al publicar.")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("boton_ticket")
        .setDescription("Dejar boton para abrir ticket debajo del embed.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("tipo_ticket")
        .setDescription("Tipo de ticket que abrira el boton.")
        .addChoices(
          { name: "normal", value: TICKET_TYPES.NORMAL },
          { name: "keys gratis", value: TICKET_TYPES.FREE_KEY }
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("texto_boton")
        .setDescription("Texto del boton de ticket.")
        .setMaxLength(80)
        .setRequired(false)
    ),

  async execute(interaction) {
    const allowed = await requireStaff(interaction, "publicar embeds administrativos", PermissionFlagsBits.ManageGuild);
    if (!allowed) return;

    const channel = interaction.options.getChannel("canal", true);
    const image = await captureImageOption(interaction, "foto", "imagen_url", "foto");
    const thumbnail = await captureImageOption(interaction, "logo", "logo_url", "logo");

    if (image.error || thumbnail.error) {
      await interaction.reply({
        content: image.error || thumbnail.error,
        ephemeral: true
      });
      return;
    }

    await adminEmbedService.showKnownChannelModal(interaction, channel.id, {
      bannerMedia: image.media,
      thumbnailMedia: thumbnail.media,
      mentionEveryone: interaction.options.getBoolean("everyone") || false,
      ticketButton: interaction.options.getBoolean("boton_ticket") ?? true,
      ticketType: interaction.options.getString("tipo_ticket") || TICKET_TYPES.NORMAL,
      ticketLabel: interaction.options.getString("texto_boton") || "Abrir ticket"
    });
  }
};
