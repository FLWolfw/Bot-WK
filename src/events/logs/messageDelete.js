import { Events, AuditLogEvent } from 'discord.js';
import { getGuildConfig } from '../../services/guildConfigService.js';
import { createLogEmbed } from '../../utils/logEmbed.js';

export default {
  name: Events.MessageDelete,

  async execute(message, client) {

    if (!message.guild || message.author?.bot) return;

    const config = await getGuildConfig(
      client.db,
      message.guild.id
    );

    if (!config.logs?.enabled) return;

    let logChannel = null;

    // 🔥 CATEGORY (con fetch)
    if (config.logs?.categories?.message) {
      logChannel =
        message.guild.channels.cache.get(config.logs.categories.message)
        || await message.guild.channels
          .fetch(config.logs.categories.message)
          .catch(() => null);
    }

    // 🔥 FALLBACK
    if (!logChannel && config.logs?.channel) {
      logChannel =
        message.guild.channels.cache.get(config.logs.channel)
        || await message.guild.channels
          .fetch(config.logs.channel)
          .catch(() => null);
    }

    if (!logChannel) return;

    // 🔥 AUDIT LOG
    let deleter = 'Desconocido';

    try {
      const fetchedLogs = await message.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MessageDelete
      });

      const log = fetchedLogs.entries.first();

      if (log && log.target?.id === message.author.id) {
        deleter = `${log.executor.tag} (${log.executor.id})`;
      }

    } catch (err) {
      console.log('⚠️ Audit logs no disponibles');
    }

    // 🔥 CONTENIDO SEGURO
    const content = message.content
      ? `\`\`\`\n${message.content.slice(0, 1000)}\n\`\`\``
      : 'Sin contenido';

    const embed = createLogEmbed({
      title: '🗑️ Message Deleted',
      color: '#ff3b3b',
      user: message.author,
      fields: [
        {
          name: '👤 Usuario',
          value: `${message.author}\n🆔 \`${message.author.id}\``,
          inline: true
        },
        {
          name: '💬 Canal',
          value: `<#${message.channel.id}>\n🆔 \`${message.channel.id}\``,
          inline: true
        },
        {
          name: '🧹 Eliminado por',
          value: deleter,
          inline: false
        },
        {
          name: '📄 Contenido',
          value: content,
          inline: false
        },
        {
          name: '🆔 Message ID',
          value: `\`${message.id}\``,
          inline: false
        }
      ],
      footer: `Servidor: ${message.guild.name}`
    });

    await logChannel.send({ embeds: [embed] });

  }
};