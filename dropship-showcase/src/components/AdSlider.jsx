import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { normalizeImageUrl } from "../utils/productsApi";

function createFallbackImage({ accentA, accentB, accentC }) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-label="Hero slide">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${accentA}"/>
          <stop offset="55%" stop-color="${accentB}"/>
          <stop offset="100%" stop-color="${accentC}"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#bg)" />
      <circle cx="1260" cy="210" r="250" fill="url(#glow)" />
      <circle cx="260" cy="680" r="220" fill="#ffffff" fill-opacity="0.12" />
      <rect x="135" y="165" width="440" height="560" rx="42" fill="#ffffff" fill-opacity="0.16" stroke="#ffffff" stroke-opacity="0.24" />
      <rect x="195" y="230" width="320" height="255" rx="28" fill="#ffffff" fill-opacity="0.18" />
      <rect x="195" y="520" width="320" height="58" rx="20" fill="#ffffff" fill-opacity="0.26" />
      <rect x="195" y="595" width="260" height="20" rx="10" fill="#ffffff" fill-opacity="0.22" />
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const FALLBACK_SLIDES = [
  {
    id: 1,
    image: createFallbackImage({
      accentA: "#0ea5e9",
      accentB: "#2563eb",
      accentC: "#0f172a",
    }),
  },
  {
    id: 2,
    image: createFallbackImage({
      accentA: "#f97316",
      accentB: "#ec4899",
      accentC: "#1d4ed8",
    }),
  },
  {
    id: 3,
    image: createFallbackImage({
      accentA: "#10b981",
      accentB: "#059669",
      accentC: "#0f172a",
    }),
  },
];

const AUTO_INTERVAL = 4500;
const API = (import.meta.env.VITE_API_URL || "https://admin.elitedrop.net.in/api").replace(/\/$/, "");

export default function AdSlider() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [slides, setSlides] = useState(FALLBACK_SLIDES);

  useEffect(() => {
    let mounted = true;

    fetch(`${API}/products/hero-slides/`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((payload) => {
        if (!mounted || !Array.isArray(payload?.slides)) return;
        const normalized = payload.slides
          .map((slide) => {
            const image = normalizeImageUrl(slide?.image || "") || createFallbackImage({
              accentA: "#0ea5e9",
              accentB: "#2563eb",
              accentC: "#0f172a",
            });
            return {
              id: slide.id,
              image,
            };
          })
          .filter(Boolean);

        if (normalized.length) {
          setSlides(normalized);
          setCurrent(0);
        }
      })
      .catch(() => {
        // Keep fallback slides when API is unavailable.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const next = useCallback(() => {
    if (!slides.length) return;
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    if (!slides.length) return;
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, AUTO_INTERVAL);
    return () => clearInterval(t);
  }, [paused, next]);

  useEffect(() => {
    setCurrent((prev) => (slides.length ? prev % slides.length : 0));
  }, [slides.length]);

  const slide = slides[current] || FALLBACK_SLIDES[0];

  return (
    <section
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative overflow-hidden h-[88vh] min-h-[680px] md:h-[106vh] select-none">
        <img
          src={slide.image}
          alt="Hero slide"
          className="absolute inset-0 h-full w-full object-cover object-top"
          loading="eager"
          onError={(event) => {
            const target = event.currentTarget;
            if (target.dataset.fallbackApplied === "1") return;
            target.dataset.fallbackApplied = "1";
            target.src = createFallbackImage({
              accentA: "#0ea5e9",
              accentB: "#2563eb",
              accentC: "#0f172a",
            });
          }}
        />

        {/* Prev / Next arrows */}
        <button
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/35 hover:bg-black/55 text-white flex items-center justify-center backdrop-blur-sm transition"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={next}
          aria-label="Next slide"
          className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/35 hover:bg-black/55 text-white flex items-center justify-center backdrop-blur-sm transition"
        >
          <ChevronRight size={20} />
        </button>

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Dots */}
      <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current
                ? "w-8 bg-white"
                : "w-2 bg-white/60"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
