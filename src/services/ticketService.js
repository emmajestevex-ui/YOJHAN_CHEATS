const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  PermissionsBitField
} = require("discord.js");

const { config } = require("../config");
const { CUSTOM_IDS, TICKET_TYPES } = require("../constants");
const { isStaff } = require("../utils/permissions");
const { sanitizeChannelName, truncate } = require("../utils/text");

function normalizeTicketType(type) {
  return type === TICKET_TYPES.FREE_KEY ? TICKET_TYPES.FREE_KEY : TICKET_TYPES.NORMAL;
}

function ticketLabel(type) {
  return normalizeTicketType(type) === TICKET_TYPES.FREE_KEY ? "keys gratis" : "soporte";
}

function parseTicketTopic(topic) {
  const match = String(topic || "").match(/YOJHAN_TICKET owner=(\d+) type=([a-z-]+)/);
  if (!match) return null;
  return {
    ownerId: match[1],
    type: normalizeTicketType(match[2])
  };
}

function closeButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.CLOSE_TICKET)
      .setLabel("Cerrar ticket")
      .setStyle(ButtonStyle.Danger)
  );
}

function panelPayload(type) {
  const normalizedType = normalizeTicketType(type);
  const isFreeKey = normalizedType === TICKET_TYPES.FREE_KEY;

  const embed = new EmbedBuilder()
    .setColor(config.defaultEmbedColor)
    .setTitle(isFreeKey ? "YOJHAN_CHEATS | Keys gratis" : "YOJHAN_CHEATS | Tickets")
    .setDescription(
      isFreeKey
        ? "Abre un ticket especial para solicitar una key gratis. El staff revisara tu caso."
        : "Abre un ticket privado para soporte, compras o consultas."
    )
    .addFields(
      { name: "Tipo", value: isFreeKey ? "Ticket especial de key gratis" : "Ticket normal", inline: true },
      { name: "Staff", value: "Solo admins/mods podran verlo.", inline: true }
    )
    .setFooter({ text: "YOJHAN_CHEATS" });

  const button = new ButtonBuilder()
    .setCustomId(`${CUSTOM_IDS.OPEN_TICKET_PREFIX}${normalizedType}`)
    .setLabel(isFreeKey ? "Pedir key gratis" : "Abrir ticket")
    .setStyle(ButtonStyle.Danger);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)]
  };
}

async function sendTicketPanel(interaction, channel, type) {
  await interaction.deferReply({ ephemeral: true });

  if (!channel || !channel.isTextBased() || typeof channel.send !== "function") {
    await interaction.editReply("Elige un canal de texto valido.");
    return;
  }

  const permissions = channel.permissionsFor(interaction.client.user);
  const canSend = permissions?.has(PermissionFlagsBits.ViewChannel)
    && permissions?.has(PermissionFlagsBits.SendMessages)
    && permissions?.has(PermissionFlagsBits.EmbedLinks);

  if (!canSend) {
    await interaction.editReply(`No tengo permisos suficientes para publicar el panel en ${channel}.`);
    return;
  }

  await channel.send(panelPayload(type));
  await interaction.editReply(`Panel de ${ticketLabel(type)} publicado en ${channel}.`);
}

function buildTicketOverwrites(guild, userId, botUserId) {
  const staffRoleIds = [...new Set([...config.adminRoleIds, ...config.modRoleIds])];

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: userId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks
      ]
    },
    {
      id: botUserId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.AttachFiles
      ]
    }
  ];

  for (const roleId of staffRoleIds) {
    overwrites.push({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.AttachFiles
      ]
    });
  }

  return overwrites;
}

function findExistingTicket(guild, userId, type) {
  return guild.channels.cache.find((channel) => {
    if (channel.type !== ChannelType.GuildText) return false;
    const info = parseTicketTopic(channel.topic);
    return info?.ownerId === userId && info.type === normalizeTicketType(type);
  });
}

function buildTicketIntro(user, type) {
  const normalizedType = normalizeTicketType(type);
  const isFreeKey = normalizedType === TICKET_TYPES.FREE_KEY;

  return new EmbedBuilder()
    .setColor(config.defaultEmbedColor)
    .setTitle(isFreeKey ? "Ticket especial | Key gratis" : "Ticket normal")
    .setDescription(
      isFreeKey
        ? "Cuenta que key necesitas y espera a que un admin/mod revise tu solicitud."
        : "Explica tu caso con detalles para que el staff pueda ayudarte rapido."
    )
    .addFields(
      { name: "Usuario", value: `${user}`, inline: true },
      { name: "Estado", value: "Abierto", inline: true }
    )
    .setFooter({ text: "YOJHAN_CHEATS" })
    .setTimestamp();
}

