export type FaqEntry = {
  id: string;
  category: string;
  question: string;
  answerHtml: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeCategory(value?: string | null) {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : 'General';
}
