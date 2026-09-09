const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const { requireStaff } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Borra mensajes recientes del canal.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de mensajes a borrar, de 1 a 100.")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Opcional: borrar solo mensajes de este usuario.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const allowed = await requireStaff(interaction, "borrar mensajes", PermissionFlagsBits.ManageMessages);
    if (!allowed) return;

    await interaction.deferReply({ ephemeral: true });

    const amount = interaction.options.getInteger("cantidad", true);
    const user = interaction.options.getUser("usuario");
    const messages = await interaction.channel.messages.fetch({ limit: amount });
    const filtered = user ? messages.filter((message) => message.author.id === user.id) : messages;

    if (filtered.size === 0) {
      await interaction.editReply("No encontre mensajes para borrar con ese filtro.");
      return;
    }

    const deleted = await interaction.channel.bulkDelete(filtered, true);
    await interaction.editReply(`Mensajes borrados: ${deleted.size}.`);
  }
};
