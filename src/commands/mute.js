const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const { formatDuration, parseDuration } = require("../utils/duration");
const { requireStaff } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Aplica timeout a un usuario.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Usuario a mutear.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("duracion")
        .setDescription("Duracion: 10m, 1h, 2d. Maximo 28d.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("razon")
        .setDescription("Razon del mute.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const allowed = await requireStaff(interaction, "mutear usuarios", PermissionFlagsBits.ModerateMembers);
    if (!allowed) return;

    const member = interaction.options.getMember("usuario");
    const duration = parseDuration(interaction.options.getString("duracion", true));
    const reason = interaction.options.getString("razon") || "Sin razon especificada.";

    if (!member) {
      await interaction.reply({ content: "No pude encontrar ese miembro en el servidor.", ephemeral: true });
      return;
    }

    if (!duration) {
      await interaction.reply({ content: "Duracion invalida. Usa algo como 10m, 1h o 2d. Maximo 28d.", ephemeral: true });
      return;
    }

    if (!member.moderatable) {
      await interaction.reply({ content: "No puedo mutear a ese usuario. Revisa la jerarquia de roles del bot.", ephemeral: true });
      return;
    }

    await member.timeout(duration, `${reason} | Moderador: ${interaction.user.tag}`);
    await interaction.reply({
      content: `${member.user.tag} fue muteado por ${formatDuration(duration)}. Razon: ${reason}`,
      ephemeral: true
    });
  }
};
