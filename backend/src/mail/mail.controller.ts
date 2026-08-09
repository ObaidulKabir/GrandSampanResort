import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mail: MailService) {}

  /** Admin-only SMTP smoke test (does not affect bookings). */
  @Post('test')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async test(@Body() body: { to?: string }) {
    return this.mail.sendTestEmail(body?.to);
  }
}
