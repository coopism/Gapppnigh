import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ══════════════════════════════════════════════════════════════════════════════
// TUNING CONSTANTS — tweak these to adjust feel without touching component code
// ══════════════════════════════════════════════════════════════════════════════

// Parallax base speeds (fraction of scrollY applied as -translateY)
export const PARALLAX_FAR  = 0.07;  // 7%
export const PARALLAX_MID  = 0.15;  // 15%
export const PARALLAX_NEAR = 0.26;  // 26%

// Cluster subgroups drift faster than base haze by this multiplier
export const CLUSTER_DRIFT_MULT = 1.35;

// Base layer blur / opacity
export const BLUR_FAR  = 36;
export const BLUR_MID  = 12;
export const BLUR_NEAR = 4;
export const OPACITY_FAR  = 0.52;
export const OPACITY_MID  = 0.75;
export const OPACITY_NEAR = 0.85;

// Anchor clouds — sharper, higher contrast for perceptibility
export const ANCHOR_BLUR    = 3;
export const ANCHOR_OPACITY = 0.92;

// Cloud curtain reveal
export const CURTAIN_OFFSET_START = -200;
export const CURTAIN_OFFSET_END   = 500;
export const CURTAIN_MAX_TRANSLATE = 180;
export const CURTAIN_MAX_BLUR     = 10;

// Debug
export const DEBUG_PARALLAX = true;

const SKY = "linear-gradient(180deg,#a8b8e2 0%,#b8c6ec 10%,#c8d4f4 25%,#d8e2f8 45%,#e4eafe 62%,#edf2ff 80%,#f4f7ff 100%)";

// ══════════════════════════════════════════════════════════════════════════════
// CLOUD DATA — [cx, cy, rx, ry, gradient-key] in 1440×1400 viewBox
// ══════════════════════════════════════════════════════════════════════════════
type CD = [number, number, number, number, string];

// ── FAR layer (pure haze, no clusters) ───────────────────────────────────────
const FAR_BASE: CD[] = [
  [100,60,120,55,"a"],[340,30,100,48,"b"],[560,85,130,60,"c"],
  [780,40,110,52,"a"],[1020,70,125,58,"b"],[1260,35,105,50,"c"],
  [200,220,135,62,"b"],[460,260,115,55,"c"],[700,200,125,58,"a"],
  [950,250,110,52,"b"],[1180,230,120,56,"c"],[80,400,130,60,"a"],
  [580,390,120,55,"c"],[830,430,110,52,"a"],[1100,410,125,58,"b"],
  [1350,450,105,50,"c"],[180,600,115,55,"a"],[500,640,130,60,"b"],
  [850,610,120,55,"c"],[1200,650,110,52,"a"],[60,800,125,58,"b"],
  [400,830,100,48,"c"],[750,790,135,62,"a"],[1100,820,115,55,"b"],
];

// ── MID layer — base haze ────────────────────────────────────────────────────
const MID_BASE: CD[] = [
  [80,120,155,72,"a"],[300,90,140,65,"b"],[540,145,160,75,"c"],
  [780,80,145,68,"a"],[1040,130,155,72,"b"],[1280,95,140,65,"c"],
  [160,310,160,75,"a"],[420,340,145,68,"b"],[680,290,155,72,"c"],
  [950,330,140,65,"a"],[1200,310,150,70,"b"],[60,500,160,75,"c"],
  [350,540,145,68,"a"],[640,490,155,72,"b"],[920,530,140,65,"c"],
  [1180,510,150,70,"a"],[250,700,155,72,"b"],[600,740,145,68,"c"],
  [950,710,160,75,"a"],[1300,730,140,65,"b"],
];

// ── MID anchor clusters — sharper, cross viewport during scroll ──────────────
const MID_CLUSTERS: CD[] = [
  [220,180,175,80,"a"],[720,350,190,85,"b"],[1100,520,165,78,"c"],
  [400,680,180,82,"a"],[900,150,170,78,"b"],
];

// ── NEAR layer — base haze ───────────────────────────────────────────────────
const NEAR_BASE: CD[] = [
  [60,250,110,52,"a"],[1380,230,105,50,"b"],[200,440,120,55,"c"],
  [1260,420,115,52,"a"],[440,520,110,50,"b"],[1080,510,120,55,"c"],
  [100,650,125,58,"a"],[700,620,115,55,"b"],[1350,640,110,52,"c"],
  [350,780,120,55,"a"],[900,760,125,58,"b"],[1200,800,110,52,"c"],
  [550,900,115,55,"a"],[80,950,120,58,"b"],[1400,920,105,50,"c"],
];

