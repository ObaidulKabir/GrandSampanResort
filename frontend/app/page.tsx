import Hero from '@/components/Hero';
import ViewsCarousel from '@/components/ViewsCarousel';
import FeaturesGrid from '@/components/FeaturesGrid';
import Footer from '@/components/Footer';
import LocationSection from '@/components/LocationSection';
import AvailableCards from '@/components/AvailableCards';
import ChatBot from '@/components/ChatBot';

export default function HomePage() {
  return (
    <main>
      <Hero />

      

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="font-['Playfair Display'] text-3xl text-ocean">Views</h2>
        <p className="mt-2 text-ocean/80">A glimpse of the resort ambiance and oceanfront lifestyle.</p>
        <div className="mt-6">
          <ViewsCarousel height={500} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="font-['Playfair Display'] text-3xl text-ocean">Available Now</h2>
        <p className="mt-2 text-ocean/80">A quick peek at units with open dates this month.</p>
        <div className="mt-6">
          <AvailableCards />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="font-['Playfair Display'] text-3xl text-ocean">Features</h2>
        <p className="mt-2 text-ocean/80">Handpicked amenities from your features image set.</p>
        <FeaturesGrid />
      </section>

      <LocationSection />

      <Footer />
      <ChatBot />
    </main>
  );
}
