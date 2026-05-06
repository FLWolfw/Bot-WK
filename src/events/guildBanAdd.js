import {
  Events,
  AuditLogEvent
} from 'discord.js';

import {
  logEvent,
  EVENT_TYPES
} from '../services/loggingService.js';

import { logger }
  from '../utils/logger.js';

import {
  antiBan
} from '../security/antiNuke.js';

export default {

  name: Events.GuildBanAdd,

  async execute(ban) {

    try {

      const {
        guild,
        user
      } = ban;

      const fetchedLogs =
        await guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.MemberBanAdd
        });

      const log =
        fetchedLogs.entries.first();

      let executorObj = null;

      let executor =
        'Desconocido';

      let reason =
        'No reason provided';

      if (log) {

        executorObj =
          log.executor;

        executor =
          log.executor?.tag ||
          'Desconocido';

        reason =
          log.reason ||
          'No reason provided';

      }

      // 🔥 ANTI-NUKE
      if (executorObj) {

        await antiBan(
          guild,
          executorObj
        );

      }

      // 🔥 NUEVO SISTEMA ÚNICO
      await logEvent({
        client: guild.client,
        guildId: guild.id,
        eventType: EVENT_TYPES.MEMBER_BAN,
        data: {
          description:
            `${user.tag} was banned`,
          userId: user.id,
          fields: [
            {
              name: '👤 User',
              value:
                `${user.tag} (${user.id})`,
              inline: true
            },
            {
              name: '🛡️ Moderator',
              value: executor,
              inline: true
            },
            {
              name: '📄 Reason',
              value: reason,
              inline: false
            }
          ]
        }
      });

    } catch (error) {

      logger.error(
        'Error en guildBanAdd:',
        error
      );

    }
  }
};