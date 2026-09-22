const { supabase } = require("./supabase");


// ==========================================
// BUSCAR SI EL USUARIO YA HABÍA ENTRADO
// ==========================================

async function getExistingMember(userId, guildId) {

  const { data, error } = await supabase
    .from("invite_members")
    .select("*")
    .eq("user_id", userId)
    .eq("guild_id", guildId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}


// ==========================================
// OBTENER INVITACIONES DEL INVITADOR
// ==========================================

async function getInviteStats(guildId, inviterId) {

  const { data, error } = await supabase
    .from("invite_stats")
    .select("valid_invites")
    .eq("guild_id", guildId)
    .eq("inviter_id", inviterId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.valid_invites ?? 0;
}


// ==========================================
// PROCESAR INVITACIÓN
// ==========================================

async function processInvite(member, invite) {

  const guildId = member.guild.id;


  // ========================================
  // LOS BOTS NO CUENTAN
  // ========================================

  if (member.user.bot) {

    return {
      valid: false,
      reason: "Es un bot."
    };

  }


  // ========================================
  // COMPROBAR QUE SABEMOS QUIÉN INVITÓ
  // ========================================

  if (!invite || !invite.inviter) {

    return {
      valid: false,
      reason: "No se pudo identificar al invitador."
    };

  }


  const inviterId = invite.inviter.id;


  // ========================================
  // COMPROBAR SI YA HABÍA ENTRADO
  // ========================================

  const existingMember = await getExistingMember(
    member.id,
    guildId
  );


  if (existingMember) {

    console.log(
      `[invites] ${member.user.tag} ya había entrado anteriormente. No cuenta.`
    );

    return {
      valid: false,
      reason: "Este usuario ya había entrado anteriormente."
    };

  }


  // ========================================
  // PRIMERA VEZ QUE ENTRA
  // GUARDARLO
  // ========================================

  const { error: memberError } = await supabase
    .from("invite_members")
    .insert({

      user_id: member.id,

      guild_id: guildId,

      inviter_id: inviterId,

      invite_code: invite.code,

      account_created_at:
        member.user.createdAt.toISOString(),

      joined_at:
        new Date().toISOString(),

      valid: true,

      invalid_reason: null

    });


  if (memberError) {

    // Ya existe en la base de datos
    if (memberError.code === "23505") {

      return {
        valid: false,
        reason: "Este usuario ya había entrado anteriormente."
      };

    }

    throw memberError;

  }


  // ========================================
  // OBTENER TOTAL ACTUAL
  // ========================================

  const currentTotal =
    await getInviteStats(
      guildId,
      inviterId
    );


  const newTotal =
    currentTotal + 1;


  // ========================================
  // ACTUALIZAR CONTADOR
  // ========================================

  const { error: statsError } =
    await supabase
      .from("invite_stats")
      .upsert(
        {

          guild_id:
            guildId,

          inviter_id:
            inviterId,

          valid_invites:
            newTotal,

          updated_at:
            new Date().toISOString()

        },
        {

          onConflict:
            "guild_id,inviter_id"

        }
      );


  if (statsError) {
    throw statsError;
  }


  // ========================================
  // RECOMPENSA CADA 20 INVITACIONES
  // ========================================

  let rewardUnlocked = false;
  let milestone = null;


  if (newTotal % 20 === 0) {

    milestone = newTotal;


    const { error: rewardError } =
      await supabase
        .from("invite_rewards")
        .insert({

          guild_id:
            guildId,

          inviter_id:
            inviterId,

          milestone:
            milestone

        });


    if (!rewardError) {

      rewardUnlocked = true;

    } else if (
      rewardError.code !== "23505"
    ) {

      throw rewardError;

    }

  }


  // ========================================
  // RESULTADO
  // ========================================

  return {

    valid: true,

    inviterId:
      inviterId,

    inviter:
      invite.inviter,

    inviteCode:
      invite.code,

    total:
      newTotal,

    rewardUnlocked:
      rewardUnlocked,

    milestone:
      milestone

  };

}


// ==========================================
// EXPORTAR
// ==========================================

module.exports = {
  processInvite,
  getInviteStats
};
