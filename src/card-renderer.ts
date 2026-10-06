import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { countdownText, formatCountdown } from './time.js';

const WIDTH = 2400;
const HEIGHT = 1500;
const IMAGE_TOP = 1030;
const IMAGE_HEIGHT = 1400;

function escapeXml(value: string): string {
	return value.replace(
		/[<>&'\"]/g,
		(character) =>
			({
				'<': '&lt;',
				'>': '&gt;',
				'&': '&amp;',
				"'": '&apos;',
				'"': '&quot;',
			})[character]!,
	);
}

function truncateTitle(title: string): string {
	return title.length > 48 ? `${title.slice(0, 45)}...` : title;
}

export async function renderCountdownCard(
	imagePath: string,
	title: string,
	remainingMs: number,
): Promise<Buffer> {
	const parts = formatCountdown(remainingMs);
	const sourceImage = await readFile(imagePath);
	const fittedImage = await sharp(sourceImage)
		.rotate()
		.resize({
			width: WIDTH - 120,
			height: IMAGE_HEIGHT,
			fit: 'contain',
			background: '#101827',
		})
		.png()
		.toBuffer();

	const svg = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#101827" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#background)" />
      <text x="800" y="82" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="34" font-weight="600" letter-spacing="4">${escapeXml(truncateTitle(title))}</text>
      <text x="800" y="260" text-anchor="middle" fill="#f8fafc" font-family="Arial, sans-serif" font-size="212" font-weight="800">${escapeXml(countdownText(parts))}</text>
      <line x1="60" y1="350" x2="1540" y2="350" stroke="#334155" stroke-width="3" />
      <text x="800" y="298" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="43">FOREVER HYPE!!!!</text>
    </svg>
  `);

	return sharp({
		create: {
			width: WIDTH,
			height: HEIGHT,
			channels: 4,
			background: '#101827',
		},
	})
		.composite([
			{ input: svg, top: 0, left: 0 },
			{ input: fittedImage, top: IMAGE_TOP, left: 60 },
		])
		.png()
		.toBuffer();
}
