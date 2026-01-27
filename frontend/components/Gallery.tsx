"use client";
import { useState } from "react";
import Image from "next/image";

interface GalleryImage {
  src: string;
  alt: string;
  category: string;
}

const categories = [
  { id: "all", name: "All", icon: "🏝️" },
  { id: "suites", name: "Suites", icon: "🛏️" },
  { id: "beach", name: "Beach Views", icon: "🌊" },
  { id: "dining", name: "Dining", icon: "🍽️" },
  { id: "amenities", name: "Amenities", icon: "✨" },
  { id: "activities", name: "Activities", icon: "🏄" },
];

const galleryImages: GalleryImage[] = [
  // Suites
  { src: "/views/View-03.png", alt: "Luxury Suite Interior", category: "suites" },
  { src: "/views/View-04.png", alt: "Ocean View Suite", category: "suites" },
  { src: "/views/3d_sun_set_view.png", alt: "Sunset View Suite", category: "suites" },
  
  // Beach Views
  { src: "/views/3d_sun_set_view.png", alt: "Beach Sunset", category: "beach" },
  { src: "/views/View-03.png", alt: "Pristine Beach", category: "beach" },
  { src: "/views/View-04.png", alt: "Oceanfront", category: "beach" },
  
  // Dining
  { src: "/views/View-04.png", alt: "Rooftop Restaurant", category: "dining" },
  { src: "/views/View-03.png", alt: "Beachside Dining", category: "dining" },
  
  // Amenities
  { src: "/views/View-03.png", alt: "Infinity Pool", category: "amenities" },
  { src: "/views/View-04.png", alt: "Spa Facilities", category: "amenities" },
  
  // Activities
  { src: "/views/3d_sun_set_view.png", alt: "Water Sports", category: "activities" },
  { src: "/views/View-03.png", alt: "Beach Activities", category: "activities" },
];

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageScale, setImageScale] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const filteredImages =
    activeCategory === "all"
      ? galleryImages
      : galleryImages.filter((img) => img.category === activeCategory);

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
    setImageScale(1);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setImageScale(1);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % filteredImages.length);
    setImageScale(1);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? filteredImages.length - 1 : prev - 1
    );
    setImageScale(1);
  };

  const zoomIn = () => {
    setImageScale((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setImageScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  return (
    <section className="relative py-24 bg-gradient-to-b from-white via-pearl/50 to-white">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 rounded-full bg-ocean/10 border border-ocean/20 text-ocean font-semibold text-sm tracking-wide mb-4">
            GALLERY
          </span>
          <h2 className="font-['Playfair Display'] text-4xl md:text-5xl text-ocean mb-4">
            Explore Our Resort
          </h2>
          <p className="text-xl text-ocean/70 max-w-2xl mx-auto">
            Browse through our collection of stunning views, luxury suites, and world-class amenities
          </p>
        </div>

        {/* Mobile Filter Button */}
        <div className="md:hidden mb-8 flex justify-center">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-ocean/20 text-ocean rounded-full font-semibold shadow-md hover:shadow-lg transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filter Categories</span>
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-ocean text-white text-xs font-bold">
              {categories.findIndex((c) => c.id === activeCategory) === -1 ? 0 : categories.findIndex((c) => c.id === activeCategory) === 0 ? categories.length : 1}
            </span>
          </button>
        </div>

        {/* Mobile Filter Modal */}
        {mobileFilterOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end">
            <div className="bg-white w-full rounded-t-3xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-['Playfair Display'] text-2xl text-ocean">Select Category</h3>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-10 h-10 rounded-full bg-ocean/10 flex items-center justify-center text-ocean hover:bg-ocean/20 transition-colors"
                  aria-label="Close filter"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Category List */}
              <div className="space-y-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveCategory(category.id);
                      setMobileFilterOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-semibold transition-all duration-300 ${
                      activeCategory === category.id
                        ? "bg-gradient-to-r from-ocean to-ocean/90 text-white shadow-lg"
                        : "bg-ocean/5 text-ocean hover:bg-ocean/10"
                    }`}
                  >
                    <span className="text-2xl">{category.icon}</span>
                    <span className="flex-1 text-left text-lg">{category.name}</span>
                    {activeCategory === category.id && (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Category Filters */}
        <div className="hidden md:flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`group relative px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeCategory === category.id
                  ? "bg-gradient-to-r from-ocean to-ocean/90 text-white shadow-lg scale-105"
                  : "bg-white text-ocean hover:bg-ocean/5 border border-ocean/20"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{category.icon}</span>
                <span>{category.name}</span>
              </span>
              {activeCategory === category.id && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-gold rounded-full"></span>
              )}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredImages.map((image, index) => (
            <div
              key={index}
              onClick={() => openLightbox(index)}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              {/* Image */}
              <div className="relative w-full h-full bg-ocean/5">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-ocean/80 via-ocean/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-white font-semibold text-lg">{image.alt}</p>
                  <div className="flex items-center gap-2 mt-2 text-white/80">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                    <span className="text-sm">Click to view</span>
                  </div>
                </div>
              </div>

              {/* Category Badge */}
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-ocean text-xs font-semibold shadow-lg">
                {categories.find((c) => c.id === image.category)?.name}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredImages.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-ocean/60 text-lg">No images in this category yet</p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300 z-10"
            aria-label="Close lightbox"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Zoom Controls */}
          <div className="absolute top-6 left-6 flex gap-2 z-10">
            <button
              onClick={zoomIn}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300"
              aria-label="Zoom in"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            <button
              onClick={zoomOut}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300"
              aria-label="Zoom out"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6" />
              </svg>
            </button>
            <div className="px-4 h-12 rounded-full bg-white/10 text-white flex items-center justify-center font-semibold">
              {Math.round(imageScale * 100)}%
            </div>
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-semibold z-10">
            {currentImageIndex + 1} / {filteredImages.length}
          </div>

          {/* Previous Button */}
          <button
            onClick={prevImage}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300 z-10"
            aria-label="Previous image"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Next Button */}
          <button
            onClick={nextImage}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300 z-10"
            aria-label="Next image"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Image Container */}
          <div className="relative max-w-7xl max-h-[90vh] overflow-auto px-20">
            <div
              style={{
                transform: `scale(${imageScale})`,
                transition: "transform 0.3s ease-out",
              }}
              className="relative w-full h-full"
            >
              <Image
                src={filteredImages[currentImageIndex].src}
                alt={filteredImages[currentImageIndex].alt}
                width={1920}
                height={1080}
                className="object-contain max-h-[80vh] w-auto mx-auto"
                priority
              />
            </div>
          </div>

          {/* Image Title */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm text-white font-semibold text-lg max-w-2xl text-center">
            {filteredImages[currentImageIndex].alt}
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-4 text-white/60 text-xs">
            <span>← → Navigate</span>
            <span>ESC Close</span>
          </div>
        </div>
      )}

      {/* Keyboard Navigation */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-40"
          onKeyDown={(e) => {
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowLeft") prevImage();
            if (e.key === "ArrowRight") nextImage();
          }}
          tabIndex={0}
        />
      )}
    </section>
  );
}