// ── NEAR anchor clusters — sharpest, most obvious motion ─────────────────────
const NEAR_CLUSTERS: CD[] = [
  [320,300,135,62,"a"],[1150,350,145,68,"b"],[600,500,155,70,"c"],
  [180,700,140,64,"a"],[850,450,150,68,"b"],[1300,650,130,60,"c"],
];

// ══════════════════════════════════════════════════════════════════════════════
// SVG renderers
// ══════════════════════════════════════════════════════════════════════════════

function HazeSVG({ clouds, prefix }: { clouds: CD[]; prefix: string }) {
  return (
    <svg viewBox="0 0 1440 1400" preserveAspectRatio="xMidYMin slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "140%", display: "block" }}>
      <defs>
        <radialGradient id={`${prefix}-a`} cx="45%" cy="22%" r="62%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1"/>
          <stop offset="35%" stopColor="#f2f6ff" stopOpacity="0.96"/>
          <stop offset="70%" stopColor="#d0ddf4" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#b0c0e8" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={`${prefix}-b`} cx="48%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1"/>
          <stop offset="32%" stopColor="#f8f2ff" stopOpacity="0.96"/>
          <stop offset="68%" stopColor="#dccef6" stopOpacity="0.48"/>
          <stop offset="100%" stopColor="#c0b4e8" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={`${prefix}-c`} cx="52%" cy="25%" r="64%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1"/>
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

function AnchorSVG({ clouds, prefix }: { clouds: CD[]; prefix: string }) {
  return (
    <svg viewBox="0 0 1440 1400" preserveAspectRatio="xMidYMin slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "140%", display: "block" }}>
      <defs>
        <radialGradient id={`${prefix}-a`} cx="44%" cy="20%" r="54%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1"/>
          <stop offset="50%" stopColor="#f0f4ff" stopOpacity="0.94"/>
          <stop offset="80%" stopColor="#d8e4f8" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#c0d0ec" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={`${prefix}-b`} cx="46%" cy="18%" r="52%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1"/>
          <stop offset="45%" stopColor="#f6f0ff" stopOpacity="0.94"/>
          <stop offset="78%" stopColor="#e0d4f8" stopOpacity="0.56"/>
          <stop offset="100%" stopColor="#c8bce8" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={`${prefix}-c`} cx="50%" cy="22%" r="56%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1"/>
          <stop offset="48%" stopColor="#ecf4ff" stopOpacity="0.94"/>
          <stop offset="80%" stopColor="#d0e0f4" stopOpacity="0.54"/>
          <stop offset="100%" stopColor="#b4c8e4" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {clouds.map(([cx, cy, rx, ry, g], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${prefix}-${g})`} />
      ))}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CloudBackdrop — 3 layers × 2 subgroups (base haze + anchor clusters)
// ══════════════════════════════════════════════════════════════════════════════
export function CloudBackdrop({ children, className }: { children?: React.ReactNode; className?: string }) {
  const farRef       = useRef<HTMLDivElement>(null);
  const midBaseRef   = useRef<HTMLDivElement>(null);
  const midCluRef    = useRef<HTMLDivElement>(null);
  const nearBaseRef  = useRef<HTMLDivElement>(null);
  const nearCluRef   = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);
  const [dbg, setDbg] = useState({ sy: 0 });

  useEffect(() => {
    let ticking = false;
    const tick = () => {
      if (ticking) return;
      ticking = true;
      rafRef.current = requestAnimationFrame(() => {
        const sy = window.scrollY;
        const f  = -sy * PARALLAX_FAR;
        const mb = -sy * PARALLAX_MID;
        const mc = -sy * PARALLAX_MID * CLUSTER_DRIFT_MULT;
        const nb = -sy * PARALLAX_NEAR;
        const nc = -sy * PARALLAX_NEAR * CLUSTER_DRIFT_MULT;
        if (farRef.current)      farRef.current.style.transform      = `translate3d(0,${f}px,0)`;
        if (midBaseRef.current)  midBaseRef.current.style.transform  = `translate3d(0,${mb}px,0)`;
        if (midCluRef.current)   midCluRef.current.style.transform   = `translate3d(0,${mc}px,0)`;
        if (nearBaseRef.current) nearBaseRef.current.style.transform = `translate3d(0,${nb}px,0)`;
        if (nearCluRef.current)  nearCluRef.current.style.transform  = `translate3d(0,${nc}px,0)`;
        if (DEBUG_PARALLAX) setDbg({ sy });
        ticking = false;
      });
    };
    window.addEventListener("scroll", tick, { passive: true });
    tick();
    return () => { window.removeEventListener("scroll", tick); cancelAnimationFrame(rafRef.current); };
  }, []);

  const L: React.CSSProperties = {
    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
    pointerEvents: "none", willChange: "transform",
  };
  const dbgO = (c: string) => DEBUG_PARALLAX ? { outline: `1px dashed ${c}` } : {};
  const sy = dbg.sy;

  return (
    <div className={cn("relative min-h-screen overflow-hidden", className)} style={{ background: SKY }}>
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        {/* FAR — pure haze */}
        <div ref={farRef} style={{ ...L, filter: `blur(${BLUR_FAR}px)`, opacity: OPACITY_FAR, ...dbgO("rgba(255,0,0,0.25)") }}>
          <HazeSVG clouds={FAR_BASE} prefix="cf" />
        </div>
        {/* MID — base haze */}
        <div ref={midBaseRef} style={{ ...L, filter: `blur(${BLUR_MID}px)`, opacity: OPACITY_MID, ...dbgO("rgba(0,200,0,0.25)") }}>
          <HazeSVG clouds={MID_BASE} prefix="cm" />
        </div>
        {/* MID — anchor clusters (sharper, drifts faster) */}
        <div ref={midCluRef} style={{ ...L, filter: `blur(${ANCHOR_BLUR}px)`, opacity: ANCHOR_OPACITY, ...dbgO("rgba(0,255,0,0.4)") }}>
          <AnchorSVG clouds={MID_CLUSTERS} prefix="cma" />
        </div>
        {/* NEAR — base haze */}
        <div ref={nearBaseRef} style={{ ...L, filter: `blur(${BLUR_NEAR}px)`, opacity: OPACITY_NEAR, ...dbgO("rgba(0,60,255,0.25)") }}>
          <HazeSVG clouds={NEAR_BASE} prefix="cn" />
        </div>
        {/* NEAR — anchor clusters (sharpest, fastest drift) */}
        <div ref={nearCluRef} style={{ ...L, filter: `blur(${ANCHOR_BLUR}px)`, opacity: ANCHOR_OPACITY, ...dbgO("rgba(80,120,255,0.4)") }}>
          <AnchorSVG clouds={NEAR_CLUSTERS} prefix="cna" />
        </div>
      </div>

      {/* Debug HUD */}
      {DEBUG_PARALLAX && (
        <div style={{ position: "fixed", top: 0, left: 0, zIndex: 9999, pointerEvents: "none", display: "flex", flexDirection: "column", gap: 2, padding: 6 }}>
          {[
            { l: "FAR", v: Math.round(sy * PARALLAX_FAR), p: PARALLAX_FAR },
            { l: "MID", v: Math.round(sy * PARALLAX_MID), p: PARALLAX_MID },
            { l: "M-CLU", v: Math.round(sy * PARALLAX_MID * CLUSTER_DRIFT_MULT), p: PARALLAX_MID * CLUSTER_DRIFT_MULT },
            { l: "NEAR", v: Math.round(sy * PARALLAX_NEAR), p: PARALLAX_NEAR },
            { l: "N-CLU", v: Math.round(sy * PARALLAX_NEAR * CLUSTER_DRIFT_MULT), p: PARALLAX_NEAR * CLUSTER_DRIFT_MULT },
          ].map(({ l, v, p }) => (
            <div key={l} style={{ background: "rgba(0,0,0,0.75)", color: "#0f0", fontSize: 10, fontFamily: "monospace", padding: "2px 6px", borderRadius: 3, whiteSpace: "nowrap" }}>
              {l} ty:-{v}px ({Math.round(p * 100)}%)
            </div>
          ))}
        </div>
      )}

      <div className="relative" style={{ zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CloudCurtain — scroll-linked fog overlay that reveals the section below
// ══════════════════════════════════════════════════════════════════════════════
export function CloudCurtain({ className }: { className?: string }) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);
  const [dbg, setDbg] = useState({ ty: 0, op: 1 });

  useEffect(() => {
    let ticking = false;
    const tick = () => {
      if (ticking) return;
      ticking = true;
      rafRef.current = requestAnimationFrame(() => {
        if (!wrapRef.current || !innerRef.current) { ticking = false; return; }
        const top  = wrapRef.current.offsetTop;
        const sy   = window.scrollY;
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
        if (DEBUG_PARALLAX) setDbg({ ty: Math.round(ty), op: Math.round(op * 100) / 100 });
        ticking = false;
      });
    };
    window.addEventListener("scroll", tick, { passive: true });
    tick();
    return () => { window.removeEventListener("scroll", tick); cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div ref={wrapRef} className={cn("relative w-full pointer-events-none", className)}
      style={{ height: 220, marginTop: -80, marginBottom: -140, zIndex: 12, position: "relative" }}>
      <div ref={innerRef} style={{ position: "absolute", inset: 0, willChange: "transform, opacity, filter" }}>
        <svg viewBox="0 0 1440 220" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%", display: "block" }}>
          <defs>
            <radialGradient id="cur-g" cx="50%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.95"/>
              <stop offset="55%" stopColor="#f4f8ff" stopOpacity="0.75"/>
              <stop offset="100%" stopColor="#e0ecff" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <ellipse cx="180" cy="110" rx="300" ry="95" fill="url(#cur-g)" opacity="0.88"/>
          <ellipse cx="550" cy="90"  rx="340" ry="105" fill="url(#cur-g)" opacity="0.92"/>
          <ellipse cx="920" cy="100" rx="320" ry="100" fill="url(#cur-g)" opacity="0.88"/>
          <ellipse cx="1300" cy="110" rx="280" ry="90" fill="url(#cur-g)" opacity="0.85"/>
          <ellipse cx="360" cy="55" rx="360" ry="55" fill="rgba(255,255,255,0.55)"/>
          <ellipse cx="1050" cy="60" rx="340" ry="50" fill="rgba(255,255,255,0.50)"/>
        </svg>
      </div>
      {DEBUG_PARALLAX && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: "rgba(0,0,0,0.75)", color: "#ff0", fontSize: 10, fontFamily: "monospace",
          padding: "2px 6px", borderRadius: 3, zIndex: 999,
        }}>
          CURTAIN y:{dbg.ty}px op:{dbg.op}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WavyCloudDivider — filled cloud bank + stacked contour strokes
// ══════════════════════════════════════════════════════════════════════════════
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
    <div className={cn("relative w-full pointer-events-none select-none", className)}
      style={{ height: 280, marginTop: -80, marginBottom: -120, zIndex: 11, position: "relative" }}
      aria-hidden="true">
      {/* Gradient depth behind everything */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "85%",
        background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.40) 25%, rgba(255,255,255,0.80) 60%, rgba(255,255,255,0.98) 100%)",
      }} />

      {/* Cloud bank fill — soft puffy shapes behind contour lines */}
      <svg viewBox="0 0 1440 280" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <radialGradient id="bank-a" cx="50%" cy="32%" r="60%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.95"/>
            <stop offset="55%" stopColor="#f4f8ff" stopOpacity="0.72"/>
            <stop offset="100%" stopColor="#e4ecff" stopOpacity="0"/>
          </radialGradient>
          <filter id="bank-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="10"/>
          </filter>
        </defs>
        <g filter="url(#bank-blur)" opacity="0.82">
          <ellipse cx="160"  cy="170" rx="280" ry="85" fill="url(#bank-a)"/>
          <ellipse cx="480"  cy="150" rx="310" ry="95" fill="url(#bank-a)"/>
          <ellipse cx="820"  cy="165" rx="290" ry="90" fill="url(#bank-a)"/>
          <ellipse cx="1120" cy="155" rx="280" ry="88" fill="url(#bank-a)"/>
          <ellipse cx="1380" cy="170" rx="240" ry="78" fill="url(#bank-a)"/>
        </g>
        {/* Top highlight rim */}
        <g opacity="0.40">
          <ellipse cx="320"  cy="115" rx="300" ry="42" fill="rgba(255,255,255,0.8)"/>
          <ellipse cx="860"  cy="110" rx="340" ry="48" fill="rgba(255,255,255,0.75)"/>
          <ellipse cx="1280" cy="120" rx="260" ry="38" fill="rgba(255,255,255,0.7)"/>
        </g>
      </svg>

      {/* Contour stroke lines — positioned at bottom half */}
      <svg viewBox="0 0 1440 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "200px" }}>
        <defs>
          <filter id="wcd-sh" x="-5%" y="-20%" width="110%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>
            <feColorMatrix in="b" type="matrix"
              values="0 0 0 0 0.7 0 0 0 0 0.75 0 0 0 0 0.85 0 0 0 0.28 0" result="s"/>
            <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <g filter="url(#wcd-sh)">
          {WAVE_PATHS.map((d, i) => (
            <path key={i} d={d} fill="none"
              stroke={`rgba(255,255,255,${0.32 + i * 0.12})`}
              strokeWidth={2.8 - i * 0.18} strokeLinecap="round" />
          ))}
        </g>
        {/* Solid white bottom fills */}
        <path d="M0,158 C220,130 400,164 680,140 C960,116 1020,156 1200,136 C1380,116 1420,150 1440,138 L1440,200 L0,200 Z" fill="rgba(255,255,255,0.95)"/>
        <path d="M0,140 C200,108 380,148 640,118 C900,88 980,138 1160,114 C1340,90 1400,132 1440,116 L1440,200 L0,200 Z" fill="rgba(255,255,255,0.72)"/>
        <path d="M0,118 C180,82 360,128 600,96 C840,64 940,118 1120,92 C1300,66 1380,112 1440,94 L1440,200 L0,200 Z" fill="rgba(255,255,255,0.45)"/>
      </svg>
    </div>
  );
}
