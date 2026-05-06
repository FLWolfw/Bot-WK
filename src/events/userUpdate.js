import {
  Events
} from 'discord.js';

import {
  logEvent,
  EVENT_TYPES
} from '../services/loggingService.js';

import { logger }
  from '../utils/logger.js';

// 🔥 Anti-duplicados
const avatarCooldown =
  new Map();

const AVATAR_COOLDOWN_MS =
  5000;

export default {

  name: Events.UserUpdate,

  once: false,

  async execute(
    oldUser,
    newUser
  ) {

    try {

      if (oldUser.bot) return;

      const usernameChanged =
        oldUser.username !==
        newUser.username;

      const discriminatorChanged =
        oldUser.discriminator !==
        newUser.discriminator;

      const oldAvatar =
        oldUser.displayAvatarURL({
          size: 1024
        });

      const newAvatar =
        newUser.displayAvatarURL({
          size: 1024
        });

      const avatarChanged =
        oldAvatar !== newAvatar;

      if (
        !usernameChanged &&
        !discriminatorChanged &&
        !avatarChanged
      ) {
        return;
      }

      // 🔥 Verifica que esté en algún guild
      const isInGuild =
        newUser.client.guilds.cache.some(
          g =>
            g.members.cache.has(
              newUser.id
            )
        );

      if (!isInGuild) return;

      // =====================================
      // 🧠 AVATAR
      // =====================================

      if (avatarChanged) {

        const lastChange =
          avatarCooldown.get(
            newUser.id
          );

        const now =
          Date.now();

        if (
          lastChange &&
          now - lastChange <
            AVATAR_COOLDOWN_MS
        ) {

          return;

        }

        avatarCooldown.set(
          newUser.id,
          now
        );

        // 🔥 NUEVO SISTEMA
        await logEvent({
          client: newUser.client,
          guildId:
            newUser.client.guilds.cache.first()?.id,
          eventType:
            EVENT_TYPES.MEMBER_UPDATE,
          data: {
            description:
              `${newUser.tag} changed their avatar`,
            userId:
              newUser.id,
            fields: [
              {
                name: '🖼️ Old Avatar',
                value:
                  `[View Avatar](${oldAvatar})`,
                inline: true
              },
              {
                name: '🖼️ New Avatar',
                value:
                  `[View Avatar](${newAvatar})`,
                inline: true
              }
            ]
          }
        });

      }

      // =====================================
      // ✏️ USERNAME
      // =====================================

      if (
        usernameChanged ||
        discriminatorChanged
      ) {

        const fields = [];

        if (usernameChanged) {

          fields.push(
            {
              name:
                'Old Username',
              value:
                oldUser.username,
              inline: true
            },
            {
              name:
                'New Username',
              value:
                newUser.username,
              inline: true
            }
          );

        }

        if (
          discriminatorChanged
        ) {

          fields.push(
            {
              name:
                'Old Tag',
              value:
                `#${oldUser.discriminator}`,
              inline: true
            },
            {
              name:
                'New Tag',
              value:
                `#${newUser.discriminator}`,
              inline: true
            }
          );

        }

        // 🔥 NUEVO SISTEMA
        await logEvent({
          client: newUser.client,
          guildId:
            newUser.client.guilds.cache.first()?.id,
          eventType:
            EVENT_TYPES.MEMBER_NAME_CHANGE,
          data: {
            description:
              `${newUser.tag} updated their username`,
            userId:
              newUser.id,
            fields
          }
        });

      }

    } catch (error) {

      logger.error(
        'Error in userUpdate event:',
        error
      );

    }
  }
};