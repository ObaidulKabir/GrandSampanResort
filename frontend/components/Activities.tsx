export default function Activities() {
  const activities = [
    {
      title: "Water Sports",
      description: "Jet skiing, parasailing, kayaking, and paddleboarding for the adventurous soul.",
      icon: "🏄",
      gradient: "from-blue-500 to-cyan-400",
    },
    {
      title: "Spa & Wellness",
      description: "Rejuvenate with premium spa treatments, yoga sessions, and meditation classes.",
      icon: "💆",
      gradient: "from-purple-500 to-pink-400",
    },
    {
      title: "Fine Dining",
      description: "Savor world-class cuisine at our beachfront restaurants and rooftop bar.",
      icon: "🍽️",
      gradient: "from-orange-500 to-red-400",
    },
    {
      title: "Beach Activities",
      description: "Beach volleyball, bonfires, sunrise yoga, and exclusive beach parties.",
      icon: "🏖️",
      gradient: "from-yellow-500 to-orange-400",
    },
    {
      title: "Fitness Center",
      description: "State-of-the-art gym with ocean views, personal trainers, and group classes.",
      icon: "💪",
      gradient: "from-green-500 to-teal-400",
    },
    {
      title: "Excursions",
      description: "Guided tours, island hopping, snorkeling, and cultural experiences.",
      icon: "⛵",
      gradient: "from-indigo-500 to-blue-400",
    },
  ];

  return (
    <section className="py-24 bg-pearl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-96 h-96 bg-sunset rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-ocean rounded-full blur-3xl"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-sunset/10 border border-sunset/20 text-sunset font-semibold text-sm tracking-wide mb-4">
            EXPERIENCES
          </span>
          <h2 className="font-['Playfair Display'] text-4xl md:text-5xl text-ocean mb-4">
            Endless Activities & Amenities
          </h2>
          <p className="text-xl text-ocean/70 max-w-2xl mx-auto">
            From adrenaline-pumping water sports to serene spa experiences, there's something for everyone
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-ocean/5"
            >
              {/* Icon */}
              <div className="text-6xl mb-4">
                {activity.icon}
              </div>

              {/* Title */}
              <h3 className="font-['Playfair Display'] text-2xl text-ocean mb-3">
                {activity.title}
              </h3>

              {/* Description */}
              <p className="text-ocean/70 leading-relaxed">
                {activity.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <a
            href="/booking"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-ocean to-ocean/90 text-white rounded-full font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <span>Explore All Amenities</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
