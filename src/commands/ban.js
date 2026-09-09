const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const { requireStaff } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banea a un usuario.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Usuario a banear.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("razon")
        .setDescription("Razon del ban.")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("borrar_dias")
        .setDescription("Dias de mensajes a borrar, de 0 a 7.")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction) {
    const allowed = await requireStaff(interaction, "banear usuarios", PermissionFlagsBits.BanMembers);
    if (!allowed) return;

    const user = interaction.options.getUser("usuario", true);
    const member = interaction.options.getMember("usuario");
    const reason = interaction.options.getString("razon") || "Sin razon especificada.";
    const deleteMessageSeconds = (interaction.options.getInteger("borrar_dias") || 0) * 24 * 60 * 60;

    if (member && !member.bannable) {
      await interaction.reply({ content: "No puedo banear a ese usuario. Revisa la jerarquia de roles del bot.", ephemeral: true });
      return;
    }

    await interaction.guild.members.ban(user.id, {
      reason: `${reason} | Moderador: ${interaction.user.tag}`,
      deleteMessageSeconds
    });

    await interaction.reply({
      content: `${user.tag} fue baneado. Razon: ${reason}`,
      ephemeral: true
    });
  }
};
