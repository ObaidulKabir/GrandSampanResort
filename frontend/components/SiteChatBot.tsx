'use client';
import { usePathname } from 'next/navigation';
import ChatBot from '@/components/ChatBot';

export default function SiteChatBot() {
  const path = usePathname() || '';
  if (path.startsWith('/admin')) return null;
  return <ChatBot />;
}
