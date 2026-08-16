export function stripHtml(html: string) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function money(value?: number | null) {
  const n = Math.round(Math.abs(Number(value) || 0));
  const grouped = n.toLocaleString('en-IN');
  const body = `ট${grouped}/-`;
  return Number(value) < 0 ? `-${body}` : body;
}

export function formatBdDate(input?: string | Date | null) {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export type ReturnAssumptions = {
  referenceSqFt: number;
  occupancyLowPct: number;
  occupancyHighPct: number;
  operatingCostPct: number;
  categories: Record<string, { adrLow: number; adrHigh: number }>;
};

export function sampleAnnualRange(
  daysPerMonth: number,
  assumptions: ReturnAssumptions,
  category: string
) {
  const days = Math.max(0, Math.min(30, Number(daysPerMonth) || 0));
  const rates = assumptions.categories[category] || assumptions.categories.Standard;
  if (!rates || days <= 0) return null;
  const costFactor = 1 - assumptions.operatingCostPct / 100;
  const annual = (adr: number, occPct: number) =>
    Math.round(adr * days * (occPct / 100) * costFactor * 12);
  const low = annual(rates.adrLow, assumptions.occupancyLowPct);
  const high = annual(rates.adrHigh, assumptions.occupancyHighPct);
  return { low: Math.min(low, high), high: Math.max(low, high) };
}
