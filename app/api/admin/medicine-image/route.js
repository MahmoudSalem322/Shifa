import { handle, HttpError, isAdmin, requireUser } from '@/lib/server/auth';
import { MAX_IMAGE_BYTES, saveImage, sniffImage } from '@/lib/server/medicine-images';

/* POST /api/admin/medicine-image (multipart: file) → { imageUrl }.
   The admin uploads a medicine picture; the medicine form then saves the
   returned address with the medicine. */
export const POST = handle(async (request) => {
  const user = await requireUser(request);
  if (!isAdmin(user)) throw new HttpError(403, 'رفع الصور متاح للإدارة فقط.');

  const declared = Number(request.headers.get('content-length'));
  if (declared && declared > MAX_IMAGE_BYTES + 64 * 1024) throw new HttpError(413, 'حجم الصورة أكبر من 3 ميغابايت.');

  let form;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError(400, 'أرسل الصورة كملف.');
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') throw new HttpError(400, 'أرسل الصورة كملف.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'حجم الصورة أكبر من 3 ميغابايت.');
  const ext = sniffImage(bytes);
  if (!ext) throw new HttpError(415, 'الملف ليس صورة. الأنواع المسموحة: JPG أو PNG أو WEBP أو GIF.');

  return Response.json({ imageUrl: await saveImage(bytes, ext), message: 'تم رفع الصورة.' }, { status: 201 });
});
