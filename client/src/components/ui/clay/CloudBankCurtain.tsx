import React, { useRef, useEffect, useState } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// TUNING CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
// Scroll is measured as fraction of window.innerHeight
export const CURTAIN_START_VH      = 0.15;  // start fading at 15% of vh scrolled
export const CURTAIN_END_VH        = 1.10;  // fully gone at 110% of vh scrolled
export const CURTAIN_MAX_TRANSLATE = 340;   // px upward total travel
export const CURTAIN_HEIGHT        = 500;   // px height of the curtain element
export const DEBUG_CURTAIN         = true;

// ══════════════════════════════════════════════════════════════════════════════
// CloudBankCurtain — position:fixed cloud bank that sits above the sky layer
// (zIndex 5) and below page content (zIndex 10).
//
// Being fixed means its transparent areas show the fixed sky background
// through them — exactly like a real cloud bank hovering over the sky.
// Scroll-linked: translates up + fades out as user scrolls past the hero.
// ══════════════════════════════════════════════════════════════════════════════
export function CloudBankCurtain() {
  const ref    = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [dbg, setDbg] = useState({ ty: 0, op: 1 });
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = "/clay/clouds-bank.png";
    img.onload  = () => setImgLoaded(true);
    img.onerror = () => setImgLoaded(false);
  }, []);

  useEffect(() => {
    let ticking = false;
    const tick = () => {
      if (ticking) return;
      ticking = true;
      rafRef.current = requestAnimationFrame(() => {
        const sy    = window.scrollY;
        const vh    = window.innerHeight;
        const start = vh * CURTAIN_START_VH;
        const end   = vh * CURTAIN_END_VH;
        const progress = Math.max(0, Math.min(1, (sy - start) / (end - start)));

        const ty = -progress * CURTAIN_MAX_TRANSLATE;
        const op = 1 - progress;

        if (ref.current) {
          ref.current.style.transform = `translate3d(0,${ty}px,0)`;
          ref.current.style.opacity   = String(Math.max(0, op));
        }

        if (DEBUG_CURTAIN) setDbg({ ty: Math.round(ty), op: Math.round(op * 100) / 100 });
        ticking = false;
      });
    };
    window.addEventListener("scroll", tick, { passive: true });
    tick();
    return () => { window.removeEventListener("scroll", tick); cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: CURTAIN_HEIGHT,
        zIndex: 5,
        pointerEvents: "none",
        willChange: "transform, opacity",
        backgroundImage: `url("/clay/clouds-bank.png")`,
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
      }}
    >
      {DEBUG_CURTAIN && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: "rgba(0,0,0,0.75)", color: "#ff0", fontSize: 10,
          fontFamily: "monospace", padding: "2px 6px", borderRadius: 3,
        }}>
          CURTAIN y:{dbg.ty}px op:{dbg.op} {imgLoaded ? "[IMG]" : "[FALLBACK]"}
        </div>
      )}
    </div>
  );
}
