import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { useMainPlayer, useQueue, QueueRepeatMode } from 'discord-player';
import { logger } from '../../utils/logger.js';

const LOOP_MAP = {
  off: QueueRepeatMode.OFF,
  track: QueueRepeatMode.TRACK,
  queue: QueueRepeatMode.QUEUE,
  autoplay: QueueRepeatMode.AUTOPLAY,
};

const LOOP_LABEL = {
  off: 'desactivado',
  track: 'canción actual',
  queue: 'cola completa',
  autoplay: 'autoplay (recomendaciones)',
};

export default {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Reproductor de música — Spotify, YouTube, SoundCloud y más.')
    .setDMPermission(false)
    .addSubcommand((s) =>
      s.setName('play')
        .setDescription('Reproduce o añade a la cola (URL de Spotify/YouTube/SoundCloud o búsqueda).')
        .addStringOption((o) =>
          o.setName('query').setDescription('URL o nombre de la canción/playlist').setRequired(true)))
    .addSubcommand((s) => s.setName('skip').setDescription('Saltar la canción actual.'))
    .addSubcommand((s) => s.setName('queue').setDescription('Ver la cola actual.'))
    .addSubcommand((s) => s.setName('now').setDescription('Qué está sonando ahora.'))
    .addSubcommand((s) => s.setName('pause').setDescription('Pausar la reproducción.'))
    .addSubcommand((s) => s.setName('resume').setDescription('Reanudar la reproducción.'))
    .addSubcommand((s) => s.setName('stop').setDescription('Parar, vaciar la cola y salir del canal.'))
    .addSubcommand((s) => s.setName('shuffle').setDescription('Mezclar la cola.'))
    .addSubcommand((s) =>
      s.setName('loop').setDescription('Configura el modo de repetición.')
        .addStringOption((o) =>
          o.setName('mode').setDescription('Modo de repetición').setRequired(true)
            .addChoices(
              { name: 'Off (sin repetir)', value: 'off' },
              { name: 'Canción actual', value: 'track' },
              { name: 'Cola completa', value: 'queue' },
              { name: 'Autoplay (recomendar)', value: 'autoplay' },
            )))
    .addSubcommand((s) =>
      s.setName('volume').setDescription('Cambia el volumen (0-100).')
        .addIntegerOption((o) =>
          o.setName('level').setDescription('0-100').setMinValue(0).setMaxValue(100).setRequired(true)))
    .addSubcommand((s) =>
      s.setName('remove').setDescription('Quita una canción de la cola por su posición.')
        .addIntegerOption((o) =>
          o.setName('position').setDescription('Posición en la cola (empieza en 1)').setMinValue(1).setRequired(true))),

  async execute(interaction, config, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'play') return handlePlay(interaction);

    const queue = useQueue(interaction.guildId);
    if (!queue) {
      return embed(interaction, 0xf5b942, '⚠️ Nada sonando', 'No hay nada en la cola en este momento.');
    }

    try {
      switch (sub) {
        case 'skip': {
          const track = queue.currentTrack;
          queue.node.skip();
          return embed(interaction, 0x7b6cff, '⏭️ Skip', track ? `Saltada: **${track.title}**` : 'Saltando…');
        }
        case 'pause': queue.node.pause();  return embed(interaction, 0x7b6cff, '⏸️ Pausa', 'Reproducción pausada.');
        case 'resume': queue.node.resume(); return embed(interaction, 0x7b6cff, '▶️ Reanudar', 'Reproducción reanudada.');
        case 'stop': queue.delete();        return embed(interaction, 0xef4444, '⏹️ Stop', 'Cola vaciada y bot desconectado.');
        case 'shuffle': queue.tracks.shuffle(); return embed(interaction, 0x7b6cff, '🔀 Shuffle', `Mezcladas **${queue.tracks.size}** canciones.`);
        case 'loop': {
          const mode = interaction.options.getString('mode');
          queue.setRepeatMode(LOOP_MAP[mode] ?? QueueRepeatMode.OFF);
          return embed(interaction, 0x7b6cff, '🔁 Repetición', `Modo: **${LOOP_LABEL[mode]}**.`);
        }
        case 'volume': {
          const level = interaction.options.getInteger('level');
          queue.node.setVolume(level);
          return embed(interaction, 0x7b6cff, '🔊 Volumen', `Volumen ajustado a **${level}**.`);
        }
        case 'now': return handleNow(interaction, queue);
        case 'queue': return handleQueue(interaction, queue);
        case 'remove': {
          const pos = interaction.options.getInteger('position');
          const track = queue.tracks.at(pos - 1);
          if (!track) return embed(interaction, 0xef4444, '❌ No existe', `No hay canción en la posición ${pos}.`);
          queue.removeTrack(pos - 1);
          return embed(interaction, 0x7b6cff, '✂️ Removida', `Quitada: **${track.title}**.`);
        }
      }
    } catch (err) {
      logger.error('music command error', { sub, error: err?.message });
      return embed(interaction, 0xef4444, 'Error', '```' + String(err?.message || err).slice(0, 500) + '```');
    }
  },
};

