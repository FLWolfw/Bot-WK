import { Events } from 'discord.js';
import { getGuildConfig } from '../../services/guildConfigService.js';
import { createLogEmbed } from '../../utils/logEmbed.js';

export default {
  name: Events.MessageUpdate,

  async execute(oldMessage, newMessage, client) {

    // ❌ ignorar cosas inútiles
    if (!oldMessage.guild) return;
    if (oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const config = await getGuildConfig(
      client.db,
      oldMessage.guild.id
    );

    if (!config.logs?.enabled) return;

    let logChannel = null;

    // 🔥 CATEGORY
    if (config.logs?.categories?.message) {
      logChannel =
        oldMessage.guild.channels.cache.get(config.logs.categories.message)
        || await oldMessage.guild.channels
          .fetch(config.logs.categories.message)
          .catch(() => null);
    }

    // 🔥 FALLBACK
    if (!logChannel && config.logs?.channel) {
      logChannel =
        oldMessage.guild.channels.cache.get(config.logs.channel)
        || await oldMessage.guild.channels
          .fetch(config.logs.channel)
          .catch(() => null);
    }

    if (!logChannel) return;

    // 🔥 CONTENIDO ANTES / DESPUÉS
    const before = oldMessage.content
      ? oldMessage.content.slice(0, 1000)
      : 'Sin contenido';

    const after = newMessage.content
      ? newMessage.content.slice(0, 1000)
      : 'Sin contenido';

    // 🔥 FORMATO PRO (diff estilo Git)
    const diff = `\`\`\`diff\n- ${before}\n+ ${after}\n\`\`\``;

    // 🔥 LINK AL MENSAJE
    const messageLink = `https://discord.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id}`;

    const embed = createLogEmbed({
      title: '✏️ Message Edited',
      color: '#ffaa00',
      user: oldMessage.author,
      fields: [
        {
          name: '👤 Usuario',
          value: `${oldMessage.author}\n🆔 \`${oldMessage.author.id}\``,
          inline: true
        },
        {
          name: '💬 Canal',
          value: `<#${oldMessage.channel.id}>\n🆔 \`${oldMessage.channel.id}\``,
          inline: true
        },
        {
          name: '🔗 Ir al mensaje',
          value: `[Click aquí](${messageLink})`,
          inline: false
        },
        {
          name: '📝 Cambios',
          value: diff,
          inline: false
        },
        {
          name: '🆔 Message ID',
          value: `\`${oldMessage.id}\``,
          inline: false
        }
      ],
      footer: `Servidor: ${oldMessage.guild.name}`
    });

    await logChannel.send({ embeds: [embed] });

  }
};