/** Normalize phone/camera files so KYC uploads succeed across browsers. */

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif'
};

const DIRECT_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
]);

function fileExt(name: string) {
  return (name.match(/\.([^.]+)$/)?.[1] || '').toLowerCase();
}

function withMime(file: File, mime: string) {
  if (file.type === mime) return file;
  return new File([file], file.name, { type: mime, lastModified: file.lastModified });
}

async function reencodeAsJpeg(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxEdge = 2000;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas_unsupported');
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) throw new Error('encode_failed');
    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

/**
 * Prepare an image for multipart upload.
 * - Fills missing MIME from extension
 * - Re-encodes HEIC/unknown types to JPEG when the browser can decode them
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('file_too_large');
  }

  const ext = fileExt(file.name);
  const mimeFromExt = EXT_MIME[ext];
  let normalized = file;

  if ((!file.type || file.type === 'application/octet-stream') && mimeFromExt) {
    normalized = withMime(file, mimeFromExt);
  } else if (file.type === 'image/jpg') {
    normalized = withMime(file, 'image/jpeg');
  }

  if (DIRECT_UPLOAD_TYPES.has(normalized.type)) {
    return normalized.type === 'image/jpg' ? withMime(normalized, 'image/jpeg') : normalized;
  }

  // HEIC / odd camera types: convert when the browser can decode the image.
  try {
    return await reencodeAsJpeg(normalized);
  } catch {
    if (normalized.type === 'image/heic' || normalized.type === 'image/heif' || ext === 'heic' || ext === 'heif') {
      throw new Error('heic_unsupported');
    }
    throw new Error('unsupported_type');
  }
}

export function uploadImageErrorMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : String(err || '');
  if (code === 'file_too_large') return 'Photo is too large. Use a file under 20MB.';
  if (code === 'heic_unsupported') {
    return 'This iPhone photo format (HEIC) is not supported here. Open it in Photos, export as JPG, then upload.';
  }
  if (code === 'unsupported_type') {
    return 'Unsupported image type. Use JPG, PNG, WEBP, or GIF.';
  }
  return 'Photo upload failed. Try a JPG or PNG under 20MB.';
}
