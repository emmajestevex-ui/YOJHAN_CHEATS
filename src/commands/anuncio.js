const { ChannelType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const { config } = require("../config");
const { parseColor } = require("../utils/colors");
const { readImageOption } = require("../utils/images");
const { requireStaff } = require("../utils/permissions");
const { truncate } = require("../utils/text");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anuncio")
    .setDescription("Publica un anuncio embed con estetica YOJHAN_CHEATS.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal donde se publicara el anuncio.")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("titulo")
        .setDescription("Titulo del anuncio.")
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption((option) =>
      option
        .setName("mensaje")
        .setDescription("Contenido del anuncio.")
        .setRequired(true)
        .setMaxLength(1800)
    )
    .addBooleanOption((option) =>
      option
        .setName("everyone")
        .setDescription("Mencionar @everyone.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("Color HEX. Ejemplo: #ff1f1f")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("imagen")
        .setDescription("URL opcional de imagen/banner.")
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName("foto")
        .setDescription("Imagen/banner subida desde Discord.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("logo_url")
        .setDescription("URL opcional de miniatura/logo.")
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName("logo")
        .setDescription("Miniatura/logo subida desde Discord.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const allowed = await requireStaff(interaction, "publicar anuncios", PermissionFlagsBits.ManageGuild);
    if (!allowed) return;

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("canal", true);
    const image = readImageOption(interaction, "foto", "imagen");
    const thumbnail = readImageOption(interaction, "logo", "logo_url");

    if (image.error || thumbnail.error) {
      await interaction.editReply(image.error || thumbnail.error);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(parseColor(interaction.options.getString("color"), config.defaultEmbedColor))
      .setTitle(truncate(interaction.options.getString("titulo", true), 256))
      .setDescription(truncate(interaction.options.getString("mensaje", true), 4096))
      .setFooter({ text: "YOJHAN_CHEATS" })
      .setTimestamp();

    if (image.url) embed.setImage(image.url);
    if (thumbnail.url) embed.setThumbnail(thumbnail.url);

    const everyone = interaction.options.getBoolean("everyone") || false;
    await channel.send({
      content: everyone ? "@everyone" : undefined,
      embeds: [embed],
      allowedMentions: everyone ? { parse: ["everyone"] } : { parse: [] }
    });

    await interaction.editReply(`Anuncio publicado en ${channel}.`);
  }
};
