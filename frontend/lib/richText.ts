import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'h3',
  'h4',
  'blockquote'
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

export function looksLikeHtml(value?: string | null): boolean {
  return !!value && /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Strip tags for length checks / empty detection. */
export function plainTextFromHtml(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeRichHtml(value?: string | null): string {
  if (!value) return '';
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false
  }).trim();
}

/** Convert stored plain text (legacy) into simple HTML for the editor. */
export function toEditorHtml(raw?: string | null): string {
  const s = (raw || '').trim();
  if (!s) return '';
  if (looksLikeHtml(s)) return sanitizeRichHtml(s);
  const escaped = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}
