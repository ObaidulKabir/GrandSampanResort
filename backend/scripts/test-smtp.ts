/**
 * One-shot SMTP connectivity test. Usage:
 *   SMTP_HOST=... SMTP_PORT=... SMTP_USER=... SMTP_PASS=... npx ts-node scripts/test-smtp.ts [to]
 */
import * as nodemailer from 'nodemailer';

async function main() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 465);
  const to = process.argv[2] || user || process.env.MAIL_BCC;
  const from = process.env.MAIL_FROM || user;

  if (!host || !user || !pass || !to) {
    console.error('Missing SMTP_HOST / SMTP_USER / SMTP_PASS / recipient');
    process.exit(1);
  }

  const secure = port === 465;
  console.log(`Connecting ${host}:${port} secure=${secure} as ${user} → ${to}`);

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: port === 587,
    auth: { user, pass },
  });

  await transport.verify();
  console.log('SMTP verify OK');

  const info = await transport.sendMail({
    from,
    to,
    subject: `Grand Sampan SMTP test ${new Date().toISOString()}`,
    text: 'This is a test message from the Grand Sampan Resort backend SMTP check.',
    html: '<p>This is a <strong>test message</strong> from the Grand Sampan Resort backend SMTP check.</p>',
  });

  console.log('Message sent:', info.messageId || info.response);
}

main().catch((err) => {
  console.error('SMTP test failed:', err?.message || err);
  process.exit(1);
});
