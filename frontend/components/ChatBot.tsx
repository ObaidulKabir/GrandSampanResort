'use client';
import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'bot'; text: string };

function respond(input: string): string {
  const q = input.toLowerCase();
  if (q.includes('location')) return "Marine Dirve Road, Rupayan Beach View Innani, Cox's Bazar.";
  if (q.includes('plan') || q.includes('invest')) return 'Explore plans at /invest or view details in pricing/plans.';
  if (q.includes('contact') || q.includes('support')) return 'Contact: info@grandsampan.com • +880 17 0000 0000';
  if (q.includes('terms')) return 'See Terms & Conditions at /terms.';
  if (q.includes('faq')) return 'Open the FAQ link in the header.';
  if (q.includes('site visit') || q.includes('visit')) return 'To book a site visit, share a preferred date and time; we will confirm availability.';
  if (q.includes('availability')) return 'Availability can be checked per suite via the Investor Dashboard or the booking page.';
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
        className="fixed bottom-6 right-6 z-40 rounded-full bg-ocean px-4 py-3 text-white shadow-lg"
      >
        {open ? 'Close Chat' : 'Chat'}
      </button>
      {open && (
        <div className="fixed bottom-20 right-6 z-40 w-80 rounded-xl border border-gold/30 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-ocean/10 px-3 py-2">
            <span className="text-ocean">Assistant</span>
            <button onClick={() => setOpen(false)} className="text-ocean/70">×</button>
          </div>
          <div className="max-h-80 overflow-auto px-3 py-2">
            {msgs.map((m, i) => (
              <div key={i} className={`my-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block rounded px-2 py-1 ${m.role === 'user' ? 'bg-ocean text-white' : 'bg-ocean/5 text-ocean'}`}>{m.text}</span>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 border-t border-ocean/10 px-3 py-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded border border-ocean/20 px-2 py-1"
            />
            <button onClick={send} className="rounded bg-ocean px-3 py-1 text-white">Send</button>
          </div>
        </div>
      )}
    </>
  );
}

