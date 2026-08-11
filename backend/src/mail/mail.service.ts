import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { buildDepositInvoicePdf, InvoiceData } from './invoice.pdf';
import { formatDateDdMmYyyy, formatDateTimeDdMmYyyy } from './date-format';
import {
  escapeHtml,
  emailCta,
  emailDetailTable,
  emailNotice,
  emailScheduleTable,
  renderBrandedEmail,
  type BadgeTone,
} from './email-template';

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
  /** Booking / schedule start (ISO or Date). Shown as dd/mm/yyyy in emails. */
  startDate?: string | Date | null;
  /** When the booking was placed. Shown as dd/mm/yyyy HH:mm in emails. */
  bookedAt?: string | Date | null;
  /** Payment schedule lines for email summaries. */
  schedule?: { type: string; dueDate: string | Date; amount: number }[];
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

  private wrapHtml(
    title: string,
    body: string,
    opts?: { badge?: string; badgeTone?: BadgeTone; preheader?: string; eyebrow?: string }
  ) {
    return renderBrandedEmail({
      title,
      bodyHtml: body,
      badge: opts?.badge,
      badgeTone: opts?.badgeTone,
      preheader: opts?.preheader,
      eyebrow: opts?.eyebrow,
    });
  }

  private bookingDetails(ctx: BookingMailContext, extra: { label: string; value: string }[] = []) {
    return emailDetailTable([
      { label: 'Booking ID', value: escapeHtml(ctx.bookingId) },
      { label: 'Plan', value: escapeHtml(`${ctx.planName}${ctx.planId ? ` (${ctx.planId})` : ''}`) },
      { label: 'Unit', value: escapeHtml(ctx.suiteId) },
      { label: 'Booked at', value: escapeHtml(formatDateTimeDdMmYyyy(ctx.bookedAt)) },
      { label: 'Contract start', value: escapeHtml(formatDateDdMmYyyy(ctx.startDate)) },
      { label: 'Total price', value: escapeHtml(formatMoney(ctx.totalPrice)) },
      { label: 'Deposit', value: escapeHtml(formatMoney(ctx.depositAmount)) },
      {
        label: 'Deposit method',
        value: ctx.depositMethod ? escapeHtml(methodLabel(ctx.depositMethod)) : '',
      },
      {
        label: 'Deposit reference',
        value: ctx.depositReference ? escapeHtml(ctx.depositReference) : '',
      },
      ...extra,
    ]);
  }

  private scheduleBlock(ctx: BookingMailContext) {
    const rows = (ctx.schedule || []).slice(0, 12).map((item) => ({
      type: String(item.type || 'payment'),
      due: formatDateDdMmYyyy(item.dueDate),
      amount: formatMoney(item.amount),
    }));
    return {
      html: emailScheduleTable(rows),
      text: rows.length
        ? ['Payment schedule:', ...rows.map((r) => `- ${r.type}: ${r.amount} due ${r.due}`)].join(
            '\n'
          )
        : '',
    };
  }

  private greeting(name: string) {
    return `<p style="margin:0 0 14px;font-size:16px;">Dear ${escapeHtml(name || 'Investor')},</p>`;
  }

  /** Admin smoke test — verifies Zoho SMTP from the running backend. */
  async sendTestEmail(to?: string) {
    const recipient = (to || process.env.MAIL_BCC || process.env.SMTP_USER || '').trim();
    if (!recipient) {
      return { ok: false as const, error: 'no_recipient' };
    }
    const subject = `Grand Sampan SMTP test ${formatDateDdMmYyyy(new Date())}`;
    const text =
      'This is a test message from the Grand Sampan Resort backend. Transactional booking notifications are configured.';
    const html = this.wrapHtml(
      'SMTP test',
      `${this.greeting('Admin')}
       <p style="margin:0 0 12px;">This is a test message from the Grand Sampan Resort backend.</p>
       <p style="margin:0;">Transactional booking notifications are configured.</p>`,
      { badge: 'System', badgeTone: 'info', preheader: 'SMTP configuration test' }
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
      `${this.greeting(opts.name)}
       <p style="margin:0 0 12px;">Please verify your account email so you can submit investment bookings.</p>
       ${emailCta(opts.verifyUrl, 'Verify email')}
       <p style="margin:16px 0 0;font-size:13px;color:#5a6b75;">Or open this link:<br/>${escapeHtml(opts.verifyUrl)}</p>
       <p style="margin:12px 0 0;font-size:13px;color:#5a6b75;">This link expires in 48 hours. You can still sign in before verifying.</p>`,
      { badge: 'Account', badgeTone: 'info', preheader: 'Verify your Grand Sampan account email' }
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
      `${this.greeting(opts.name)}
       <p style="margin:0 0 12px;">We received a request to reset your password. Click below to choose a new one.</p>
       ${emailCta(opts.resetUrl, 'Reset password')}
       <p style="margin:16px 0 0;font-size:13px;color:#5a6b75;">Or open this link:<br/>${escapeHtml(opts.resetUrl)}</p>
       <p style="margin:12px 0 0;font-size:13px;color:#5a6b75;">This link expires in 1 hour. If you did not request a reset, ignore this email.</p>`,
      { badge: 'Security', badgeTone: 'warn', preheader: 'Password reset for your Grand Sampan account' }
    );
    return this.send({ to: opts.to, subject, html, text });
  }

  async notifyBookingSubmitted(ctx: BookingMailContext) {
    const portal = `${this.siteUrl()}/investor`;
    const schedule = this.scheduleBlock(ctx);
    const subject = `Booking submitted — ${ctx.bookingId} (plan reserved)`;
    const text = [
      `Dear ${ctx.buyerName},`,
      ``,
      `Your investment booking ${ctx.bookingId} for ${ctx.planName} (${ctx.planId}) on unit ${ctx.suiteId} has been submitted.`,
      `Booked at: ${formatDateTimeDdMmYyyy(ctx.bookedAt)}`,
      `Contract start: ${formatDateDdMmYyyy(ctx.startDate)}`,
      `Total: ${formatMoney(ctx.totalPrice)}`,
      `Deposit: ${formatMoney(ctx.depositAmount)} via ${methodLabel(ctx.depositMethod)} (ref ${ctx.depositReference}).`,
      `The plan is reserved while we confirm your deposit and verify KYC.`,
      ...(schedule.text ? ['', schedule.text] : []),
      ``,
      `Portal: ${portal}`,
    ].join('\n');
    const html = this.wrapHtml(
      'Booking submitted',
      `${this.greeting(ctx.buyerName)}
       <p style="margin:0 0 12px;">Thank you. Your investment booking has been received and the share plan is now <strong>reserved</strong>.</p>
       ${emailNotice(
         'Booking completes after we confirm deposit receipt (or bank encashment) and verify your KYC details.',
         'warn'
       )}
       ${this.bookingDetails(ctx)}
       ${schedule.html}
       ${emailCta(portal, 'Open owner portal')}`,
      {
        badge: 'Reserved',
        badgeTone: 'warn',
        eyebrow: 'Investment booking',
        preheader: `Booking ${ctx.bookingId} submitted — plan reserved`,
      }
    );
    return this.send({ to: ctx.to, subject, html, text });
  }

  async notifyDepositConfirmed(ctx: BookingMailContext) {
    const portal = `${this.siteUrl()}/investor`;
    const subject = `Deposit received — ${ctx.bookingId}`;
    const text = [
      `Dear ${ctx.buyerName},`,
      ``,
      `We confirmed receipt of your deposit for booking ${ctx.bookingId}.`,
      `Deposit: ${formatMoney(ctx.depositAmount)} via ${methodLabel(ctx.depositMethod)} (ref ${ctx.depositReference}).`,
      `Booked at: ${formatDateTimeDdMmYyyy(ctx.bookedAt)}`,
      `Contract start: ${formatDateDdMmYyyy(ctx.startDate)}`,
      `KYC verification may still be pending before the booking is fully completed.`,
      ``,
      `Portal: ${portal}`,
    ].join('\n');
    const html = this.wrapHtml(
      'Deposit confirmed',
      `${this.greeting(ctx.buyerName)}
       <p style="margin:0 0 12px;">We confirmed receipt / encashment of your deposit for this booking.</p>
       ${emailNotice(
         'If KYC is still under review, we will notify you when the booking is fully completed.',
         'info'
       )}
       ${this.bookingDetails(ctx)}
       ${emailCta(portal, 'Open owner portal')}`,
      {
        badge: 'Deposit received',
        badgeTone: 'success',
        eyebrow: 'Investment booking',
        preheader: `Deposit confirmed for booking ${ctx.bookingId}`,
      }
    );
    return this.send({ to: ctx.to, subject, html, text });
  }

  async notifyKycVerified(ctx: BookingMailContext) {
    const portal = `${this.siteUrl()}/investor`;
    const subject = `KYC verified — ${ctx.bookingId}`;
    const text = [
      `Dear ${ctx.buyerName},`,
      ``,
      `Your KYC for booking ${ctx.bookingId} has been verified.`,
      `Booked at: ${formatDateTimeDdMmYyyy(ctx.bookedAt)}`,
      `Contract start: ${formatDateDdMmYyyy(ctx.startDate)}`,
      `Deposit confirmation may still be pending before the booking is fully completed.`,
      ``,
      `Portal: ${portal}`,
    ].join('\n');
    const html = this.wrapHtml(
      'KYC verified',
      `${this.greeting(ctx.buyerName)}
       <p style="margin:0 0 12px;">Your KYC details for this booking have been verified as valid.</p>
       ${emailNotice(
         'If deposit confirmation is still pending, we will notify you when the booking is fully completed.',
         'info'
       )}
       ${this.bookingDetails(ctx)}
       ${emailCta(portal, 'Open owner portal')}`,
      {
        badge: 'KYC verified',
        badgeTone: 'success',
        eyebrow: 'Investment booking',
        preheader: `KYC verified for booking ${ctx.bookingId}`,
      }
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
    const schedule = this.scheduleBlock(ctx);
    const issuedLabel = formatDateDdMmYyyy(invoice.issuedAt);
    const subject = `Booking completed — ${ctx.bookingId} (invoice attached)`;
    const text = [
      `Dear ${ctx.buyerName},`,
      ``,
      `Your booking ${ctx.bookingId} for ${ctx.planName} on unit ${ctx.suiteId} is now complete.`,
      `Booked at: ${formatDateTimeDdMmYyyy(ctx.bookedAt)}`,
      `Contract start: ${formatDateDdMmYyyy(ctx.startDate)}`,
      `Invoice issued: ${issuedLabel}`,
      `Deposit ${formatMoney(ctx.depositAmount)} has been confirmed and KYC verified.`,
      `Please find your deposit invoice attached.`,
      ...(schedule.text ? ['', schedule.text] : []),
      ``,
      `Portal: ${portal}`,
    ].join('\n');
    const html = this.wrapHtml(
      'Booking completed',
      `${this.greeting(ctx.buyerName)}
       <p style="margin:0 0 12px;">Congratulations — your investment booking is now <strong>complete</strong>. Deposit is confirmed and KYC is verified.</p>
       ${emailNotice(
         pdf
           ? 'Your deposit invoice is attached as a PDF for your records.'
           : 'Your booking is complete. If the invoice PDF is missing, contact us and we will resend it.',
         'success'
       )}
       ${this.bookingDetails(ctx, [
         { label: 'Invoice', value: escapeHtml(invoice.invoiceNo) },
         { label: 'Invoice issued', value: escapeHtml(issuedLabel) },
       ])}
       ${schedule.html}
       ${emailCta(portal, 'Open owner portal')}`,
      {
        badge: 'Completed',
        badgeTone: 'success',
        eyebrow: 'Investment booking',
        preheader: `Booking ${ctx.bookingId} completed — invoice attached`,
      }
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
    const portal = `${this.siteUrl()}/invest`;
    const subject = `Booking cancelled — ${ctx.bookingId}`;
    const text = [
      `Dear ${ctx.buyerName},`,
      ``,
      `Booking ${ctx.bookingId} for ${ctx.planName} has been cancelled and the share plan is available again.`,
      `Booked at: ${formatDateTimeDdMmYyyy(ctx.bookedAt)}`,
      `Contract start was: ${formatDateDdMmYyyy(ctx.startDate)}`,
      reason ? `Reason: ${reason}` : '',
      ``,
      `Contact admin@grandsampanresort.com if you have questions.`,
    ]
      .filter(Boolean)
      .join('\n');
    const html = this.wrapHtml(
      'Booking cancelled',
      `${this.greeting(ctx.buyerName)}
       <p style="margin:0 0 12px;">This booking has been cancelled. The share plan is available again for purchase.</p>
       ${
         reason
           ? emailNotice(`<strong>Reason:</strong> ${escapeHtml(reason)}`, 'danger')
           : emailNotice('If you believe this is an error, please contact us.', 'danger')
       }
       ${this.bookingDetails(ctx)}
       ${emailCta(portal, 'Browse available plans')}`,
      {
        badge: 'Cancelled',
        badgeTone: 'danger',
        eyebrow: 'Investment booking',
        preheader: `Booking ${ctx.bookingId} cancelled`,
      }
    );
    return this.send({ to: ctx.to, subject, html, text });
  }
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
