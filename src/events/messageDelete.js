import { Events, AuditLogEvent } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';
import { getReactionRoleMessage, deleteReactionRoleMessage } from '../services/reactionRoleService.js';

const MAX_LOGGED_MESSAGE_CONTENT_LENGTH = 1024;

export default {
  name: Events.MessageDelete,
  once: false,

  async execute(message) {
    try {
      if (!message.guild) return;

      // 🔥 =========================
      // 🧠 DETECTAR QUIÉN BORRÓ EL MENSAJE
      // 🔥 =========================
      let deletedBy = 'Autor del mensaje';

      try {
        const fetchedLogs = await message.guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.MessageDelete
        });

        const log = fetchedLogs.entries.first();

        if (
          log &&
          message.author &&
          log.target?.id === message.author.id &&
          log.extra?.channel?.id === message.channel.id &&
          Date.now() - log.createdTimestamp < 5000
        ) {
          deletedBy = log.executor?.tag || 'Desconocido';
        }

      } catch (auditError) {
        logger.warn('Error leyendo audit logs:', auditError);
      }

      // 🧹 REACTION ROLES
      try {
        const reactionRoleData = await getReactionRoleMessage(
          message.client,
          message.guild.id,
          message.id
        );

        if (reactionRoleData) {
          await deleteReactionRoleMessage(
            message.client,
            message.guild.id,
            message.id
          );
        }

      } catch (err) {
        logger.warn('Error limpiando reaction roles:', err);
      }

      if (message.author?.bot) return;

      const fields = [];

      // 👤 Autor
      if (message.author) {
        fields.push({
          name: '👤 Author',
          value: `${message.author.tag} (${message.author.id})`,
          inline: true
        });
      }

      // 💬 Canal
      fields.push({
        name: '💬 Channel',
        value: `${message.channel.toString()} (${message.channel.id})`,
        inline: true
      });

      // 🧹 Eliminado por
      fields.push({
        name: '🧹 Deleted By',
        value: deletedBy,
        inline: true
      });

      // 📝 Contenido
      if (message.content) {

        const content =
          message.content.length >
          MAX_LOGGED_MESSAGE_CONTENT_LENGTH
            ? message.content.substring(
                0,
                MAX_LOGGED_MESSAGE_CONTENT_LENGTH - 3
              ) + '...'
            : message.content;

        fields.push({
          name: '📝 Content',
          value: content || '*(empty message)*',
          inline: false
        });
      }

      // 🆔 ID
      fields.push({
        name: '🆔 Message ID',
        value: message.id,
        inline: true
      });

      // 📅 Fecha
      fields.push({
        name: '📅 Created',
        value: `<t:${Math.floor(
          message.createdTimestamp / 1000
        )}:R>`,
        inline: true
      });

      // 📎 Adjuntos
      if (message.attachments.size > 0) {
        fields.push({
          name: '📎 Attachments',
          value: message.attachments.size.toString(),
          inline: true
        });
      }

      // 🔥 NUEVO SISTEMA ÚNICO
      await logEvent({
        client: message.client,
        guildId: message.guild.id,
        eventType: EVENT_TYPES.MESSAGE_DELETE,
        data: {
          description: `A message was deleted in ${message.channel.toString()}`,
          userId: message.author?.id,
          channelId: message.channel.id,
          fields
        }
      });

    } catch (error) {
      logger.error('Error in messageDelete event:', error);
    }
  }
};