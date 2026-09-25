import { promises as fs } from 'fs';
import path from 'path';
import { IMAGE_DIR, typeOfFile } from '@/lib/server/medicine-images';

/* GET /api/medicine-images/{file} — an uploaded medicine picture. Public,
   like the rest of the medicine catalogue's images. */
export async function GET(request, { params }) {
  const { file } = await params;
  const type = /^[a-f0-9]{24}\.(png|jpg|webp|gif)$/.test(file) ? typeOfFile(file) : null;
  if (!type) return new Response('Not found', { status: 404 });
  try {
    const bytes = await fs.readFile(path.join(IMAGE_DIR, file));
    return new Response(bytes, {
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' }
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
