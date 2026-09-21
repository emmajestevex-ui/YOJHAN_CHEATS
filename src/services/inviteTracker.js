// Caché de invitaciones:
// guildId -> Map(inviteCode -> cantidad de usos)
const inviteCache = new Map();

function mapInvites(invites) {
  return new Map(
    invites.map((invite) => [
      invite.code,
      invite.uses ?? 0
    ])
  );
}

// Guarda el estado actual de las invitaciones de un servidor.
async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();

    inviteCache.set(
      guild.id,
      mapInvites(invites)
    );

    console.log(
      `[invites] Caché cargada: ${guild.name} (${invites.size} invitaciones)`
    );

    return true;
  } catch (error) {
    console.error(
      `[invites] No se pudieron cargar las invitaciones de ${guild.name}:`,
      error
    );

    return false;
  }
}

// Se ejecutará al iniciar el bot.
async function cacheAllInvites(client) {
  for (const guild of client.guilds.cache.values()) {
    await cacheGuildInvites(guild);
  }
}

// Cuando entra alguien, compara el estado anterior con el actual.
async function detectUsedInvite(guild) {
  const previousInvites =
    inviteCache.get(guild.id) || new Map();

  let currentInvites;

  try {
    currentInvites = await guild.invites.fetch();
  } catch (error) {
    console.error(
      "[invites] Error obteniendo las invitaciones:",
      error
    );

    return null;
  }

  let usedInvite = null;

  for (const invite of currentInvites.values()) {
    const oldUses =
      previousInvites.get(invite.code) ?? 0;

    const newUses =
      invite.uses ?? 0;

    if (newUses > oldUses) {
      usedInvite = invite;
      break;
    }
  }

  // Actualizamos inmediatamente la caché.
  inviteCache.set(
    guild.id,
    mapInvites(currentInvites)
  );

  return usedInvite;
}

// Si se crea una invitación nueva, actualizamos la caché.
async function handleInviteCreate(invite) {
  const guildId = invite.guild?.id;

  if (!guildId) return;

  let guildCache = inviteCache.get(guildId);

  if (!guildCache) {
    guildCache = new Map();
    inviteCache.set(guildId, guildCache);
  }

  guildCache.set(
    invite.code,
    invite.uses ?? 0
  );
}

// Si eliminan una invitación, la quitamos de la caché.
function handleInviteDelete(invite) {
  const guildId = invite.guild?.id;

  if (!guildId) return;

  const guildCache = inviteCache.get(guildId);

  if (!guildCache) return;

  guildCache.delete(invite.code);
}

module.exports = {
  cacheAllInvites,
  cacheGuildInvites,
  detectUsedInvite,
  handleInviteCreate,
  handleInviteDelete
};
