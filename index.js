require('dotenv').config();

const crypto = require('crypto');
const http = require('http');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('❌ Falta DISCORD_TOKEN.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// Guarda temporalmente los datos escogidos antes de abrir el modal de /publicar-embed.
const pendingEmbeds = new Map();
const PENDING_TTL_MS = 15 * 60 * 1000;

function splitIds(value) {
  return String(value || '')
    .split(/[\s,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function cleanName(value) {
  const text = String(value || 'usuario')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return text || 'usuario';
}

function isHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function imageFromOptions(interaction, attachmentName, urlName) {
  const attachment = interaction.options.getAttachment(attachmentName);
  if (attachment?.url) return attachment.url;
  return isHttpUrl(interaction.options.getString(urlName));
}

// Los archivos subidos en un slash command pueden ser temporales. Como /publicar-embed
// abre un modal antes de publicar, descargamos la imagen ANTES de abrir el modal y
// guardamos sus bytes unos minutos. Al enviar el embed la adjuntamos de nuevo al mensaje.
async function captureImageOption(interaction, attachmentName, urlName, prefix) {
  const attachment = interaction.options.getAttachment(attachmentName);
  if (attachment?.url) {
    if (attachment.contentType && !attachment.contentType.startsWith('image/')) {
      throw new Error(`El archivo de ${attachmentName} debe ser una imagen.`);
    }

    const maxBytes = 25 * 1024 * 1024;
    if (attachment.size && attachment.size > maxBytes) {
      throw new Error(`La imagen de ${attachmentName} es demasiado grande. Máximo 25 MB.`);
    }

    const response = await fetch(attachment.url);
    if (!response.ok) {
      throw new Error(`No pude descargar la imagen de ${attachmentName} antes de abrir el formulario.`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) {
      throw new Error(`La imagen de ${attachmentName} es demasiado grande. Máximo 25 MB.`);
    }

    const originalName = String(attachment.name || 'imagen.png');
    const extMatch = originalName.match(/\.[a-zA-Z0-9]{1,8}$/);
    const extension = extMatch ? extMatch[0].toLowerCase() : '.png';
    const fileName = `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${extension}`;

    return { type: 'attachment', fileName, buffer };
  }

  const url = isHttpUrl(interaction.options.getString(urlName));
  return url ? { type: 'url', url } : null;
}

function parseColor(value, fallback = 0xed1c24) {
  if (!value) return fallback;
  const normalized = String(value).trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback;
  return Number.parseInt(normalized, 16);
}

function applyImages(embed, imageUrl, logoUrl) {
  if (imageUrl) embed.setImage(imageUrl);
  if (logoUrl) embed.setThumbnail(logoUrl);
  return embed;
}

async function validSupportRoleIds(guild) {
  await guild.roles.fetch().catch(() => null);
  const ids = [...new Set([
    ...splitIds(process.env.ADMIN_ROLE_IDS),
    ...splitIds(process.env.MOD_ROLE_IDS),
  ])];
  return ids.filter((id) => guild.roles.cache.has(id));
}

async function resolveTicketCategory(guild) {
  await guild.channels.fetch().catch(() => null);

  const configuredId = String(process.env.TICKET_CATEGORY_ID || '').trim();
  if (configuredId) {
    const configured = guild.channels.cache.get(configuredId);
    if (configured?.type === ChannelType.GuildCategory) return configured;
  }

  const preferred = String(process.env.TICKET_CATEGORY_NAME || 'TIKET').trim().toUpperCase();
  const acceptedNames = new Set([preferred, 'TIKET', 'TICKET', 'TICKETS']);
  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && acceptedNames.has(c.name.toUpperCase()),
  );
  if (existing) return existing;

  const me = guild.members.me || (await guild.members.fetchMe());
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error('No existe la categoría TIKET y al bot le falta el permiso Administrar canales.');
  }

  return guild.channels.create({
    name: 'TIKET',
    type: ChannelType.GuildCategory,
    reason: 'Categoría automática para tickets de YOJHAN_CHEATS',
  });
}

async function openTicket(interaction, kind) {
  if (!interaction.guild) return;

  await interaction.deferReply({ ephemeral: true });

  const category = await resolveTicketCategory(interaction.guild);
  const supportRoles = await validSupportRoleIds(interaction.guild);
  const me = interaction.guild.members.me || (await interaction.guild.members.fetchMe());

  // Evita abrir varios tickets del mismo tipo para la misma persona.
  await interaction.guild.channels.fetch().catch(() => null);
  const topicMarker = `yojhan-ticket:${kind}:${interaction.user.id}`;
  const existing = interaction.guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildText && c.topic === topicMarker,
  );
  if (existing) {
    await interaction.editReply(`Ya tienes un ticket abierto: ${existing}`);
    return;
  }

  const prefix = kind === 'key' ? 'key' : 'ticket';
  const channel = await interaction.guild.channels.create({
    name: `${prefix}-${cleanName(interaction.user.username)}`,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: topicMarker,
    reason: `Ticket ${kind} abierto por ${interaction.user.tag}`,
    permissionOverwrites: [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
        ],
      },
      ...supportRoles.map((id) => ({
        id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      })),
    ],
  });

  const isKey = kind === 'key';
  const embed = new EmbedBuilder()
    .setColor(isKey ? 0xf1c40f : 0xed1c24)
    .setTitle(isKey ? '🔑 Ticket de Key Gratis' : '🎫 Ticket de Soporte')
    .setDescription(
      isKey
        ? `${interaction.user}, tu ticket de **KEY GRATIS** fue creado. Explica lo que necesitas y espera al staff.`
        : `${interaction.user}, explica tu consulta y espera a que un miembro del staff te atienda.`,
    )
    .setFooter({ text: 'YOJHAN_CHEATS' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Cerrar ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
  );

  await channel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
  await interaction.editReply(`✅ Ticket creado: ${channel}`);
}

async function publishTicketPanel(interaction, kind) {
  const channel = interaction.options.getChannel('canal') || interaction.channel;
  if (!channel?.isTextBased()) {
    await interaction.reply({ content: 'Ese canal no permite mensajes.', ephemeral: true });
    return;
  }

  const isKey = kind === 'key';
  const title =
    interaction.options.getString('titulo') ||
    (isKey ? '🔑 KEY GRATIS' : '🎫 ABRIR TICKET');
  const description =
    interaction.options.getString('descripcion') ||
    (isKey
      ? 'Pulsa el botón para abrir un ticket especial y solicitar tu key gratis.'
      : 'Pulsa el botón para abrir un ticket privado con el staff.');
  const buttonText =
    interaction.options.getString('boton') || (isKey ? 'Pedir Key Gratis' : 'Abrir Ticket');
  const imageUrl = imageFromOptions(interaction, 'foto', 'imagen_url');
  const logoUrl = imageFromOptions(interaction, 'logo', 'logo_url');

  const embed = applyImages(
    new EmbedBuilder()
      .setColor(isKey ? 0xf1c40f : 0xed1c24)
      .setTitle(title.slice(0, 256))
      .setDescription(description.slice(0, 4096))
      .setFooter({ text: 'YOJHAN_CHEATS' }),
    imageUrl,
    logoUrl,
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_open:${kind}`)
      .setLabel(buttonText.slice(0, 80))
      .setEmoji(isKey ? '🔑' : '🎫')
      .setStyle(isKey ? ButtonStyle.Success : ButtonStyle.Primary),
  );

  await channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: `✅ Panel publicado en ${channel}.`, ephemeral: true });
}

async function handlePublicarEmbed(interaction) {
  const channel = interaction.options.getChannel('canal');
  if (!channel?.isTextBased()) {
    await interaction.reply({ content: 'Ese canal no permite mensajes.', ephemeral: true });
    return;
  }

  // Captura los archivos ahora mismo. Si esperamos a que el usuario complete el modal,
  // el enlace temporal del archivo de Discord puede dejar de ser válido.
  const image = await captureImageOption(interaction, 'foto', 'imagen_url', 'foto');
  const logo = await captureImageOption(interaction, 'logo', 'logo_url', 'logo');

  const nonce = crypto.randomBytes(9).toString('hex');
  pendingEmbeds.set(nonce, {
    userId: interaction.user.id,
    channelId: channel.id,
    image,
    logo,
    expiresAt: Date.now() + PENDING_TTL_MS,
  });

  const modal = new ModalBuilder()
    .setCustomId(`publicar_embed:${nonce}`)
    .setTitle('Embed YOJHAN_CHEATS');

  const title = new TextInputBuilder()
    .setCustomId('titulo')
    .setLabel('Título')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('YOJHAN_CHEATS')
    .setMaxLength(256)
    .setRequired(true);

  const description = new TextInputBuilder()
    .setCustomId('descripcion')
    .setLabel('Descripción')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe el producto, aviso o servicio.')
    .setMaxLength(3500)
    .setRequired(true);

  const list = new TextInputBuilder()
    .setCustomId('funciones')
    .setLabel('Funciones/lista')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Una función por línea.')
    .setMaxLength(1500)
    .setRequired(false);

  const color = new TextInputBuilder()
    .setCustomId('color')
    .setLabel('Color HEX')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('#ff1f1f')
    .setMaxLength(7)
    .setRequired(false);

  const footer = new TextInputBuilder()
    .setCustomId('footer')
    .setLabel('Footer')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('YOJHAN_CHEATS')
    .setMaxLength(2048)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(description),
    new ActionRowBuilder().addComponents(list),
    new ActionRowBuilder().addComponents(color),
    new ActionRowBuilder().addComponents(footer),
  );

  await interaction.showModal(modal);
}

async function handlePublicarEmbedModal(interaction) {
  const nonce = interaction.customId.split(':')[1];
  const pending = pendingEmbeds.get(nonce);
  pendingEmbeds.delete(nonce);

  if (!pending || pending.expiresAt < Date.now()) {
    await interaction.reply({
      content: 'Este formulario expiró. Vuelve a usar /publicar-embed.',
      ephemeral: true,
    });
    return;
  }
  if (pending.userId !== interaction.user.id) {
    await interaction.reply({ content: 'Este formulario no te pertenece.', ephemeral: true });
    return;
  }

  const channel = await interaction.guild.channels.fetch(pending.channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    await interaction.reply({ content: 'No encuentro el canal de publicación.', ephemeral: true });
    return;
  }

  const title = interaction.fields.getTextInputValue('titulo').trim();
  const description = interaction.fields.getTextInputValue('descripcion').trim();
  const functions = interaction.fields.getTextInputValue('funciones').trim();
  const colorValue = interaction.fields.getTextInputValue('color').trim();
  const footer = interaction.fields.getTextInputValue('footer').trim();

  const embed = new EmbedBuilder()
    .setColor(parseColor(colorValue))
    .setTitle(title.slice(0, 256))
    .setDescription(description.slice(0, 4096));

  if (functions) {
    const formatted = functions
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line.startsWith('•') || line.startsWith('-') ? line : `• ${line}`))
      .join('\n')
      .slice(0, 1024);
    if (formatted) embed.addFields({ name: 'Funciones', value: formatted });
  }

  if (footer) embed.setFooter({ text: footer.slice(0, 2048) });

  const files = [];
  if (pending.image?.type === 'url') {
    embed.setImage(pending.image.url);
  } else if (pending.image?.type === 'attachment') {
    embed.setImage(`attachment://${pending.image.fileName}`);
    files.push({ attachment: pending.image.buffer, name: pending.image.fileName });
  }

  if (pending.logo?.type === 'url') {
    embed.setThumbnail(pending.logo.url);
  } else if (pending.logo?.type === 'attachment') {
    embed.setThumbnail(`attachment://${pending.logo.fileName}`);
    files.push({ attachment: pending.logo.buffer, name: pending.logo.fileName });
  }

  // Publica TODO junto: embed + imagen dentro del embed + botón de ticket debajo.
  const ticketRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_open:normal')
      .setLabel('Abrir ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Danger),
  );

  await channel.send({
    embeds: [embed],
    files,
    components: [ticketRow],
  });
  await interaction.reply({ content: `✅ Publicación enviada a ${channel} con imagen y botón de ticket.`, ephemeral: true });
}

async function handleAnnouncement(interaction) {
  const channel = interaction.options.getChannel('canal');
  const imageUrl = imageFromOptions(interaction, 'foto', 'imagen_url');
  const logoUrl = imageFromOptions(interaction, 'logo', 'logo_url');
  const embed = applyImages(
    new EmbedBuilder()
      .setColor(parseColor(interaction.options.getString('color')))
      .setTitle(interaction.options.getString('titulo').slice(0, 256))
      .setDescription(interaction.options.getString('descripcion').slice(0, 4096))
      .setFooter({ text: 'YOJHAN_CHEATS' })
      .setTimestamp(),
    imageUrl,
    logoUrl,
  );
  await channel.send({ embeds: [embed] });
  await interaction.reply({ content: `✅ Anuncio publicado en ${channel}.`, ephemeral: true });
}

async function handleModeration(interaction) {
  const command = interaction.commandName;
  const user = interaction.options.getUser('usuario');
  const reason = interaction.options.getString('razon') || `Acción realizada por ${interaction.user.tag}`;
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!member) {
    await interaction.reply({ content: 'No pude encontrar a ese miembro en el servidor.', ephemeral: true });
    return;
  }

  if (command === 'mute') {
    const minutes = interaction.options.getInteger('minutos');
    if (!member.moderatable) throw new Error('No puedo silenciar a ese usuario por la jerarquía de roles.');
    await member.timeout(minutes * 60 * 1000, reason);
    await interaction.reply({ content: `✅ ${user.tag} silenciado por ${minutes} minuto(s).`, ephemeral: true });
    return;
  }

  if (command === 'kick') {
    if (!member.kickable) throw new Error('No puedo expulsar a ese usuario por la jerarquía de roles.');
    await member.kick(reason);
    await interaction.reply({ content: `✅ ${user.tag} expulsado.`, ephemeral: true });
    return;
  }

  if (command === 'ban') {
    if (!member.bannable) throw new Error('No puedo banear a ese usuario por la jerarquía de roles.');
    await member.ban({ reason });
    await interaction.reply({ content: `✅ ${user.tag} baneado.`, ephemeral: true });
  }
}

