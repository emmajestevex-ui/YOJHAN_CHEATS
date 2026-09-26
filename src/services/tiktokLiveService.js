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

// Ninguna comprobación externa debe bloquear el bot.
const USER_CHECK_TIMEOUT = 45 * 1000;
const CONNECT_TIMEOUT = 25 * 1000;
const CHANNEL_SEND_TIMEOUT = 15 * 1000;

// Guardar estado anterior de cada cuenta
const liveStates = new Map();

// Evitar comprobaciones simultáneas
let checking = false;

function withTimeout(promise, ms, label) {

  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} tardó más de ${ms}ms`)),
      ms
    );
  });

  return Promise.race([promise, timeoutPromise])
    .finally(() => clearTimeout(timeoutId));

}

// ==========================================
// COMPROBAR UNA CUENTA
// ==========================================

async function checkUser(client, username) {

  let connection = null;

  try {

    console.log(
      `[TikTok] Comprobando @${username}...`
    );


    // ======================================
    // CARGAR TIKTOK LIVE CONNECTOR 2.x
    // ======================================

    const {
      TikTokLiveConnection
    } = await import("tiktok-live-connector");


    // ======================================
    // CREAR CONEXIÓN
    // ======================================

    connection = new TikTokLiveConnection(
      username,
      {
        processInitialData: false,
        fetchRoomInfoOnConnect: true,
        enableExtendedGiftInfo: false
      }
    );


    // ======================================
    // COMPROBAR SI ESTÁ LIVE
    // ======================================

    let isLive = false;

    try {

      const state = await withTimeout(
        connection.connect(),
        CONNECT_TIMEOUT,
        `[TikTok] connect @${username}`
      );

      isLive = true;

      console.log(
        `[TikTok] ✅ @${username} ESTÁ LIVE`
      );

      if (state?.roomId) {

        console.log(
          `[TikTok] Room ID: ${state.roomId}`
        );

      }

    } catch (error) {

      isLive = false;

      console.log(
        `[TikTok] ⚫ @${username} NO está LIVE`
      );

      console.log(
        `[TikTok] Motivo: ${error.message}`
      );

    }


    // ======================================
    // ESTADO ANTERIOR
    // ======================================

    const wasLive =
      liveStates.get(username) ?? false;


    // ======================================
    // LIVE ACABA DE COMENZAR
    // ======================================

    if (isLive && !wasLive) {

      console.log(
        `[TikTok] 🔴 NUEVO LIVE DETECTADO: @${username}`
      );


      // Buscar canal de Discord
      const channel = await client.channels
        .fetch(LIVE_CHANNEL_ID)
        .catch((error) => {

          console.error(
            "[TikTok] ❌ Error buscando el canal:",
            error.message
          );

          return null;

        });


      // ====================================
      // COMPROBAR CANAL
      // ====================================

      if (!channel) {

        console.error(
          `[TikTok] ❌ No existe el canal ${LIVE_CHANNEL_ID}`
        );

        liveStates.set(
          username,
          isLive
        );

        return;

      }


      if (!channel.isTextBased()) {

        console.error(
          "[TikTok] ❌ El canal no permite mensajes."
        );

        liveStates.set(
          username,
          isLive
        );

        return;

      }


      // ====================================
      // URL DEL LIVE
      // ====================================

      const liveURL =
        `https://www.tiktok.com/@${username}/live`;


      // ====================================
      // EMBED
      // ====================================

      const embed = new EmbedBuilder()

        .setColor(0xff1744)

        .setTitle(
          "🔴 ¡NUEVO LIVE EN TIKTOK!"
        )

        .setURL(liveURL)

        .setDescription(
          `**@${username}** acaba de iniciar un LIVE.\n\n` +
          `🔥 **¡ENTREN AL LIVE!**\n\n` +
          `🎮 **YOJHAN CHEATS**`
        )

        .setFooter({
          text: "YOJHAN CHEATS • TikTok LIVE"
        })

        .setTimestamp();


      // ====================================
      // BOTÓN
      // ====================================

      const button = new ButtonBuilder()

        .setLabel(
          "🔴 VER LIVE"
        )

        .setStyle(
          ButtonStyle.Link
        )

        .setURL(
          liveURL
        );


      const row =
        new ActionRowBuilder()
          .addComponents(button);


      // ====================================
      // ENVIAR A DISCORD
      // ====================================

      try {

        await withTimeout(channel.send({

          content:
            `@everyone 🔴 **@${username} ESTÁ EN LIVE!**`,

          embeds: [
            embed
          ],

          components: [
            row
          ],

          allowedMentions: {
            parse: [
              "everyone"
            ]
          }

        }), CHANNEL_SEND_TIMEOUT, `[TikTok] enviar aviso @${username}`);


        console.log(
          `[TikTok] ✅ AVISO ENVIADO A DISCORD PARA @${username}`
        );


      } catch (error) {

        console.error(
          `[TikTok] ❌ Error enviando el aviso de @${username}:`
        );

        console.error(error);

      }

    }


    // ======================================
    // LIVE TERMINÓ
    // ======================================

    if (!isLive && wasLive) {

      console.log(
        `[TikTok] ⚫ @${username} TERMINÓ EL LIVE`
      );

    }


    // ======================================
    // GUARDAR ESTADO
    // ======================================

    liveStates.set(
      username,
      isLive
    );


  } catch (error) {

    console.error(
      `[TikTok] ❌ Error general comprobando @${username}:`
    );

    console.error(error);

  } finally {


    // ======================================
    // DESCONECTAR
    // ======================================

    if (connection) {

      try {

        connection.disconnect();

      } catch (error) {

        // Ignorar error al desconectar

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
      "[TikTok] Ya hay una comprobación ejecutándose."
    );

    return;

  }


  checking = true;


  try {

    for (const username of TIKTOK_USERS) {

      await withTimeout(
        checkUser(
          client,
          username
        ),
        USER_CHECK_TIMEOUT,
        `[TikTok] comprobación @${username}`
      );

    }

  } catch (error) {

    console.error(
      "[TikTok] ❌ Error general del monitor:"
    );

    console.error(error);

  } finally {

    checking = false;

    console.log(
      "[TikTok] Comprobación finalizada."
    );

  }

}


// ==========================================
// INICIAR MONITOR
// ==========================================

function startTikTokLiveMonitor(client) {

  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "🔴 YOJHAN CHEATS - TIKTOK LIVE MONITOR"
  );

  console.log(
    "=========================================="
  );


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


  console.log(
    "=========================================="
  );

  console.log("");


  // ======================================
  // PRIMERA COMPROBACIÓN
  // ======================================

  checkTikTokLives(client);


  // ======================================
  // COMPROBAR CADA 60 SEGUNDOS
  // ======================================

  setInterval(
    () => {

      checkTikTokLives(client);

    },
    CHECK_INTERVAL
  );

}


// ==========================================
// EXPORTAR
// ==========================================

module.exports = {
  startTikTokLiveMonitor
};
