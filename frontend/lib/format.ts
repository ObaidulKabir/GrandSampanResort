/** Bangladesh-style display helpers: dd/mm/yyyy dates and ট##,##,###/- amounts. */

export type FormatDigits = 'latin' | 'bengali';

export type FormatOptions = {
  /** Default latin (Western) digits — banking/invoices use these. */
  digits?: FormatDigits;
};

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toDigits(s: string, digits: FormatDigits = 'latin') {
  if (digits !== 'bengali') return s;
  return s.replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)] || d);
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * Format a date as dd/mm/yyyy.
 * Date-only ISO strings (YYYY-MM-DD) are parsed as calendar dates to avoid
 * timezone shifts that can move the day.
 */
export function formatDate(input?: string | Date | null, options?: FormatOptions): string {
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
  return toDigits(`${pad2(day)}/${pad2(month)}/${year}`, options?.digits);
}

/**
 * Format a date-time as dd/mm/yyyy HH:mm (local timezone).
 * Prefer this for booking submission timestamps.
 */
export function formatDateTime(input?: string | Date | null, options?: FormatOptions): string {
  if (input == null || input === '') return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return toDigits(`${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`, options?.digits);
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
export function formatAmount(value?: number | null, decimals = 2, options?: FormatOptions): string {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const neg = safe < 0;
  const fixed = Math.abs(safe).toFixed(Math.max(0, decimals));
  const [intPart, decPart] = fixed.split('.');
  const grouped = formatBdGrouped(intPart);
  const body = decimals > 0 ? `${grouped}.${decPart}` : grouped;
  return toDigits(neg ? `-${body}` : body, options?.digits);
}

/** Currency as ট##,##,###/- (integer taka, Bangladesh grouping). */
export function formatMoney(value?: number | null, _decimals = 2, options?: FormatOptions): string {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const neg = safe < 0;
  const grouped = formatBdGrouped(String(Math.round(Math.abs(safe))));
  const body = `ট${grouped}/-`;
  return toDigits(neg ? `-${body}` : body, options?.digits);
}
