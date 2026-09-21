const { Events, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const WELCOME_CHANNEL_ID = "1549623202408308787";

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    try {
      const channel = await member.guild.channels
        .fetch(WELCOME_CHANNEL_ID)
        .catch(() => null);

      if (!channel || !channel.isTextBased()) {
        console.log("[bienvenida] No se encontró el canal de bienvenida.");
        return;
      }

      // ==============================
      // TAMAÑO DE LA TARJETA
      // ==============================
      const width = 1000;
      const height = 450;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // ==============================
      // FONDO
      // ==============================
      const gradient = ctx.createLinearGradient(0, 0, width, height);

      gradient.addColorStop(0, "#090909");
      gradient.addColorStop(0.5, "#171717");
      gradient.addColorStop(1, "#350000");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Línea roja izquierda
      ctx.fillStyle = "#ff1f2d";
      ctx.fillRect(0, 0, 12, height);

      // Decoración roja
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#ff0000";

      ctx.beginPath();
      ctx.arc(850, 70, 220, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;

      // ==============================
      // AVATAR DEL USUARIO
      // ==============================
      const avatarURL = member.user.displayAvatarURL({
        extension: "png",
        size: 512
      });

      const avatar = await loadImage(avatarURL);

      const avatarSize = 190;
      const avatarX = (width - avatarSize) / 2;
      const avatarY = 45;

      // Borde rojo
      ctx.beginPath();
      ctx.arc(
        width / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2 + 8,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = "#ff1f2d";
      ctx.fill();

      // Avatar circular
      ctx.save();

      ctx.beginPath();
      ctx.arc(
        width / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2,
        0,
        Math.PI * 2
      );

      ctx.closePath();
      ctx.clip();

      ctx.drawImage(
        avatar,
        avatarX,
        avatarY,
        avatarSize,
        avatarSize
      );

      ctx.restore();

      // ==============================
      // NOMBRE DEL USUARIO
      // ==============================
      let username = member.displayName || member.user.username;

      if (username.length > 20) {
        username = username.substring(0, 20) + "...";
      }

      ctx.textAlign = "center";

      ctx.font = "bold 42px sans-serif";
      ctx.fillStyle = "#ffffff";

      ctx.fillText(
        username,
        width / 2,
        295
      );

      // ==============================
      // TEXTO DE BIENVENIDA
      // ==============================
      ctx.font = "32px sans-serif";
      ctx.fillStyle = "#ffffff";

      ctx.fillText(
        "¡ingresó al servidor!",
        width / 2,
        345
      );

      // ==============================
      // CANTIDAD DE MIEMBROS
      // ==============================
      ctx.font = "bold 30px sans-serif";
      ctx.fillStyle = "#ff3344";

      ctx.fillText(
        `Ahora somos ${member.guild.memberCount} miembros`,
        width / 2,
        395
      );

      // ==============================
      // CREAR PNG
      // ==============================
      const buffer = canvas.toBuffer("image/png");

      const attachment = new AttachmentBuilder(buffer, {
        name: "bienvenida.png"
      });

      // ==============================
      // ENVIAR BIENVENIDA
      // ==============================
      await channel.send({
        content: `¡${member} BIENVENID@!`,
        files: [attachment],
        allowedMentions: {
          users: [member.id]
        }
      });

      console.log(
        `[bienvenida] Bienvenida enviada para ${member.user.tag}`
      );

    } catch (error) {
      console.error(
        "[bienvenida] Error creando la bienvenida:",
        error
      );
    }
  }
};