async function openTicket(interaction, type) {
  await interaction.deferReply({ ephemeral: true });

  const normalizedType = normalizeTicketType(type);
  const existing = findExistingTicket(interaction.guild, interaction.user.id, normalizedType);
  if (existing) {
    await interaction.editReply(`Ya tienes un ticket abierto: ${existing}.`);
    return;
  }

  const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe();
  const prefix = normalizedType === TICKET_TYPES.FREE_KEY
    ? config.freeKeyTicketNamePrefix
    : config.ticketNamePrefix;
  const channelName = `${sanitizeChannelName(prefix)}-${sanitizeChannelName(interaction.user.username)}-${interaction.user.id.slice(-4)}`.slice(0, 100);
  const parent = normalizedType === TICKET_TYPES.FREE_KEY
    ? (config.freeKeysCategoryId || config.ticketCategoryId)
    : config.ticketCategoryId;

  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parent || undefined,
    topic: `YOJHAN_TICKET owner=${interaction.user.id} type=${normalizedType}`,
    permissionOverwrites: buildTicketOverwrites(interaction.guild, interaction.user.id, botMember.id),
    reason: `Ticket ${ticketLabel(normalizedType)} creado por ${interaction.user.tag}`
  });

  await channel.send({
    content: `${interaction.user}`,
    embeds: [buildTicketIntro(interaction.user, normalizedType)],
    components: [closeButtonRow()],
    allowedMentions: { users: [interaction.user.id] }
  });

  await interaction.editReply(`Ticket creado: ${channel}`);
}

async function logTicketClose(interaction, info, reason) {
  if (!config.logChannelId) return;

  const logChannel = await interaction.guild.channels.fetch(config.logChannelId).catch(() => null);
  if (!logChannel || !logChannel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(config.defaultEmbedColor)
    .setTitle("Ticket cerrado")
    .addFields(
      { name: "Canal", value: interaction.channel.name, inline: true },
      { name: "Tipo", value: ticketLabel(info.type), inline: true },
      { name: "Cerrado por", value: `${interaction.user}`, inline: true },
      { name: "Razon", value: truncate(reason || "Sin razon especifica.", 1024), inline: false }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

async function closeTicket(interaction, reason = "") {
  const info = parseTicketTopic(interaction.channel?.topic);
  if (!info) {
    await interaction.reply({
      content: "Este canal no parece ser un ticket creado por YOJHAN_CHEATS.",
      ephemeral: true
    });
    return;
  }

  const isOwner = info.ownerId === interaction.user.id;
  const userIsStaff = isStaff(interaction.member, interaction.memberPermissions);

  if (!isOwner && !userIsStaff) {
    await interaction.reply({
      content: "Solo el dueño del ticket o el staff puede cerrarlo.",
      ephemeral: true
    });
    return;
  }

  await logTicketClose(interaction, info, reason);
  await interaction.reply({
    content: "Ticket cerrado. Este canal se eliminara en 5 segundos."
  });

  setTimeout(() => {
    interaction.channel.delete(`Ticket cerrado por ${interaction.user.tag}`).catch(() => {});
  }, 5000);
}

function canHandleButton(interaction) {
  return interaction.customId.startsWith(CUSTOM_IDS.OPEN_TICKET_PREFIX)
    || interaction.customId === CUSTOM_IDS.CLOSE_TICKET;
}

async function handleButton(interaction) {
  if (interaction.customId.startsWith(CUSTOM_IDS.OPEN_TICKET_PREFIX)) {
    const type = interaction.customId.slice(CUSTOM_IDS.OPEN_TICKET_PREFIX.length);
    await openTicket(interaction, type);
    return;
  }

  if (interaction.customId === CUSTOM_IDS.CLOSE_TICKET) {
    await closeTicket(interaction, "Cerrado desde boton.");
  }
}

module.exports = {
  sendTicketPanel,
  openTicket,
  closeTicket,
  canHandleButton,
  handleButton,
  parseTicketTopic
};
