"use client";
import { useEffect, useState } from "react";
import Carousel from "./Carousel";

export default function ViewsCarousel({
  height = "20vh",
}: {
  height?: number | string;
}) {
  const [slides, setSlides] = useState<{ src: string; alt: string }[]>([
    { src: "/views/3d_sun_set_view.png", alt: "Ocean view" },
    { src: "/views/View-03.png", alt: "Rooms" },
    { src: "/views/View-04.png", alt: "Rooftop" },
    { src: "/views/View-05.png", alt: "Beach" },
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
  return <Carousel height={height} slides={slides} />;
}
