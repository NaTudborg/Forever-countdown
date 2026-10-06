import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
const DISPLAY_WIDTH = 1920;
const DISPLAY_HEIGHT = 1080;
// Sharp reports AVIF input as the HEIF container format with AV1 compression.
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'heif', 'avif', 'tiff']);
export async function downloadAndNormalizeImage(url, directory) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Could not download the image (HTTP ${response.status}).`);
    }
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_DOWNLOAD_BYTES) {
        throw new Error('The image must be 10 MB or smaller.');
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_DOWNLOAD_BYTES) {
        throw new Error('The image must be 10 MB or smaller.');
    }
    const metadata = await sharp(bytes).metadata();
    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
        throw new Error('Upload a PNG, JPEG, WebP, GIF, AVIF/HEIF, or TIFF image.');
    }
    await mkdir(directory, { recursive: true });
    const destination = join(directory, `${randomUUID()}.png`);
    await sharp(bytes)
        .rotate()
        .resize({ width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT, fit: 'inside', withoutEnlargement: false })
        .png()
        .toFile(destination);
    return destination;
}
export async function removeStoredImage(path) {
    try {
        await unlink(path);
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
    }
}
