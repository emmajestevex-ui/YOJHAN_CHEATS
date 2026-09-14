const crypto = require("node:crypto");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const { config } = require("../config");
const { CUSTOM_IDS, TICKET_TYPES } = require("../constants");
const { parseColor, toHexColor } = require("../utils/colors");
const {
  cleanInput,
  formatFunctionList,
  isHttpUrl,
  parseBooleanInput,
  truncate
} = require("../utils/text");

const drafts = new Map();
const modalPrefills = new Map();
const DRAFT_TTL_MS = 60 * 60 * 1000;

function createTextInput(customId, label, style, options = {}) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setRequired(options.required ?? false);

  if (options.placeholder) input.setPlaceholder(options.placeholder);
  if (options.maxLength) input.setMaxLength(options.maxLength);
  if (options.value) input.setValue(options.value);

  return new ActionRowBuilder().addComponents(input);
}

function normalizeChannelId(value) {
  return cleanInput(value).replace(/[<#>]/g, "");
}

function mediaFromUrl(url) {
  const cleanUrl = cleanInput(url);
  return cleanUrl && isHttpUrl(cleanUrl) ? { type: "url", url: cleanUrl } : null;
}

function applyMedia(embed, media, methodName, files) {
  if (!media) return;

  if (media.type === "url" && isHttpUrl(media.url)) {
    embed[methodName](media.url);
    return;
  }

  if (media.type === "attachment" && media.fileName && media.buffer) {
    embed[methodName](`attachment://${media.fileName}`);
    files.push({ attachment: media.buffer, name: media.fileName });
  }
}

function getModalValue(interaction, fieldId) {
  try {
    return interaction.fields.getTextInputValue(fieldId);
  } catch {
    return "";
  }
}

function newDraft(data) {
  const id = crypto.randomUUID().slice(0, 8);
  const draft = {
    id,
    createdAt: Date.now(),
    userId: data.userId,
    guildId: data.guildId,
    targetChannelId: data.targetChannelId,
    title: data.title,
    description: data.description,
    features: data.features,
    color: data.color,
    footer: data.footer || "YOJHAN_CHEATS",
    bannerUrl: data.bannerUrl || "",
    thumbnailUrl: data.thumbnailUrl || "",
    bannerMedia: data.bannerMedia || mediaFromUrl(data.bannerUrl),
    thumbnailMedia: data.thumbnailMedia || mediaFromUrl(data.thumbnailUrl),
    mentionEveryone: data.mentionEveryone || false,
    ticketButton: data.ticketButton ?? true,
    ticketType: data.ticketType || TICKET_TYPES.NORMAL,
    ticketLabel: data.ticketLabel || "Abrir ticket"
  };

  drafts.set(id, draft);
  return draft;
}

function hasPrefillValue(data = {}) {
  return Object.values(data).some((value) => value !== undefined && value !== null && value !== "");
}

function createModalPrefill(data = {}) {
  if (!hasPrefillValue(data)) return null;

  const id = crypto.randomUUID().slice(0, 8);
  modalPrefills.set(id, {
    ...data,
    createdAt: Date.now()
  });
  return id;
}

function pruneDrafts() {
  const now = Date.now();
  for (const [id, draft] of drafts.entries()) {
    if (now - draft.createdAt > DRAFT_TTL_MS) {
      drafts.delete(id);
    }
  }

  for (const [id, prefill] of modalPrefills.entries()) {
    if (now - prefill.createdAt > DRAFT_TTL_MS) {
      modalPrefills.delete(id);
    }
  }
}

function takeModalPrefill(prefillId) {
  pruneDrafts();
  if (!prefillId) return {};

  const prefill = modalPrefills.get(prefillId);
  modalPrefills.delete(prefillId);

  if (!prefill) return {};
  const { createdAt, ...data } = prefill;
  return data;
}

function parseKnownModalPayload(payload) {
  const [channelId, prefillId] = String(payload || "").split(":");
  return {
    channelId,
    prefillId
  };
}

async function getDraftOrReply(interaction, draftId) {
  pruneDrafts();
  const draft = drafts.get(draftId);
  if (!draft) {
    await interaction.reply({
      content: "Ese borrador ya expiro. Abre el panel otra vez para crear uno nuevo.",
      ephemeral: true
    });
    return null;
  }

  if (draft.guildId !== interaction.guildId) {
    await interaction.reply({
      content: "Ese borrador no pertenece a este servidor.",
      ephemeral: true
    });
    return null;
  }

  return draft;
}

function buildAdminEmbed(draft, files = []) {
  const embed = new EmbedBuilder()
    .setColor(draft.color || config.defaultEmbedColor)
    .setTitle(truncate(draft.title, 256))
    .setDescription(truncate(draft.description, 4096))
    .setTimestamp();

  const functions = formatFunctionList(draft.features);
  if (functions) {
    embed.addFields({ name: "Funciones", value: functions, inline: false });
  }

  applyMedia(embed, draft.thumbnailMedia || mediaFromUrl(draft.thumbnailUrl), "setThumbnail", files);
  applyMedia(embed, draft.bannerMedia || mediaFromUrl(draft.bannerUrl), "setImage", files);

  if (draft.footer) {
    embed.setFooter({ text: truncate(draft.footer, 2048) });
  }

  return embed;
}

function buildEmbedPayload(draft) {
  const files = [];
  const payload = {
    content: draft.mentionEveryone ? "@everyone" : undefined,
    embeds: [buildAdminEmbed(draft, files)],
    files,
    components: [],
    allowedMentions: draft.mentionEveryone ? { parse: ["everyone"] } : { parse: [] }
  };

  if (draft.ticketButton) {
    payload.components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_IDS.OPEN_TICKET_PREFIX}${draft.ticketType}`)
          .setLabel(truncate(draft.ticketLabel || "Abrir ticket", 80))
          .setStyle(ButtonStyle.Danger)
      )
    );
  }

  return payload;
}

function buildPreviewRows(draftId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.ADMIN_EMBED_MEDIA_PREFIX}${draftId}`)
        .setLabel("Media")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.ADMIN_EMBED_OPTIONS_PREFIX}${draftId}`)
        .setLabel("Opciones")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.ADMIN_EMBED_PUBLISH_PREFIX}${draftId}`)
        .setLabel("Publicar")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.ADMIN_EMBED_CANCEL_PREFIX}${draftId}`)
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function previewContent(draft) {
  const ticketText = draft.ticketButton
    ? `activado (${draft.ticketType === TICKET_TYPES.FREE_KEY ? "keys gratis" : "normal"})`
    : "desactivado";

  return [
    `Vista previa privada para <#${draft.targetChannelId}>.`,
    `Color: ${toHexColor(draft.color)} | @everyone: ${draft.mentionEveryone ? "si" : "no"} | Ticket: ${ticketText}`
  ].join("\n");
}

