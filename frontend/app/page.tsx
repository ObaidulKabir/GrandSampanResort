import Hero from '@/components/Hero';
import ViewsCarousel from '@/components/ViewsCarousel';
import FeaturesGrid from '@/components/FeaturesGrid';
import Footer from '@/components/Footer';
import LocationSection from '@/components/LocationSection';
import AvailableCards from '@/components/AvailableCards';
import ChatBot from '@/components/ChatBot';
import Testimonials from '@/components/Testimonials';
import Activities from '@/components/Activities';
import Gallery from '@/components/Gallery';

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <Hero />

      {/* Gallery Section with Categories */}
      <Gallery />

      {/* Enhanced Available Now Section */}
      <section className="relative py-24 bg-gradient-to-b from-white to-pearl">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold font-semibold text-sm tracking-wide mb-4">
              AVAILABILITY
            </span>
            <h2 className="font-['Playfair Display'] text-4xl md:text-5xl text-ocean mb-4">
              Available Now
            </h2>
            <p className="text-xl text-ocean/70 max-w-2xl mx-auto">
              Premium suites with open dates this month - book your dream vacation today
            </p>
          </div>
          <div className="mt-8">
            <AvailableCards />
          </div>
        </div>
      </section>

      {/* Activities Section */}
      <Activities />

      {/* Enhanced Features Section */}
      <section className="relative py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 rounded-full bg-ocean/10 border border-ocean/20 text-ocean font-semibold text-sm tracking-wide mb-4">
              AMENITIES
            </span>
            <h2 className="font-['Playfair Display'] text-4xl md:text-5xl text-ocean mb-4">
              World-Class Features
            </h2>
            <p className="text-xl text-ocean/70 max-w-2xl mx-auto">
              Handpicked amenities designed for the ultimate luxury experience
            </p>
          </div>
          <FeaturesGrid />
        </div>
      </section>

      {/* Testimonials Section */}
      <Testimonials />

      <LocationSection />

      <Footer />
      <ChatBot />
    </main>
  );
}
