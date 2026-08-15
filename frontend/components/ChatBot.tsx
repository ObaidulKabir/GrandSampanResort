'use client';
import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'bot'; text: string };

function respond(input: string): string {
  const q = input.toLowerCase();
  if (q.includes('location')) return "Marine Drive Road, Rupayan Beach View Innani, Cox's Bazar.";
  if (q.includes('plan') || q.includes('invest'))
    return 'Explore live plans at /invest, or use /invest/advisor to match a plan to the funds you have.';
  if (q.includes('contact') || q.includes('support')) return 'Contact: info@grandsampan.com • +880 17 0000 0000';
  if (q.includes('terms')) return 'See Terms & Conditions at /terms.';
  if (q.includes('faq')) return 'Open the FAQ link in the footer.';
  if (q.includes('site visit') || q.includes('visit')) return 'To book a site visit, share a preferred date and time; we will confirm availability.';
  if (q.includes('availability')) return 'Availability can be checked per suite on the Book a Stay page.';
  if (q.includes('suite')) return 'Suites: Standard, Deluxe, Premium, with sea or hill views.';
  return 'I can help with plans, visits, availability, and contacts. Ask me anything.';
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'bot', text: 'Hi! How can I help today?' }]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);
  function send() {
    const t = text.trim();
    if (!t) return;
    const reply = respond(t);
    setMsgs((m) => [...m, { role: 'user', text: t }, { role: 'bot', text: reply }]);
    setText('');
  }
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Chat with us'}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-ocean text-white shadow-lg transition hover:bg-ocean/90"
      >
        {open ? (
          <span aria-hidden className="text-xl leading-none">×</span>
        ) : (
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z" />
          </svg>
        )}
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-80 border border-gold/40 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-ocean/10 bg-ocean px-4 py-3">
            <span className="font-display text-white">Grand Sampan Concierge</span>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-white/70 hover:text-white">
              ×
            </button>
          </div>
          <div className="max-h-80 overflow-auto px-3 py-3">
            {msgs.map((m, i) => (
              <div key={i} className={`my-1.5 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span
                  className={`inline-block max-w-[85%] rounded-md px-3 py-1.5 text-sm ${
                    m.role === 'user' ? 'bg-ocean text-white' : 'bg-pearl text-ocean'
                  }`}
                >
                  {m.text}
                </span>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 border-t border-ocean/10 px-3 py-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a message…"
              className="field flex-1"
            />
            <button onClick={send} className="rounded-md bg-ocean px-3 py-1.5 text-sm font-semibold text-white">
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
