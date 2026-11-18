"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { EventItem } from "@/lib/data/festivalData";

export interface ComicBookData {
  event: EventItem;
  issueNumber: number;
  bgColor: string;
  accentColor: string;
  burstText: string;
}

export interface OpenComicBookModalProps {
  event: EventItem | null;
  comicData: ComicBookData | null;
  isOpen: boolean;
  onClose: () => void;
  leftPageChildren?: React.ReactNode;
  rightPageChildren?: React.ReactNode;
}

const OPEN_MS = 760;
const CLOSE_MS = 600;
/** Let the closed cover register before the swing starts. */
const OPEN_HOLD_MS = 50;

const CLOSED_BOOK_TRANSFORM = "translateX(-25%)";
const OPEN_BOOK_TRANSFORM = "translateX(0)";

const halftone = (alpha: number) =>
  `radial-gradient(rgba(28, 25, 23, ${alpha}) 1.5px, transparent 1.5px)`;

export function OpenComicBookModal({
  event,
  comicData,
  isOpen,
  onClose,
  leftPageChildren,
  rightPageChildren,
}: OpenComicBookModalProps) {
  const [displayedEvent, setDisplayedEvent] = useState<EventItem | null>(event);
  const [displayedComic, setDisplayedComic] = useState<ComicBookData | null>(comicData);
  const [coverOpen, setCoverOpen] = useState(false);
  // Keeps the book on screen for the length of the closing swing.
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = isOpen || isClosing;

  // Keep the last issue on screen while the cover swings shut.
  if (event && event !== displayedEvent) {
    setDisplayedEvent(event);
  }
  if (comicData && comicData !== displayedComic) {
    setDisplayedComic(comicData);
  }

  useEffect(() => {
    if (!isOpen) return;
    const holdTimer = setTimeout(() => setCoverOpen(true), OPEN_HOLD_MS);
    return () => clearTimeout(holdTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMounted]);

  const handleClose = useCallback(() => {
    setCoverOpen(false);
    setIsClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setIsClosing(false);
      onClose();
    }, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMounted, handleClose]);

  if (!isMounted || !displayedEvent || !displayedComic) return null;

  const duration = coverOpen ? OPEN_MS : CLOSE_MS;
  const coverEase = coverOpen
    ? "cubic-bezier(0.33, 0.05, 0.16, 1)"
    : "cubic-bezier(0.4, 0.05, 0.55, 1)";
  const bookEase = "cubic-bezier(0.33, 1, 0.68, 1)";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${displayedEvent.title} rulebook`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8 select-none"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.95)" }}
      onClick={handleClose}
    >
      <div
        className="relative flex w-full max-w-5xl flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="mb-3 flex items-center justify-end w-full px-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-full bg-[#EF4444] text-white border-2 border-[#1C1917] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[3px_3px_0px_#1C1917] hover:bg-[#DC2626] active:translate-y-[1px] transition-colors cursor-pointer"
          >
            <span>✕ CLOSE BOOK</span>
            <span className="text-[10px] font-mono text-white/80 hidden sm:inline">[ESC]</span>
          </button>
        </div>

        {/* Stage holds the perspective so the cover hinges around the spine. */}
        <div
          className="relative w-full"
          style={{
            perspective: "2400px",
            perspectiveOrigin: "50% 45%",
            height: "clamp(320px, min(calc(100dvh - 150px), 88vw), 660px)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transformStyle: "preserve-3d",
              transform: coverOpen ? OPEN_BOOK_TRANSFORM : CLOSED_BOOK_TRANSFORM,
              transition: `transform ${duration}ms ${bookEase} 0ms`,
              willChange: "transform",
            }}
          >
            {/* Soft ambient shadow — a gradient, so no page-shaped dark
                rectangle can ever appear mid-swing. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                transformOrigin: "right center",
                transform: coverOpen
                  ? "translate(12px, 18px) scaleX(1) translateZ(-40px)"
                  : "translate(12px, 18px) scaleX(0.5) translateZ(-40px)",
                transition: `transform ${duration}ms ${bookEase} 0ms`,
                background:
                  "radial-gradient(58% 52% at 50% 55%, rgba(0, 0, 0, 0.6), transparent 72%)",
              }}
            />

            {/* Page block seen edge-on behind the right page. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
              style={{ transform: "translateZ(-2px)" }}
            >
              {[13, 9, 5].map((offset, index) => (
                <div
                  key={offset}
                  className="absolute inset-0 rounded-r-2xl border-[3px] border-[#1C1917]"
                  style={{
                    transform: `translate(${offset}px, ${offset}px)`,
                    backgroundColor: ["#D6CCB2", "#E4DCC6", "#F1EADA"][index],
                  }}
                />
              ))}
            </div>

            {/* Right Page: the first page of the rulebook. It sits still while
                the cover swings off it. */}
            <section className="absolute inset-y-0 right-0 w-1/2 overflow-hidden rounded-r-2xl md:rounded-r-3xl border-4 border-[#1C1917] bg-[#FFFDF7] p-3 sm:p-5">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-10"
                style={{
                  background:
                    "linear-gradient(to right, rgba(28, 25, 23, 0.3), transparent)",
                }}
              />
              <div className="relative flex h-full flex-col">
                {rightPageChildren}
              </div>
            </section>

            {/* The leaf is the front cover AND the left page: the left page is
                painted on its front, the cover art on its back. Opening the
                cover is literally turning the left page into place, so no
                layer ever fades in or out. */}
            <div
              className="absolute inset-y-0 left-0 w-1/2"
              style={{
                transformStyle: "preserve-3d",
                transformOrigin: "right center",
                transform: `translateZ(1px) rotateY(${coverOpen ? 0 : 180}deg)`,
                transition: `transform ${duration}ms ${coverEase} 0ms`,
                willChange: "transform",
              }}
            >
              {/* Front of the leaf = left page (visible once the book is open). */}
              <section
                className="absolute inset-0 overflow-hidden rounded-l-2xl md:rounded-l-3xl border-4 border-[#1C1917] bg-[#FFFDF7] p-3 sm:p-5"
                style={{
                  backfaceVisibility: "hidden",
                  backgroundImage: halftone(0.16),
                  backgroundSize: "18px 18px",
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 right-0 w-10"
                  style={{
                    background:
                      "linear-gradient(to left, rgba(28, 25, 23, 0.3), transparent)",
                  }}
                />
                <div className="relative flex h-full flex-col">
                  {leftPageChildren}
                </div>
              </section>

              {/* Back of the leaf = the cover the reader sees while shut. */}
              <div
                className="absolute inset-0 overflow-hidden rounded-r-2xl md:rounded-r-3xl border-4 border-[#1C1917] bg-[#FF4500]"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  backgroundImage: halftone(0.22),
                  backgroundSize: "16px 16px",
                }}
              >
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-12"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(28, 25, 23, 0.35), transparent)",
                  }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(108deg, rgba(255, 255, 255, 0.24), transparent 40%, rgba(0, 0, 0, 0.16))",
                  }}
                />
                <div className="relative flex h-full flex-col justify-between p-4 sm:p-6 md:p-8">
                  <span className="w-fit whitespace-nowrap border-2 border-[#1C1917] bg-[#FFCC00] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#1C1917] shadow-[3px_3px_0px_#1C1917] sm:px-2.5 sm:text-xs">
                    YUVAAN &apos;27 • ISSUE #
                    {displayedComic.issueNumber.toString().padStart(2, "0")}
                  </span>
                  <div className="text-center">
                    <h2 className="mb-2 text-xl font-black uppercase leading-[0.95] tracking-wide text-[#FFFDF7] [text-shadow:3px_3px_0_#1C1917] sm:text-3xl md:text-4xl">
                      {displayedEvent.title}
                    </h2>
                    <p className="inline-block border border-[#FFCC00] bg-[#1C1917] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#FFCC00] shadow-[2px_2px_0px_#000] sm:text-xs">
                      {displayedComic.burstText}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-white sm:text-xs">
                    <span>UNFOLDING BOOK...</span>
                    <span aria-hidden>&rarr;</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Spine crease, above both pages and the cover edge. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-1/2 w-3 sm:w-4 border-x border-[#1C1917]/35 bg-gradient-to-r from-[#1C1917]/45 via-[#1C1917]/10 to-[#1C1917]/45"
              style={{ transform: "translateX(-50%) translateZ(2px)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
