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

export default {

  name: Events.ChannelUpdate,

  async execute(
    oldChannel,
    newChannel
  ) {

    try {

      if (!newChannel.guild) return;

      let changes = [];

      // 🔥 Nombre cambiado
      if (
        oldChannel.name !==
        newChannel.name
      ) {

        changes.push(
          `Name: ${oldChannel.name} → ${newChannel.name}`
        );

      }

      // 🔥 Topic cambiado
      if (
        oldChannel.topic !==
        newChannel.topic
      ) {

        changes.push(
          `Topic changed`
        );

      }

      if (changes.length === 0) {
        return;
      }

      let executor =
        'Desconocido';

      try {

        const fetchedLogs =
          await newChannel.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.ChannelUpdate
          });

        const log =
          fetchedLogs.entries.first();

        if (
          log &&
          log.target.id ===
            newChannel.id &&
          Date.now() -
            log.createdTimestamp <
            5000
        ) {

          executor =
            log.executor?.tag ||
            'Desconocido';

        }

      } catch (err) {

        logger.warn(
          'Error audit logs channelUpdate:',
          err
        );

      }

      // 🔥 NUEVO SISTEMA ÚNICO
      await logEvent({
        client: newChannel.client,
        guildId: newChannel.guild.id,
        eventType: EVENT_TYPES.ROLE_UPDATE,
        data: {
          description:
            `A channel was updated: ${newChannel.name}`,
          fields: [
            {
              name: '📝 Changes',
              value:
                changes.join('\n'),
              inline: false
            },
            {
              name: '🧑‍💼 Updated By',
              value: executor,
              inline: true
            },
            {
              name: '🆔 Channel ID',
              value: newChannel.id,
              inline: true
            }
          ]
        }
      });

    } catch (error) {

      logger.error(
        'Error en channelUpdate:',
        error
      );

    }
  }
};