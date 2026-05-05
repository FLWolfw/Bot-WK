const trackers = {
  channelDelete: new Map(),
  channelCreate: new Map(),
  roleCreate: new Map(),
  ban: new Map()
};

const LIMITS = {
  channelDelete: 3,
  channelCreate: 5,
  roleCreate: 3,
  ban: 3
};

const TIME = 10000;

// 🔥 ROLES PROTEGIDOS
const SAFE_ROLES = [
  '1231565813597863946', // Founder
  '1453091584185860268'  // Katt
];

async function punish(member, reason) {
  try {
    await member.roles.set([]);
    console.log(`🚨 Anti-nuke: ${member.user.tag} castigado (${reason})`);
  } catch (err) {
    console.error('Error castigando:', err);
  }
}

async function handleAction(type, guild, executor) {
  if (!executor || executor.bot) return;

  if (executor.id === guild.ownerId) return;

  const member = await guild.members.fetch(executor.id);

  // 🔥 WHITELIST POR ROL
  if (SAFE_ROLES.some(r => member.roles.cache.has(r))) return;

  const now = Date.now();
  const map = trackers[type];

  if (!map.has(executor.id)) {
    map.set(executor.id, []);
  }

  const actions = map.get(executor.id).filter(t => now - t < TIME);
  actions.push(now);
  map.set(executor.id, actions);

  if (actions.length >= LIMITS[type]) {
    await punish(member, type);
  }
}

// ==========================
// EXPORTS
// ==========================

export async function antiChannelDelete(channel, executor) {
  await handleAction('channelDelete', channel.guild, executor);
}

export async function antiChannelCreate(channel, executor) {
  await handleAction('channelCreate', channel.guild, executor);
}

export async function antiRoleCreate(role, executor) {
  await handleAction('roleCreate', role.guild, executor);
}

export async function antiBan(guild, executor) {
  await handleAction('ban', guild, executor);
}