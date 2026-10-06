import { AttachmentBuilder, type Message, type TextChannel } from 'discord.js';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { countdownMessageText } from './time.js';
import type { Countdown } from './types.js';

function remainingMs(countdown: Countdown, nowMs: number): number {
  return Math.max(0, Date.parse(countdown.targetAtUtc) - nowMs);
}

export async function publishCountdownMessage(
  channel: TextChannel,
  countdown: Countdown,
  nowMs: number,
): Promise<Message> {
  const image = await sharp(await readFile(countdown.imagePath))
    .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
  return channel.send({
    content: countdownMessageText(countdown.title, remainingMs(countdown, nowMs)),
    files: [new AttachmentBuilder(image, { name: 'countdown-image.png' })],
  });
}

export async function editCountdownMessage(
  message: Message,
  countdown: Countdown,
  nowMs: number,
): Promise<void> {
  await message.edit({
    content: countdownMessageText(countdown.title, remainingMs(countdown, nowMs)),
  });
}

export function countdownAccessibleText(countdown: Countdown, nowMs: number): string {
  return countdownMessageText(countdown.title, remainingMs(countdown, nowMs)).replace(/[\\*`]/g, '');
}
