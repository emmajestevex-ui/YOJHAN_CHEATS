const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {

  data: new SlashCommandBuilder()
    .setName("setup-autoroles")
    .setDescription("Crea el panel de auto roles.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  async execute(interaction) {

    await interaction.deferReply({
      ephemeral: true
    });

    const embed = new EmbedBuilder()
      .setColor(0x00c7b7)
      .setTitle("🎭 PERSONALIZA TU PERFIL")
      .setDescription(
        "Selecciona los roles que te representan.\n\n" +

        "💻 **DISPOSITIVO**\n" +
        "Selecciona si utilizas **PC** o **iPhone**.\n\n" +

        "👤 **GÉNERO**\n" +
        "Selecciona **Hombre** o **Mujer**.\n\n" +

        "🎮 **JUEGO**\n" +
        "Selecciona si juegas **Free Fire**.\n\n" +

        "Puedes cambiar tus selecciones cuando quieras."
      )
      .setFooter({
        text: "YOJHAN CHEATS • Auto Roles"
      });


    // =========================
    // DISPOSITIVO
    // =========================

    const pcButton = new ButtonBuilder()
      .setCustomId("autorole_pc")
      .setLabel("PC")
      .setEmoji("💻")
      .setStyle(ButtonStyle.Secondary);


    const iphoneButton = new ButtonBuilder()
      .setCustomId("autorole_iphone")
      .setLabel("iPhone")
      .setEmoji("🍎")
      .setStyle(ButtonStyle.Secondary);


    const deviceRow =
      new ActionRowBuilder()
        .addComponents(
          pcButton,
          iphoneButton
        );


    // =========================
    // GÉNERO
    // =========================

    const hombreButton = new ButtonBuilder()
      .setCustomId("autorole_hombre")
      .setLabel("Hombre")
      .setEmoji("👨")
      .setStyle(ButtonStyle.Primary);


    const mujerButton = new ButtonBuilder()
      .setCustomId("autorole_mujer")
      .setLabel("Mujer")
      .setEmoji("👩")
      .setStyle(ButtonStyle.Danger);


    const genderRow =
      new ActionRowBuilder()
        .addComponents(
          hombreButton,
          mujerButton
        );


    // =========================
    // FREE FIRE
    // =========================

    const freeFireButton = new ButtonBuilder()
      .setCustomId("autorole_freefire")
      .setLabel("Free Fire")
      .setEmoji("🎮")
      .setStyle(ButtonStyle.Success);


    const gameRow =
      new ActionRowBuilder()
        .addComponents(
          freeFireButton
        );


    // =========================
    // ENVIAR PANEL
    // =========================

    await interaction.channel.send({
      embeds: [embed],
      components: [
        deviceRow,
        genderRow,
        gameRow
      ]
    });


    await interaction.editReply({
      content:
        "✅ Panel de auto roles creado correctamente."
    });

  }

};
