import '../../styles/globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SiteFooter from '@/components/SiteFooter';
import SiteChatBot from '@/components/SiteChatBot';
import { routing, type Locale } from '@/i18n/routing';
import { buildLocaleMetadata } from '@/lib/seo';
import React from 'react';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: { locale: string } }) {
  return buildLocaleMetadata(params.locale, { path: '/' });
}

export default async function SiteLocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  if (!routing.locales.includes(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const isBn = locale === 'bn';

  return (
    <html lang={locale}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0E3A5A" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href={
            isBn
              ? 'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap'
              : 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap'
          }
          rel="stylesheet"
        />
      </head>
      <body className="bg-pearl text-ocean antialiased">
        <NextIntlClientProvider messages={messages}>
          <Navbar />
          {children}
          <SiteFooter />
          <SiteChatBot />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
