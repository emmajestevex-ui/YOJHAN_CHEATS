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

        const command =
          interaction.client.commands.get(
            interaction.commandName
          );


        if (!command) return;


        await command.execute(interaction);

        return;

      }


      // ====================================
      // BOTONES
      // ====================================

      if (interaction.isButton()) {


        // ================================
        // AUTO ROLES
        // ================================

        if (
          autoRoleService.canHandleButton(
            interaction
          )
        ) {

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

          await ticketService.handleButton(
            interaction
          );

          return;

        }


        return;

      }


      // ====================================
      // MODALES
      // ====================================

      if (interaction.isModalSubmit()) {

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

      }


    } catch (error) {

      console.error(
        "[interaction]",
        error
      );


      await sendInteractionError(
        interaction
      );

    }

  }

};
