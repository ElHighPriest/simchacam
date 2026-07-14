"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type GuideLightboxFigureProps = {
  alt: string;
  caption?: string;
  height?: number;
  src: string;
  width?: number;
};

export default function GuideLightboxFigure({
  alt,
  caption,
  height = 1024,
  src,
  width = 1536,
}: GuideLightboxFigureProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      <figure className="my-12">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group block w-full overflow-hidden rounded-[1.5rem] border border-gold/25 bg-white text-left shadow-[0_18px_50px_rgba(11,31,58,0.11)]"
          aria-label="Open image larger"
        >
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes="(max-width: 768px) 100vw, 768px"
            className="h-auto w-full transition duration-300 group-hover:scale-[1.01]"
          />
          <span className="block border-t border-gold/20 bg-white/85 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#80652f]">
            Click to enlarge
          </span>
        </button>

        {caption && (
          <figcaption className="mt-4 text-center text-sm leading-6 text-muted-navy">
            {caption}
          </figcaption>
        )}
      </figure>

      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-navy/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged image"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-h-[92dvh] w-full max-w-7xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-warm-white px-4 py-2 text-sm font-semibold text-navy shadow-lg transition hover:bg-white"
            >
              Close
            </button>
            <div className="overflow-auto rounded-[1.25rem] bg-white p-2 shadow-2xl">
              <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                sizes="100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
