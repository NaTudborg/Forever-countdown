import { AttachmentBuilder } from 'discord.js';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { countdownMessageText } from './time.js';
function remainingMs(countdown, nowMs) {
    return Math.max(0, Date.parse(countdown.targetAtUtc) - nowMs);
}
export async function publishCountdownMessage(channel, countdown, nowMs) {
    const image = await sharp(await readFile(countdown.imagePath))
        .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: false })
        .png()
        .toBuffer();
    return channel.send({
        content: countdownMessageText(countdown.title, remainingMs(countdown, nowMs)),
        files: [new AttachmentBuilder(image, { name: 'countdown-image.png' })],
    });
}
export async function editCountdownMessage(message, countdown, nowMs) {
    await message.edit({
        content: countdownMessageText(countdown.title, remainingMs(countdown, nowMs)),
    });
}
export function countdownAccessibleText(countdown, nowMs) {
    return countdownMessageText(countdown.title, remainingMs(countdown, nowMs)).replace(/[\\*`]/g, '');
}