async function replyWithPreview(interaction, draft) {
  const files = [];
  await interaction.reply({
    content: previewContent(draft),
    embeds: [buildAdminEmbed(draft, files)],
    files,
    components: buildPreviewRows(draft.id),
    ephemeral: true
  });
}

async function showAdminPanel(interaction) {
  const panel = new EmbedBuilder()
    .setColor(config.defaultEmbedColor)
    .setTitle("YOJHAN_CHEATS | Panel administrativo")
    .setDescription("Crea embeds rojos/negros/blancos con vista previa privada antes de publicarlos.")
    .addFields(
      { name: "Publicar aqui", value: "Usa el canal actual como destino.", inline: true },
      { name: "Elegir canal", value: "Escribe el ID del canal dentro del formulario.", inline: true }
    )
    .setFooter({ text: "No pegues tokens ni secretos en ningun formulario." });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.ADMIN_EMBED_CREATE_CURRENT_PREFIX}${interaction.channelId}`)
      .setLabel("Crear embed aqui")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.ADMIN_EMBED_CREATE_MANUAL)
      .setLabel("Elegir canal por ID")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    embeds: [panel],
    components: [row],
    ephemeral: true
  });
}

async function showKnownChannelModal(interaction, channelId, prefill = {}) {
  const prefillId = createModalPrefill(prefill);
  const customId = prefillId
    ? `${CUSTOM_IDS.ADMIN_EMBED_MODAL_KNOWN_PREFIX}${channelId}:${prefillId}`
    : `${CUSTOM_IDS.ADMIN_EMBED_MODAL_KNOWN_PREFIX}${channelId}`;

  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle("Embed YOJHAN_CHEATS");

  modal.addComponents(
    createTextInput("title", "Titulo", TextInputStyle.Short, {
      required: true,
      maxLength: 256,
      placeholder: "YOJHAN_CHEATS"
    }),
    createTextInput("description", "Descripcion", TextInputStyle.Paragraph, {
      required: true,
      maxLength: 1800,
      placeholder: "Describe el producto, aviso o servicio."
    }),
    createTextInput("features", "Funciones/lista", TextInputStyle.Paragraph, {
      required: false,
      maxLength: 1200,
      placeholder: "Una funcion por linea."
    }),
    createTextInput("color", "Color HEX", TextInputStyle.Short, {
      required: false,
      maxLength: 20,
      placeholder: "#ff1f1f"
    }),
    createTextInput("footer", "Footer", TextInputStyle.Short, {
      required: false,
      maxLength: 200,
      placeholder: "YOJHAN_CHEATS"
    })
  );

  await interaction.showModal(modal);
}

async function showManualChannelModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.ADMIN_EMBED_MODAL_MANUAL)
    .setTitle("Embed YOJHAN_CHEATS");

  modal.addComponents(
    createTextInput("channel_id", "ID del canal destino", TextInputStyle.Short, {
      required: true,
      maxLength: 30,
      placeholder: "123456789012345678"
    }),
    createTextInput("title", "Titulo", TextInputStyle.Short, {
      required: true,
      maxLength: 256,
      placeholder: "YOJHAN_CHEATS"
    }),
    createTextInput("description", "Descripcion", TextInputStyle.Paragraph, {
      required: true,
      maxLength: 1800
    }),
    createTextInput("features", "Funciones/lista", TextInputStyle.Paragraph, {
      required: false,
      maxLength: 1200,
      placeholder: "Una funcion por linea."
    }),
    createTextInput("color", "Color HEX", TextInputStyle.Short, {
      required: false,
      maxLength: 20,
      placeholder: "#ff1f1f"
    })
  );

  await interaction.showModal(modal);
}

async function showMediaModal(interaction, draft) {
  const modal = new ModalBuilder()
    .setCustomId(`${CUSTOM_IDS.ADMIN_EMBED_MEDIA_PREFIX}${draft.id}`)
    .setTitle("Media del embed");

  modal.addComponents(
    createTextInput("banner_url", "Imagen/banner URL", TextInputStyle.Short, {
      required: false,
      maxLength: 400,
      placeholder: "https://..."
    }),
    createTextInput("thumbnail_url", "Miniatura/logo URL", TextInputStyle.Short, {
      required: false,
      maxLength: 400,
      placeholder: "https://..."
    })
  );

  await interaction.showModal(modal);
}

async function showOptionsModal(interaction, draft) {
  const modal = new ModalBuilder()
    .setCustomId(`${CUSTOM_IDS.ADMIN_EMBED_OPTIONS_PREFIX}${draft.id}`)
    .setTitle("Opciones del embed");

  modal.addComponents(
    createTextInput("footer", "Footer", TextInputStyle.Short, {
      required: false,
      maxLength: 200,
      value: draft.footer || "YOJHAN_CHEATS"
    }),
    createTextInput("mention_everyone", "Mencionar @everyone? si/no", TextInputStyle.Short, {
      required: false,
      maxLength: 10,
      placeholder: "no"
    }),
    createTextInput("ticket_button", "Boton de ticket? si/no", TextInputStyle.Short, {
      required: false,
      maxLength: 10,
      placeholder: "si"
    }),
    createTextInput("ticket_label", "Texto del boton", TextInputStyle.Short, {
      required: false,
      maxLength: 80,
      value: draft.ticketLabel || "Abrir ticket"
    }),
    createTextInput("ticket_type", "Tipo ticket: normal o keys", TextInputStyle.Short, {
      required: false,
      maxLength: 20,
      placeholder: "normal"
    })
  );

  await interaction.showModal(modal);
}

function draftFromPrimaryModal(interaction, targetChannelId, prefill = {}) {
  const colorInput = cleanInput(getModalValue(interaction, "color"));
  return newDraft({
    userId: interaction.user.id,
    guildId: interaction.guildId,
    targetChannelId,
    title: getModalValue(interaction, "title"),
    description: getModalValue(interaction, "description"),
    features: cleanInput(getModalValue(interaction, "features")),
    color: parseColor(colorInput, config.defaultEmbedColor),
    footer: cleanInput(getModalValue(interaction, "footer")),
    bannerUrl: prefill.bannerUrl,
    thumbnailUrl: prefill.thumbnailUrl,
    bannerMedia: prefill.bannerMedia,
    thumbnailMedia: prefill.thumbnailMedia,
    mentionEveryone: prefill.mentionEveryone,
    ticketButton: prefill.ticketButton,
    ticketType: prefill.ticketType,
    ticketLabel: prefill.ticketLabel
  });
}

async function publishDraft(interaction, draft) {
  await interaction.deferUpdate();

  const channel = await interaction.guild.channels.fetch(draft.targetChannelId).catch(() => null);
  if (!channel || !channel.isTextBased() || typeof channel.send !== "function") {
    await interaction.editReply({
      content: "No pude encontrar un canal de texto valido para publicar ese embed.",
      embeds: [],
      components: []
    });
    return;
  }

  const permissions = channel.permissionsFor(interaction.client.user);
  const canSend = permissions?.has(PermissionFlagsBits.ViewChannel)
    && permissions?.has(PermissionFlagsBits.SendMessages)
    && permissions?.has(PermissionFlagsBits.EmbedLinks);

  if (!canSend) {
    await interaction.editReply({
      content: `No tengo permisos suficientes para publicar embeds en ${channel}.`,
      embeds: [],
      components: []
    });
    return;
  }

  await channel.send(buildEmbedPayload(draft));
  drafts.delete(draft.id);

  await interaction.editReply({
    content: `Embed publicado en ${channel}.`,
    embeds: [],
    components: []
  });
}

function canHandleButton(interaction) {
  const id = interaction.customId;
  return id.startsWith(CUSTOM_IDS.ADMIN_EMBED_CREATE_CURRENT_PREFIX)
    || id === CUSTOM_IDS.ADMIN_EMBED_CREATE_MANUAL
    || id.startsWith(CUSTOM_IDS.ADMIN_EMBED_MEDIA_PREFIX)
    || id.startsWith(CUSTOM_IDS.ADMIN_EMBED_OPTIONS_PREFIX)
    || id.startsWith(CUSTOM_IDS.ADMIN_EMBED_PUBLISH_PREFIX)
    || id.startsWith(CUSTOM_IDS.ADMIN_EMBED_CANCEL_PREFIX);
}

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id.startsWith(CUSTOM_IDS.ADMIN_EMBED_CREATE_CURRENT_PREFIX)) {
    const channelId = id.slice(CUSTOM_IDS.ADMIN_EMBED_CREATE_CURRENT_PREFIX.length);
    await showKnownChannelModal(interaction, channelId);
    return;
  }

  if (id === CUSTOM_IDS.ADMIN_EMBED_CREATE_MANUAL) {
    await showManualChannelModal(interaction);
    return;
  }

  if (id.startsWith(CUSTOM_IDS.ADMIN_EMBED_MEDIA_PREFIX)) {
    const draft = await getDraftOrReply(interaction, id.slice(CUSTOM_IDS.ADMIN_EMBED_MEDIA_PREFIX.length));
    if (draft) await showMediaModal(interaction, draft);
    return;
  }

  if (id.startsWith(CUSTOM_IDS.ADMIN_EMBED_OPTIONS_PREFIX)) {
    const draft = await getDraftOrReply(interaction, id.slice(CUSTOM_IDS.ADMIN_EMBED_OPTIONS_PREFIX.length));
    if (draft) await showOptionsModal(interaction, draft);
    return;
  }

  if (id.startsWith(CUSTOM_IDS.ADMIN_EMBED_PUBLISH_PREFIX)) {
    const draft = await getDraftOrReply(interaction, id.slice(CUSTOM_IDS.ADMIN_EMBED_PUBLISH_PREFIX.length));
    if (draft) await publishDraft(interaction, draft);
    return;
  }

  if (id.startsWith(CUSTOM_IDS.ADMIN_EMBED_CANCEL_PREFIX)) {
    const draftId = id.slice(CUSTOM_IDS.ADMIN_EMBED_CANCEL_PREFIX.length);
    drafts.delete(draftId);
    await interaction.update({
      content: "Borrador cancelado.",
      embeds: [],
      components: []
    });
  }
}

function canHandleModal(interaction) {
  const id = interaction.customId;
  return id.startsWith(CUSTOM_IDS.ADMIN_EMBED_MODAL_KNOWN_PREFIX)
    || id === CUSTOM_IDS.ADMIN_EMBED_MODAL_MANUAL
    || id.startsWith(CUSTOM_IDS.ADMIN_EMBED_MEDIA_PREFIX)
    || id.startsWith(CUSTOM_IDS.ADMIN_EMBED_OPTIONS_PREFIX);
}

async function handleModal(interaction) {
  const id = interaction.customId;

  if (id.startsWith(CUSTOM_IDS.ADMIN_EMBED_MODAL_KNOWN_PREFIX)) {
    const payload = id.slice(CUSTOM_IDS.ADMIN_EMBED_MODAL_KNOWN_PREFIX.length);
    const { channelId, prefillId } = parseKnownModalPayload(payload);
    const draft = draftFromPrimaryModal(interaction, channelId, takeModalPrefill(prefillId));
    await replyWithPreview(interaction, draft);
    return;
  }

  if (id === CUSTOM_IDS.ADMIN_EMBED_MODAL_MANUAL) {
    const targetChannelId = normalizeChannelId(getModalValue(interaction, "channel_id"));
    const draft = draftFromPrimaryModal(interaction, targetChannelId);
    await replyWithPreview(interaction, draft);
    return;
  }

  if (id.startsWith(CUSTOM_IDS.ADMIN_EMBED_MEDIA_PREFIX)) {
    const draft = await getDraftOrReply(interaction, id.slice(CUSTOM_IDS.ADMIN_EMBED_MEDIA_PREFIX.length));
    if (!draft) return;

    const bannerUrl = cleanInput(getModalValue(interaction, "banner_url"));
    const thumbnailUrl = cleanInput(getModalValue(interaction, "thumbnail_url"));

    if ((bannerUrl && !isHttpUrl(bannerUrl)) || (thumbnailUrl && !isHttpUrl(thumbnailUrl))) {
      await interaction.reply({
        content: "Las imagenes deben ser URLs http o https validas.",
        ephemeral: true
      });
      return;
    }

    draft.bannerUrl = bannerUrl;
    draft.thumbnailUrl = thumbnailUrl;
    draft.bannerMedia = mediaFromUrl(bannerUrl);
    draft.thumbnailMedia = mediaFromUrl(thumbnailUrl);
    await replyWithPreview(interaction, draft);
    return;
  }

  if (id.startsWith(CUSTOM_IDS.ADMIN_EMBED_OPTIONS_PREFIX)) {
    const draft = await getDraftOrReply(interaction, id.slice(CUSTOM_IDS.ADMIN_EMBED_OPTIONS_PREFIX.length));
    if (!draft) return;

    const ticketType = cleanInput(getModalValue(interaction, "ticket_type")).toLowerCase();
    draft.footer = cleanInput(getModalValue(interaction, "footer")) || "YOJHAN_CHEATS";
    draft.mentionEveryone = parseBooleanInput(getModalValue(interaction, "mention_everyone"), draft.mentionEveryone);
    draft.ticketButton = parseBooleanInput(getModalValue(interaction, "ticket_button"), draft.ticketButton);
    draft.ticketLabel = cleanInput(getModalValue(interaction, "ticket_label")) || "Abrir ticket";
    draft.ticketType = ticketType === TICKET_TYPES.FREE_KEY || ticketType === "key" || ticketType === "keys gratis"
      ? TICKET_TYPES.FREE_KEY
      : TICKET_TYPES.NORMAL;

    await replyWithPreview(interaction, draft);
  }
}

module.exports = {
  showAdminPanel,
  showKnownChannelModal,
  buildAdminEmbed,
  buildEmbedPayload,
  canHandleButton,
  handleButton,
  canHandleModal,
  handleModal
};
