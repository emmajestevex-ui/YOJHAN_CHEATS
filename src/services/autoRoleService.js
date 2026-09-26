const ROLE_IDS = {
  PC: "1549623201183567921",
  IPHONE: "1551773455576207412",
  MUJER: "1551773884708298792",
  HOMBRE: "1551773941855428769",
  FREE_FIRE: "1551774171120533575",
  USER: "1549623201183567919"
};


// ==========================================
// COMPROBAR SI ES BOTÓN DE AUTOROL
// ==========================================

function canHandleButton(interaction) {

  return interaction.customId.startsWith("autorole_");

}


// ==========================================
// AGREGAR / QUITAR ROL
// ==========================================

async function toggleRole(member, roleId, roleName) {

  const hasRole =
    member.roles.cache.has(roleId);


  // Si ya tiene el rol, quitarlo
  if (hasRole) {

    await member.roles.remove(roleId);

    return {
      added: false,
      message: `❌ Se eliminó el rol **${roleName}**.`
    };

  }


  // Si no lo tiene, agregarlo
  await member.roles.add(roleId);

  return {
    added: true,
    message: `✅ Ahora tienes el rol **${roleName}**.`
  };

}


// ==========================================
// DISPOSITIVO
// PC / IPHONE
// ==========================================

async function handleDevice(member, selectedRole) {

  const pcRole = ROLE_IDS.PC;
  const iphoneRole = ROLE_IDS.IPHONE;


  // Seleccionó PC
  if (selectedRole === "PC") {

    // Si ya tiene PC, quitarlo
    if (member.roles.cache.has(pcRole)) {

      await member.roles.remove(pcRole);

      return {
        message: "❌ Se eliminó tu rol **PC**."
      };

    }


    // Quitar iPhone
    if (member.roles.cache.has(iphoneRole)) {

      await member.roles.remove(iphoneRole);

    }


    // Poner PC
    await member.roles.add(pcRole);


    return {
      message: "💻 Ahora tu dispositivo es **PC**."
    };

  }


  // Seleccionó IPHONE
  if (selectedRole === "IPHONE") {

    // Si ya tiene iPhone, quitarlo
    if (member.roles.cache.has(iphoneRole)) {

      await member.roles.remove(iphoneRole);

      return {
        message: "❌ Se eliminó tu rol **iPhone**."
      };

    }


    // Quitar PC
    if (member.roles.cache.has(pcRole)) {

      await member.roles.remove(pcRole);

    }


    // Poner iPhone
    await member.roles.add(iphoneRole);


    return {
      message: "🍎 Ahora tu dispositivo es **iPhone**."
    };

  }

}


// ==========================================
// GÉNERO
// HOMBRE / MUJER
// ==========================================

async function handleGender(member, selectedRole) {

  const hombreRole = ROLE_IDS.HOMBRE;
  const mujerRole = ROLE_IDS.MUJER;


  // Seleccionó HOMBRE
  if (selectedRole === "HOMBRE") {

    if (member.roles.cache.has(hombreRole)) {

      await member.roles.remove(hombreRole);

      return {
        message: "❌ Se eliminó tu rol **Hombre**."
      };

    }


    // Quitar Mujer
    if (member.roles.cache.has(mujerRole)) {

      await member.roles.remove(mujerRole);

    }


    // Agregar Hombre
    await member.roles.add(hombreRole);


    return {
      message: "👨 Ahora tienes el rol **Hombre**."
    };

  }


  // Seleccionó MUJER
  if (selectedRole === "MUJER") {

    if (member.roles.cache.has(mujerRole)) {

      await member.roles.remove(mujerRole);

      return {
        message: "❌ Se eliminó tu rol **Mujer**."
      };

    }


    // Quitar Hombre
    if (member.roles.cache.has(hombreRole)) {

      await member.roles.remove(hombreRole);

    }


    // Agregar Mujer
    await member.roles.add(mujerRole);


    return {
      message: "👩 Ahora tienes el rol **Mujer**."
    };

  }

}


// ==========================================
// MANEJAR BOTONES
// ==========================================

async function handleButton(interaction) {

  await interaction.deferReply({
    ephemeral: true
  });

  // Obtener miembro actualizado
  const member = await interaction.guild.members.fetch(
    interaction.user.id
  );


  let result;


  // ========================================
  // PC
  // ========================================

  if (interaction.customId === "autorole_pc") {

    result = await handleDevice(
      member,
      "PC"
    );

  }


  // ========================================
  // IPHONE
  // ========================================

  else if (
    interaction.customId === "autorole_iphone"
  ) {

    result = await handleDevice(
      member,
      "IPHONE"
    );

  }


  // ========================================
  // HOMBRE
  // ========================================

  else if (
    interaction.customId === "autorole_hombre"
  ) {

    result = await handleGender(
      member,
      "HOMBRE"
    );

  }


  // ========================================
  // MUJER
  // ========================================

  else if (
    interaction.customId === "autorole_mujer"
  ) {

    result = await handleGender(
      member,
      "MUJER"
    );

  }


  // ========================================
  // FREE FIRE
  // ========================================

  else if (
    interaction.customId === "autorole_freefire"
  ) {

    result = await toggleRole(
      member,
      ROLE_IDS.FREE_FIRE,
      "Free Fire"
    );

  }


  if (!result) {
    await interaction.editReply({
      content: "Ese botón de autorol ya no está disponible."
    });
    return;
  }


  // ========================================
  // RESPUESTA PRIVADA
  // ========================================

  await interaction.editReply({

    content: result.message,

  });

}


// ==========================================
// EXPORTAR
// ==========================================

module.exports = {
  canHandleButton,
  handleButton,
  ROLE_IDS
};
