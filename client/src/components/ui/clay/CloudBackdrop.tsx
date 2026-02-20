import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

// ── TUNING CONSTANTS ─────────────────────────────────────────────────────────
export const CLOUD_SCALE_FAR  = 1.35;
export const CLOUD_SCALE_MID  = 1.00;
export const CLOUD_SCALE_NEAR = 0.62;
export const BLUR_FAR         = 40;   // px
export const BLUR_MID         = 16;   // px
export const BLUR_NEAR        = 6;    // px
export const PARALLAX_SPEED_FAR  = 0.04;
export const PARALLAX_SPEED_MID  = 0.10;
export const PARALLAX_SPEED_NEAR = 0.22;

const SKY = "linear-gradient(180deg,#a8b8e2 0%,#b8c6ec 10%,#c8d4f4 25%,#d8e2f8 45%,#e4eafe 62%,#edf2ff 80%,#f4f7ff 100%)";

// cx, cy, rx, ry, grad (a/b/c)
type C = [number, number, number, number, string];

const FAR: C[] = [
  [80,80,85,42,"a"],[270,45,75,38,"b"],[440,90,95,48,"c"],
  [620,35,80,40,"a"],[800,75,90,45,"b"],[970,40,70,35,"c"],
  [1140,85,85,42,"a"],[1320,50,75,38,"b"],[150,210,100,50,"c"],
  [380,255,80,40,"a"],[600,185,90,45,"b"],[780,235,95,48,"c"],
  [1000,200,85,42,"a"],[1200,265,80,40,"b"],[1390,215,75,38,"c"],
  [50,380,95,48,"a"],[280,420,82,41,"b"],[530,365,90,45,"c"],
  [760,400,85,42,"a"],[1010,375,78,39,"b"],[1255,415,90,45,"c"],
];

const MID: C[] = [
  [60,140,130,65,"a"],[240,110,120,60,"b"],[470,160,140,70,"c"],
  [700,95,125,62,"a"],[940,145,135,68,"b"],[1150,105,120,60,"c"],
  [1370,150,115,58,"a"],[30,320,140,70,"b"],[260,355,125,62,"c"],
  [540,300,130,65,"a"],[800,340,120,60,"b"],[1060,310,135,68,"c"],
  [1310,345,125,62,"a"],[180,490,130,65,"b"],[720,510,140,70,"c"],
];

const NEAR: C[] = [
  [40,280,95,48,"a"],[1400,260,90,45,"b"],[140,460,105,52,"c"],
  [1310,450,100,50,"a"],[380,540,95,48,"b"],[1060,530,100,50,"c"],
  [50,640,110,55,"a"],[700,620,100,50,"b"],[1380,610,105,52,"c"],
  [300,720,95,48,"a"],[1100,710,110,55,"b"],
];

function CloudSVG({ clouds, scale, prefix }: { clouds: C[]; scale: number; prefix: string }) {
  return (
    <svg
      viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <radialGradient id={`${prefix}-a`} cx="50%" cy="28%" r="60%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="45%"  stopColor="#f0f4ff" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="#bccaf0" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={`${prefix}-b`} cx="50%" cy="24%" r="60%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="40%"  stopColor="#f4f0ff" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="#c4b8f4" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={`${prefix}-c`} cx="50%" cy="30%" r="60%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="44%"  stopColor="#e8f0ff" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="#b8ccf0" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {clouds.map(([cx, cy, rx, ry, g], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx * scale} ry={ry * scale} fill={`url(#${prefix}-${g})`} />
      ))}
    </svg>
  );
}

export function CloudBackdrop({ children, className }: { children?: React.ReactNode; className?: string }) {
  const farRef  = useRef<HTMLDivElement>(null);
  const midRef  = useRef<HTMLDivElement>(null);
  const nearRef = useRef<HTMLDivElement>(null);
  const rafRef  = useRef<number>(0);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const sy = window.scrollY;
        if (farRef.current)  farRef.current.style.transform  = `translateY(${sy * PARALLAX_SPEED_FAR}px)`;
        if (midRef.current)  midRef.current.style.transform  = `translateY(${sy * PARALLAX_SPEED_MID}px)`;
        if (nearRef.current) nearRef.current.style.transform = `translateY(${sy * PARALLAX_SPEED_NEAR}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(rafRef.current); };
  }, []);

  const layer: React.CSSProperties = { position: "fixed", inset: 0, pointerEvents: "none", willChange: "transform" };

  return (
    <div className={cn("relative min-h-screen overflow-x-hidden", className)} style={{ background: SKY }}>
      <div ref={farRef}  style={{ ...layer, zIndex: 0, filter: `blur(${BLUR_FAR}px)`,  opacity: 0.58 }}>
        <CloudSVG clouds={FAR}  scale={CLOUD_SCALE_FAR}  prefix="cf" />
      </div>
      <div ref={midRef}  style={{ ...layer, zIndex: 1, filter: `blur(${BLUR_MID}px)`,  opacity: 0.82 }}>
        <CloudSVG clouds={MID}  scale={CLOUD_SCALE_MID}  prefix="cm" />
      </div>
      <div ref={nearRef} style={{ ...layer, zIndex: 2, filter: `blur(${BLUR_NEAR}px)`, opacity: 0.88 }}>
        <CloudSVG clouds={NEAR} scale={CLOUD_SCALE_NEAR} prefix="cn" />
      </div>
      <div className="relative" style={{ zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
}

export function WavyCloudDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative w-full pointer-events-none select-none", className)}
      style={{ height: 200, marginTop: -70, marginBottom: -10, zIndex: 3, position: "relative" }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 200" preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {/* 4 stacked wave layers, bottom = most opaque */}
        <path d="M0,162 C200,128 460,172 720,148 C980,124 1240,165 1440,150 L1440,200 L0,200 Z"
              fill="rgba(255,255,255,0.95)" />
        <path d="M0,140 C180,100 430,156 720,124 C1010,92 1262,150 1440,128 L1440,200 L0,200 Z"
              fill="rgba(255,255,255,0.80)" />
        <path d="M0,112 C165,68 405,132 720,96 C1035,60 1280,124 1440,100 L1440,200 L0,200 Z"
              fill="rgba(255,255,255,0.62)" />
        <path d="M0,80 C148,36 388,104 720,66 C1052,28 1295,98 1440,68 L1440,200 L0,200 Z"
              fill="rgba(255,255,255,0.38)" />
      </svg>
    </div>
  );
}
