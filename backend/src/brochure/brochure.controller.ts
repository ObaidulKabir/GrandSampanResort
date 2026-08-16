import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { BrochureService } from './brochure.service';

@Controller()
export class BrochureController {
  constructor(private readonly brochure: BrochureService) {}

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
