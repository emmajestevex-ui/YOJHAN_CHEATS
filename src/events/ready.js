const { Events, ActivityType } = require("discord.js");
const { cacheAllInvites } = require("../services/inviteTracker");

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    console.log(
      `[ready] SHADOW CHEATS conectado como ${client.user.tag}`
    );

    client.user.setPresence({
      activities: [
        {
          name: "SHADOW CHEATS | tickets",
          type: ActivityType.Watching
        }
      ],
      status: "online"
    });

    // Guardar el estado actual de las invitaciones
    await cacheAllInvites(client);

    console.log(
      "[invites] Sistema de invitaciones preparado."
    );
  }
};
