import { Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { BrochureService } from './brochure.service';

@Controller()
export class BrochureController {
  constructor(private readonly brochure: BrochureService) {}

  @Post('brochure/jobs')
  start(@Query('locale') locale: string) {
    const job = this.brochure.startJob(locale);
    return { ok: true, job };
  }

  @Get('brochure/jobs/:id')
  status(@Param('id') id: string) {
    const job = this.brochure.getJob(id);
    if (!job) return { ok: false, error: 'not_found' };
    return { ok: true, job };
  }

  @Get('brochure/jobs/:id/file')
  file(@Param('id') id: string, @Res() res: Response) {
    const file = this.brochure.getJobFile(id);
    if (!file) {
      const job = this.brochure.getJob(id);
      res.status(job?.status === 'error' ? 500 : 404).json({ ok: false, error: job ? 'not_ready' : 'not_found' });
      return;
    }
    const filename = `Grand-Sampan-Brochure-${file.locale}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, max-age=120');
    res.send(file.buf);
  }

  @Get('brochure.pdf')
  async pdf(@Query('locale') locale: string, @Res() res: Response) {
    const { buf, locale: loc } = await this.brochure.pdf(locale);
    const filename = `Grand-Sampan-Brochure-${loc}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buf);
  }
}
