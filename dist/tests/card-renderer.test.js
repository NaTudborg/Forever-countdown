import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderCountdownCard } from '../src/card-renderer.js';
describe('renderCountdownCard', () => {
    it('renders a large countdown card with the uploaded image below it', async () => {
        const directory = await mkdtemp(join(tmpdir(), 'discord-countdown-'));
        const imagePath = join(directory, 'source.png');
        const source = await sharp({
            create: { width: 300, height: 180, channels: 3, background: '#e879f9' },
        }).png().toBuffer();
        await writeFile(imagePath, source);
        const card = await renderCountdownCard(imagePath, 'Launch day', 2 * 86_400_000 + 3_661_000);
        const metadata = await sharp(card).metadata();
        expect(metadata.width).toBe(2400);
        expect(metadata.height).toBe(1500);
        expect((await readFile(imagePath)).byteLength).toBeGreaterThan(0);
        await rm(directory, { recursive: true, force: true });
    });
});
