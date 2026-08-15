import './styles/globals.css';
import Navbar from '@/components/Navbar';
import SiteFooter from '@/components/SiteFooter';
import SiteChatBot from '@/components/SiteChatBot';
import React from 'react';

export const metadata = {
  title: 'Unitech Grand Sampan Resort',
  description: 'Luxury beachfront resort & fractional ownership platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0E3A5A" />
        <meta name="description" content="Luxury beachfront resort & fractional ownership platform" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-pearl text-ocean antialiased">
        <Navbar />
        {children}
        <SiteFooter />
        <SiteChatBot />
      </body>
    </html>
  );
}
