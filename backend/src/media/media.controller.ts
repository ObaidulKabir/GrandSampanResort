import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MediaService } from './media.service';
import { mediaMulterOptions, UPLOADS_ROOT } from './media.multer';
import { MoveMediaDto, UploadMediaDto, UpdateMediaDto } from './dto/media.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Get()
  async list(@Query('category') category?: string, @Query('suiteId') suiteId?: string) {
    const media = await this.service.list({ category, suiteId });
    return { ok: true, media };
  }

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file', mediaMulterOptions))
  async upload(@UploadedFile() file: Express.Multer.File, @Body(new ValidationPipe({ whitelist: true })) body: UploadMediaDto) {
    if (!file) return { ok: false, error: 'no_file' };
    const created = await this.service.create({
      category: body.category,
      label: body.label,
      alt: body.alt,
      suiteId: body.suiteId,
      url: `/uploads/media/${file.filename}`
    });
    return { ok: true, media: created };
  }

  /** Investor/admin photo upload for per-booking KYC (returns URL only). */
  @Post('kyc-upload')
  @UseGuards(RolesGuard)
  @Roles('investor', 'admin')
  @UseInterceptors(FileInterceptor('file', mediaMulterOptions))
  async kycUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file) return { ok: false, error: 'no_file' };
    return { ok: true, url: `/uploads/media/${file.filename}` };
  }

  /** Investor/admin proof image for offline deposit payment. */
  @Post('payment-proof')
  @UseGuards(RolesGuard)
  @Roles('investor', 'admin')
  @UseInterceptors(FileInterceptor('file', mediaMulterOptions))
  async paymentProofUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file) return { ok: false, error: 'no_file' };
    return { ok: true, url: `/uploads/media/${file.filename}` };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body(new ValidationPipe({ whitelist: true })) body: UpdateMediaDto) {
    const media = await this.service.update(id, {
      label: body.label !== undefined ? String(body.label).trim() || null : undefined,
      alt: body.alt !== undefined ? String(body.alt).trim() || null : undefined
    });
    if (!media) return { ok: false, error: 'not_found' };
    return { ok: true, media };
  }

  @Patch(':id/move')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async move(@Param('id') id: string, @Body(new ValidationPipe({ whitelist: true })) body: MoveMediaDto) {
    const media = await this.service.move(id, body.direction);
    if (!media) return { ok: false, error: 'not_found' };
    return { ok: true, media };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    const item = await this.service.remove(id);
    if (!item) return { ok: false, error: 'not_found' };
    if (item.url?.startsWith('/uploads/')) {
      try {
        await unlink(join(UPLOADS_ROOT, item.url.replace(/^\/uploads\//, '')));
      } catch {
        // best-effort: file may already be gone
      }
    }
    return { ok: true };
  }
}
