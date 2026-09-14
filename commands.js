const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const imageOptions = (builder) =>
  builder
    .addAttachmentOption((o) =>
      o.setName('foto').setDescription('Sube la foto/banner principal').setRequired(false),
    )
    .addStringOption((o) =>
      o.setName('imagen_url').setDescription('URL directa de la foto/banner').setRequired(false),
    )
    .addAttachmentOption((o) =>
      o.setName('logo').setDescription('Sube un logo pequeño').setRequired(false),
    )
    .addStringOption((o) =>
      o.setName('logo_url').setDescription('URL directa del logo pequeño').setRequired(false),
    );

const destinationOptions = (builder, description) =>
  builder
    .addChannelOption((o) =>
      o
        .setName('canal')
        .setDescription(description)
        .setRequired(false),
    )
    .addStringOption((o) =>
      o
        .setName('canal_id')
        .setDescription('ID del canal si no aparece en la lista')
        .setRequired(false),
    );

const commands = [];

commands.push(
  imageOptions(
    destinationOptions(
      new SlashCommandBuilder()
        .setName('publicar-embed')
        .setDescription('Abre un formulario para crear y publicar un embed YOJHAN_CHEATS.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
      'Canal donde se publicará el embed',
    ),
  ),
);

commands.push(
  imageOptions(
    destinationOptions(
      new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Publica un panel para abrir tickets normales.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
      'Canal donde se publicará el panel',
    )
      .addStringOption((o) =>
        o.setName('titulo').setDescription('Título del panel').setRequired(false),
      )
      .addStringOption((o) =>
        o.setName('descripcion').setDescription('Descripción del panel').setRequired(false),
      )
      .addStringOption((o) =>
        o.setName('boton').setDescription('Texto del botón').setRequired(false),
      ),
  ),
);

commands.push(
  imageOptions(
    destinationOptions(
      new SlashCommandBuilder()
        .setName('key-panel')
        .setDescription('Publica un panel para tickets de key gratis.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
      'Canal donde se publicará el panel',
    )
      .addStringOption((o) =>
        o.setName('titulo').setDescription('Título del panel').setRequired(false),
      )
      .addStringOption((o) =>
        o.setName('descripcion').setDescription('Descripción del panel').setRequired(false),
      )
      .addStringOption((o) =>
        o.setName('boton').setDescription('Texto del botón').setRequired(false),
      ),
  ),
);

commands.push(
  imageOptions(
    destinationOptions(
      new SlashCommandBuilder()
        .setName('anuncio')
        .setDescription('Publica un anuncio con imagen/banner y logo opcionales.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption((o) =>
          o.setName('titulo').setDescription('Título del anuncio').setRequired(true),
        )
        .addStringOption((o) =>
          o.setName('descripcion').setDescription('Texto del anuncio').setRequired(true),
        ),
      'Canal donde se publicará el anuncio',
      )
      .addStringOption((o) =>
        o.setName('color').setDescription('Color HEX, ejemplo #ff1f1f').setRequired(false),
      ),
  ),
);

commands.push(
  new SlashCommandBuilder()
    .setName('panel-admin')
    .setDescription('Muestra el estado y comandos principales del bot.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
);

commands.push(
  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Silencia temporalmente a un miembro.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addIntegerOption((o) =>
      o
        .setName('minutos')
        .setDescription('Duración en minutos')
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true),
    )
    .addStringOption((o) => o.setName('razon').setDescription('Razón').setRequired(false)),
);

commands.push(
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un miembro.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption((o) => o.setName('razon').setDescription('Razón').setRequired(false)),
);

commands.push(
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banea a un miembro.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption((o) => o.setName('razon').setDescription('Razón').setRequired(false)),
);

module.exports = { commands };
