const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const { requireStaff } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Quita el timeout de un usuario.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Usuario a desmutear.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("razon")
        .setDescription("Razon.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const allowed = await requireStaff(interaction, "quitar mutes", PermissionFlagsBits.ModerateMembers);
    if (!allowed) return;

    const member = interaction.options.getMember("usuario");
    const reason = interaction.options.getString("razon") || "Sin razon especificada.";

    if (!member) {
      await interaction.reply({ content: "No pude encontrar ese miembro en el servidor.", ephemeral: true });
      return;
    }

    if (!member.moderatable) {
      await interaction.reply({ content: "No puedo modificar a ese usuario. Revisa la jerarquia de roles del bot.", ephemeral: true });
      return;
    }

    await member.timeout(null, `${reason} | Moderador: ${interaction.user.tag}`);
    await interaction.reply({
      content: `${member.user.tag} ya no tiene timeout. Razon: ${reason}`,
      ephemeral: true
    });
  }
};
