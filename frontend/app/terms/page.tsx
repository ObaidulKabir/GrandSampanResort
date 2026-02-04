import Footer from '@/components/Footer';
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 mt-10">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Terms & Conditions</h1>
      <p className="mt-4 text-ocean/80">
        These sample terms govern the use of Unitech Grand Sampan Resort services, bookings, and investor participation.
      </p>

      <section className="mt-8">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">1. Definitions</h2>
        <ul className="mt-2 space-y-2 text-ocean/80">
          <li>\u2022 “Guest” means a person staying at the resort.</li>
          <li>\u2022 “Investor” means a person who purchases a share plan or unit.</li>
          <li>\u2022 “Services” include accommodation, amenities, and related offerings.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">2. Bookings and Payments</h2>
        <ul className="mt-2 space-y-2 text-ocean/80">
          <li>\u2022 All bookings are subject to availability and confirmation.</li>
          <li>\u2022 Deposits, downpayment, and installment schedules must be paid by due dates.</li>
          <li>\u2022 Failure to pay on time may result in suspension of entitlements until rectified.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">3. Investor Entitlements</h2>
        <ul className="mt-2 space-y-2 text-ocean/80">
          <li>\u2022 Investors receive usage days per month consistent with the selected plan.</li>
          <li>\u2022 Revenue share, if applicable, is calculated per policy and may be adjusted.</li>
          <li>\u2022 Transfer or resale is subject to company review and compliance.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">4. Conduct and Safety</h2>
        <ul className="mt-2 space-y-2 text-ocean/80">
          <li>\u2022 Guests and investors must follow resort rules and local regulations.</li>
          <li>\u2022 Damage to property may incur repair costs payable by the responsible party.</li>
          <li>\u2022 Safety guidelines for beach access and common areas must be respected.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">5. Cancellation and Refunds</h2>
        <ul className="mt-2 space-y-2 text-ocean/80">
          <li>\u2022 Cancellations are processed per booking policy and plan terms.</li>
          <li>\u2022 Refund eligibility depends on notice period and service usage.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">6. Privacy</h2>
        <ul className="mt-2 space-y-2 text-ocean/80">
          <li>\u2022 Personal data is handled per privacy policy and applicable law.</li>
          <li>\u2022 Security measures are maintained to protect user information.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">7. Changes to Terms</h2>
        <p className="mt-2 text-ocean/80">
          The company may update these terms periodically. Continued use of services indicates acceptance of changes.
        </p>
      </section>

      <section className="mt-8 mb-20">
        <h2 className="font-['Playfair Display'] text-2xl text-ocean">8. Contact</h2>
        <p className="mt-2 text-ocean/80">
          For questions or support: info@grandsampan.com • +880 17 0000 0000
        </p>
      </section>
      <Footer/>
    </main>
  );
}

