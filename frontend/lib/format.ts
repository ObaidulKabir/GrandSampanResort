/** Bangladesh-style display helpers: dd/mm/yyyy dates and ##,##,###.## amounts. */

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * Format a date as dd/mm/yyyy.
 * Date-only ISO strings (YYYY-MM-DD) are parsed as calendar dates to avoid
 * timezone shifts that can move the day.
 */
export function formatDate(input?: string | Date | null): string {
  if (input == null || input === '') return '—';
  let day: number;
  let month: number;
  let year: number;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const [y, m, d] = input.slice(0, 10).split('-').map(Number);
    year = y;
    month = m;
    day = d;
  } else {
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '—';
    day = d.getDate();
    month = d.getMonth() + 1;
    year = d.getFullYear();
  }
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

/**
 * Format a date-time as dd/mm/yyyy HH:mm (local timezone).
 * Prefer this for booking submission timestamps.
 */
export function formatDateTime(input?: string | Date | null): string {
  if (input == null || input === '') return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Integer part with Bangladesh / Indian grouping: 12,34,567 */
export function formatBdGrouped(intDigits: string): string {
  const s = intDigits.replace(/^0+(?=\d)/, '') || '0';
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  const groups: string[] = [];
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) groups.unshift(rest);
  return `${groups.join(',')},${last3}`;
}

/**
 * Format a number as ##,##,###.## (always 2 decimal places unless decimals=0).
 */
export function formatAmount(value?: number | null, decimals = 2): string {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const neg = safe < 0;
  const fixed = Math.abs(safe).toFixed(Math.max(0, decimals));
  const [intPart, decPart] = fixed.split('.');
  const grouped = formatBdGrouped(intPart);
  const body = decimals > 0 ? `${grouped}.${decPart}` : grouped;
  return neg ? `-${body}` : body;
}

/** Currency with ৳ prefix, e.g. ৳ 12,34,567.00 */
export function formatMoney(value?: number | null, decimals = 2): string {
  return `৳ ${formatAmount(value, decimals)}`;
}
