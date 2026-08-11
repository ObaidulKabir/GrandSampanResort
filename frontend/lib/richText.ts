const ALLOWED_TAGS = new Set([
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
]);

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

/**
 * Lightweight HTML sanitizer for FAQ/Terms content.
 * Avoids jsdom/DOMPurify so Next.js Docker production builds stay clean.
 */
export function sanitizeRichHtml(value?: string | null): string {
  if (!value) return '';
  let html = String(value)
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|form)[^>]*\/?\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src|xlink:href)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|\s*javascript:[^\s>]+)/gi, '');

  html = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, rawTag: string, rawAttrs = '') => {
    const tag = rawTag.toLowerCase();
    const closing = match.startsWith('</');
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (closing) return `</${tag}>`;
    if (tag === 'br') return '<br />';
    if (tag === 'a') {
      const hrefMatch = String(rawAttrs).match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      let href = (hrefMatch?.[1] || hrefMatch?.[2] || hrefMatch?.[3] || '').trim();
      if (!/^(https?:\/\/|mailto:|\/|#)/i.test(href)) {
        return '<a>';
      }
      href = href.replace(/"/g, '&quot;');
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
    }
    return `<${tag}>`;
  });

  return html.trim();
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
