import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadAndNormalizeImage } from '../src/image-storage.js';
describe('downloadAndNormalizeImage', () => {
    it('accepts AVIF uploads and normalizes them to PNG', async () => {
        const directory = await mkdtemp(join(tmpdir(), 'discord-countdown-image-'));
        const avif = await sharp({
            create: { width: 32, height: 18, channels: 3, background: '#e879f9' },
        }).avif().toBuffer();
        const normalizedPath = await downloadAndNormalizeImage(`data:image/avif;base64,${avif.toString('base64')}`, directory);
        const metadata = await sharp(normalizedPath).metadata();
        expect(metadata.format).toBe('png');
        expect(metadata.width).toBe(1920);
        expect(metadata.height).toBe(1080);
        await rm(directory, { recursive: true, force: true });
    });
});
