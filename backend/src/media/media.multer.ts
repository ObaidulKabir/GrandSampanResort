import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { diskStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const MEDIA_UPLOAD_DIR = join(UPLOADS_ROOT, 'media');

function ensureUploadDir() {
  if (!existsSync(MEDIA_UPLOAD_DIR)) mkdirSync(MEDIA_UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];

export const mediaMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadDir();
      cb(null, MEDIA_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = (file.originalname.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, name);
    }
  }),
  fileFilter: (_req: any, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(new BadRequestException('Only JPG, PNG, WEBP, GIF, or PDF files are allowed'), false);
      return;
    }
    cb(null, true);
  },
  // Layout PDFs can be larger than photo uploads.
  limits: { fileSize: 20 * 1024 * 1024 }
};
