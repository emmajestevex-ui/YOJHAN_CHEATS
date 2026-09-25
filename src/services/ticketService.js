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
      .catch(() => {});

    return;
  }


  await interaction
    .reply(payload)
    .catch(() => {});
}


// ==========================================
// EVENTO INTERACTION CREATE
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
          `[COMMAND] /${interaction.commandName} | Usuario: ${interaction.user.tag}`
        );

        const command =
          interaction.client.commands.get(
            interaction.commandName
          );


        if (!command) {

          console.log(
            `[COMMAND] No encontré el comando /${interaction.commandName}`
          );

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
          `[BUTTON] Recibido: ${interaction.customId} | Usuario: ${interaction.user.tag}`
        );


        // ================================
        // AUTO ROLES
        // ================================

        if (
          autoRoleService.canHandleButton(
            interaction
          )
        ) {

          console.log(
            `[AUTOROLE] Botón reconocido: ${interaction.customId}`
          );

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

          console.log(
            `[ADMIN-EMBED] Botón reconocido: ${interaction.customId}`
          );

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

          console.log(
            `[TICKET] Botón reconocido: ${interaction.customId}`
          );


          await ticketService.handleButton(
            interaction
          );


          console.log(
            `[TICKET] Procesamiento terminado: ${interaction.customId}`
          );

          return;
        }


        // ================================
        // BOTÓN DESCONOCIDO
        // ================================

        console.log(
          `[BUTTON] Ningún servicio reconoció: ${interaction.customId}`
        );

        return;
      }


      // ====================================
      // MODALES
      // ====================================

      if (interaction.isModalSubmit()) {

        console.log(
          `[MODAL] Recibido: ${interaction.customId} | Usuario: ${interaction.user.tag}`
        );


        if (
          adminEmbedService.canHandleModal(
            interaction
          )
        ) {

          console.log(
            `[ADMIN-EMBED] Modal reconocido: ${interaction.customId}`
          );


          await adminEmbedService.handleModal(
            interaction
          );


          return;
        }


        console.log(
          `[MODAL] Ningún servicio reconoció: ${interaction.customId}`
        );

        return;
      }


    } catch (error) {

      console.error(
        "[interaction] ❌ ERROR:",
        error
      );


      await sendInteractionError(
        interaction
      );
    }
  }
};
