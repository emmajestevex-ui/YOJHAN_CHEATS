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
const { parseColor } = require("../utils/colors");
const { isStaff } = require("../utils/permissions");
const {
  cleanInput,
  isHttpUrl,
  sanitizeChannelName,
  truncate
} = require("../utils/text");

// ==========================================
// NORMALIZAR TIPO DE TICKET
// ==========================================

function normalizeTicketType(type) {
  return type === TICKET_TYPES.FREE_KEY
    ? TICKET_TYPES.FREE_KEY
    : TICKET_TYPES.NORMAL;
}

// ==========================================
// NOMBRE/TIPO DEL TICKET
// ==========================================

function ticketLabel(type) {
  return normalizeTicketType(type) === TICKET_TYPES.FREE_KEY
    ? "keys gratis"
    : "soporte";
}

// ==========================================
// NORMALIZAR NOMBRE
// ==========================================

function normalizeName(value) {
  return cleanInput(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

// ==========================================
// LEER INFORMACIÓN DEL TOPIC DEL TICKET
// ==========================================

function parseTicketTopic(topic) {
  const match = String(topic || "").match(
    /YOJHAN_TICKET owner=(\d+) type=([a-z-]+)/
  );

  if (!match) {
    return null;
  }

  return {
    ownerId: match[1],
    type: normalizeTicketType(match[2])
  };
}

// ==========================================
// BOTÓN CERRAR TICKET
// ==========================================

function closeButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.CLOSE_TICKET)
      .setLabel("Cerrar ticket")
      .setStyle(ButtonStyle.Danger)
  );
}

// ==========================================
// PANEL DE TICKETS
// ==========================================

function panelPayload(type, options = {}) {
  const normalizedType = normalizeTicketType(type);

  const isFreeKey =
    normalizedType === TICKET_TYPES.FREE_KEY;

  const title =
    cleanInput(options.title) ||
    (
      isFreeKey
        ? "YOJHAN_CHEATS | Keys gratis"
        : "YOJHAN_CHEATS | Tickets"
    );

  const description =
    cleanInput(options.description) ||
    (
      isFreeKey
        ? "Abre un ticket especial para solicitar una key gratis. El staff revisara tu caso."
        : "Abre un ticket privado para soporte, compras o consultas."
    );

  const footer =
    cleanInput(options.footer) ||
    "YOJHAN_CHEATS";

  const buttonLabel =
    cleanInput(options.buttonLabel) ||
    (
      isFreeKey
        ? "Pedir key gratis"
        : "Abrir ticket"
    );

  const imageUrl =
    cleanInput(options.imageUrl);

  const thumbnailUrl =
    cleanInput(options.thumbnailUrl);

  const embed = new EmbedBuilder()
    .setColor(
      parseColor(
        options.color,
        config.defaultEmbedColor
      )
    )
    .setTitle(
      truncate(title, 256)
    )
    .setDescription(
      truncate(description, 4096)
    )
    .addFields(
      {
        name: "Tipo",
        value: isFreeKey
          ? "Ticket especial de key gratis"
          : "Ticket normal",
        inline: true
      },
      {
        name: "Staff",
        value: "Solo admins/mods podran verlo.",
        inline: true
      }
    )
    .setFooter({
      text: truncate(footer, 2048)
    });

  if (
    imageUrl &&
    isHttpUrl(imageUrl)
  ) {
    embed.setImage(imageUrl);
  }

  if (
    thumbnailUrl &&
    isHttpUrl(thumbnailUrl)
  ) {
    embed.setThumbnail(thumbnailUrl);
  }

  const button =
    new ButtonBuilder()
      .setCustomId(
        `${CUSTOM_IDS.OPEN_TICKET_PREFIX}${normalizedType}`
      )
      .setLabel(
        truncate(buttonLabel, 80)
      )
      .setStyle(
        ButtonStyle.Danger
      );

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder()
        .addComponents(button)
    ]
  };
}

// ==========================================
// PUBLICAR PANEL DE TICKETS
// ==========================================

async function sendTicketPanel(
  interaction,
  channel,
  type,
  options = {}
) {
  await interaction.deferReply({
    ephemeral: true
  });

  if (
    !channel ||
    !channel.isTextBased() ||
    typeof channel.send !== "function"
  ) {
    await interaction.editReply(
      "Elige un canal de texto valido."
    );

    return;
  }

  const permissions =
    channel.permissionsFor(
      interaction.client.user
    );

  const canSend =
    permissions?.has(
      PermissionFlagsBits.ViewChannel
    ) &&
    permissions?.has(
      PermissionFlagsBits.SendMessages
    ) &&
    permissions?.has(
      PermissionFlagsBits.EmbedLinks
    );

  if (!canSend) {
    await interaction.editReply(
      `No tengo permisos suficientes para publicar el panel en ${channel}.`
    );

    return;
  }

  await channel.send(
    panelPayload(
      type,
      options
    )
  );

  await interaction.editReply(
    `Panel de ${ticketLabel(type)} publicado en ${channel}.`
  );
}

