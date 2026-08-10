import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { buildDepositInvoicePdf, InvoiceData } from './invoice.pdf';

export type BookingMailContext = {
  to: string;
  buyerName: string;
  bookingId: string;
  planName: string;
  planId: string;
  suiteId: string;
  totalPrice: number;
  depositAmount: number;
  depositMethod: string;
  depositReference: string;
  buyerContact?: string;
  buyerNid?: string;
  buyerAddress?: string;
  cancellationReason?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private siteUrl() {
    return (process.env.PUBLIC_SITE_URL || 'https://www.grandsampanresort.com').replace(/\/+$/, '');
  }

  private fromAddress() {
    return (
      process.env.MAIL_FROM ||
      process.env.SMTP_USER ||
      'Grand Sampan Resort <admin@grandsampanresort.com>'
    );
  }

  private enabled() {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  private getTransporter(): Transporter | null {
    if (!this.enabled()) return null;
    if (this.transporter) return this.transporter;
    const port = Number(process.env.SMTP_PORT || 465);
    // Port 465 = implicit TLS (secure true). Port 587 = STARTTLS (secure false).
    // Ignore SMTP_SECURE=true on 587 — that combo commonly fails with Zoho.
    const secure = port === 465;
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      requireTLS: port === 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    this.logger.log(`SMTP transport ready (${process.env.SMTP_HOST}:${port}, secure=${secure})`);
    return this.transporter;
  }

  private async send(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
    attachments?: { filename: string; content: Buffer; contentType?: string }[];
  }) {
    const transport = this.getTransporter();
    if (!transport) {
      this.logger.warn(`SMTP not configured; skipped email "${opts.subject}" to ${opts.to}`);
      return { ok: false as const, skipped: true as const };
    }
    if (!opts.to?.includes('@')) {
      this.logger.warn(`Invalid recipient; skipped email "${opts.subject}"`);
      return { ok: false as const, skipped: true as const };
    }
    try {
      await transport.sendMail({
        from: this.fromAddress(),
        to: opts.to,
        bcc: process.env.MAIL_BCC || undefined,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        attachments: opts.attachments,
      });
      this.logger.log(`Sent "${opts.subject}" to ${opts.to}`);
      return { ok: true as const };
    } catch (err: any) {
      this.logger.error(`Failed to send "${opts.subject}" to ${opts.to}: ${err?.message || err}`);
      return { ok: false as const, error: String(err?.message || err) };
    }
  }

  private wrapHtml(title: string, body: string) {
    return `<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;color:#0b2a3a;line-height:1.5;max-width:640px;margin:0 auto;padding:24px;">
  <p style="letter-spacing:.08em;text-transform:uppercase;font-size:12px;color:#b08d57;margin:0 0 8px;">Grand Sampan Resort</p>
  <h1 style="font-size:24px;margin:0 0 16px;">${title}</h1>
  ${body}
  <p style="margin-top:28px;font-size:13px;color:#567;">
    Questions? Reply to this email or write <a href="mailto:admin@grandsampanresort.com">admin@grandsampanresort.com</a>.
  </p>
</body></html>`;
  }

  /** Admin smoke test — verifies Zoho SMTP from the running backend. */
  async sendTestEmail(to?: string) {
    const recipient = (to || process.env.MAIL_BCC || process.env.SMTP_USER || '').trim();
    if (!recipient) {
      return { ok: false as const, error: 'no_recipient' };
    }
    const subject = `Grand Sampan SMTP test ${new Date().toISOString()}`;
    const text =
      'This is a test message from the Grand Sampan Resort backend. Transactional booking notifications are configured.';
    const html = this.wrapHtml(
      'SMTP test',
      '<p>This is a test message from the Grand Sampan Resort backend.</p><p>Transactional booking notifications are configured.</p>'
    );
    const result = await this.send({ to: recipient, subject, html, text });
    if (result.ok) return { ok: true as const, to: recipient };
    if ('skipped' in result && result.skipped) {
      return { ok: false as const, error: 'smtp_not_configured' };
    }
    return { ok: false as const, error: 'send_failed', detail: (result as any).error };
  }

  async sendEmailVerification(opts: { to: string; name: string; verifyUrl: string }) {
    const subject = 'Verify your Grand Sampan Resort account email';
    const text = [
      `Dear ${opts.name},`,
      ``,
      `Please verify your email to complete investment bookings:`,
      opts.verifyUrl,
      ``,
      `This link expires in 48 hours. You can still sign in before verifying.`,
    ].join('\n');
    const html = this.wrapHtml(
      'Verify your email',
      `<p>Dear ${escapeHtml(opts.name)},</p>
       <p>Please verify your account email so you can submit investment bookings.</p>
       <p><a href="${escapeHtml(opts.verifyUrl)}" style="display:inline-block;background:#0b2a3a;color:#fff;padding:10px 16px;text-decoration:none;">Verify email</a></p>
       <p style="font-size:13px;color:#567;">Or open this link:<br/>${escapeHtml(opts.verifyUrl)}</p>
       <p style="font-size:13px;color:#567;">This link expires in 48 hours. You can still sign in before verifying.</p>`
    );
    return this.send({ to: opts.to, subject, html, text });
  }

  async sendPasswordReset(opts: { to: string; name: string; resetUrl: string }) {
    const subject = 'Reset your Grand Sampan Resort password';
    const text = [
      `Dear ${opts.name},`,
      ``,
      `We received a request to reset your password. Open this link to choose a new one:`,
      opts.resetUrl,
      ``,
      `This link expires in 1 hour. If you did not request a reset, you can ignore this email.`,
    ].join('\n');
    const html = this.wrapHtml(
      'Reset your password',
      `<p>Dear ${escapeHtml(opts.name)},</p>
       <p>We received a request to reset your password. Click below to choose a new one.</p>
       <p><a href="${escapeHtml(opts.resetUrl)}" style="display:inline-block;background:#0b2a3a;color:#fff;padding:10px 16px;text-decoration:none;">Reset password</a></p>
       <p style="font-size:13px;color:#567;">Or open this link:<br/>${escapeHtml(opts.resetUrl)}</p>
       <p style="font-size:13px;color:#567;">This link expires in 1 hour. If you did not request a reset, ignore this email.</p>`
    );
    return this.send({ to: opts.to, subject, html, text });
  }

  async notifyBookingSubmitted(ctx: BookingMailContext) {
    const portal = `${this.siteUrl()}/investor`;
    const subject = `Booking submitted — ${ctx.bookingId} (plan reserved)`;
    const text = [
      `Dear ${ctx.buyerName},`,
      ``,
      `Your investment booking ${ctx.bookingId} for ${ctx.planName} (${ctx.planId}) on unit ${ctx.suiteId} has been submitted.`,
      `The plan is reserved while we confirm your deposit and verify KYC.`,
      ``,
      `Deposit: ${ctx.depositAmount} BDT via ${ctx.depositMethod} (ref ${ctx.depositReference}).`,
      `Portal: ${portal}`,
    ].join('\n');
    const html = this.wrapHtml(
      'Booking submitted',
      `<p>Dear ${escapeHtml(ctx.buyerName)},</p>
       <p>Your investment booking <strong>${escapeHtml(ctx.bookingId)}</strong> for
       <strong>${escapeHtml(ctx.planName)}</strong> (${escapeHtml(ctx.planId)}) on unit
       <strong>${escapeHtml(ctx.suiteId)}</strong> has been submitted.</p>
       <p>The plan is <strong>reserved</strong>. Booking completes after we confirm deposit receipt
       (or bank encashment) and verify your KYC details.</p>
       <ul>
         <li>Deposit due: <strong>${formatMoney(ctx.depositAmount)}</strong></li>
         <li>Method: ${escapeHtml(methodLabel(ctx.depositMethod))}</li>
         <li>Reference: ${escapeHtml(ctx.depositReference)}</li>
       </ul>
       <p><a href="${portal}">Open owner portal</a></p>`
    );
    return this.send({ to: ctx.to, subject, html, text });
  }

  async notifyDepositConfirmed(ctx: BookingMailContext) {
    const subject = `Deposit received — ${ctx.bookingId}`;
    const text = `Dear ${ctx.buyerName},\n\nWe confirmed receipt of your deposit for booking ${ctx.bookingId}. KYC verification may still be pending before the booking is fully completed.`;
    const html = this.wrapHtml(
      'Deposit confirmed',
      `<p>Dear ${escapeHtml(ctx.buyerName)},</p>
       <p>We confirmed receipt / encashment of your deposit for booking
       <strong>${escapeHtml(ctx.bookingId)}</strong> (${formatMoney(ctx.depositAmount)}).</p>
       <p>If KYC is still under review, we will notify you when the booking is fully completed.</p>`
    );
    return this.send({ to: ctx.to, subject, html, text });
  }

  async notifyKycVerified(ctx: BookingMailContext) {
    const subject = `KYC verified — ${ctx.bookingId}`;
    const text = `Dear ${ctx.buyerName},\n\nYour KYC for booking ${ctx.bookingId} has been verified. Deposit confirmation may still be pending before the booking is fully completed.`;
    const html = this.wrapHtml(
      'KYC verified',
      `<p>Dear ${escapeHtml(ctx.buyerName)},</p>
       <p>Your KYC details for booking <strong>${escapeHtml(ctx.bookingId)}</strong> have been verified as valid.</p>
       <p>If deposit confirmation is still pending, we will notify you when the booking is fully completed.</p>`
    );
    return this.send({ to: ctx.to, subject, html, text });
  }

  async notifyBookingCompleted(ctx: BookingMailContext) {
    const invoice: InvoiceData = {
      invoiceNo: `INV-${ctx.bookingId}-DEP`,
      issuedAt: new Date(),
      bookingId: ctx.bookingId,
      buyerName: ctx.buyerName,
      buyerEmail: ctx.to,
      buyerContact: ctx.buyerContact || '',
      buyerNid: ctx.buyerNid || '',
      buyerAddress: ctx.buyerAddress || '',
      planName: ctx.planName,
      planId: ctx.planId,
      suiteId: ctx.suiteId,
      totalPrice: ctx.totalPrice,
      depositAmount: ctx.depositAmount,
      depositMethod: ctx.depositMethod,
      depositReference: ctx.depositReference,
    };
    let pdf: Buffer | null = null;
    try {
      pdf = await buildDepositInvoicePdf(invoice);
    } catch (err: any) {
      this.logger.error(`Invoice PDF failed for ${ctx.bookingId}: ${err?.message || err}`);
    }

    const portal = `${this.siteUrl()}/investor`;
    const subject = `Booking completed — ${ctx.bookingId} (invoice attached)`;
    const text = [
      `Dear ${ctx.buyerName},`,
      ``,
      `Your booking ${ctx.bookingId} for ${ctx.planName} on unit ${ctx.suiteId} is now complete.`,
      `Deposit ${ctx.depositAmount} BDT has been confirmed and KYC verified.`,
      `Please find your deposit invoice attached.`,
      `Portal: ${portal}`,
    ].join('\n');
    const html = this.wrapHtml(
      'Booking completed',
      `<p>Dear ${escapeHtml(ctx.buyerName)},</p>
       <p>Congratulations — booking <strong>${escapeHtml(ctx.bookingId)}</strong> for
       <strong>${escapeHtml(ctx.planName)}</strong> on unit <strong>${escapeHtml(ctx.suiteId)}</strong>
       is now <strong>complete</strong>.</p>
       <p>Deposit of <strong>${formatMoney(ctx.depositAmount)}</strong> is confirmed and KYC is verified.
       Your deposit invoice is attached as a PDF.</p>
       <p><a href="${portal}">Open owner portal</a></p>`
    );
    return this.send({
      to: ctx.to,
      subject,
      html,
      text,
      attachments: pdf
        ? [
            {
              filename: `${invoice.invoiceNo}.pdf`,
              content: pdf,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
    });
  }

  async notifyBookingRejected(ctx: BookingMailContext) {
    const reason = (ctx.cancellationReason || '').trim();
    const subject = `Booking cancelled — ${ctx.bookingId}`;
    const text = [
      `Dear ${ctx.buyerName},`,
      ``,
      `Booking ${ctx.bookingId} for ${ctx.planName} has been cancelled and the share plan is available again.`,
      reason ? `Reason: ${reason}` : '',
      ``,
      `Contact admin@grandsampanresort.com if you have questions.`,
    ]
      .filter(Boolean)
      .join('\n');
    const html = this.wrapHtml(
      'Booking cancelled',
      `<p>Dear ${escapeHtml(ctx.buyerName)},</p>
       <p>Booking <strong>${escapeHtml(ctx.bookingId)}</strong> for
       <strong>${escapeHtml(ctx.planName)}</strong> has been cancelled. The share plan is available again.</p>
       ${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ''}
       <p>If you believe this is an error, please contact us.</p>`
    );
    return this.send({ to: ctx.to, subject, html, text });
  }
}

function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(amount: number) {
  return `BDT ${Math.round(Number(amount) || 0).toLocaleString('en-BD')}`;
}

function methodLabel(method: string) {
  const map: Record<string, string> = {
    cheque: 'Cheque',
    cash_payorder: 'Cash / pay order',
    online_transfer: 'Online bank transfer',
  };
  return map[method] || method || '—';
}
