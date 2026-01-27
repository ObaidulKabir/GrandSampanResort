"use client";
import { useState } from "react";

interface Testimonial {
  name: string;
  role: string;
  content: string;
  rating: number;
  image?: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Sarah Mitchell",
    role: "Suite Owner & Investor",
    content: "Investing in Grand Sampan was the best decision I've made. The returns are consistent, and the property management is exceptional. Plus, I get to enjoy luxury vacations whenever I want!",
    rating: 5,
  },
  {
    name: "David Chen",
    role: "Business Executive",
    content: "The perfect blend of investment and leisure. The beachfront location is stunning, and the fractional ownership model makes it accessible. Highly recommend for anyone looking for a smart vacation property investment.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "Real Estate Investor",
    content: "Grand Sampan Resort exceeded all expectations. The amenities are world-class, the staff is incredibly attentive, and the income potential is remarkable. It's truly a premium experience.",
    rating: 5,
  },
  {
    name: "Michael Thompson",
    role: "Vacation Home Owner",
    content: "As someone who owns multiple vacation properties, I can confidently say Grand Sampan stands out. The management takes care of everything, and I actually earn money while not using my weeks!",
    rating: 5,
  },
];

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="relative py-24 bg-gradient-to-br from-ocean to-ocean/90 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gold rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sunset rounded-full blur-3xl"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-gold/20 border border-gold/30 text-gold font-semibold text-sm tracking-wide mb-4">
            TESTIMONIALS
          </span>
          <h2 className="font-['Playfair Display'] text-4xl md:text-5xl text-white mb-4">
            What Our Owners Say
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Hear from our satisfied investors and suite owners about their experience at Grand Sampan Resort
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Main testimonial card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
            <div className="flex items-center gap-2 mb-6">
              {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                <svg
                  key={i}
                  className="w-6 h-6 text-gold fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            <blockquote className="text-xl md:text-2xl text-ocean/90 leading-relaxed mb-8 italic">
              "{testimonials[activeIndex].content}"
            </blockquote>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold to-sunset flex items-center justify-center text-white text-2xl font-bold">
                {testimonials[activeIndex].name.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-ocean text-lg">
                  {testimonials[activeIndex].name}
                </div>
                <div className="text-ocean/60">
                  {testimonials[activeIndex].role}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation dots */}
          <div className="flex justify-center gap-3 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === activeIndex
                    ? "w-12 h-3 bg-gold"
                    : "w-3 h-3 bg-white/50 hover:bg-white/70"
                }`}
                aria-label={`View testimonial ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation arrows */}
          <button
            onClick={() =>
              setActiveIndex((prev) =>
                prev === 0 ? testimonials.length - 1 : prev - 1
              )
            }
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-16 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-ocean hover:bg-gold hover:text-white transition-all duration-300"
            aria-label="Previous testimonial"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={() =>
              setActiveIndex((prev) =>
                prev === testimonials.length - 1 ? 0 : prev + 1
              )
            }
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-16 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-ocean hover:bg-gold hover:text-white transition-all duration-300"
            aria-label="Next testimonial"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
