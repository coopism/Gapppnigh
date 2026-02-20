import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ══════════════════════════════════════════════════════════════════════════════
// TUNING CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
export const PARALLAX_SPEED   = 0.12;   // 12% of scrollY → subtle bg shift
export const NOISE_OPACITY    = 0.030;  // 3% grain overlay
export const DEBUG_HERO       = true;   // show debug HUD

// Fallback gradient if images haven't been dropped in yet
const SKY_FALLBACK = "linear-gradient(180deg,#a8b8e2 0%,#b8c6ec 10%,#c8d4f4 25%,#d8e2f8 45%,#e4eafe 62%,#edf2ff 80%,#f4f7ff 100%)";

// Inline SVG noise texture (fractal noise, used as grain overlay)
const NOISE_URI = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

// ══════════════════════════════════════════════════════════════════════════════
// HeroBackground — image-texture based cloud background with parallax + grain
// ══════════════════════════════════════════════════════════════════════════════
export function HeroBackground({ children, className }: { children?: React.ReactNode; className?: string }) {
  const bgRef  = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [dbgSy, setDbgSy] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Preload hero image
  useEffect(() => {
    const img = new Image();
    img.src = "/clay/clouds-hero.webp";
    img.onload = () => setImgLoaded(true);
    // If image fails to load, fallback gradient stays visible
    img.onerror = () => setImgLoaded(false);
  }, []);

  // Scroll-linked parallax on the background layer
  useEffect(() => {
    let ticking = false;
    const tick = () => {
      if (ticking) return;
      ticking = true;
      rafRef.current = requestAnimationFrame(() => {
        const sy = window.scrollY;
        if (bgRef.current) {
          bgRef.current.style.transform = `translate3d(0,${-sy * PARALLAX_SPEED}px,0)`;
        }
        if (DEBUG_HERO) setDbgSy(sy);
        ticking = false;
      });
    };
    window.addEventListener("scroll", tick, { passive: true });
    tick();
    return () => { window.removeEventListener("scroll", tick); cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className={cn("relative min-h-screen", className)} style={{ overflow: "hidden" }}>
      {/* ── Fixed cloud background layer ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div
          ref={bgRef}
          style={{
            position: "absolute",
            top: "-10%",
            left: 0,
            width: "100%",
            height: "120%",
            background: SKY_FALLBACK,
            willChange: "transform",
            ...(imgLoaded ? {
              backgroundImage: `url("/clay/clouds-hero.webp")`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              backgroundRepeat: "no-repeat",
            } : {}),
          }}
        />

        {/* ── Noise/grain overlay ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: NOISE_URI,
            backgroundRepeat: "repeat",
            backgroundSize: "256px 256px",
            opacity: NOISE_OPACITY,
            mixBlendMode: "overlay",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ── Debug HUD ── */}
      {DEBUG_HERO && (
        <div style={{
          position: "fixed", top: 6, left: 6, zIndex: 9999, pointerEvents: "none",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          <div style={{
            background: "rgba(0,0,0,0.75)", color: "#0f0", fontSize: 10,
            fontFamily: "monospace", padding: "2px 6px", borderRadius: 3, whiteSpace: "nowrap",
          }}>
            BG ty:-{Math.round(dbgSy * PARALLAX_SPEED)}px ({Math.round(PARALLAX_SPEED * 100)}%)
            {imgLoaded ? " [IMG]" : " [FALLBACK]"}
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <div className="relative" style={{ zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
}
