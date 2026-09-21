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

const LIVE_CHANNEL_ID = "1549623203876442177";

// Revisar cada 60 segundos
const CHECK_INTERVAL = 60 * 1000;

// Estado anterior de cada cuenta
const liveStates = new Map();

let checking = false;


// ==========================================
// COMPROBAR UNA CUENTA
// ==========================================

async function checkUser(client, username) {
  let connection = null;

  try {
    console.log(`[TikTok] Comprobando @${username}...`);

    // tiktok-live-connector 2.x es ESM
    const {
      TikTokLiveConnection
    } = await import("tiktok-live-connector");

    connection = new TikTokLiveConnection(username);

    let isLive = false;

    try {
      const state = await connection.connect();

      isLive = true;

      console.log(
        `[TikTok] ✅ @${username} está LIVE | Room: ${state.roomId}`
      );

    } catch (error) {

      isLive = false;

      console.log(
        `[TikTok] @${username} no está LIVE o TikTok rechazó la conexión: ${error.message}`
      );
    }

    const wasLive = liveStates.get(username) ?? false;


    // ======================================
    // ACABA DE INICIAR LIVE
    // ======================================

    if (isLive && !wasLive) {

      console.log(
        `[TikTok] 🔴 NUEVO LIVE DETECTADO: @${username}`
      );

      const channel = await client.channels
        .fetch(LIVE_CHANNEL_ID)
        .catch(error => {

          console.error(
            "[TikTok] Error buscando canal:",
            error.message
          );

          return null;
        });


      if (!channel) {

        console.error(
          `[TikTok] ❌ No existe el canal ${LIVE_CHANNEL_ID}`
        );

        liveStates.set(username, isLive);
        return;
      }


      if (!channel.isTextBased()) {

        console.error(
          "[TikTok] ❌ El canal no permite mensajes."
        );

        liveStates.set(username, isLive);
        return;
      }


      const liveURL =
        `https://www.tiktok.com/@${username}/live`;


      const embed = new EmbedBuilder()
        .setColor(0xff1744)
        .setTitle("🔴 ¡NUEVO LIVE EN TIKTOK!")
        .setDescription(
          `**@${username}** acaba de iniciar un LIVE.\n\n` +
          `🔥 **¡ENTREN AL LIVE!**\n\n` +
          `🎮 **YOJHAN CHEATS**`
        )
        .setURL(liveURL)
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
          content:
            `@everyone 🔴 **@${username} ESTÁ EN LIVE!**`,

          embeds: [embed],

          components: [row],

          allowedMentions: {
            parse: ["everyone"]
          }
        });


        console.log(
          `[TikTok] ✅ AVISO ENVIADO A DISCORD: @${username}`
        );


      } catch (error) {

        console.error(
          `[TikTok] ❌ Error enviando mensaje a Discord:`,
          error
        );

      }
    }


    // ======================================
    // TERMINÓ LIVE
    // ======================================

    if (!isLive && wasLive) {

      console.log(
        `[TikTok] ⚫ @${username} terminó el LIVE.`
      );

    }


    liveStates.set(username, isLive);


  } catch (error) {

    console.error(
      `[TikTok] ❌ Error general comprobando @${username}:`,
      error
    );

  } finally {

    // No necesitamos mantener conexión permanente.
    if (connection) {

      try {
        connection.disconnect();
      } catch (_) {
        // Ignorar
      }

    }

  }
}


// ==========================================
// COMPROBAR TODAS LAS CUENTAS
// ==========================================

async function checkTikTokLives(client) {

  if (checking) {

    console.log(
      "[TikTok] Esperando comprobación anterior..."
    );

    return;
  }


  checking = true;


  try {

    for (const username of TIKTOK_USERS) {

      await checkUser(client, username);

    }

  } finally {

    checking = false;

  }

}


// ==========================================
// INICIAR MONITOR
// ==========================================

function startTikTokLiveMonitor(client) {

  console.log("");
  console.log("==========================================");
  console.log("🔴 YOJHAN CHEATS - TIKTOK LIVE MONITOR");
  console.log("==========================================");

  console.log(
    `[TikTok] Cuentas: ${TIKTOK_USERS
      .map(user => `@${user}`)
      .join(", ")}`
  );

  console.log(
    `[TikTok] Canal Discord: ${LIVE_CHANNEL_ID}`
  );

  console.log(
    `[TikTok] Comprobación cada ${CHECK_INTERVAL / 1000}s`
  );

  console.log("==========================================");
  console.log("");


  // Comprobar inmediatamente
  checkTikTokLives(client);


  // Después cada minuto
  setInterval(
    () => checkTikTokLives(client),
    CHECK_INTERVAL
  );

}


// ==========================================
// EXPORTAR
// ==========================================

module.exports = {
  startTikTokLiveMonitor
};
