import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-gold/25 bg-gradient-to-b from-pearl to-[#ede9df]">
      {/* Trust & Project Badges Bar */}
      <div className="border-b border-ocean/10 py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-white text-lg">
              🛡️
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ocean">100% Deed Registered</p>
              <p className="text-[11px] text-ocean/60">Fractional Ownership with Nominee Protection</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-white text-lg">
              🏢
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ocean">Unitech Holdings Ltd</p>
              <p className="text-[11px] text-ocean/60">Premier Real Estate &amp; Resort Developer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-white text-lg">
              📈
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ocean">8% Projected Net Returns</p>
              <p className="text-[11px] text-ocean/60">Semiannual Payouts &amp; Free 30-Day Stays</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 md:grid-cols-4 md:py-16">
        {/* Col 1: Brand */}
        <div className="md:col-span-1">
          <h3 className="font-display text-xl font-bold text-ocean md:text-2xl">Grand Sampan Resort</h3>
          <p className="mt-2 text-sm text-ocean/80 leading-relaxed">
            64-room luxury oceanfront resort on Marine Drive Road, Inani Beach, Cox&apos;s Bazar.
          </p>
          <p className="mt-2 text-xs text-ocean/60">
            A prestigious property venture by <strong>Unitech Holdings Limited</strong>.
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href="https://wa.me/8801300999750"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              <span>💬</span> WhatsApp Desk
            </a>
          </div>
        </div>

        {/* Col 2: Investment & Suites */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#997D25]">Investment &amp; Ownership</h4>
          <ul className="mt-3 space-y-2 text-sm text-ocean/80">
            <li>
              <Link href="/invest" className="transition hover:text-gold hover:underline">
                Available Share Plans
              </Link>
            </li>
            <li>
              <Link href="/suites" className="transition hover:text-gold hover:underline">
                Suites &amp; Floor Plans
              </Link>
            </li>
            <li>
              <Link href="/returns-income" className="transition hover:text-gold hover:underline">
                ROI &amp; Yield Calculator
              </Link>
            </li>
            <li>
              <Link href="/invest/advisor" className="transition hover:text-gold hover:underline">
                AI Investment Advisor
              </Link>
            </li>
            <li>
              <Link href="/booking" className="transition hover:text-gold hover:underline">
                Guest Stay Reservations
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Trust & Governance */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#997D25]">Trust &amp; Governance</h4>
          <ul className="mt-3 space-y-2 text-sm text-ocean/80">
            <li>
              <Link href="/trust" className="transition hover:text-gold hover:underline">
                Legal &amp; Approvals
              </Link>
            </li>
            <li>
              <Link href="/about" className="transition hover:text-gold hover:underline">
                About Unitech Holdings
              </Link>
            </li>
            <li>
              <Link href="/design-layout" className="transition hover:text-gold hover:underline">
                Architectural Masterplan
              </Link>
            </li>
            <li>
              <Link href="/faq" className="transition hover:text-gold hover:underline">
                Frequently Asked Questions
              </Link>
            </li>
            <li>
              <Link href="/terms" className="transition hover:text-gold hover:underline">
                Terms &amp; Investor Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Direct Contacts */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#997D25]">Corporate Desk</h4>
          <ul className="mt-3 space-y-2 text-sm text-ocean/80">
            <li>
              <span className="text-xs text-ocean/55 block">Sales Hotline</span>
              <a className="font-semibold text-ocean transition hover:text-gold" href="tel:+8801300999750">
                +880 1300-999750
              </a>
            </li>
            <li>
              <span className="text-xs text-ocean/55 block">Investor Relations</span>
              <a className="break-all text-xs font-medium text-ocean transition hover:text-gold" href="mailto:admin@grandsampanresort.com">
                admin@grandsampanresort.com
              </a>
            </li>
            <li>
              <span className="text-xs text-ocean/55 block">Site Location</span>
              <span className="text-xs text-ocean/80">Marine Drive Road, Inani Beach, Cox&apos;s Bazar, Bangladesh</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ocean/10 py-6 text-center text-xs text-ocean/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <p>© {new Date().getFullYear()} Unitech Grand Sampan Resort. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Investor Terms</Link>
            <Link href="/admin/login" className="hover:underline opacity-60">Ops Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
