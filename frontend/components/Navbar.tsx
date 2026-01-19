import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="w-full border-b border-gold/20 bg-pearl/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-['Playfair Display'] text-2xl text-ocean">
          Grand Sampan
        </Link>
        <nav className="flex items-center gap-6 text-ocean">
          <Link href="/about">About</Link>
          <Link href="/features">Features</Link>
          <Link href="/investment-plans">Invest</Link>
          <Link href="/returns-income">Returns</Link>
          <Link href="/booking">Book</Link>
          <Link href="/dashboard">Dashboard</Link>
          <span className="rounded border border-ocean/20 px-2 py-1 text-xs text-ocean/70">Unit size: sq ft</span>
        </nav>
      </div>
    </header>
  );
}

