/* Upload rules shared by the prescription upload component (Module 5)
   and the prescription reader (Module 7), on both client and server. */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const PDF_TYPE = 'application/pdf';

export const ACCEPT_ATTR = IMAGE_TYPES.join(',') + ',' + PDF_TYPE;

export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/* Checks the declared type and size. Returns an Arabic message, or ''. */
export function checkFile(file, { allowPdf = true } = {}) {
  if (!file) return 'اختر ملفاً أولاً.';
  const isImage = IMAGE_TYPES.includes(file.type);
  const isPdf = file.type === PDF_TYPE;
  if (!isImage && !(allowPdf && isPdf)) {
    return allowPdf
      ? 'نوع الملف غير مدعوم. الأنواع المسموحة: JPG أو PNG أو WEBP أو PDF.'
      : 'نوع الملف غير مدعوم. الأنواع المسموحة: JPG أو PNG أو WEBP.';
  }
  if (file.size === 0) return 'الملف فارغ.';
  const limit = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) return 'حجم الملف ' + formatBytes(file.size) + ' أكبر من الحد المسموح (' + formatBytes(limit) + ').';
  return '';
}

/* Server side: the declared MIME type is the client's word, so the first
   bytes decide what the file really is. */
export function sniffType(bytes) {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return 'application/pdf';
  return '';
}
