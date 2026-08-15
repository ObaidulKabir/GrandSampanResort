import './styles/globals.css';
import Navbar from '@/components/Navbar';
import SiteFooter from '@/components/SiteFooter';
import SiteChatBot from '@/components/SiteChatBot';
import { ToastProvider } from '@/components/ui/ToastContext';
import React from 'react';

export const metadata = {
  title: 'Unitech Grand Sampan Resort | Luxury Oceanfront Ownership in Cox\'s Bazar',
  description: '64-room luxury beachfront resort in Inani, Cox\'s Bazar. Transparent fractional suite ownership, 8% projected return, and flexible vacation stays.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0E3A5A" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-pearl text-ocean antialiased selection:bg-gold/25 selection:text-ocean">
        <ToastProvider>
          <Navbar />
          {children}
          <SiteFooter />
          <SiteChatBot />
        </ToastProvider>
      </body>
    </html>
  );
}
