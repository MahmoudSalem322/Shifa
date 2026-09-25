import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR, store } from './store';

/* Medicine pictures the admin uploads. Files go under
   <data>/uploads/medicine-images and are served by
   /api/medicine-images/{file}. The .NET medicine DTOs carry no image
   field, so for .NET medicines the picture is remembered here by id. */

export const IMAGE_DIR = path.join(DATA_DIR, 'uploads', 'medicine-images');
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const TYPES = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
export const typeOfFile = (name) => TYPES[String(name).split('.').pop()] || null;

/* Recognises the image by its first bytes, not by the name it came with. */
export function sniffImage(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp';
  return null;
}

export async function saveImage(bytes, ext) {
  await fs.mkdir(IMAGE_DIR, { recursive: true });
  const name = crypto.randomBytes(12).toString('hex') + '.' + ext;
  await fs.writeFile(path.join(IMAGE_DIR, name), bytes);
  return '/api/medicine-images/' + name;
}

/* Only site-relative paths: an image from any other origin is refused. */
export function cleanImageUrl(value) {
  const url = String(value || '').trim();
  return /^\/(mock\/medicines\/[\w.-]+\.(svg|png|jpe?g|webp)|mock\/medicine_\d+\.jpg|api\/medicine-images\/[a-f0-9]+\.(png|jpg|webp|gif))$/.test(url) ? url : '';
}

/* ---- id → image for medicines kept on the .NET API ---------------- */

const MAP = 'medicine-images';

export async function imageMap() {
  const rows = await store.read(MAP);
  return new Map(rows.map((row) => [String(row.id), row.imageUrl]));
}

export async function rememberImage(id, imageUrl) {
  await store.update(MAP, (rows) => ({
    items: [...rows.filter((row) => String(row.id) !== String(id)), ...(imageUrl ? [{ id: String(id), imageUrl }] : [])],
    result: null
  }));
}
