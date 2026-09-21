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
// PERFILES DE TIKTOK A MONITOREAR
// ==========================================
const TIKTOK_USERS = [
  "yojhancheats",
  "emmanuelrhlm19"
];

const LIVE_CHANNEL_ID = "1549623203876442177";

// Comprobar cada 60 segundos
const CHECK_INTERVAL = 60 * 1000;

// Guarda si cada perfil estaba en LIVE
const liveStates = new Map();

// Evita dos comprobaciones simultáneas
let checking = false;


// ==========================================
// COMPROBAR UN PERFIL
// ==========================================
async function checkUser(client, username) {
  try {
    const connection =
      new WebcastPushConnection(username);

    const isLive =
      await connection.fetchIsLive();

    const wasLive =
      liveStates.get(username) ?? false;

    console.log(
      `[TikTok] @${username} LIVE: ${isLive}`
    );

    // ======================================
    // ACABA DE INICIAR LIVE
    // ======================================
    if (isLive && !wasLive) {
      const channel = await client.channels
        .fetch(LIVE_CHANNEL_ID)
        .catch(() => null);

      if (!channel || !channel.isTextBased()) {
        console.log(
          "[TikTok] No se encontró el canal de LIVE."
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
          text: "SHADOW CHEATS • TikTok LIVE"
        })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setLabel("🔴 VER LIVE")
        .setStyle(ButtonStyle.Link)
        .setURL(liveURL);

      const row =
        new ActionRowBuilder()
          .addComponents(button);

      await channel.send({
        content: "@everyone",
        embeds: [embed],
        components: [row],
        allowedMentions: {
          parse: ["everyone"]
        }
      });

      console.log(
        `[TikTok] Aviso enviado: @${username}`
      );
    }

    // ======================================
    // TERMINÓ EL LIVE
    // ======================================
    if (!isLive && wasLive) {
      console.log(
        `[TikTok] @${username} terminó el LIVE.`
      );
    }

    // Guardar estado individual
    liveStates.set(username, isLive);

  } catch (error) {
    console.error(
      `[TikTok] Error comprobando @${username}:`,
      error.message
    );
  }
}


// ==========================================
// COMPROBAR TODOS LOS PERFILES
// ==========================================
async function checkTikTokLives(client) {
  if (checking) {
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
  console.log(
    `[TikTok] Monitor iniciado para: ${TIKTOK_USERS
      .map(user => `@${user}`)
      .join(", ")}`
  );

  // Primera comprobación inmediatamente
  checkTikTokLives(client);

  // Después comprobar cada minuto
  setInterval(
    () => checkTikTokLives(client),
    CHECK_INTERVAL
  );
}


module.exports = {
  startTikTokLiveMonitor
};
