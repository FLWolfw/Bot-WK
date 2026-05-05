import { Events, AuditLogEvent } from 'discord.js';
import { sendLog } from '../utils/discordLogger.js';
import { logger } from '../utils/logger.js';
import { antiBan } from '../security/antiNuke.js'; // 🔥 NUEVO

export default {
  name: Events.GuildBanAdd,

  async execute(ban) {
    try {
      const { guild, user } = ban;

      const fetchedLogs = await guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanAdd
      });

      const log = fetchedLogs.entries.first();

      let executorObj = null;
      let executor = 'Desconocido';
      let reason = 'Sin razón';

      if (log) {
        executorObj = log.executor;
        executor = log.executor?.tag || 'Desconocido';
        reason = log.reason || 'Sin razón';
      }

      // 🔥 ANTI-NUKE
      if (executorObj) {
        await antiBan(guild, executorObj);
      }

      await sendLog({
        title: '🔨 Usuario baneado',
        description: `${user.tag} fue baneado`,
        color: 0xff0000,
        fields: [
          {
            name: '👤 Usuario',
            value: `${user.tag} (${user.id})`,
            inline: true
          },
          {
            name: '🛡️ Moderador',
            value: executor,
            inline: true
          },
          {
            name: '📄 Razón',
            value: reason,
            inline: false
          }
        ]
      });

    } catch (error) {
      logger.error('Error en guildBanAdd:', error);
    }
  }
};