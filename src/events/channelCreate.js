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
  antiChannelCreate
} from '../security/antiNuke.js';

export default {

  name: Events.ChannelCreate,

  async execute(channel) {

    try {

      if (!channel.guild) return;

      let executorObj = null;
      let executor = 'Desconocido';

      try {

        const fetchedLogs =
          await channel.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.ChannelCreate
          });

        const log =
          fetchedLogs.entries.first();

        if (
          log &&
          log.target.id === channel.id
        ) {

          executorObj = log.executor;

          executor =
            log.executor?.tag ||
            'Desconocido';

        }

      } catch (err) {

        logger.warn(
          'Error audit logs channelCreate:',
          err
        );

      }

      // 🔥 ANTI-NUKE
      if (executorObj) {

        await antiChannelCreate(
          channel,
          executorObj
        );

      }

      // 🔥 NUEVO SISTEMA ÚNICO
      await logEvent({
        client: channel.client,
        guildId: channel.guild.id,
        eventType: EVENT_TYPES.ROLE_CREATE,
        data: {
          description:
            `A new channel was created: ${channel.name}`,
          fields: [
            {
              name: '🧑‍💼 Created By',
              value: executor,
              inline: true
            },
            {
              name: '📁 Type',
              value: channel.type.toString(),
              inline: true
            },
            {
              name: '🆔 Channel ID',
              value: channel.id,
              inline: true
            }
          ]
        }
      });

    } catch (error) {

      logger.error(
        'Error en channelCreate:',
        error
      );

    }
  }
};