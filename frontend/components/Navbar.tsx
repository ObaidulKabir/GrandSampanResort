'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    /* Added: fixed, top-0, left-0, and z-50 to keep it at the top and above other elements */
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-gold/20 bg-pearl/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-1 z-50">
          <span className="relative h-10 w-10 sm:h-10 sm:w-10 flex-shrink-0">
            <Image 
              src="/images/logo-of-shampan.png" 
              alt="Unitech Grand Sampan Resort logo" 
              fill 
              sizes="(max-width: 640px) 32px, 40px"
              className="object-contain"
            />
          </span>
          <span className="font-['Playfair_Display'] text-lg sm:text-xl md:text-2xl font-extrabold text-ocean whitespace-nowrap">
            Unitech Grand Sampan Resort
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6 text-ocean">
          <Link href="/about" className="hover:text-gold transition-colors">About</Link>
          <Link href="/investor" className="hover:text-gold transition-colors">Investor Dashboard</Link>
          <Link href="/terms" className="hover:text-gold transition-colors">Terms & Conditions</Link>
          <Link href="/faq" className="hover:text-gold transition-colors">FAQ</Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="lg:hidden z-50 p-2 text-ocean hover:text-gold transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav className="lg:hidden bg-pearl/95 backdrop-blur border-t border-gold/20">
          <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-4">
            <Link 
              href="/about" 
              className="text-ocean hover:text-gold transition-colors py-2"
              onClick={toggleMenu}
            >
              About
            </Link>
            <Link 
              href="/investor" 
              className="text-ocean hover:text-gold transition-colors py-2"
              onClick={toggleMenu}
            >
              Investor Dashboard
            </Link>
            <Link 
              href="/terms" 
              className="text-ocean hover:text-gold transition-colors py-2"
              onClick={toggleMenu}
            >
              Terms & Conditions
            </Link>
            <Link 
              href="/faq" 
              className="text-ocean hover:text-gold transition-colors py-2"
              onClick={toggleMenu}
            >
              FAQ
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}