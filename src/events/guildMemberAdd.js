const {
  Events,
  AttachmentBuilder,
  EmbedBuilder
} = require("discord.js");

const { createCanvas, loadImage } = require("@napi-rs/canvas");

const {
  detectUsedInvite
} = require("../services/inviteTracker");

const WELCOME_CHANNEL_ID = "1549623202408308787";
const INVITES_CHANNEL_ID = "1549623202408308788";

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {

    // =====================================================
    // SISTEMA DE INVITACIONES + ANTI-TRAMPA
    // =====================================================
    try {
      const inviteChannel = await member.guild.channels
        .fetch(INVITES_CHANNEL_ID)
        .catch(() => null);

      const usedInvite = await detectUsedInvite(member.guild);

      if (!usedInvite) {
        console.log(
          `[invites] No se pudo identificar la invitación usada por ${member.user.tag}`
        );
      } else {
        const {
          processInvite
        } = require("../services/inviteService");

        const result = await processInvite(
          member,
          usedInvite
        );

        // ==========================================
        // INVITACIÓN VÁLIDA
        // ==========================================
        if (result.valid) {
          console.log(
            `[invites] ${result.inviter.tag} invitó a ${member.user.tag}. Total válido: ${result.total}`
          );

          if (inviteChannel && inviteChannel.isTextBased()) {
            const embed = new EmbedBuilder()
              .setColor(0xff1f2d)
              .setDescription(
                `🎉 **NUEVA INVITACIÓN**\n\n` +
                `<@${result.inviterId}> invitó a ${member}\n\n` +
                `Ahora tienes **${result.total} invitaciones válidas**.\n\n` +
                `🎁 **20 invitaciones = KEY de 3 días GRATIS**`
              )
              .setFooter({
                text: "SHADOW CHEATS • Sistema de invitaciones"
              })
              .setTimestamp();

            await inviteChannel.send({
              embeds: [embed],
              allowedMentions: {
                users: [
                  result.inviterId,
                  member.id
                ]
              }
            });

            // ==========================================
            // RECOMPENSA
            // ==========================================
            if (result.rewardUnlocked) {
              const rewardEmbed = new EmbedBuilder()
                .setColor(0xff1f2d)
                .setTitle("🎁 RECOMPENSA DESBLOQUEADA")
                .setDescription(
                  `<@${result.inviterId}> alcanzó **${result.milestone} invitaciones válidas**.\n\n` +
                  `🏆 Has conseguido una **KEY GRATIS DE 3 DÍAS**.\n\n` +
                  `Un administrador deberá entregarte tu KEY.`
                )
                .setFooter({
                  text: "SHADOW CHEATS • Recompensas"
                })
                .setTimestamp();

              await inviteChannel.send({
                content: `<@${result.inviterId}>`,
                embeds: [rewardEmbed],
                allowedMentions: {
                  users: [result.inviterId]
                }
              });
            }
          }
        }

        // ==========================================
        // INVITACIÓN RECHAZADA
        // ==========================================
        else {
          console.log(
            `[anti-trampa] ${member.user.tag}: ${result.reason}`
          );

          // No publicamos el motivo en Discord.
          // Así los usuarios no reciben detalles
          // sobre cómo funciona el anti-trampa.
        }
      }
    } catch (error) {
      console.error(
        "[invites] Error procesando invitación:",
        error
      );
    }

    // =====================================================
    // BIENVENIDA
    // =====================================================
    // Está separada del tracker.
    // Si Supabase o las invitaciones fallan,
    // la bienvenida seguirá funcionando.
    // =====================================================

    try {
      const channel = await member.guild.channels
        .fetch(WELCOME_CHANNEL_ID)
        .catch(() => null);

      if (!channel || !channel.isTextBased()) {
        console.log(
          "[bienvenida] No se encontró el canal de bienvenida."
        );
        return;
      }

      // ==============================
      // TAMAÑO
      // ==============================
      const width = 1000;
      const height = 450;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // ==============================
      // FONDO
      // ==============================
      const gradient = ctx.createLinearGradient(
        0,
        0,
        width,
        height
      );

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
      ctx.arc(
        850,
        70,
        220,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.globalAlpha = 1;

      // ==============================
      // AVATAR
      // ==============================
      const avatarURL =
        member.user.displayAvatarURL({
          extension: "png",
          size: 512
        });

      const avatar = await loadImage(avatarURL);

      const avatarSize = 190;
      const avatarX =
        (width - avatarSize) / 2;

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
      // NOMBRE
      // ==============================
      let username =
        member.displayName ||
        member.user.username;

      if (username.length > 20) {
        username =
          username.substring(0, 20) + "...";
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
      // TEXTO
      // ==============================
      ctx.font = "32px sans-serif";
      ctx.fillStyle = "#ffffff";

      ctx.fillText(
        "¡ingresó al servidor!",
        width / 2,
        345
      );

      // ==============================
      // MIEMBROS
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
      const buffer =
        canvas.toBuffer("image/png");

      const attachment =
        new AttachmentBuilder(
          buffer,
          {
            name: "bienvenida.png"
          }
        );

      // ==============================
      // ENVIAR
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
