
const {
  WebcastPushConnection
} = require("tiktok-live-connector");

const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");

const TIKTOK_USERNAME = "yojhancheats";
const LIVE_CHANNEL_ID = "1549623203876442177";

const CHECK_INTERVAL = 60 * 1000; // 1 minuto

let wasLive = false;
let checking = false;

async function checkTikTokLive(client) {
  if (checking) return;

  checking = true;

  try {
    const connection =
      new WebcastPushConnection(TIKTOK_USERNAME);

    const isLive = await connection.fetchIsLive();

    console.log(
      `[TikTok] @${TIKTOK_USERNAME} LIVE: ${isLive}`
    );

    // Acaba de iniciar LIVE
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
        `https://www.tiktok.com/@${TIKTOK_USERNAME}/live`;

      const embed = new EmbedBuilder()
        .setColor(0xff1744)
        .setTitle("🔴 ¡YOJHAN CHEATS ESTÁ EN VIVO!")
        .setDescription(
          `**@${TIKTOK_USERNAME}** acaba de iniciar un LIVE en TikTok.\n\n` +
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
        new ActionRowBuilder().addComponents(button);

      await channel.send({
        content: "@everyone",
        embeds: [embed],
        components: [row],
        allowedMentions: {
          parse: ["everyone"]
        }
      });

      console.log(
        `[TikTok] Aviso de LIVE enviado para @${TIKTOK_USERNAME}`
      );
    }

    // Guardamos el estado
    wasLive = isLive;

  } catch (error) {
    console.error(
      "[TikTok] Error comprobando el LIVE:",
      error.message
    );
  } finally {
    checking = false;
  }
}

function startTikTokLiveMonitor(client) {
  console.log(
    `[TikTok] Monitor iniciado para @${TIKTOK_USERNAME}`
  );

  // Primera comprobación
  checkTikTokLive(client);

  // Comprobar cada minuto
  setInterval(
    () => checkTikTokLive(client),
    CHECK_INTERVAL
  );
}

module.exports = {
  startTikTokLiveMonitor
};
