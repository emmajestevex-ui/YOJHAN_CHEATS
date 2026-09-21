const {
  WebcastPushConnection
} = require("tiktok-live-connector");

const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");

// ==========================================
// CONFIGURACIÓN
// ==========================================

const TIKTOK_USERS = [
  "yojhancheats",
  "emmanuelrhlm19"
];

// ID del canal 🔴・LIVE
const LIVE_CHANNEL_ID = "1549623203876442177";

// Revisar cada 60 segundos
const CHECK_INTERVAL = 60 * 1000;

// Estado de cada cuenta
const liveStates = new Map();

// Evita comprobaciones simultáneas
let checking = false;


// ==========================================
// COMPROBAR UNA CUENTA
// ==========================================

async function checkUser(client, username) {
  try {
    console.log(`[TikTok] Comprobando @${username}...`);

    const connection = new WebcastPushConnection(username);

    const isLive = await connection.fetchIsLive();

    const wasLive = liveStates.get(username) ?? false;

    console.log(
      `[TikTok] @${username} LIVE: ${isLive}`
    );

    // ======================================
    // LIVE ACABA DE COMENZAR
    // ======================================

    if (isLive && !wasLive) {

      console.log(
        `[TikTok] Nuevo LIVE detectado: @${username}`
      );

      const channel = await client.channels
        .fetch(LIVE_CHANNEL_ID)
        .catch(error => {
          console.error(
            "[TikTok] Error buscando el canal:",
            error.message
          );

          return null;
        });

      if (!channel) {
        console.error(
          `[TikTok] No existe el canal ${LIVE_CHANNEL_ID}`
        );

        return;
      }

      if (!channel.isTextBased()) {
        console.error(
          "[TikTok] El canal configurado no permite mensajes."
        );

        return;
      }

      const liveURL =
        `https://www.tiktok.com/@${username}/live`;

      const embed = new EmbedBuilder()
        .setColor(0xff1744)
        .setTitle("🔴 ¡NUEVO LIVE EN TIKTOK!")
        .setDescription(
          `**@${username}** acaba de iniciar un LIVE.\n\n` +
          `🔥 **¡ENTREN AL LIVE!**`
        )
        .setFooter({
          text: "YOJHAN CHEATS • TikTok LIVE"
        })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setLabel("🔴 VER LIVE")
        .setStyle(ButtonStyle.Link)
        .setURL(liveURL);

      const row = new ActionRowBuilder()
        .addComponents(button);

      try {

        await channel.send({
          content: "@everyone",
          embeds: [embed],
          components: [row],

          allowedMentions: {
            parse: ["everyone"]
          }
        });

        console.log(
          `[TikTok] ✅ Aviso enviado correctamente para @${username}`
        );

      } catch (error) {

        console.error(
          `[TikTok] ❌ No pude mandar el aviso de @${username}:`,
          error
        );

      }
    }


    // ======================================
    // LIVE TERMINÓ
    // ======================================

    if (!isLive && wasLive) {

      console.log(
        `[TikTok] 🔴 @${username} terminó el LIVE.`
      );

    }


    // Guardar estado
    liveStates.set(username, isLive);


  } catch (error) {

    console.error(
      `[TikTok] ❌ Error comprobando @${username}:`
    );

    console.error(error);

  }
}


// ==========================================
// COMPROBAR TODAS LAS CUENTAS
// ==========================================

async function checkTikTokLives(client) {

  if (checking) {
    console.log(
      "[TikTok] Ya hay una comprobación ejecutándose."
    );

    return;
  }

  checking = true;

  try {

    for (const username of TIKTOK_USERS) {

      await checkUser(client, username);

    }

  } catch (error) {

    console.error(
      "[TikTok] Error general:",
      error
    );

  } finally {

    checking = false;

  }
}


// ==========================================
// INICIAR MONITOR
// ==========================================

function startTikTokLiveMonitor(client) {

  console.log("=================================");
  console.log("🔴 TIKTOK LIVE MONITOR");
  console.log("=================================");

  console.log(
    `[TikTok] Monitor iniciado para: ${TIKTOK_USERS
      .map(user => `@${user}`)
      .join(", ")}`
  );

  console.log(
    `[TikTok] Canal Discord: ${LIVE_CHANNEL_ID}`
  );

  console.log(
    `[TikTok] Intervalo: ${CHECK_INTERVAL / 1000} segundos`
  );

  // Revisar inmediatamente
  checkTikTokLives(client);

  // Revisar cada minuto
  setInterval(() => {

    checkTikTokLives(client);

  }, CHECK_INTERVAL);
}


// ==========================================
// EXPORTAR
// ==========================================

module.exports = {
  startTikTokLiveMonitor
};
