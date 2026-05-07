import { Events, AuditLogEvent } from 'discord.js';
import { getGuildConfig } from '../../services/guildConfigService.js';
import { createLogEmbed } from '../../utils/logEmbed.js';

const voiceSessions = new Map(); // memoria temporal

export default {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState, client) {

    const guild = newState.guild;
    if (!guild) return;

    const member = newState.member;
    if (!member || member.user.bot) return;

    const config = await getGuildConfig(client.db, guild.id);
    if (!config.logs?.enabled) return;

    let logChannel = null;

    // 🔥 CATEGORY
    if (config.logs?.categories?.voice) {
      logChannel =
        guild.channels.cache.get(config.logs.categories.voice)
        || await guild.channels.fetch(config.logs.categories.voice).catch(() => null);
    }

    // 🔥 FALLBACK
    if (!logChannel && config.logs?.channel) {
      logChannel =
        guild.channels.cache.get(config.logs.channel)
        || await guild.channels.fetch(config.logs.channel).catch(() => null);
    }

    if (!logChannel) return;

    const userId = member.id;
    const key = `${guild.id}-${userId}`;

    let action = null;
    let color = '#00ffae';
    let fields = [];

    // =========================
    // 🔊 JOIN
    // =========================
    if (!oldState.channel && newState.channel) {

      voiceSessions.set(key, Date.now());

      action = '🔊 Se unió a voice';
      color = '#00ffae';

      fields.push({
        name: '📥 Canal',
        value: `${newState.channel}\n🆔 \`${newState.channel.id}\``
      });

    }

    // =========================
    // 🔇 LEAVE
    // =========================
    else if (oldState.channel && !newState.channel) {

      let timeText = 'Desconocido';
      let isAFK = false;

      const joinTime = voiceSessions.get(key);

      if (joinTime) {
        const seconds = Math.floor((Date.now() - joinTime) / 1000);

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        timeText = `${h}h ${m}m ${s}s`;

        // 🧠 AFK DETECCIÓN (menos de 15s)
        if (seconds < 15) {
          isAFK = true;
        }

        // 💾 GUARDAR EN DB (CORRECTO)
        try {
          if (client.db.isAvailable()) {
            await client.db.db.pool.query(`
              INSERT INTO voice_time (user_id, guild_id, seconds)
              VALUES ($1, $2, $3)
              ON CONFLICT (user_id, guild_id)
              DO UPDATE SET seconds = voice_time.seconds + $3
            `, [userId, guild.id, seconds]);
          }
        } catch (err) {
          console.log('Error guardando voice:', err);
        }

        voiceSessions.delete(key);
      }

      // 🔍 QUIÉN LO DESCONECTÓ
      let mover = 'Usuario (auto)';
      let movedByMod = false;

      try {
        await new Promise(res => setTimeout(res, 800));

        const logs = await guild.fetchAuditLogs({
          limit: 5,
          type: AuditLogEvent.MemberDisconnect
        });

        const entry = logs.entries.find(e =>
          e.target?.id === userId &&
          Date.now() - e.createdTimestamp < 5000
        );

        if (entry) {
          mover = `${entry.executor.tag} (${entry.executor.id})`;
          movedByMod = true;
        }

      } catch {}

      action = '🔇 Salió de voice';
      color = isAFK ? '#888888' : '#ff4d4d';

      fields.push(
        {
          name: '📤 Canal',
          value: `${oldState.channel}\n🆔 \`${oldState.channel.id}\``
        },
        {
          name: '⏱️ Tiempo en voice',
          value: timeText
        },
        {
          name: '📊 Estado',
          value: isAFK ? '😴 AFK / Salió rápido' : '🟢 Activo'
        },
        {
          name: '🧑‍💼 Acción por',
          value: movedByMod ? mover : 'Usuario (auto)'
        }
      );

    }

    // =========================
    // 🔁 MOVE
    // =========================
    else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {

      let mover = 'Usuario';
      let movedByMod = false;

      try {
        await new Promise(res => setTimeout(res, 800));

        const logs = await guild.fetchAuditLogs({
          limit: 5,
          type: AuditLogEvent.MemberMove
        });

        const entry = logs.entries.find(e =>
          e.target?.id === userId &&
          Date.now() - e.createdTimestamp < 5000
        );

        if (entry) {
          mover = `${entry.executor.tag} (${entry.executor.id})`;
          movedByMod = true;
        }

      } catch {}

      action = '🔁 Cambio de canal';
      color = '#ffaa00';

      fields.push(
        {
          name: '📤 Canal anterior',
          value: `${oldState.channel}\n🆔 \`${oldState.channel.id}\``,
          inline: true
        },
        {
          name: '📥 Canal nuevo',
          value: `${newState.channel}\n🆔 \`${newState.channel.id}\``,
          inline: true
        },
        {
          name: '🧑‍💼 Movido por',
          value: movedByMod ? mover : 'Usuario',
          inline: false
        }
      );

    }

    // =========================
    // 🔇 MUTE
    // =========================
    else if (oldState.serverMute !== newState.serverMute) {

      action = newState.serverMute ? '🔇 Usuario muteado' : '🔊 Usuario desmuteado';
      color = '#ff8800';

      fields.push({
        name: '📊 Estado',
        value: newState.serverMute
          ? 'Silenciado por moderador'
          : 'Ya puede hablar'
      });

    }

    // =========================
    // 🔕 DEAF
    // =========================
    else if (oldState.serverDeaf !== newState.serverDeaf) {

      action = newState.serverDeaf ? '🔕 Usuario ensordecido' : '🔊 Usuario escuchando';
      color = '#aa00ff';

      fields.push({
        name: '📊 Estado',
        value: newState.serverDeaf
          ? 'No puede escuchar'
          : 'Puede escuchar nuevamente'
      });

    }

    if (!action) return;

    // =========================
    // 📦 EMBED FINAL
    // =========================
    const embed = createLogEmbed({
      title: action,
      color,
      user: member.user,
      fields: [
        {
          name: '👤 Usuario',
          value: `${member.user}\n🆔 \`${member.id}\``
        },
        ...fields
      ],
      footer: `Servidor: ${guild.name}`
    });

    await logChannel.send({ embeds: [embed] });

  }
};