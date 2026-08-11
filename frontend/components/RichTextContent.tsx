'use client';

import { looksLikeHtml, sanitizeRichHtml } from '@/lib/richText';

export default function RichTextContent({
  html,
  className = ''
}: {
  html?: string | null;
  className?: string;
}) {
  const value = html || '';
  if (!value.trim()) return null;

  if (!looksLikeHtml(value)) {
    return <div className={`whitespace-pre-line ${className}`}>{value}</div>;
  }

  const safe = sanitizeRichHtml(value);
  if (!safe) return null;

  return (
    <div
      className={`prose-rich ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
