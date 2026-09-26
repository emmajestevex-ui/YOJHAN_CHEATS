const { Events } = require("discord.js");

const adminEmbedService =
  require("../services/adminEmbedService");

const ticketService =
  require("../services/ticketService");

const autoRoleService =
  require("../services/autoRoleService");


// ==========================================
// ERROR DE INTERACCIÓN
// ==========================================

async function sendInteractionError(interaction) {

  const payload = {

    content:
      "Ocurrió un error procesando esto. Revisa la consola del bot.",

    ephemeral: true

  };


  if (
    interaction.deferred ||
    interaction.replied
  ) {

    await interaction
      .followUp(payload)
      .catch((error) => {
        console.error("[INTERACTION] No se pudo enviar followUp de error:", error.message);
      });

    return;

  }


  await interaction
    .reply(payload)
    .catch((error) => {
      console.error("[INTERACTION] No se pudo responder error:", error.message);
    });

}

async function replyUnhandled(interaction, label) {
  const id =
    interaction.customId ||
    interaction.commandName ||
    "sin-id";

  console.warn(`[${label}] Interacción sin manejador: ${id}`);

  const payload = {
    content:
      "Esta interacción ya no está disponible. Vuelve a publicar el panel o usa el comando de nuevo.",
    ephemeral: true
  };

  if (
    interaction.deferred ||
    interaction.replied
  ) {
    await interaction.followUp(payload).catch(() => {});
    return;
  }

  await interaction.reply(payload).catch(() => {});
}


// ==========================================
// EVENTO
// ==========================================

module.exports = {

  name: Events.InteractionCreate,


  async execute(interaction) {

    try {


      // ====================================
      // COMANDOS /
      // ====================================

      if (interaction.isChatInputCommand()) {

        console.log(
          `[COMMAND] /${interaction.commandName} por ${interaction.user.tag} (${interaction.user.id})`
        );

        const command =
          interaction.client.commands.get(
            interaction.commandName
          );


        if (!command) {
          await replyUnhandled(interaction, "COMMAND");
          return;
        }


        await command.execute(interaction);

        return;

      }


      // ====================================
      // BOTONES
      // ====================================

      if (interaction.isButton()) {

        console.log(
          `[BUTTON] ${interaction.customId} por ${interaction.user.tag} (${interaction.user.id})`
        );


        // ================================
        // AUTO ROLES
        // ================================

        if (
          autoRoleService.canHandleButton(
            interaction
          )
        ) {

          console.log(`[AUTOROLE] ${interaction.customId}`);

          await autoRoleService.handleButton(
            interaction
          );

          return;

        }


        // ================================
        // ADMIN EMBEDS
        // ================================

        if (
          adminEmbedService.canHandleButton(
            interaction
          )
        ) {

          console.log(`[BUTTON] Sistema embeds: ${interaction.customId}`);

          await adminEmbedService.handleButton(
            interaction
          );

          return;

        }


        // ================================
        // TICKETS
        // ================================

        if (
          ticketService.canHandleButton(
            interaction
          )
        ) {

          console.log(`[TICKET] ${interaction.customId}`);

          await ticketService.handleButton(
            interaction
          );

          return;

        }


        await replyUnhandled(interaction, "BUTTON");
        return;

      }


      // ====================================
      // MODALES
      // ====================================

      if (interaction.isModalSubmit()) {

        console.log(
          `[MODAL] ${interaction.customId} por ${interaction.user.tag} (${interaction.user.id})`
        );

        if (
          adminEmbedService.canHandleModal(
            interaction
          )
        ) {

          await adminEmbedService.handleModal(
            interaction
          );

          return;

        }

        await replyUnhandled(interaction, "MODAL");

      }


    } catch (error) {

      console.error(
        "[INTERACTION]",
        error
      );


      await sendInteractionError(
        interaction
      );

    }

  }

};
