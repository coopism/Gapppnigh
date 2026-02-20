import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ── TUNING CONSTANTS ─────────────────────────────────────────────────────────
// Adjust these to taste. Values = fraction of scrollY applied as translateY.
export const PARALLAX_FAR  = 0.07;   // 7% of scroll → subtle drift
export const PARALLAX_MID  = 0.15;   // 15% → noticeable
export const PARALLAX_NEAR = 0.26;   // 26% → obvious foreground shift

export const BLUR_FAR  = 38;
export const BLUR_MID  = 14;
export const BLUR_NEAR = 5;

export const OPACITY_FAR  = 0.55;
export const OPACITY_MID  = 0.78;
export const OPACITY_NEAR = 0.88;

// Set true to show debug labels + outlines on each layer
export const DEBUG_PARALLAX = true;

const SKY = "linear-gradient(180deg,#a8b8e2 0%,#b8c6ec 10%,#c8d4f4 25%,#d8e2f8 45%,#e4eafe 62%,#edf2ff 80%,#f4f7ff 100%)";

// ── CLOUD DATA ───────────────────────────────────────────────────────────────
// [cx, cy, rx, ry, gradient-key] — positions in a 1440×1400 viewBox
// The viewBox is intentionally TALLER than the viewport so translation
// reveals different cloud positions (this is why fixed+slice failed before).
type CD = [number, number, number, number, string];

const FAR_CLOUDS: CD[] = [
  [100,60,120,55,"a"],[340,30,100,48,"b"],[560,85,130,60,"c"],
  [780,40,110,52,"a"],[1020,70,125,58,"b"],[1260,35,105,50,"c"],
  [1400,80,95,45,"a"],[200,220,135,62,"b"],[460,260,115,55,"c"],
  [700,200,125,58,"a"],[950,250,110,52,"b"],[1180,230,120,56,"c"],
  [80,400,130,60,"a"],[330,440,100,48,"b"],[580,390,120,55,"c"],
  [830,430,110,52,"a"],[1100,410,125,58,"b"],[1350,450,105,50,"c"],
  [180,600,115,55,"a"],[500,640,130,60,"b"],[850,610,120,55,"c"],
  [1200,650,110,52,"a"],[60,800,125,58,"b"],[400,830,100,48,"c"],
  [750,790,135,62,"a"],[1100,820,115,55,"b"],
];

const MID_CLOUDS: CD[] = [
  [80,120,155,72,"a"],[300,90,140,65,"b"],[540,145,160,75,"c"],
  [780,80,145,68,"a"],[1040,130,155,72,"b"],[1280,95,140,65,"c"],
  [160,310,160,75,"a"],[420,340,145,68,"b"],[680,290,155,72,"c"],
  [950,330,140,65,"a"],[1200,310,150,70,"b"],[60,500,160,75,"c"],
  [350,540,145,68,"a"],[640,490,155,72,"b"],[920,530,140,65,"c"],
  [1180,510,150,70,"a"],[250,700,155,72,"b"],[600,740,145,68,"c"],
  [950,710,160,75,"a"],[1300,730,140,65,"b"],
];

const NEAR_CLOUDS: CD[] = [
  [60,250,110,52,"a"],[1380,230,105,50,"b"],[200,440,120,55,"c"],
  [1260,420,115,52,"a"],[440,520,110,50,"b"],[1080,510,120,55,"c"],
  [100,650,125,58,"a"],[700,620,115,55,"b"],[1350,640,110,52,"c"],
  [350,780,120,55,"a"],[900,760,125,58,"b"],[1200,800,110,52,"c"],
  [550,900,115,55,"a"],[80,950,120,58,"b"],[1400,920,105,50,"c"],
];

// ── CloudSVG — renders one layer ─────────────────────────────────────────────
function CloudSVG({ clouds, prefix }: { clouds: CD[]; prefix: string }) {
  return (
    <svg
      viewBox="0 0 1440 1400"
      preserveAspectRatio="xMidYMin slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "140%", display: "block" }}
    >
      <defs>
        {/* Cool white — top-lit */}
        <radialGradient id={`${prefix}-a`} cx="45%" cy="22%" r="62%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="35%" stopColor="#f2f6ff" stopOpacity="0.96"/>
          <stop offset="70%" stopColor="#d0ddf4" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#b0c0e8" stopOpacity="0"/>
        </radialGradient>
        {/* Warm white — slight pink */}
        <radialGradient id={`${prefix}-b`} cx="48%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="32%" stopColor="#f8f2ff" stopOpacity="0.96"/>
          <stop offset="68%" stopColor="#dccef6" stopOpacity="0.48"/>
          <stop offset="100%" stopColor="#c0b4e8" stopOpacity="0"/>
        </radialGradient>
        {/* Blue white */}
        <radialGradient id={`${prefix}-c`} cx="52%" cy="25%" r="64%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="38%" stopColor="#eaf2ff" stopOpacity="0.96"/>
          <stop offset="72%" stopColor="#c4d6f2" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#a8c0e4" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {clouds.map(([cx, cy, rx, ry, g], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${prefix}-${g})`} />
      ))}
    </svg>
  );
}

// ── Debug overlay ────────────────────────────────────────────────────────────
function DebugLabel({ label, scrollY, speed }: { label: string; scrollY: number; speed: number }) {
  const ty = Math.round(scrollY * speed);
  return (
    <div style={{
      position: "absolute", top: 8, left: label === "FAR" ? 8 : label === "MID" ? 108 : 208,
      background: "rgba(0,0,0,0.7)", color: "#0f0", fontSize: 11, fontFamily: "monospace",
      padding: "3px 8px", borderRadius: 4, zIndex: 999, pointerEvents: "none",
    }}>
      {label} ty:{ty}px ({Math.round(speed * 100)}%)
    </div>
  );
}

