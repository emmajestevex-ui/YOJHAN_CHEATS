const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`[ready] YOJHAN_CHEATS conectado como ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: "YOJHAN_CHEATS | tickets", type: ActivityType.Watching }],
      status: "online"
    });
  }
};