client.once('ready', () => {
  console.log(`✅ YOJHAN_CHEATS conectado como ${client.user.tag}`);
  client.user.setActivity('YOJHAN CHEATS | /ticket-panel');
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case 'publicar-embed':
          await handlePublicarEmbed(interaction);
          break;
        case 'ticket-panel':
          await publishTicketPanel(interaction, 'normal');
          break;
        case 'key-panel':
          await publishTicketPanel(interaction, 'key');
          break;
        case 'anuncio':
          await handleAnnouncement(interaction);
          break;
        case 'panel-admin': {
          const embed = new EmbedBuilder()
            .setColor(0xed1c24)
            .setTitle('⚙️ YOJHAN_CHEATS — Panel Admin')
            .setDescription([
              '`/publicar-embed` — publicación personalizada con foto y logo',
              '`/ticket-panel` — panel de tickets',
              '`/key-panel` — panel de keys gratis',
              '`/anuncio` — anuncio con banner/logo',
              '`/mute`, `/kick`, `/ban` — moderación',
              '',
              `Categoría de tickets: **${process.env.TICKET_CATEGORY_NAME || 'TIKET'}**`,
            ].join('\n'))
            .setFooter({ text: 'YOJHAN_CHEATS' });
          await interaction.reply({ embeds: [embed], ephemeral: true });
          break;
        }
        case 'mute':
        case 'kick':
        case 'ban':
          await handleModeration(interaction);
          break;
        default:
          await interaction.reply({ content: 'Comando no reconocido.', ephemeral: true });
      }
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('publicar_embed:')) {
      await handlePublicarEmbedModal(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('ticket_open:')) {
        const kind = interaction.customId.split(':')[1] === 'key' ? 'key' : 'normal';
        await openTicket(interaction, kind);
        return;
      }

      if (interaction.customId === 'ticket_close') {
        if (!interaction.channel?.topic?.startsWith('yojhan-ticket:')) {
          await interaction.reply({ content: 'Este canal no parece ser un ticket del bot.', ephemeral: true });
          return;
        }
        await interaction.reply('🔒 Cerrando ticket en 3 segundos...');
        setTimeout(() => {
          interaction.channel.delete('Ticket cerrado en YOJHAN_CHEATS').catch(console.error);
        }, 3000);
      }
    }
  } catch (error) {
    console.error('Error de interacción:', error);
    const message = `❌ ${error.message || 'Ocurrió un error.'}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message }).catch(() => null);
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
    }
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingEmbeds.entries()) {
    if (value.expiresAt < now) pendingEmbeds.delete(key);
  }
}, 60 * 1000).unref();

const keepAlive = String(process.env.ENABLE_KEEP_ALIVE || 'true').toLowerCase() !== 'false';
if (keepAlive) {
  const port = Number(process.env.PORT || 3000);
  http
    .createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          ok: true,
          bot: client.user?.tag || 'connecting',
          version: 'publicar-embed-foto-ticket-20260914',
          uptime: Math.round(process.uptime()),
          path: req.url,
        }),
      );
    })
    .listen(port, '0.0.0.0', () => console.log(`🌐 Health server activo en puerto ${port}`));
}

client.login(TOKEN);
