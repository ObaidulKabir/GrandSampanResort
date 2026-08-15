'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CONCIERGE_QUICK, conciergeReply } from '@/lib/concierge';

type Msg = { role: 'user' | 'bot'; text: string; links?: { href: string; label: string }[] };

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'bot',
      text: 'Hi — looking for a suite share, or not sure how much to pay today?',
      links: [
        { href: '/invest', label: 'Browse suites' },
        { href: '/invest/advisor', label: 'Help me choose' }
      ]
    }
  ]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function send(raw?: string) {
    const t = (raw ?? text).trim();
    if (!t) return;
    const reply = conciergeReply(t);
    setMsgs((m) => [...m, { role: 'user', text: t }, { role: 'bot', ...reply }]);
    setText('');
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Chat with us'}
        className={`fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] right-4 z-40 h-12 w-12 items-center justify-center rounded-full bg-ocean text-white shadow-lg transition hover:bg-ocean/90 md:bottom-6 md:right-6 ${
          open ? 'hidden md:flex' : 'flex'
        }`}
      >
        {open ? (
          <span aria-hidden className="text-xl leading-none">
            ×
          </span>
        ) : (
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z" />
          </svg>
        )}
      </button>
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 top-[12%] z-50 flex flex-col border-t border-gold/40 bg-white shadow-2xl md:inset-auto md:bottom-24 md:right-6 md:top-auto md:h-[min(32rem,70vh)] md:w-80 md:border"
          role="dialog"
          aria-modal="true"
          aria-label="Grand Sampan Concierge"
        >
          <div className="flex items-center justify-between border-b border-ocean/10 bg-ocean px-4 py-3">
            <span className="font-display text-white">Grand Sampan Concierge</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center text-2xl leading-none text-white/70 hover:text-white"
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
            {msgs.map((m, i) => (
              <div key={i} className={`my-1.5 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span
                  className={`inline-block max-w-[85%] rounded-md px-3 py-1.5 text-sm ${
                    m.role === 'user' ? 'bg-ocean text-white' : 'bg-pearl text-ocean'
                  }`}
                >
                  {m.text}
                </span>
                {m.role === 'bot' && m.links?.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.links.map((l) => (
                      <Link
                        key={l.href + l.label}
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="inline-flex min-h-9 items-center rounded-md border border-gold/50 bg-white px-3 py-1.5 text-xs font-semibold text-ocean hover:bg-gold/15"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-ocean/10 px-3 pt-2">
            {CONCIERGE_QUICK.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => send(q.prompt)}
                className="min-h-9 rounded-md border border-ocean/15 px-2.5 py-1.5 text-xs font-medium text-ocean hover:border-gold/50 hover:bg-gold/10"
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a message…"
              className="field flex-1"
            />
            <button
              onClick={() => send()}
              className="h-11 shrink-0 rounded-md bg-ocean px-4 text-sm font-semibold text-white"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
