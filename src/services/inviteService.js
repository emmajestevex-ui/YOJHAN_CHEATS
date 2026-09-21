
const { supabase } = require("./supabase");

const MIN_ACCOUNT_AGE_MS = 48 * 60 * 60 * 1000;

// Comprueba si este usuario ya fue registrado anteriormente.
async function getExistingMember(userId) {
  const { data, error } = await supabase
    .from("invite_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

// Obtiene el total válido de un invitador.
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

// Guarda un usuario que NO contó.
async function saveInvalidMember({
  member,
  inviterId = null,
  inviteCode = null,
  reason
}) {
  const { error } = await supabase
    .from("invite_members")
    .insert({
      user_id: member.id,
      guild_id: member.guild.id,
      inviter_id: inviterId,
      invite_code: inviteCode,
      account_created_at: member.user.createdAt.toISOString(),
      joined_at: new Date().toISOString(),
      valid: false,
      invalid_reason: reason
    });

  if (error) {
    throw error;
  }
}

// Procesa una posible invitación válida.
async function processInvite(member, invite) {
  const guildId = member.guild.id;

  // ==============================
  // 1. BOTS NO CUENTAN
  // ==============================
  if (member.user.bot) {
    return {
      valid: false,
      reason: "Los bots no cuentan como invitación."
    };
  }

  // ==============================
  // 2. DEBE EXISTIR UN INVITADOR
  // ==============================
  if (!invite || !invite.inviter) {
    return {
      valid: false,
      reason: "No se pudo identificar al invitador."
    };
  }

  const inviterId = invite.inviter.id;

  // ==============================
  // 3. NO PERMITIR AUTO-INVITACIÓN
  // ==============================
  if (inviterId === member.id) {
    await saveInvalidMember({
      member,
      inviterId,
      inviteCode: invite.code,
      reason: "Auto-invitación detectada."
    });

    return {
      valid: false,
      reason: "Auto-invitación detectada."
    };
  }

  // ==============================
  // 4. USUARIO YA REGISTRADO
  // ==============================
  const existingMember = await getExistingMember(member.id);

  if (existingMember) {
    return {
      valid: false,
      reason: "Este usuario ya había sido registrado anteriormente."
    };
  }

  // ==============================
  // 5. ANTIGÜEDAD DE LA CUENTA
  // ==============================
  const accountAge = Date.now() - member.user.createdTimestamp;

  if (accountAge < MIN_ACCOUNT_AGE_MS) {
    await saveInvalidMember({
      member,
      inviterId,
      inviteCode: invite.code,
      reason: "Cuenta de Discord con menos de 48 horas."
    });

    return {
      valid: false,
      reason: "La cuenta tiene menos de 48 horas."
    };
  }

  // ==============================
  // 6. REGISTRAR INVITACIÓN VÁLIDA
  // ==============================
  const { error: memberError } = await supabase
    .from("invite_members")
    .insert({
      user_id: member.id,
      guild_id: guildId,
      inviter_id: inviterId,
      invite_code: invite.code,
      account_created_at: member.user.createdAt.toISOString(),
      joined_at: new Date().toISOString(),
      valid: true,
      invalid_reason: null
    });

  if (memberError) {
    // La PRIMARY KEY también nos protege contra
    // dos procesos intentando contar al mismo usuario.
    if (memberError.code === "23505") {
      return {
        valid: false,
        reason: "Este usuario ya había sido contabilizado."
      };
    }

    throw memberError;
  }

  // ==============================
  // 7. ACTUALIZAR CONTADOR
  // ==============================
  const currentTotal = await getInviteStats(
    guildId,
    inviterId
  );

  const newTotal = currentTotal + 1;

  const { error: statsError } = await supabase
    .from("invite_stats")
    .upsert(
      {
        guild_id: guildId,
        inviter_id: inviterId,
        valid_invites: newTotal,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "guild_id,inviter_id"
      }
    );

  if (statsError) {
    throw statsError;
  }

  // ==============================
  // 8. RECOMPENSA CADA 20
  // ==============================
  let rewardUnlocked = false;
  let milestone = null;

  if (newTotal % 20 === 0) {
    milestone = newTotal;

    const { error: rewardError } = await supabase
      .from("invite_rewards")
      .insert({
        guild_id: guildId,
        inviter_id: inviterId,
        milestone
      });

    if (!rewardError) {
      rewardUnlocked = true;
    } else if (rewardError.code !== "23505") {
      throw rewardError;
    }
  }

  return {
    valid: true,
    inviterId,
    inviter: invite.inviter,
    inviteCode: invite.code,
    total: newTotal,
    rewardUnlocked,
    milestone
  };
}

module.exports = {
  processInvite,
  getInviteStats
};
