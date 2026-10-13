"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

type ProductImageGalleryProps = {
  productTitle: string;
  images: string[];
  isIllustrative?: boolean;
};

export default function ProductImageGallery({
  productTitle,
  images,
  isIllustrative = false,
}: ProductImageGalleryProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const goToImage = (index: number) => {
    const viewport = viewportRef.current;
    if (!viewport || images.length === 0) return;

    const safeIndex = Math.max(0, Math.min(images.length - 1, index));
    viewport.scrollTo({
      left: safeIndex * viewport.clientWidth,
      behavior: "smooth",
    });
    setActiveIndex(safeIndex);
  };

  const handleScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport || viewport.clientWidth === 0) return;

    const nextIndex = Math.round(viewport.scrollLeft / viewport.clientWidth);
    setActiveIndex(Math.max(0, Math.min(images.length - 1, nextIndex)));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-white/5 sm:rounded-[1.5rem] sm:p-2.5">
      <div className="relative">
        {/* Fixed responsive height keeps the entire image visible at once. */}
        <div
          ref={viewportRef}
          onScroll={handleScroll}
          role="region"
          aria-label={`${productTitle} image gallery`}
          tabIndex={0}
          className="pw-product-gallery-track flex h-[180px] w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-xl bg-slate-50 sm:h-[240px] sm:rounded-2xl lg:h-[300px] xl:h-[320px] dark:bg-slate-950/40"
          style={{
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorX: "contain",
          }}
        >
          {images.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="relative flex h-full min-w-full shrink-0 snap-center snap-always items-center justify-center"
            >
              <img
                src={src}
                alt={`${productTitle} — gallery image ${index + 1} of ${images.length}`}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                className="block h-full w-full select-none object-contain p-1 sm:p-1.5"
                style={{ maxHeight: "100%" }}
              />
              <span className="absolute bottom-3 right-3 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm dark:border-white/15 dark:bg-slate-950/85 dark:text-slate-100">
                {index + 1} / {images.length}
              </span>
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goToImage(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Previous product image"
              className="absolute left-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-md transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 sm:left-2 sm:h-9 sm:w-9 dark:border-white/15 dark:bg-slate-950/90 dark:text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => goToImage(activeIndex + 1)}
              disabled={activeIndex === images.length - 1}
              aria-label="Next product image"
              className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-md transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 sm:right-2 sm:h-9 sm:w-9 dark:border-white/15 dark:bg-slate-950/90 dark:text-white"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5 sm:mt-2.5 sm:gap-2" aria-label="Choose product image">
          {images.map((src, index) => (
            <button
              key={`${src}-thumbnail-${index}`}
              type="button"
              onClick={() => goToImage(index)}
              aria-label={`Show product image ${index + 1}`}
              aria-current={activeIndex === index ? "true" : undefined}
              className={`h-10 w-10 overflow-hidden rounded-lg border-2 bg-slate-50 transition sm:h-12 sm:w-12 ${activeIndex === index ? "border-indigo-600 ring-2 ring-indigo-100 dark:border-indigo-400 dark:ring-indigo-400/20" : "border-slate-200 hover:border-indigo-300 dark:border-white/15 dark:hover:border-indigo-400/60"}`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:mt-2 sm:text-xs">
        <span>Swipe photos</span>
        <span aria-live="polite">
          {images.length > 0 ? `${activeIndex + 1} of ${images.length}` : "No photos"}
        </span>
      </div>

      {isIllustrative && (
        <p className="mt-1.5 px-1 text-[10px] leading-4 text-amber-800 dark:text-amber-200 sm:text-[11px] sm:leading-5">
          Illustrative sample photos for this demo listing; confirm the exact model before buying.
        </p>
      )}

      <style jsx>{`
        .pw-product-gallery-track::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
