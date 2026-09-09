const { PermissionFlagsBits } = require("discord.js");
const { config } = require("../config");

function getRoleIds(member) {
  if (!member?.roles) return [];
  if (member.roles.cache) return [...member.roles.cache.keys()];
  if (Array.isArray(member.roles)) return member.roles;
  return [];
}

function hasAnyRole(member, roleIds) {
  if (!roleIds || roleIds.length === 0) return false;
  const memberRoleIds = getRoleIds(member);
  return roleIds.some((roleId) => memberRoleIds.includes(roleId));
}

function isStaff(member, memberPermissions) {
  if (memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (hasAnyRole(member, config.adminRoleIds)) return true;
  if (hasAnyRole(member, config.modRoleIds)) return true;
  return false;
}

function hasNativePermission(memberPermissions, permission) {
  if (!memberPermissions) return false;
  return memberPermissions.has(PermissionFlagsBits.Administrator) || memberPermissions.has(permission);
}

function canUseStaffAction(interaction, permission) {
  if (isStaff(interaction.member, interaction.memberPermissions)) return true;
  return permission ? hasNativePermission(interaction.memberPermissions, permission) : false;
}

async function deny(interaction, action = "usar esto") {
  const payload = {
    content: `No tienes permiso para ${action}.`,
    ephemeral: true
  };

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload);
    return;
  }

  await interaction.reply(payload);
}

async function requireStaff(interaction, action = "usar este comando", permission = null) {
  if (canUseStaffAction(interaction, permission)) return true;
  await deny(interaction, action);
  return false;
}

module.exports = {
  isStaff,
  canUseStaffAction,
  requireStaff
};
