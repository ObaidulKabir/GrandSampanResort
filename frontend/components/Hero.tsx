"use client";
import Button from "./Button";
import Carousel from "./Carousel";
import { useEffect, useState } from "react";

export default function Hero() {
  const [slides, setSlides] = useState<{ src: string; alt: string }[]>([
    { src: "/views/3d_sun_set_view.png", alt: "Oceanfront luxury resort" },
    { src: "/views/View-03.png", alt: "Rooms with ocean views" },
    { src: "/views/View-04.png", alt: "Rooftop café ambiance" },
  ]);
  useEffect(() => {
    fetch("/api/views")
      .then((r) => r.json())
      .then((names: string[]) => {
        if (Array.isArray(names) && names.length) {
          setSlides(
            names.map((n) => ({
              src: `/views/${n}`,
              alt: n.replace(/[-_]/g, " "),
            })),
          );
        }
      })
      .catch(() => {});
  }, []);
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-pearl to-white">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gold rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-ocean rounded-full blur-3xl"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-20 mt-8">
        {/* Carousel with enhanced styling */}
        <div className="relative mb-12 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-gold via-sunset to-gold rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition duration-1000"></div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-ocean/10">
            <Carousel height={480} slides={slides} />
          </div>
        </div>

        {/* Content with better typography and spacing */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-block mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold font-semibold text-sm tracking-wide">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              LUXURY BEACHFRONT LIVING
            </span>
          </div>
          
          <h1 className="font-['Playfair Display'] text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1] text-ocean mb-6">
            Own the Beach.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-sunset to-gold animate-pulse">
              Earn from It.
            </span>
          </h1>
          
          <p className="mt-8 max-w-3xl mx-auto text-xl md:text-2xl text-ocean/70 leading-relaxed font-light">
            Experience unparalleled luxury at our exclusive beachfront resort. 
            <span className="text-ocean font-medium"> Invest in fractional ownership</span> and 
            enjoy premium stays while earning passive income.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Book a Site Visit
              </span>
            </Button>
            <a href="/invest">
              <Button variant="outline">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Invest in a Suite
                </span>
              </Button>
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 pt-8 border-t border-ocean/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-ocean">50+</div>
                <div className="text-sm text-ocean/60 mt-1">Luxury Suites</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-ocean">98%</div>
                <div className="text-sm text-ocean/60 mt-1">Satisfaction Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-ocean">24/7</div>
                <div className="text-sm text-ocean/60 mt-1">Concierge Service</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-ocean">15%</div>
                <div className="text-sm text-ocean/60 mt-1">Avg. Annual ROI</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
