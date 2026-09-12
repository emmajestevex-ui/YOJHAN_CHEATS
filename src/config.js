require("dotenv").config({ quiet: true });

const { COLORS } = require("./constants");
const { parseColor } = require("./utils/colors");

function splitIds(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readConfig() {
  return {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID || null,
    adminRoleIds: splitIds(process.env.ADMIN_ROLE_IDS),
    modRoleIds: splitIds(process.env.MOD_ROLE_IDS),
    ticketCategoryId: process.env.TICKET_CATEGORY_ID || null,
    ticketCategoryName: process.env.TICKET_CATEGORY_NAME || "TIKET",
    logChannelId: process.env.LOG_CHANNEL_ID || null,
    defaultEmbedColor: parseColor(process.env.DEFAULT_EMBED_COLOR, COLORS.YOJHAN_RED),
    ticketNamePrefix: process.env.TICKET_NAME_PREFIX || "ticket",
    freeKeyTicketNamePrefix: process.env.FREE_KEY_TICKET_NAME_PREFIX || "key-gratis",
    enableKeepAlive: process.env.ENABLE_KEEP_ALIVE === "true",
    port: Number.parseInt(process.env.PORT || "3000", 10)
  };
}

const config = readConfig();

function assertRuntimeConfig() {
  const missing = [];
  if (!config.token) missing.push("DISCORD_TOKEN");
  if (!config.clientId) missing.push("CLIENT_ID");

  if (missing.length > 0) {
    throw new Error(`Faltan variables en .env: ${missing.join(", ")}`);
  }
}

module.exports = {
  config,
  assertRuntimeConfig
};
