import Link from 'next/link';
import type { ReactNode } from 'react';

function Icon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pearl text-ocean">
      <span className="block h-4 w-4">{children}</span>
    </span>
  );
}

function SmallIcon({ children }: { children: ReactNode }) {
  return <span className="block h-4 w-4 text-ocean/70">{children}</span>;
}

export default function Footer() {
  return (
    <footer className="w-full border-t border-gold/20 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <span className="relative h-12 w-12">
            <img src="/images/logo.svg" alt="Unitech Grand Sampan Resort logo" className="h-12 w-12 object-contain" />
          </span>
          <div>
            <div className="font-['Playfair Display'] text-3xl font-extrabold text-ocean">Unitech Grand Sampan Resort</div>
            <div className="mt-2 text-ocean/70">
              Experience luxury and tranquility at our 32-room beachfront paradise in Cox&apos;s Bazar
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-4">
          <div>
            <div className="font-['Playfair Display'] text-xl font-bold text-ocean">About Resort</div>
            <ul className="mt-5 space-y-4 text-ocean/80">
              <li className="flex items-start gap-3">
                <SmallIcon>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M4 10.5V20h16v-9.5M7 10.5V8.25A2.25 2.25 0 0 1 9.25 6h5.5A2.25 2.25 0 0 1 17 8.25V10.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 12h16"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </SmallIcon>
                <span>32 Premium Suites</span>
              </li>
              <li className="flex items-start gap-3">
                <SmallIcon>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </SmallIcon>
                <span>Marine Drive Road</span>
              </li>
              <li className="flex items-start gap-3">
                <SmallIcon>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M3 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 13c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </SmallIcon>
                <span>Cox&apos;s Bazar Beach</span>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-['Playfair Display'] text-xl font-bold text-ocean">Quick Links</div>
            <ul className="mt-5 space-y-3 text-ocean/80">
              <li>
                <Link href="/about" className="hover:text-ocean">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/investor" className="hover:text-ocean">
                  Investor Dashboard
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-ocean">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-ocean">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-['Playfair Display'] text-xl font-bold text-ocean">Contact Us</div>
            <ul className="mt-5 space-y-4 text-ocean/80">
              <li className="flex items-start gap-3">
                <SmallIcon>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M22 16.9v2a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3 5.18 2 2 0 0 1 5.11 3h2a2 2 0 0 1 2 1.72c.12.86.33 1.7.62 2.5a2 2 0 0 1-.45 2.11L8.09 10.91a16 16 0 0 0 5 5l1.58-1.21a2 2 0 0 1 2.11-.45c.8.29 1.64.5 2.5.62A2 2 0 0 1 22 16.9Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </SmallIcon>
                <a href="tel:+8801700000000" className="hover:text-ocean">
                  +880 17 0000 0000
                </a>
              </li>
              <li className="flex items-start gap-3">
                <SmallIcon>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M4 6h16v12H4V6Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m4 7 8 6 8-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </SmallIcon>
                <a href="mailto:info@grandsampan.com" className="hover:text-ocean">
                  info@grandsampan.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <SmallIcon>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M12 8v5l3 2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </SmallIcon>
                <span>24/7 Support</span>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-['Playfair Display'] text-xl font-bold text-ocean">Follow Us</div>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Icon>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.6-1.6H16.7V4.9c-.3 0-1.3-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.6V11H7v3h2.7v8h3.8Z" />
                  </svg>
                </Icon>
              </a>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Icon>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M17.5 6.5h.01"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </Icon>
              </a>
              <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <Icon>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5A3 3 0 0 0 2.4 7.2 31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10.5 15.3V8.7L16 12l-5.5 3.3Z" />
                  </svg>
                </Icon>
              </a>
              <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Icon>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M6.9 6.8a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4ZM5 21.5h3.8V9H5v12.5ZM10.6 9H14v1.7h.1c.5-.9 1.7-1.9 3.6-1.9 3.9 0 4.6 2.6 4.6 5.9v6.8h-3.8v-6c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1v6.1h-3.8V9Z" />
                  </svg>
                </Icon>
              </a>
            </div>
            <p className="mt-4 text-sm text-ocean/70">Connect with us for updates &amp; exclusive offers</p>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-gold/20 pt-6 text-sm text-ocean/60 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Unitech Grand Sampan Resort. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-ocean">
              Privacy Policy
            </Link>
            <span className="text-ocean/30">•</span>
            <Link href="/terms" className="hover:text-ocean">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
