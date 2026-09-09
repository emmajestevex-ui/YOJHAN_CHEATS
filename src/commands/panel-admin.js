const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const adminEmbedService = require("../services/adminEmbedService");
const { requireStaff } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panel-admin")
    .setDescription("Abre el panel administrativo de YOJHAN_CHEATS.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const allowed = await requireStaff(interaction, "abrir el panel administrativo", PermissionFlagsBits.ManageGuild);
    if (!allowed) return;

    await adminEmbedService.showAdminPanel(interaction);
  }
};
