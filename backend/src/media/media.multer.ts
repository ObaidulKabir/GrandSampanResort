import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { diskStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const MEDIA_UPLOAD_DIR = join(UPLOADS_ROOT, 'media');

function ensureUploadDir() {
  if (!existsSync(MEDIA_UPLOAD_DIR)) mkdirSync(MEDIA_UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
  // Some mobile browsers send photos as generic binary.
  'application/octet-stream'
]);

const ALLOWED_EXT = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
  '.pdf'
]);

function fileExt(originalname: string) {
  return (originalname.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
}

export const mediaMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadDir();
      cb(null, MEDIA_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = fileExt(file.originalname) || '.bin';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, name);
    }
  }),
  fileFilter: (_req: any, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
    const ext = fileExt(file.originalname);
    const mime = String(file.mimetype || '').toLowerCase();
    const mimeOk = !mime || ALLOWED_MIME.has(mime);
    const extOk = ALLOWED_EXT.has(ext);
    if (extOk && mimeOk) {
      cb(null, true);
      return;
    }
    // Trust known image extensions even when MIME is missing/wrong.
    if (extOk) {
      cb(null, true);
      return;
    }
    cb(new BadRequestException('Only JPG, PNG, WEBP, GIF, HEIC, or PDF files are allowed'), false);
  },
  // Layout PDFs can be larger than photo uploads.
  limits: { fileSize: 20 * 1024 * 1024 }
};
