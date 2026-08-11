/** Shared branded HTML email shell (inline styles for mail clients). */

const COLORS = {
  ocean: '#0b2a3a',
  oceanSoft: '#134a66',
  gold: '#b08d57',
  goldSoft: '#d4af37',
  pearl: '#f5f7f8',
  white: '#ffffff',
  muted: '#5a6b75',
  line: '#d9e2e8',
  successBg: '#e8f5ef',
  successText: '#1a5c3a',
  warnBg: '#f8f1e3',
  warnText: '#7a5a18',
  dangerBg: '#fdecec',
  dangerText: '#8a1f1f',
  infoBg: '#e8f1f6',
  infoText: '#0b2a3a',
};

export function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type BadgeTone = 'info' | 'success' | 'warn' | 'danger';

function badgeStyles(tone: BadgeTone) {
  switch (tone) {
    case 'success':
      return { bg: COLORS.successBg, fg: COLORS.successText };
    case 'warn':
      return { bg: COLORS.warnBg, fg: COLORS.warnText };
    case 'danger':
      return { bg: COLORS.dangerBg, fg: COLORS.dangerText };
    default:
      return { bg: COLORS.infoBg, fg: COLORS.infoText };
  }
}

export function emailCta(href: string, label: string) {
  const safeHref = escapeHtml(href);
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
    <tr>
      <td style="background:${COLORS.ocean};border-radius:4px;">
        <a href="${safeHref}" style="display:inline-block;padding:12px 22px;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;color:${COLORS.white};text-decoration:none;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

export function emailDetailTable(rows: { label: string; value: string }[]) {
  const body = rows
    .filter((r) => r.value != null && String(r.value).trim() !== '')
    .map(
      (r, i) => `
      <tr>
        <td style="padding:10px 12px;border-top:${i === 0 ? '0' : `1px solid ${COLORS.line}`};font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.muted};width:38%;vertical-align:top;">
          ${escapeHtml(r.label)}
        </td>
        <td style="padding:10px 12px;border-top:${i === 0 ? '0' : `1px solid ${COLORS.line}`};font-family:Georgia,'Times New Roman',serif;font-size:14px;color:${COLORS.ocean};font-weight:600;vertical-align:top;">
          ${r.value}
        </td>
      </tr>`
    )
    .join('');
  if (!body) return '';
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid ${COLORS.line};border-radius:6px;background:${COLORS.white};">
    ${body}
  </table>`;
}

export function emailScheduleTable(
  rows: { type: string; due: string; amount: string }[]
) {
  if (!rows.length) return '';
  const tr = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:9px 10px;border-top:1px solid ${COLORS.line};font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.ocean};text-transform:capitalize;">
          ${escapeHtml(r.type)}
        </td>
        <td style="padding:9px 10px;border-top:1px solid ${COLORS.line};font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.ocean};">
          ${escapeHtml(r.due)}
        </td>
        <td style="padding:9px 10px;border-top:1px solid ${COLORS.line};font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.ocean};text-align:right;font-weight:600;">
          ${escapeHtml(r.amount)}
        </td>
      </tr>`
    )
    .join('');
  return `
  <p style="margin:22px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:${COLORS.ocean};font-weight:700;">Payment schedule</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.line};border-radius:6px;background:${COLORS.white};">
    <tr>
      <th align="left" style="padding:9px 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.muted};background:${COLORS.pearl};">Type</th>
      <th align="left" style="padding:9px 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.muted};background:${COLORS.pearl};">Due</th>
      <th align="right" style="padding:9px 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.muted};background:${COLORS.pearl};">Amount</th>
    </tr>
    ${tr}
  </table>`;
}

export function emailNotice(text: string, tone: BadgeTone = 'info') {
  const { bg, fg } = badgeStyles(tone);
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    <tr>
      <td style="padding:12px 14px;background:${bg};border-left:4px solid ${COLORS.gold};border-radius:4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${fg};line-height:1.5;">
        ${text}
      </td>
    </tr>
  </table>`;
}

export function renderBrandedEmail(opts: {
  preheader?: string;
  eyebrow?: string;
  title: string;
  badge?: string;
  badgeTone?: BadgeTone;
  bodyHtml: string;
  contactEmail?: string;
}) {
  const contact = opts.contactEmail || 'admin@grandsampanresort.com';
  const badge = opts.badge
    ? (() => {
        const { bg, fg } = badgeStyles(opts.badgeTone || 'info');
        return `<span style="display:inline-block;margin:0 0 14px;padding:5px 10px;border-radius:999px;background:${bg};color:${fg};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">${escapeHtml(opts.badge)}</span>`;
      })()
    : '';
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.pearl};">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.pearl};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:${COLORS.white};border:1px solid ${COLORS.line};border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:${COLORS.ocean};padding:22px 28px;">
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${COLORS.goldSoft};">
                ${escapeHtml(opts.eyebrow || 'Grand Sampan Resort')}
              </p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:700;color:${COLORS.white};">
                ${escapeHtml(opts.title)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,${COLORS.gold} 0%,${COLORS.goldSoft} 50%,${COLORS.gold} 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:Georgia,'Times New Roman',serif;color:${COLORS.ocean};line-height:1.55;font-size:15px;">
              ${badge}
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;background:${COLORS.pearl};border-top:1px solid ${COLORS.line};">
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${COLORS.gold};">
                Grand Sampan Resort
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.muted};line-height:1.5;">
                Questions? Reply to this email or write
                <a href="mailto:${escapeHtml(contact)}" style="color:${COLORS.ocean};">${escapeHtml(contact)}</a>.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${COLORS.muted};">
          Unitech Grand Sampan Resort · Cox&apos;s Bazar
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
