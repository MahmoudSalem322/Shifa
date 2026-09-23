import { handle, HttpError, requireUser } from '@/lib/server/auth';
import { extractPrescription } from '@/lib/server/prescription-ai';
import { COLLECTION, publicPrescription } from '@/lib/server/prescriptions';
import { store } from '@/lib/server/store';
import { MAX_IMAGE_BYTES, MAX_PDF_BYTES, sniffType } from '@/lib/files';

/* Reading a handwritten prescription can take a while. */
export const maxDuration = 120;

/* POST /api/prescriptions/read (multipart: file)
   Module 7 · Feature 1: validate the image, send it to the AI reader,
   return the extracted medicines and keep them as a draft for review. */
export const POST = handle(async (request) => {
  const user = await requireUser(request);

  let form;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError(400, 'أرسل صورة الوصفة كملف.');
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') throw new HttpError(400, 'أرسل صورة الوصفة كملف.');

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = sniffType(bytes);
  if (!mediaType) throw new HttpError(415, 'الملف ليس صورة أو PDF صالحاً. الأنواع المسموحة: JPG أو PNG أو WEBP أو PDF.');
  const limit = mediaType === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (bytes.length > limit) throw new HttpError(413, 'حجم الملف أكبر من الحد المسموح.');

  const result = await extractPrescription({ bytes, mediaType });

  const record = await store.update(COLLECTION, (items) => {
    const entry = {
      id: store.newId('rx'),
      userId: user.id,
      status: 'extracted',
      fileName: String(file.name || 'prescription').slice(0, 120),
      mediaType,
      fileSize: bytes.length,
      extracted: result,
      medications: result.medications,
      drugRequestIds: [],
      createdAt: new Date().toISOString()
    };
    return { items: [...items, entry], result: entry };
  });

  return Response.json({ prescription: publicPrescription(record) }, { status: 201 });
});
