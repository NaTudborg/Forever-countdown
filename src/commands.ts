import {
  Attachment,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { DateTime } from 'luxon';
import { downloadAndNormalizeImage, removeStoredImage } from './image-storage.js';
import { CountdownScheduler } from './scheduler.js';
import { CountdownStore } from './storage.js';
import { parseTargetDateTime } from './time.js';

export const commandDefinition = new SlashCommandBuilder()
  .setName('countdown')
  .setDescription('Manage the countdown for this channel')
  .addSubcommand((command) => command
    .setName('set')
    .setDescription('Create or replace this channel\'s countdown')
    .addStringOption((option) => option.setName('date_time').setDescription('Local date and time, e.g. 2026-12-31 23:59:00').setRequired(true))
    .addStringOption((option) => option.setName('timezone').setDescription('IANA timezone, e.g. Europe/Copenhagen').setRequired(true))
    .addAttachmentOption((option) => option.setName('image').setDescription('Image displayed below the countdown').setRequired(true))
    .addStringOption((option) => option.setName('title').setDescription('Optional heading').setRequired(false)))
  .addSubcommand((command) => command
    .setName('show')
    .setDescription('Show the current countdown settings'))
  .addSubcommand((command) => command
    .setName('stop')
    .setDescription('Stop the countdown in this channel'))
  .toJSON();

function requireGuild(interaction: ChatInputCommandInteraction): { guildId: string; channelId: string } {
  if (!interaction.guildId || !interaction.channelId) throw new Error('This command can only be used in a server channel.');
  return { guildId: interaction.guildId, channelId: interaction.channelId };
}

function requireManageGuild(interaction: ChatInputCommandInteraction): void {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    throw new Error('You need the Manage Server permission to change a countdown.');
  }
}

export async function handleCountdownCommand(
  interaction: ChatInputCommandInteraction,
  store: CountdownStore,
  scheduler: CountdownScheduler,
  imageDirectory: string,
): Promise<void> {
  try {
    const { guildId, channelId } = requireGuild(interaction);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'set') {
      requireManageGuild(interaction);
      await interaction.deferReply({ ephemeral: true });

      const dateTime = interaction.options.getString('date_time', true);
      const timezone = interaction.options.getString('timezone', true);
      const target = parseTargetDateTime(dateTime, timezone);
      if (target.toMillis() <= Date.now()) throw new Error('The countdown target must be in the future.');

      const attachment = interaction.options.getAttachment('image', true);
      const imagePath = await downloadAttachment(attachment, imageDirectory);
      const previous = store.get(guildId, channelId);
      const countdown = store.upsert({
        guildId,
        channelId,
        targetAtUtc: target.toUTC().toISO()!,
        timezone,
        title: interaction.options.getString('title')?.trim() || 'Countdown',
        imagePath,
        createdBy: interaction.user.id,
      });

      if (previous?.imagePath && previous.imagePath !== imagePath) {
        await removeStoredImage(previous.imagePath);
      }
      scheduler.track(countdown);
      await scheduler.updateNow(guildId, channelId);
      await interaction.editReply('Countdown saved and posted in this channel.');
      return;
    }

    if (subcommand === 'stop') {
      requireManageGuild(interaction);
      const existing = store.get(guildId, channelId);
      if (!existing || existing.state !== 'active') {
        await interaction.reply({ content: 'There is no active countdown in this channel.', ephemeral: true });
        return;
      }
      store.setState(guildId, channelId, 'stopped');
      scheduler.stop(guildId, channelId);
      await interaction.reply({ content: 'Countdown stopped.', ephemeral: true });
      return;
    }

    const existing = store.get(guildId, channelId);
    if (!existing) {
      await interaction.reply({ content: 'There is no countdown configured in this channel.', ephemeral: true });
      return;
    }
    const target = DateTime.fromISO(existing.targetAtUtc).setZone(existing.timezone).toFormat('yyyy-LL-dd HH:mm:ss ZZZZ');
    await interaction.reply({
      content: `**${existing.title}**\nTarget: ${target}\nStatus: ${existing.state}`,
      ephemeral: true,
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Something went wrong while managing the countdown.';
    if (interaction.deferred || interaction.replied) await interaction.editReply(message);
    else await interaction.reply({ content: message, ephemeral: true });
  }
}

async function downloadAttachment(attachment: Attachment, imageDirectory: string): Promise<string> {
  if (!attachment.contentType?.startsWith('image/')) throw new Error('The attachment must be an image.');
  return downloadAndNormalizeImage(attachment.url, imageDirectory);
}
