/** Format dates for emails/PDFs as dd/mm/yyyy (Bangladesh-style). */
export function formatDateDdMmYyyy(input?: string | Date | null): string {
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
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(day)}/${pad(month)}/${year}`;
}

/** Format date-time as dd/mm/yyyy HH:mm. */
export function formatDateTimeDdMmYyyy(input?: string | Date | null): string {
  if (input == null || input === '') return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${formatDateDdMmYyyy(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
