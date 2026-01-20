import React from 'react';

export default function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-gold/30 bg-white p-6">{children}</div>;
}