// ==========================================
// PERMISOS DEL CANAL DEL TICKET
// ==========================================

function buildTicketOverwrites(
  guild,
  userId,
  botUserId
) {
  const staffRoleIds = [
    ...new Set([
      ...config.adminRoleIds,
      ...config.programadorRoleIds
    ])
  ].filter(
    (roleId) =>
      guild.roles.cache.has(roleId)
  );

  const overwrites = [
    {
      id: guild.roles.everyone.id,

      deny: [
        PermissionsBitField.Flags.ViewChannel
      ]
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

  for (
    const roleId
    of staffRoleIds
  ) {
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

// ==========================================
// BUSCAR CATEGORÍA CONFIGURADA
// ==========================================

async function fetchConfiguredCategory(
  guild,
  categoryId,
  label = "TICKET_CATEGORY_ID"
) {
  if (!categoryId) {
    return null;
  }

  const channel =
    await guild.channels
      .fetch(categoryId)
      .catch(() => null);

  if (!channel) {
    console.warn(
      `[tickets] No encontre la categoria configurada en ${label}: ${categoryId}`
    );

    return null;
  }

  if (
    channel.type !==
    ChannelType.GuildCategory
  ) {
    console.warn(
      `[tickets] ${label} debe ser una categoria, no un canal: ${channel.name}`
    );

    return null;
  }

  return channel;
}

// ==========================================
// CONFIGURACIÓN DE CATEGORÍAS
// ==========================================

function ticketCategorySettings(type) {
  const normalizedType =
    normalizeTicketType(type);

  if (
    normalizedType ===
    TICKET_TYPES.FREE_KEY
  ) {
    return {
      id:
        config.freeKeysCategoryId,

      idLabel:
        "FREE_KEYS_CATEGORY_ID",

      name:
        config.freeKeysCategoryName ||
        "TIKET GRATIS",

      acceptedNames: [
        config.freeKeysCategoryName,
        "TIKET GRATIS",
        "TICKET GRATIS",
        "KEY GRATIS",
        "KEYS GRATIS"
      ]
    };
  }

  return {
    id:
      config.ticketCategoryId,

    idLabel:
      "TICKET_CATEGORY_ID",

    name:
      config.ticketCategoryName ||
      "TIKET",

    acceptedNames: [
      config.ticketCategoryName,
      "TIKET",
      "TICKET",
      "TICKETS"
    ]
  };
}

// ==========================================
// BUSCAR CATEGORÍA EXISTENTE
// ==========================================

function findExistingTicketCategory(
  guild,
  type
) {
  const settings =
    ticketCategorySettings(type);

  const wantedNames =
    new Set(
      settings.acceptedNames
        .map(normalizeName)
        .filter(Boolean)
    );

  return guild.channels.cache.find(
    (channel) =>
      channel.type ===
        ChannelType.GuildCategory &&
      wantedNames.has(
        normalizeName(channel.name)
      )
  );
}

// ==========================================
// BUSCAR O CREAR CATEGORÍA
// ==========================================

async function findTicketCategory(
  guild,
  type
) {
  const normalizedType =
    normalizeTicketType(type);

  const settings =
    ticketCategorySettings(
      normalizedType
    );

  await guild.channels
    .fetch()
    .catch(() => null);

  const configured =
    await fetchConfiguredCategory(
      guild,
      settings.id,
      settings.idLabel
    );

  if (configured) {
    return configured;
  }

  const existing =
    findExistingTicketCategory(
      guild,
      normalizedType
    );

  if (existing) {
    return existing;
  }

  const created =
    await guild.channels.create({
      name:
        settings.name,

      type:
        ChannelType.GuildCategory,

      reason:
        "Categoria de tickets creada por YOJHAN_CHEATS"
    });

  const normalCategory =
    normalizedType ===
    TICKET_TYPES.FREE_KEY
      ? findExistingTicketCategory(
          guild,
          TICKET_TYPES.NORMAL
        )
      : null;

  const position =
    normalCategory
      ? (
          normalCategory.rawPosition ??
          0
        ) + 1
      : guild.channels.cache
          .filter(
            (channel) =>
              channel.type ===
              ChannelType.GuildCategory
          )
          .reduce(
            (max, channel) =>
              Math.max(
                max,
                channel.rawPosition ??
                  0
              ),
            0
          );

  await created
    .setPosition(position)
    .catch(() => {});

  return created;
}

// ==========================================
// ESCAPAR REGEX
// ==========================================

function escapeRegExp(value) {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}

// ==========================================
// PREFIJO DEL CANAL
// ==========================================

function ticketChannelPrefix(type) {
  const normalizedType =
    normalizeTicketType(type);

  const fallback =
    normalizedType ===
    TICKET_TYPES.FREE_KEY
      ? "tiket-gratis"
      : "tiket";

  const configuredPrefix =
    normalizedType ===
    TICKET_TYPES.FREE_KEY
      ? config.freeKeyTicketNamePrefix
      : config.ticketNamePrefix;

  return sanitizeChannelName(
    cleanInput(configuredPrefix) ||
    fallback
  );
}

// ==========================================
// SIGUIENTE NÚMERO DEL TICKET
// ==========================================

function nextTicketChannelName(
  guild,
  categoryId,
  type
) {
  const prefix =
    ticketChannelPrefix(type);

  const pattern =
    new RegExp(
      `^${escapeRegExp(prefix)}-(\\d+)$`,
      "i"
    );

  let maxNumber = 0;

  for (
    const channel
    of guild.channels.cache.values()
  ) {
    if (
      channel.type !==
      ChannelType.GuildText
    ) {
      continue;
    }

    if (
      categoryId &&
      channel.parentId !== categoryId
    ) {
      continue;
    }

    const match =
      channel.name.match(pattern);

    if (match) {
      maxNumber =
        Math.max(
          maxNumber,
          Number.parseInt(
            match[1],
            10
          ) || 0
        );
    }
  }

  return `${prefix}-${maxNumber + 1}`;
}

// ==========================================
// MENSAJE DE ERROR AL CREAR TICKET
// ==========================================

function ticketCreateErrorMessage(error) {
  if (error?.code === 50013) {
    return "No puedo crear el ticket porque me falta permiso de Administrar canales o no tengo acceso a la categoria TIKET/TIKET GRATIS.";
  }

  if (error?.code === 50035) {
    return "No pude crear el ticket porque hay una categoria o rol mal configurado. Revisa que los IDs configurados sean de categorias, no de canales.";
  }

  return "No pude crear el ticket. Revisa permisos del bot, categorias TIKET/TIKET GRATIS y jerarquia de roles.";
}

// ==========================================
// BUSCAR TICKET EXISTENTE
// ==========================================

function findExistingTicket(
  guild,
  userId,
  type
) {
  return guild.channels.cache.find(
    (channel) => {
      if (
        channel.type !==
        ChannelType.GuildText
      ) {
        return false;
      }

      const info =
        parseTicketTopic(
          channel.topic
        );

      return (
        info?.ownerId === userId &&
        info.type ===
          normalizeTicketType(type)
      );
    }
  );
}

// ==========================================
// EMBED DE BIENVENIDA DEL TICKET
// ==========================================

function buildTicketIntro(
  user,
  type
) {
  const normalizedType =
    normalizeTicketType(type);

  const isFreeKey =
    normalizedType ===
    TICKET_TYPES.FREE_KEY;

  return new EmbedBuilder()
    .setColor(
      config.defaultEmbedColor
    )
    .setTitle(
      isFreeKey
        ? "Ticket especial | Key gratis"
        : "Ticket normal"
    )
    .setDescription(
      isFreeKey
        ? "Cuenta que key necesitas y espera a que un admin/mod revise tu solicitud."
        : "Explica tu caso con detalles para que el staff pueda ayudarte rapido."
    )
    .addFields(
      {
        name: "Usuario",
        value: `${user}`,
        inline: true
      },
      {
        name: "Estado",
        value: "Abierto",
        inline: true
      }
    )
    .setFooter({
      text: "YOJHAN_CHEATS"
    })
    .setTimestamp();
}

// ==========================================
// ABRIR TICKET
// ==========================================

async function openTicket(
  interaction,
  type
) {
  // IMPORTANTE:
  // Discord recibe respuesta inmediatamente.
  await interaction.deferReply({
    ephemeral: true
  });

  const normalizedType =
    normalizeTicketType(type);

  const existing =
    findExistingTicket(
      interaction.guild,
      interaction.user.id,
      normalizedType
    );

  if (existing) {
    await interaction.editReply(
      `Ya tienes un ticket abierto: ${existing}.`
    );

    return;
  }

  const botMember =
    interaction.guild.members.me ||
    await interaction.guild.members.fetchMe();

  if (
    !botMember.permissions.has(
      PermissionFlagsBits.ManageChannels
    )
  ) {
    await interaction.editReply(
      "No puedo crear tickets porque me falta el permiso Administrar canales."
    );

    return;
  }

  let channel;

  try {
    const category =
      await findTicketCategory(
        interaction.guild,
        normalizedType
      );

    const channelName =
      nextTicketChannelName(
        interaction.guild,
        category?.id,
        normalizedType
      );

    channel =
      await interaction.guild
        .channels
        .create({
          name:
            channelName,

          type:
            ChannelType.GuildText,

          parent:
            category?.id,

          topic:
            `YOJHAN_TICKET owner=${interaction.user.id} type=${normalizedType}`,

          permissionOverwrites:
            buildTicketOverwrites(
              interaction.guild,
              interaction.user.id,
              botMember.id
            ),

          reason:
            `Ticket ${ticketLabel(normalizedType)} creado por ${interaction.user.tag}`
        });

  } catch (error) {
    console.error(
      "[tickets] Error creando ticket:",
      error
    );

    await interaction.editReply(
      ticketCreateErrorMessage(
        error
      )
    );

    return;
  }

  await channel.send({
    content:
      `${interaction.user}`,

    embeds: [
      buildTicketIntro(
        interaction.user,
        normalizedType
      )
    ],

    components: [
      closeButtonRow()
    ],

    allowedMentions: {
      users: [
        interaction.user.id
      ]
    }
  });

  await interaction.editReply(
    `Ticket creado: ${channel}`
  );
}

// ==========================================
// LOG DE CIERRE
// ==========================================

async function logTicketClose(
  interaction,
  info,
  reason
) {
  if (!config.logChannelId) {
    return;
  }

  const logChannel =
    await interaction.guild
      .channels
      .fetch(
        config.logChannelId
      )
      .catch(() => null);

  if (
    !logChannel ||
    !logChannel.isTextBased()
  ) {
    return;
  }

  const embed =
    new EmbedBuilder()
      .setColor(
        config.defaultEmbedColor
      )
      .setTitle(
        "Ticket cerrado"
      )
      .addFields(
        {
          name: "Canal",
          value:
            interaction.channel.name,
          inline: true
        },
        {
          name: "Tipo",
          value:
            ticketLabel(info.type),
          inline: true
        },
        {
          name: "Cerrado por",
          value:
            `${interaction.user}`,
          inline: true
        },
        {
          name: "Razon",
          value:
            truncate(
              reason ||
                "Sin razon especifica.",
              1024
            ),
          inline: false
        }
      )
      .setTimestamp();

  await logChannel
    .send({
      embeds: [embed]
    })
    .catch(() => {});
}

// ==========================================
// CERRAR TICKET
// ==========================================

async function closeTicket(
  interaction,
  reason = ""
) {
  const info =
    parseTicketTopic(
      interaction.channel?.topic
    );

  if (!info) {
    await interaction.reply({
      content:
        "Este canal no parece ser un ticket creado por YOJHAN_CHEATS.",

      ephemeral: true
    });

    return;
  }

  const isOwner =
    info.ownerId ===
    interaction.user.id;

  const userIsStaff =
    isStaff(
      interaction.member,
      interaction.memberPermissions
    );

  if (
    !isOwner &&
    !userIsStaff
  ) {
    await interaction.reply({
      content:
        "Solo el dueño del ticket o el staff puede cerrarlo.",

      ephemeral: true
    });

    return;
  }

  await logTicketClose(
    interaction,
    info,
    reason
  );

  await interaction.reply({
    content:
      "Ticket cerrado. Este canal se eliminara en 5 segundos."
  });

  setTimeout(() => {
    interaction.channel
      .delete(
        `Ticket cerrado por ${interaction.user.tag}`
      )
      .catch(() => {});
  }, 5000);
}

// ==========================================
// COMPROBAR SI EL BOTÓN ES DE TICKETS
// ==========================================

function canHandleButton(
  interaction
) {
  return (
    interaction.customId.startsWith(
      CUSTOM_IDS.OPEN_TICKET_PREFIX
    ) ||
    interaction.customId ===
      CUSTOM_IDS.CLOSE_TICKET
  );
}

// ==========================================
// PROCESAR BOTONES DE TICKETS
// ==========================================

async function handleButton(
  interaction
) {
  if (
    interaction.customId.startsWith(
      CUSTOM_IDS.OPEN_TICKET_PREFIX
    )
  ) {
    const type =
      interaction.customId.slice(
        CUSTOM_IDS.OPEN_TICKET_PREFIX.length
      );

    await openTicket(
      interaction,
      type
    );

    return;
  }

  if (
    interaction.customId ===
    CUSTOM_IDS.CLOSE_TICKET
  ) {
    await closeTicket(
      interaction,
      "Cerrado desde boton."
    );
  }
}

// ==========================================
// EXPORTAR
// ==========================================

module.exports = {
  sendTicketPanel,
  openTicket,
  closeTicket,
  canHandleButton,
  handleButton,
  parseTicketTopic
};
