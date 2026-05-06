export async function getGuildConfig(db, guildId) {

  const key = `guild:${guildId}:config`;

  let config = await db.get(key, null);

  if (!config) {
    config = {
      guild_id: guildId,
      welcome_enabled: false,
      welcome_channel: null // 🔥 NUEVO
    };

    await db.set(key, config);
  }

  return config;
}

export async function updateWelcome(db, guildId, value) {

  const key = `guild:${guildId}:config`;

  let config = await db.get(key, null);

  if (!config) {
    config = {
      guild_id: guildId,
      welcome_enabled: false,
      welcome_channel: null
    };
  }

  config.welcome_enabled = value;

  await db.set(key, config);
}

// 🔥 NUEVO: GUARDAR CANAL
export async function updateWelcomeChannel(db, guildId, channelId) {

  const key = `guild:${guildId}:config`;

  let config = await db.get(key, null);

  if (!config) {
    config = {
      guild_id: guildId,
      welcome_enabled: false,
      welcome_channel: null
    };
  }

  config.welcome_channel = channelId;

  await db.set(key, config);
}