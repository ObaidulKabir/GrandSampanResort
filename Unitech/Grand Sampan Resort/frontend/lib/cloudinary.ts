import { createHash } from 'crypto';
import { unlink } from 'fs/promises';
import { join } from 'path';

const CLOUDINARY_HOSTNAME = 'res.cloudinary.com';
const CLOUDINARY_BASE_FOLDER = 'grand-sampan';

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function signParams(params: Record<string, string | number>, apiSecret: string) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== '' && value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return createHash('sha1')
    .update(`${payload}${apiSecret}`)
    .digest('hex');
}

function normalizeUrlPath(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname);
  } catch {
    return url;
  }
}

export function isCloudinaryConfigured() {
  return cloudinaryConfig() !== null;
}

export function isCloudinaryUrl(url: string, folder: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== CLOUDINARY_HOSTNAME) return false;
    const path = decodeURIComponent(parsed.pathname);
    return path.includes(`/image/upload/`) && path.includes(`/${CLOUDINARY_BASE_FOLDER}/${folder}/`);
  } catch {
    return false;
  }
}

export function extractFilename(url: string) {
  const path = normalizeUrlPath(url);
  const name = path.split('/').pop() || '';
  const cleanName = name.split('?')[0].split('#')[0];
  if (!cleanName || cleanName.includes('..') || cleanName.includes('/') || !/\.(png|jpe?g|svg|webp)$/i.test(cleanName)) return '';
  return cleanName;
}

export async function uploadImageToCloudinary(file: File, folder: string) {
  const config = cloudinaryConfig();
  if (!config) throw new Error('Cloudinary is not configured');

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const dataUri = `data:${file.type};base64,${base64}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const cloudinaryFolder = `${CLOUDINARY_BASE_FOLDER}/${folder}`;
  const signature = signParams({ folder: cloudinaryFolder, timestamp }, config.apiSecret);

  const formData = new FormData();
  formData.append('file', dataUri);
  formData.append('api_key', config.apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', cloudinaryFolder);
  formData.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.secure_url) {
    throw new Error(json?.error?.message || 'Cloudinary upload failed');
  }

  return {
    url: json.secure_url as string,
    publicId: typeof json.public_id === 'string' ? json.public_id : null
  };
}

export function getCloudinaryPublicId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== CLOUDINARY_HOSTNAME) return null;

    const rawPath = decodeURIComponent(parsed.pathname);
    const uploadIndex = rawPath.indexOf('/image/upload/');
    if (uploadIndex === -1) return null;

    let remainder = rawPath.slice(uploadIndex + '/image/upload/'.length);
    const parts = remainder.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    if (/^v\d+$/.test(parts[0])) parts.shift();
    if (parts.length === 0) return null;

    const last = parts[parts.length - 1];
    parts[parts.length - 1] = last.replace(/\.[^.]+$/, '');
    return parts.join('/');
  } catch {
    return null;
  }
}

export async function deleteManagedAsset(url: string, folder: string) {
  if (isCloudinaryUrl(url, folder)) {
    const config = cloudinaryConfig();
    const publicId = getCloudinaryPublicId(url);
    if (!config || !publicId) return;

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signParams({ public_id: publicId, timestamp }, config.apiSecret);
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', config.apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);

    await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
      method: 'POST',
      body: formData
    }).catch(() => null);
    return;
  }

  const name = extractFilename(url);
  if (!name || !url.startsWith(`/uploads/${folder}/`)) return;
  await unlink(join(process.cwd(), 'public', 'uploads', folder, name)).catch(() => null);
}