// ── CloudBackdrop ────────────────────────────────────────────────────────────
export function CloudBackdrop({ children, className }: { children?: React.ReactNode; className?: string }) {
  const farRef  = useRef<HTMLDivElement>(null);
  const midRef  = useRef<HTMLDivElement>(null);
  const nearRef = useRef<HTMLDivElement>(null);
  const rafRef  = useRef<number>(0);
  const [dbgScroll, setDbgScroll] = useState(0);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafRef.current = requestAnimationFrame(() => {
        const sy = window.scrollY;
        if (farRef.current)  farRef.current.style.transform  = `translate3d(0,${-sy * PARALLAX_FAR}px,0)`;
        if (midRef.current)  midRef.current.style.transform  = `translate3d(0,${-sy * PARALLAX_MID}px,0)`;
        if (nearRef.current) nearRef.current.style.transform = `translate3d(0,${-sy * PARALLAX_NEAR}px,0)`;
        if (DEBUG_PARALLAX) setDbgScroll(sy);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(rafRef.current); };
  }, []);

  const layerBase: React.CSSProperties = {
    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
    pointerEvents: "none", willChange: "transform",
  };

  return (
    <div className={cn("relative min-h-screen overflow-hidden", className)} style={{ background: SKY }}>
      {/* Sticky viewport that pins the cloud layers while content scrolls */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div ref={farRef} style={{
          ...layerBase, filter: `blur(${BLUR_FAR}px)`, opacity: OPACITY_FAR,
          ...(DEBUG_PARALLAX ? { outline: "1px dashed rgba(255,0,0,0.3)" } : {}),
        }}>
          <CloudSVG clouds={FAR_CLOUDS} prefix="cf" />
        </div>
        <div ref={midRef} style={{
          ...layerBase, filter: `blur(${BLUR_MID}px)`, opacity: OPACITY_MID,
          ...(DEBUG_PARALLAX ? { outline: "1px dashed rgba(0,255,0,0.3)" } : {}),
        }}>
          <CloudSVG clouds={MID_CLOUDS} prefix="cm" />
        </div>
        <div ref={nearRef} style={{
          ...layerBase, filter: `blur(${BLUR_NEAR}px)`, opacity: OPACITY_NEAR,
          ...(DEBUG_PARALLAX ? { outline: "1px dashed rgba(0,100,255,0.3)" } : {}),
        }}>
          <CloudSVG clouds={NEAR_CLOUDS} prefix="cn" />
        </div>
      </div>

      {/* Debug HUD */}
      {DEBUG_PARALLAX && (
        <div style={{ position: "fixed", top: 0, left: 0, zIndex: 9999, pointerEvents: "none" }}>
          <DebugLabel label="FAR" scrollY={dbgScroll} speed={PARALLAX_FAR} />
          <DebugLabel label="MID" scrollY={dbgScroll} speed={PARALLAX_MID} />
          <DebugLabel label="NEAR" scrollY={dbgScroll} speed={PARALLAX_NEAR} />
        </div>
      )}

      {/* Page content above clouds */}
      <div className="relative" style={{ zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
}

// ── WavyCloudDivider — stacked contour lines matching LINES-REF ──────────────
// 6 organic wave contours with soft strokes + gradient fill + drop shadow.
// Overlaps section below by 60px via negative margin-bottom.
const WAVE_PATHS = [
  "M0,55 C120,22 280,78 480,42 C680,6 820,68 1000,35 C1180,2 1320,62 1440,38",
  "M0,75 C140,40 310,95 520,58 C730,21 860,82 1040,52 C1220,22 1340,78 1440,55",
  "M0,98 C160,60 340,112 560,78 C780,44 900,100 1080,72 C1260,44 1360,96 1440,75",
  "M0,118 C180,82 360,128 600,96 C840,64 940,118 1120,92 C1300,66 1380,112 1440,94",
  "M0,140 C200,108 380,148 640,118 C900,88 980,138 1160,114 C1340,90 1400,132 1440,116",
  "M0,158 C220,130 400,164 680,140 C960,116 1020,156 1200,136 C1380,116 1420,150 1440,138",
];

export function WavyCloudDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative w-full pointer-events-none select-none", className)}
      style={{ height: 220, marginTop: -60, marginBottom: -80, zIndex: 11, position: "relative" }}
      aria-hidden="true"
    >
      {/* Soft gradient backdrop behind contours */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "70%",
        background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.90) 100%)",
      }} />
      <svg
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <filter id="wcd-shadow" x="-5%" y="-20%" width="110%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
            <feColorMatrix in="blur" type="matrix"
              values="0 0 0 0 0.7  0 0 0 0 0.75  0 0 0 0 0.85  0 0 0 0.25 0" result="shadow"/>
            <feMerge>
              <feMergeNode in="shadow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#wcd-shadow)">
          {WAVE_PATHS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={`rgba(255,255,255,${0.30 + i * 0.13})`}
              strokeWidth={2.5 - i * 0.15}
              strokeLinecap="round"
            />
          ))}
        </g>
        {/* Bottom fill — solid white fade into content section */}
        <path
          d="M0,158 C220,130 400,164 680,140 C960,116 1020,156 1200,136 C1380,116 1420,150 1440,138 L1440,200 L0,200 Z"
          fill="rgba(255,255,255,0.92)"
        />
        <path
          d="M0,140 C200,108 380,148 640,118 C900,88 980,138 1160,114 C1340,90 1400,132 1440,116 L1440,200 L0,200 Z"
          fill="rgba(255,255,255,0.65)"
        />
      </svg>
    </div>
  );
}
