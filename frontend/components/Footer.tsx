import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-gold/20 bg-pearl">
      <div className="mx-auto max-w-7xl px-6 py-12 grid gap-8 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <h3 className="font-display text-2xl text-ocean">Unitech Grand Sampan Resort</h3>
          <p className="mt-2 text-ocean/80">64-room beachfront in Cox's Bazar</p>
          <p className="mt-1 text-ocean/70">Marine Drive Road, Innani, Cox's Bazar</p>
        </div>
        <div>
          <h4 className="text-ocean font-semibold">Contacts</h4>
          <ul className="mt-2 space-y-2 text-ocean/80">
            <li><a href="tel:+8801300999750">+880 1300-999750</a></li>
            <li><a href="mailto:admin@grandsampanresort.com">admin@grandsampanresort.com</a></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/invest">Invest</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/terms">Terms</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-ocean font-semibold">Social</h4>
          <ul className="mt-2 space-y-2 text-ocean/80">
            <li><a href="https://www.facebook.com/GrandSampanResort" target="_blank" rel="noopener noreferrer">Facebook</a></li>
            <li><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Instagram</a></li>
            <li><a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">YouTube</a></li>
            <li><a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 pb-8 text-sm text-ocean/60">
        © {new Date().getFullYear()} Unitech Grand Sampan Resort. All rights reserved.
      </div>
    </footer>
  );
}

