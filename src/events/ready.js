const { Events, ActivityType } = require("discord.js");
const { cacheAllInvites } = require("../services/inviteTracker");

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    console.log(
      `[ready] YOJHAN CHEATS conectado como ${client.user.tag}`
    );

    client.user.setPresence({
      activities: [
        {
          name: "YOJHAN CHEATS | tickets",
          type: ActivityType.Watching
        }
      ],
      status: "online"
    });

    // Guardar el estado actual de las invitaciones
    try {
      await cacheAllInvites(client);

      console.log(
        "[invites] Sistema de invitaciones preparado."
      );
    } catch (error) {
      console.error(
        "[invites] No se pudo preparar el cache de invitaciones:",
        error
      );
    }
  }
};