async function handlePlay(interaction) {
  const vc = interaction.member?.voice?.channel;
  if (!vc) {
    return embed(interaction, 0xef4444, '🔇 No estás en un canal de voz', 'Únete a un canal de voz primero.');
  }

  const me = interaction.guild.members.me;
  if (
    vc.joinable === false ||
    !vc.permissionsFor(me)?.has(PermissionFlagsBits.Connect) ||
    !vc.permissionsFor(me)?.has(PermissionFlagsBits.Speak)
  ) {
    return embed(interaction, 0xef4444, '🚫 Sin permisos', `No puedo conectarme o hablar en ${vc}.`);
  }

  const query = interaction.options.getString('query', true);
  await interaction.deferReply();

  try {
    const player = useMainPlayer();
    const result = await player.play(vc, query, {
      nodeOptions: {
        metadata: { channel: interaction.channel, requestedBy: interaction.user },
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 60_000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 60_000,
        selfDeaf: true,
        volume: 80,
      },
      requestedBy: interaction.user,
    });

    const track = result.track;
    const isPlaylist = Boolean(result.searchResult?.playlist);

    return interaction.editReply({
      embeds: [{
        color: 0x36d6c3,
        title: isPlaylist ? '📜 Playlist añadida' : '🎵 Añadido a la cola',
        description: isPlaylist
          ? `**${result.searchResult.playlist.title}** · ${result.searchResult.tracks.length} canciones`
          : `[${track.title}](${track.url}) · **${track.author}**`,
        thumbnail: track.thumbnail ? { url: track.thumbnail } : undefined,
      }],
    });
  } catch (err) {
    logger.error('music play error', { error: err?.message });
    return interaction.editReply({
      embeds: [{
        color: 0xef4444,
        title: '❌ No se pudo reproducir',
        description: '```' + String(err?.message || err).slice(0, 700) + '```',
      }],
    });
  }
}

function handleNow(interaction, queue) {
  const track = queue.currentTrack;
  if (!track) return embed(interaction, 0xf5b942, 'Nada sonando', 'No hay canción actual.');
  let progress = '';
  try { progress = queue.node.createProgressBar(); } catch { /* ignore */ }
  return interaction.reply({
    embeds: [{
      color: 0x7b6cff,
      author: { name: 'Sonando ahora' },
      title: track.title?.slice(0, 250) || 'Pista',
      url: track.url,
      description: `por **${track.author}**${progress ? `\n\n${progress}` : ''}`,
      thumbnail: track.thumbnail ? { url: track.thumbnail } : undefined,
      footer: { text: `Pedida por ${track.requestedBy?.tag || 'anónimo'}` },
    }],
  });
}

function handleQueue(interaction, queue) {
  const current = queue.currentTrack;
  const upcoming = queue.tracks.toArray().slice(0, 10);
  const lines = upcoming.map(
    (t, i) => `\`${String(i + 1).padStart(2, ' ')}.\` [${t.title.slice(0, 70)}](${t.url}) · **${t.author}**`,
  );
  const more = queue.tracks.size > 10 ? `\n\n*+ ${queue.tracks.size - 10} más en la cola…*` : '';
  return interaction.reply({
    embeds: [{
      color: 0x7b6cff,
      title: '📜 Cola de reproducción',
      description:
        (current ? `**Sonando ahora:** [${current.title}](${current.url})\n\n` : '') +
        (lines.length ? lines.join('\n') : '*(la cola está vacía)*') +
        more,
      footer: { text: `${queue.tracks.size} canciones en cola` },
    }],
  });
}

function embed(interaction, color, title, description) {
  const payload = { embeds: [{ color, title, description }] };
  if (interaction.deferred) return interaction.editReply(payload);
  return interaction.reply(payload);
}
