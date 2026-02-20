import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ══════════════════════════════════════════════════════════════════════════════
// TUNING CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
export const CURTAIN_OFFSET_START  = -200;  // start animating 200px before element top
export const CURTAIN_OFFSET_END    = 500;   // finish animating 500px after element top
export const CURTAIN_MAX_TRANSLATE = 180;   // px upward
export const CURTAIN_MAX_BLUR     = 10;    // px blur at exit
export const DEBUG_CURTAIN        = true;

// ══════════════════════════════════════════════════════════════════════════════
// CloudBankCurtain — scroll-linked cloud bank overlay (image-based)
//
// Sits at the hero → content boundary, overlapping both sections.
// Uses clouds-bank.webp (transparent PNG/WebP) for the puffy cloud bank.
// Falls back to a CSS gradient cloud shape if image isn't available.
// ══════════════════════════════════════════════════════════════════════════════
export function CloudBankCurtain({ className }: { className?: string }) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);
  const [dbg, setDbg] = useState({ ty: 0, op: 1 });
  const [imgLoaded, setImgLoaded] = useState(false);

  // Preload cloud bank image
  useEffect(() => {
    const img = new Image();
    img.src = "/clay/clouds-bank.png";
    img.onload = () => setImgLoaded(true);
    img.onerror = () => setImgLoaded(false);
  }, []);

  // Scroll-linked animation: translate up + fade out + blur
  useEffect(() => {
    let ticking = false;
    const tick = () => {
      if (ticking) return;
      ticking = true;
      rafRef.current = requestAnimationFrame(() => {
        if (!wrapRef.current || !innerRef.current) { ticking = false; return; }
        const top   = wrapRef.current.offsetTop;
        const sy    = window.scrollY;
        const start = top + CURTAIN_OFFSET_START;
        const end   = top + CURTAIN_OFFSET_END;
        const range = end - start;
        const progress = Math.max(0, Math.min(1, (sy - start) / range));

        const ty = -progress * CURTAIN_MAX_TRANSLATE;
        const op = 1 - progress;
        const bl = progress * CURTAIN_MAX_BLUR;

        innerRef.current.style.transform = `translate3d(0,${ty}px,0)`;
        innerRef.current.style.opacity   = String(Math.max(0, op));
        innerRef.current.style.filter    = `blur(${bl}px)`;

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
      ref={wrapRef}
      className={cn("relative w-full pointer-events-none", className)}
      style={{
        height: 280,
        marginTop: -120,
        marginBottom: -160,
        zIndex: 12,
        position: "relative",
      }}
    >
      <div
        ref={innerRef}
        style={{
          position: "absolute",
          inset: 0,
          willChange: "transform, opacity, filter",
          ...(imgLoaded ? {
            backgroundImage: `url("/clay/clouds-bank.png")`,
            backgroundSize: "100% 100%",
            backgroundPosition: "center bottom",
            backgroundRepeat: "no-repeat",
          } : {
            // Fallback: gradient cloud bank shape
            background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0.50) 45%, rgba(255,255,255,0.80) 70%, rgba(255,255,255,0.95) 90%, white 100%)",
          }),
        }}
      />

      {/* Debug label */}
      {DEBUG_CURTAIN && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: "rgba(0,0,0,0.75)", color: "#ff0", fontSize: 10,
          fontFamily: "monospace", padding: "2px 6px", borderRadius: 3, zIndex: 999,
        }}>
          CURTAIN y:{dbg.ty}px op:{dbg.op} {imgLoaded ? "[IMG]" : "[FALLBACK]"}
        </div>
      )}
    </div>
  );
}
