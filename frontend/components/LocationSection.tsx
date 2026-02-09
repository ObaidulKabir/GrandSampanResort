export default function LocationSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
      <div className="text-center mb-8 lg:mb-12">
        <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl lg:text-5xl font-bold text-ocean mb-3">
          Our Location
        </h2>
        <div className="w-20 h-1 bg-gradient-to-r from-gold/30 via-gold to-gold/30 mx-auto mb-4"></div>
        <p className="text-base sm:text-lg text-ocean/80 max-w-2xl mx-auto">
          Marine Drive Road, Rupayan Beach View Innani, Cox's Bazar
        </p>
        <p className="text-sm sm:text-base text-ocean/60 mt-2">
          Experience luxury on the world's longest natural sea beach
        </p>
      </div>
      
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-gold/20 via-gold/30 to-gold/20 rounded-2xl blur-lg"></div>
        <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] w-full rounded-2xl overflow-hidden border-2 border-gold/40 shadow-2xl">
          <iframe
            title="Resort Location Map"
            src="https://www.google.com/maps?q=Marine%20Dirve%20Road%20Rupayan%20Beach%20View%20Innani%20Cox%27s%20Bazar&output=embed"
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white/50 backdrop-blur rounded-xl p-4 sm:p-6 border border-gold/20 text-center hover:shadow-lg transition-shadow">
          <div className="text-2xl sm:text-3xl mb-2">📍</div>
          <h3 className="font-semibold text-ocean mb-1 text-sm sm:text-base">Prime Location</h3>
          <p className="text-xs sm:text-sm text-ocean/70">Beachfront access to Cox's Bazar</p>
        </div>
        <div className="bg-white/50 backdrop-blur rounded-xl p-4 sm:p-6 border border-gold/20 text-center hover:shadow-lg transition-shadow">
          <div className="text-2xl sm:text-3xl mb-2">🚗</div>
          <h3 className="font-semibold text-ocean mb-1 text-sm sm:text-base">Easy Access</h3>
          <p className="text-xs sm:text-sm text-ocean/70">15 min from Cox's Bazar Airport</p>
        </div>
        <div className="bg-white/50 backdrop-blur rounded-xl p-4 sm:p-6 border border-gold/20 text-center hover:shadow-lg transition-shadow">
          <div className="text-2xl sm:text-3xl mb-2">🌊</div>
          <h3 className="font-semibold text-ocean mb-1 text-sm sm:text-base">Ocean Views</h3>
          <p className="text-xs sm:text-sm text-ocean/70">Stunning sea views from every suite</p>
        </div>
      </div>
    </section>
  );
}
