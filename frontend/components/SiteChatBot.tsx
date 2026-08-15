'use client';
import ChatBot from '@/components/ChatBot';

/** Site chrome only — rendered from the buyer locale layout, never on /admin. */
export default function SiteChatBot() {
  return <ChatBot />;
}
