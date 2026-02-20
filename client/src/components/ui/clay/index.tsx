/**
 * GapNight Claymorphism Component Library
 * Matches the soft sky / clay card mockup aesthetic.
 */
import React from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   CloudBackground — photorealistic SVG layered cloud sky
───────────────────────────────────────────────────────────── */
export function CloudBackground({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative min-h-screen overflow-x-hidden", className)}
      style={{ background: "linear-gradient(180deg,#a8b8e2 0%,#b8c6ec 10%,#c8d4f4 25%,#d8e2f8 45%,#e4eafe 62%,#edf2ff 80%,#f4f7ff 100%)" }}>
      {/* Full-screen SVG cloud layer */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none select-none"
        style={{ zIndex: 0, minHeight: "100vh" }}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Cloud body — cool white */}
          <radialGradient id="cg-a" cx="50%" cy="26%" r="60%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"/>
            <stop offset="40%"  stopColor="#f0f5ff" stopOpacity="0.98"/>
            <stop offset="70%"  stopColor="#d4e0f8" stopOpacity="0.80"/>
            <stop offset="100%" stopColor="#b4c4ec" stopOpacity="0"/>
          </radialGradient>
          {/* Cloud body — warm white */}
          <radialGradient id="cg-b" cx="50%" cy="22%" r="60%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"/>
            <stop offset="36%"  stopColor="#f6f0ff" stopOpacity="0.97"/>
            <stop offset="68%"  stopColor="#ddd0f8" stopOpacity="0.80"/>
            <stop offset="100%" stopColor="#beb0ec" stopOpacity="0"/>
          </radialGradient>
          {/* Cloud body — bluish white */}
          <radialGradient id="cg-c" cx="50%" cy="30%" r="60%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"/>
            <stop offset="42%"  stopColor="#e8f0ff" stopOpacity="0.97"/>
            <stop offset="72%"  stopColor="#c8d8f4" stopOpacity="0.80"/>
            <stop offset="100%" stopColor="#a8b8e0" stopOpacity="0"/>
          </radialGradient>
          {/* Cloud underside shadow */}
          <radialGradient id="cg-shad" cx="50%" cy="72%" r="55%">
            <stop offset="0%"   stopColor="#7890c8" stopOpacity="0.26"/>
            <stop offset="55%"  stopColor="#90a8d4" stopOpacity="0.10"/>
            <stop offset="100%" stopColor="#a8b8e0" stopOpacity="0"/>
          </radialGradient>
          {/* Pure white top highlight */}
          <radialGradient id="cg-hl" cx="50%" cy="16%" r="50%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"/>
            <stop offset="52%"  stopColor="#ffffff" stopOpacity="0.65"/>
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
          </radialGradient>
          {/* Glow + merge filter */}
          <filter id="cf-glow" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="14" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="cf-soft" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="7"/>
          </filter>
        </defs>

        {/* ── BACKGROUND CLOUD LAYER (far, small, low opacity) ── */}
        {/* BG Cloud 1 — top-left distant */}
        <g opacity="0.70" style={{ animation: "cloud-drift-1 28s ease-in-out infinite" }}>
          <ellipse cx="180" cy="128" rx="172" ry="68" fill="url(#cg-shad)"/>
          <ellipse cx="180" cy="110" rx="170" ry="90" fill="url(#cg-c)"/>
          <ellipse cx="100" cy="130" rx="130" ry="75" fill="url(#cg-c)"/>
          <ellipse cx="260" cy="125" rx="140" ry="70" fill="url(#cg-c)"/>
          <ellipse cx="160" cy="70"  rx="110" ry="70" fill="url(#cg-a)"/>
          <ellipse cx="320" cy="145" rx="110" ry="60" fill="url(#cg-c)"/>
          <ellipse cx="155" cy="65"  rx="76"  ry="52" fill="url(#cg-hl)"/>
        </g>
        {/* BG Cloud 2 — top-right distant */}
        <g opacity="0.68" style={{ animation: "cloud-drift-2 32s ease-in-out infinite" }}>
          <ellipse cx="1280" cy="108" rx="162" ry="65" fill="url(#cg-shad)"/>
          <ellipse cx="1280" cy="90"  rx="160" ry="85" fill="url(#cg-a)"/>
          <ellipse cx="1180" cy="115" rx="140" ry="70" fill="url(#cg-a)"/>
          <ellipse cx="1380" cy="115" rx="130" ry="65" fill="url(#cg-b)"/>
          <ellipse cx="1240" cy="55"  rx="120" ry="72" fill="url(#cg-a)"/>
          <ellipse cx="1440" cy="130" rx="110" ry="55" fill="url(#cg-a)"/>
          <ellipse cx="1238" cy="50"  rx="84"  ry="56" fill="url(#cg-hl)"/>
        </g>
        {/* BG Cloud 3 — center-top small */}
        <g opacity="0.55" style={{ animation: "cloud-drift-3 36s ease-in-out infinite" }}>
          <ellipse cx="720" cy="75"  rx="122" ry="42" fill="url(#cg-shad)"/>
          <ellipse cx="720" cy="60"  rx="120" ry="55" fill="url(#cg-b)"/>
          <ellipse cx="640" cy="75"  rx="100" ry="50" fill="url(#cg-b)"/>
          <ellipse cx="810" cy="80"  rx="110" ry="48" fill="url(#cg-c)"/>
          <ellipse cx="700" cy="30"  rx="90"  ry="52" fill="url(#cg-a)"/>
          <ellipse cx="698" cy="26"  rx="62"  ry="40" fill="url(#cg-hl)"/>
        </g>

        {/* ── MID CLOUD LAYER ── */}
        {/* Mid Cloud 1 — left side */}
        <g opacity="0.92" filter="url(#cf-glow)" style={{ animation: "cloud-drift-2 22s ease-in-out infinite" }}>
          <ellipse cx="60"  cy="248" rx="215" ry="88" fill="url(#cg-shad)"/>
          <ellipse cx="175" cy="268" rx="185" ry="80" fill="url(#cg-shad)"/>
          <ellipse cx="60"  cy="220" rx="210" ry="112" fill="url(#cg-a)"/>
          <ellipse cx="-30" cy="260" rx="160" ry="95"  fill="url(#cg-a)"/>
          <ellipse cx="170" cy="245" rx="180" ry="102" fill="url(#cg-b)"/>
          <ellipse cx="20"  cy="165" rx="150" ry="96"  fill="url(#cg-a)"/>
          <ellipse cx="140" cy="155" rx="132" ry="92"  fill="url(#cg-b)"/>
          <ellipse cx="290" cy="270" rx="152" ry="82"  fill="url(#cg-a)"/>
          <ellipse cx="55"  cy="165" rx="85"  ry="58" fill="url(#cg-hl)"/>
          <ellipse cx="132" cy="148" rx="74"  ry="52" fill="url(#cg-hl)"/>
        </g>
        {/* Mid Cloud 2 — right side */}
        <g opacity="0.90" filter="url(#cf-glow)" style={{ animation: "cloud-drift-1 26s ease-in-out infinite" }}>
          <ellipse cx="1382" cy="228" rx="215" ry="88" fill="url(#cg-shad)"/>
          <ellipse cx="1268" cy="254" rx="188" ry="80" fill="url(#cg-shad)"/>
          <ellipse cx="1380" cy="200" rx="212" ry="112" fill="url(#cg-b)"/>
          <ellipse cx="1460" cy="240" rx="166" ry="96"  fill="url(#cg-b)"/>
          <ellipse cx="1270" cy="230" rx="186" ry="102" fill="url(#cg-a)"/>
          <ellipse cx="1400" cy="150" rx="152" ry="92"  fill="url(#cg-b)"/>
          <ellipse cx="1260" cy="160" rx="132" ry="84"  fill="url(#cg-a)"/>
          <ellipse cx="1150" cy="260" rx="152" ry="84"  fill="url(#cg-c)"/>
          <ellipse cx="1372" cy="145" rx="88"  ry="60" fill="url(#cg-hl)"/>
          <ellipse cx="1265" cy="148" rx="76"  ry="54" fill="url(#cg-hl)"/>
        </g>
        {/* Mid Cloud 3 — upper center-left gap filler */}
        <g opacity="0.75" style={{ animation: "cloud-drift-3 30s ease-in-out infinite", animationDelay: "-8s" }}>
          <ellipse cx="400" cy="178" rx="142" ry="55" fill="url(#cg-shad)"/>
          <ellipse cx="400" cy="160" rx="142" ry="74" fill="url(#cg-c)"/>
          <ellipse cx="320" cy="180" rx="122" ry="66" fill="url(#cg-c)"/>
          <ellipse cx="490" cy="175" rx="126" ry="64" fill="url(#cg-a)"/>
          <ellipse cx="380" cy="120" rx="102" ry="66" fill="url(#cg-a)"/>
          <ellipse cx="560" cy="190" rx="112" ry="60" fill="url(#cg-c)"/>
          <ellipse cx="378" cy="114" rx="72"  ry="52" fill="url(#cg-hl)"/>
        </g>
        {/* Mid Cloud 4 — upper center-right gap filler */}
        <g opacity="0.75" style={{ animation: "cloud-drift-2 34s ease-in-out infinite", animationDelay: "-12s" }}>
          <ellipse cx="1040" cy="172" rx="142" ry="55" fill="url(#cg-shad)"/>
          <ellipse cx="1040" cy="155" rx="142" ry="74" fill="url(#cg-b)"/>
          <ellipse cx="960"  cy="175" rx="122" ry="66" fill="url(#cg-b)"/>
          <ellipse cx="1120" cy="170" rx="132" ry="64" fill="url(#cg-a)"/>
          <ellipse cx="1010" cy="115" rx="107" ry="66" fill="url(#cg-b)"/>
          <ellipse cx="1180" cy="188" rx="117" ry="60" fill="url(#cg-a)"/>
          <ellipse cx="1008" cy="110" rx="76"  ry="54" fill="url(#cg-hl)"/>
        </g>

        {/* ── FOREGROUND CLOUD LAYER (large, crisp, high opacity) ── */}
        {/* FG Cloud 1 — bottom-left large */}
        <g opacity="0.97" filter="url(#cf-glow)" style={{ animation: "cloud-drift-1 20s ease-in-out infinite" }}>
          <ellipse cx="0"   cy="618" rx="285" ry="110" fill="url(#cg-shad)"/>
          <ellipse cx="205" cy="645" rx="255" ry="102" fill="url(#cg-shad)"/>
          <ellipse cx="80"  cy="528" rx="202" ry="98"  fill="url(#cg-shad)"/>
          <ellipse cx="0"   cy="580" rx="282" ry="148" fill="url(#cg-a)"/>
          <ellipse cx="-80" cy="640" rx="222" ry="132" fill="url(#cg-b)"/>
          <ellipse cx="200" cy="610" rx="252" ry="138" fill="url(#cg-a)"/>
          <ellipse cx="80"  cy="495" rx="202" ry="132" fill="url(#cg-b)"/>
          <ellipse cx="330" cy="640" rx="222" ry="122" fill="url(#cg-c)"/>
          <ellipse cx="-50" cy="520" rx="182" ry="122" fill="url(#cg-a)"/>
          <ellipse cx="420" cy="600" rx="198" ry="112" fill="url(#cg-a)"/>
          <ellipse cx="190" cy="440" rx="172" ry="112" fill="url(#cg-b)"/>
          <ellipse cx="72"  cy="488" rx="105" ry="75" fill="url(#cg-hl)"/>
          <ellipse cx="185" cy="432" rx="92"  ry="70" fill="url(#cg-hl)"/>
          <ellipse cx="332" cy="536" rx="88"  ry="64" fill="url(#cg-hl)"/>
        </g>
        {/* FG Cloud 2 — bottom-right large */}
        <g opacity="0.96" filter="url(#cf-glow)" style={{ animation: "cloud-drift-2 24s ease-in-out infinite" }}>
          <ellipse cx="1440" cy="598" rx="288" ry="112" fill="url(#cg-shad)"/>
          <ellipse cx="1242" cy="625" rx="258" ry="106" fill="url(#cg-shad)"/>
          <ellipse cx="1362" cy="512" rx="208" ry="100" fill="url(#cg-shad)"/>
          <ellipse cx="1440" cy="560" rx="286" ry="150" fill="url(#cg-b)"/>
          <ellipse cx="1520" cy="625" rx="226" ry="134" fill="url(#cg-a)"/>
          <ellipse cx="1240" cy="590" rx="256" ry="140" fill="url(#cg-b)"/>
          <ellipse cx="1360" cy="480" rx="206" ry="134" fill="url(#cg-a)"/>
          <ellipse cx="1100" cy="625" rx="226" ry="124" fill="url(#cg-c)"/>
          <ellipse cx="1490" cy="510" rx="186" ry="124" fill="url(#cg-b)"/>
          <ellipse cx="1020" cy="590" rx="202" ry="114" fill="url(#cg-a)"/>
          <ellipse cx="1250" cy="440" rx="176" ry="114" fill="url(#cg-b)"/>
          <ellipse cx="1362" cy="472" rx="108" ry="76" fill="url(#cg-hl)"/>
          <ellipse cx="1250" cy="432" rx="94"  ry="72" fill="url(#cg-hl)"/>
          <ellipse cx="1112" cy="566" rx="90"  ry="66" fill="url(#cg-hl)"/>
        </g>
        {/* FG Cloud 3 — bottom center */}
        <g opacity="0.88" style={{ animation: "cloud-drift-3 28s ease-in-out infinite", animationDelay: "-6s" }}>
          <ellipse cx="720" cy="718" rx="242" ry="92" fill="url(#cg-shad)"/>
          <ellipse cx="580" cy="748" rx="202" ry="84" fill="url(#cg-shad)"/>
          <ellipse cx="700" cy="648" rx="182" ry="82" fill="url(#cg-shad)"/>
          <ellipse cx="720" cy="700" rx="242" ry="122" fill="url(#cg-a)"/>
          <ellipse cx="580" cy="730" rx="202" ry="112" fill="url(#cg-b)"/>
          <ellipse cx="860" cy="720" rx="212" ry="110" fill="url(#cg-a)"/>
          <ellipse cx="700" cy="630" rx="182" ry="110" fill="url(#cg-b)"/>
          <ellipse cx="960" cy="740" rx="188" ry="102" fill="url(#cg-c)"/>
          <ellipse cx="490" cy="745" rx="178" ry="100" fill="url(#cg-a)"/>
          <ellipse cx="720" cy="580" rx="158" ry="102" fill="url(#cg-b)"/>
          <ellipse cx="840" cy="610" rx="152" ry="97"  fill="url(#cg-a)"/>
          <ellipse cx="718" cy="574" rx="108" ry="78" fill="url(#cg-hl)"/>
          <ellipse cx="840" cy="602" rx="98"  ry="72" fill="url(#cg-hl)"/>
        </g>
        {/* FG Cloud 4 — far bottom edge */}
        <g opacity="0.93" style={{ animation: "cloud-drift-1 18s ease-in-out infinite", animationDelay: "-3s" }}>
          <ellipse cx="360"  cy="858" rx="282" ry="92" fill="url(#cg-shad)"/>
          <ellipse cx="1102" cy="858" rx="288" ry="94" fill="url(#cg-shad)"/>
          <ellipse cx="360"  cy="840" rx="282" ry="122" fill="url(#cg-a)"/>
          <ellipse cx="200"  cy="860" rx="232" ry="107" fill="url(#cg-b)"/>
          <ellipse cx="552"  cy="855" rx="252" ry="117" fill="url(#cg-a)"/>
          <ellipse cx="1100" cy="840" rx="288" ry="124" fill="url(#cg-b)"/>
          <ellipse cx="942"  cy="862" rx="238" ry="110" fill="url(#cg-a)"/>
          <ellipse cx="1282" cy="858" rx="258" ry="120" fill="url(#cg-c)"/>
        </g>

        {/* ── STAR SPARKLES ── */}
        {[
          [1340, 45, 3], [1380, 80, 2], [1310, 95, 2.5], [1400, 35, 2],
          [1420, 115, 1.5], [1355, 130, 2], [80, 80, 2], [50, 130, 1.5],
          [600, 30, 1.5], [680, 15, 2], [760, 40, 1.5], [850, 25, 2],
        ].map(([sx, sy, sr], i) => (
          <g key={i} transform={`translate(${sx}, ${sy})`} opacity={0.7 + i * 0.02}>
            <circle r={sr} fill="white" opacity="0.9"/>
            <line x1={`-${(sr as number) * 2.5}`} y1="0" x2={`${(sr as number) * 2.5}`} y2="0" stroke="white" strokeWidth="0.8" opacity="0.6"/>
            <line x1="0" y1={`-${(sr as number) * 2.5}`} x2="0" y2={`${(sr as number) * 2.5}`} stroke="white" strokeWidth="0.8" opacity="0.6"/>
          </g>
        ))}
      </svg>

      <div className="relative" style={{ zIndex: 1 }}>{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ClayCard
───────────────────────────────────────────────────────────── */
interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  hover?: boolean;
}

export function ClayCard({ children, className, size = "md", hover = false, ...props }: ClayCardProps) {
  const base =
    size === "sm" ? "clay-card-sm" :
    size === "lg" ? "clay-panel" :
    "clay-card";
  return (
    <div
      className={cn(base, hover && "clay-hover cursor-pointer", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ClayPanel — large hero / modal container
───────────────────────────────────────────────────────────── */
export function ClayPanel({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("clay-panel", className)} {...props}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ClayButton — primary gradient pill
───────────────────────────────────────────────────────────── */
interface ClayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function ClayButton({
  children, className, variant = "primary", size = "md",
  loading, disabled, ...props
}: ClayButtonProps) {
  const base =
    variant === "ghost"  ? "clay-btn-ghost" :
    variant === "danger" ? "clay-btn bg-red-500 from-red-500 to-red-600" :
    "clay-btn";

  const sizeClass =
    size === "sm" ? "px-4 py-2 text-sm" :
    size === "lg" ? "px-8 py-4 text-base" :
    "px-6 py-3 text-sm";

  return (
    <button
      className={cn(
        base, sizeClass,
        "inline-flex items-center justify-center gap-2 font-semibold select-none",
        (disabled || loading) && "opacity-60 cursor-not-allowed pointer-events-none",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   ClayChip — filter / time-window pill
───────────────────────────────────────────────────────────── */
interface ClayChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

export function ClayChip({ children, className, active, icon, ...props }: ClayChipProps) {
  return (
    <button
      className={cn("clay-chip", active && "active", className)}
      {...props}
    >
      {icon && <span className="opacity-80">{icon}</span>}
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   ClayInput — rounded pill input
───────────────────────────────────────────────────────────── */
interface ClayInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function ClayInput({ className, icon, iconRight, ...props }: ClayInputProps) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--clay-text-muted)] pointer-events-none">
          {icon}
        </span>
      )}
      <input
        className={cn("clay-input", icon && "pl-11", iconRight && "pr-11", className)}
        {...props}
      />
      {iconRight && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--clay-text-muted)]">
          {iconRight}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ClayBadge variants
───────────────────────────────────────────────────────────── */
export function ClayBadgeDeal({ children }: { children: React.ReactNode }) {
  return <span className="clay-badge-deal">{children}</span>;
}

export function ClayBadgeGN({ children }: { children: React.ReactNode }) {
  return (
    <span className="clay-badge-gn">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
      {children}
    </span>
  );
}

export function ClayBadgeRating({ value, count }: { value: number | string; count?: number }) {
  return (
    <span className="clay-badge-rating">
      <svg className="w-3 h-3 fill-amber-400 text-amber-400" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="0">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      <span style={{ color: "var(--clay-text)" }}>{value}</span>
      {count !== undefined && <span style={{ color: "var(--clay-text-muted)", fontWeight: 400 }}>({count})</span>}
    </span>
  );
}

export function ClayBadgeApproval() {
  return (
    <span className="clay-badge-approval">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      Host approval required
    </span>
  );
}

export function ClayBadgeAmber({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full"
      style={{ background: "var(--clay-badge-amber-bg)", color: "var(--clay-badge-amber)", border: "1px solid rgba(245,158,11,0.25)" }}>
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   ClayNav — glassmorphic sticky nav pill
───────────────────────────────────────────────────────────── */
export function ClayNav({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full",
        "bg-white/70 backdrop-blur-xl",
        "border-b border-white/60",
        className
      )}
      style={{ boxShadow: "0 2px 24px rgba(100,120,200,0.10)" }}
    >
      {children}
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────
   ClayDealCard — pixel-accurate recreation of mockup deal card
───────────────────────────────────────────────────────────── */
interface ClayDealCardProps {
  image: string;
  imageAlt?: string;
  discountPercent?: number;
  rating?: number;
  reviewCount?: number;
  title: string;
  location: string;
  highlight?: string;
  originalPrice?: string;
  slashedMidPrice?: string;
  currentPrice: string;
  isApprovalRequired?: boolean;
  isGapNight?: boolean;
  nightCount?: string;
  guestCount?: string;
  onClick?: () => void;
  className?: string;
}

export function ClayDealCard({
  image, imageAlt = "", discountPercent, rating,
  title, location, highlight, originalPrice, slashedMidPrice, currentPrice,
  isApprovalRequired = true, isGapNight = true, nightCount, guestCount,
  onClick, className,
}: ClayDealCardProps) {
  return (
    <div
      className={cn("overflow-hidden group cursor-pointer", className)}
      style={{
        background: "#ffffff",
        borderRadius: "24px",
        boxShadow: "0 20px 60px rgba(65,85,165,0.22), 0 4px 14px rgba(65,85,165,0.12), inset 0 2px 0 rgba(255,255,255,1), inset 0 1px 8px rgba(255,255,255,0.50)",
        border: "1px solid rgba(255,255,255,0.92)",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-5px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 32px 80px rgba(65,85,165,0.28), 0 8px 24px rgba(65,85,165,0.16), inset 0 2px 0 rgba(255,255,255,1)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 60px rgba(65,85,165,0.22), 0 4px 14px rgba(65,85,165,0.12), inset 0 2px 0 rgba(255,255,255,1), inset 0 1px 8px rgba(255,255,255,0.50)";
      }}
      onClick={onClick}
    >
      {/* ── IMAGE AREA ── */}
      <div className="relative overflow-hidden" style={{ height: "200px", borderRadius: "var(--clay-radius-lg) var(--clay-radius-lg) 0 0" }}>
        <img
          src={image} alt={imageAlt}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { e.currentTarget.src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />

        {/* Top-left: red pill OFF badge */}
        {discountPercent !== undefined && discountPercent > 0 && (
          <div className="absolute top-2.5 left-2.5">
            <span style={{
              background: "#EF4444", color: "white", fontWeight: 700,
              fontSize: "0.6875rem", borderRadius: "6px",
              padding: "3px 8px", letterSpacing: "0.02em",
              boxShadow: "0 2px 8px rgba(239,68,68,0.40)",
            }}>
              {discountPercent}% OFF
            </span>
          </div>
        )}

        {/* Top-right: dark circular GPN rating badge */}
        {rating !== undefined && (
          <div className="absolute top-2.5 right-2.5">
            <div style={{
              background: "rgba(22, 32, 64, 0.85)", backdropFilter: "blur(8px)",
              color: "white", borderRadius: "50%", width: "44px", height: "44px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              border: "1.5px solid rgba(255,255,255,0.15)",
            }}>
              <span style={{ fontSize: "0.5rem", fontWeight: 600, letterSpacing: "0.05em", opacity: 0.75, lineHeight: 1.1 }}>GPN</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, lineHeight: 1.1 }}>{rating}</span>
            </div>
          </div>
        )}

        {/* Bottom-left: guest/room count */}
        {(nightCount || guestCount) && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1">
            <span style={{
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
              color: "rgba(255,255,255,0.9)", fontSize: "0.65rem",
              padding: "2px 7px", borderRadius: "20px", fontWeight: 500,
            }}>
              <svg className="w-2.5 h-2.5 inline mr-0.5 opacity-80" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
              {guestCount || nightCount}
            </span>
          </div>
        )}

        {/* Bottom-right: Gap Night badge with leaf */}
        {isGapNight && (
          <div className="absolute bottom-2.5 right-2.5">
            <span style={{
              background: "rgba(255,255,255,0.92)", color: "#0ea58a",
              fontWeight: 700, fontSize: "0.6875rem",
              borderRadius: "20px", padding: "3px 9px 3px 7px",
              display: "inline-flex", alignItems: "center", gap: "4px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
              border: "1px solid rgba(16,185,129,0.25)",
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
              </svg>
              Gap Night
            </span>
          </div>
        )}
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="p-3.5">
        {/* Title */}
        <h3 className="font-bold text-sm leading-tight mb-1.5 line-clamp-1"
          style={{ color: "var(--clay-text)", fontFamily: "var(--font-display)", fontSize: "0.9rem" }}>
          {title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#FBBF24" }} />
          <span className="text-xs truncate" style={{ color: "var(--clay-text-muted)" }}>{location}</span>
        </div>

        {/* Highlight */}
        {highlight && (
          <div className="flex items-center gap-1 mb-1.5">
            <svg className="w-3 h-3 shrink-0" style={{ color: "#4A8FE7" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span className="text-xs truncate" style={{ color: "var(--clay-text-muted)" }}>{highlight}</span>
          </div>
        )}

        {/* Divider */}
        <div className="my-2" style={{ borderTop: "1px solid rgba(107,122,154,0.10)" }} />

        {/* Checklist + Price row */}
        <div className="flex items-end justify-between gap-2">
          {/* Left: checklist */}
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 shrink-0" style={{ color: "#10B981" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span className="text-[0.65rem] truncate" style={{ color: "var(--clay-text-muted)" }}>Free cancellation within 24hrs</span>
            </div>
            {isApprovalRequired && (
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" style={{ color: "#10B981" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-[0.65rem] truncate" style={{ color: "var(--clay-text-muted)" }}>Host approval required</span>
              </div>
            )}
          </div>

          {/* Right: price */}
          <div className="text-right shrink-0">
            <div className="text-[0.65rem] font-medium mb-0.5" style={{ color: "var(--clay-text-muted)" }}>Tonight</div>
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-base font-bold" style={{ color: "var(--clay-text)", fontFamily: "var(--font-display)" }}>
                {currentPrice}
              </span>
              <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--clay-primary)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            {(originalPrice || slashedMidPrice) && (
              <div className="flex items-center gap-1 justify-end mt-0.5">
                {originalPrice && <span className="text-[0.65rem] line-through" style={{ color: "var(--clay-text-light)" }}>{originalPrice}</span>}
                {slashedMidPrice && <span className="text-[0.65rem] line-through" style={{ color: "var(--clay-text-light)" }}>{slashedMidPrice}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ClayKPICard — host dashboard stat tile
───────────────────────────────────────────────────────────── */
export function ClayKPICard({
  label, value, sub, icon, accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={cn("clay-card-sm p-4 flex flex-col gap-1", accent && "bg-[var(--clay-primary)]/10")}>
      {icon && <div className="text-[var(--clay-primary)] mb-1">{icon}</div>}
      <div className="text-2xl font-bold font-display" style={{ color: accent ? "var(--clay-primary)" : "var(--clay-text)" }}>
        {value}
      </div>
      {sub && <div className="text-xs font-medium" style={{ color: "var(--clay-badge-gn)" }}>{sub}</div>}
      <div className="text-xs" style={{ color: "var(--clay-text-muted)" }}>{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ClayRequestRow — host dashboard booking request item
───────────────────────────────────────────────────────────── */
export function ClayRequestRow({
  avatar, name, property, details, value, onDecline, onApprove,
}: {
  avatar?: string;
  name: string;
  property: string;
  details?: string;
  value?: string;
  onDecline?: () => void;
  onApprove?: () => void;
}) {
  return (
    <div className="clay-card-sm p-3 flex items-center gap-3">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[var(--clay-sky-mid)] flex items-center justify-center font-bold text-sm"
        style={{ color: "var(--clay-primary)" }}>
        {avatar
          ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
          : name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate" style={{ color: "var(--clay-text)" }}>{name}</span>
          {value && <span className="text-xs font-medium ml-auto shrink-0" style={{ color: "var(--clay-text-muted)" }}>{value}</span>}
        </div>
        <div className="text-xs truncate" style={{ color: "var(--clay-primary)" }}>{property}</div>
        {details && <div className="text-xs mt-0.5 truncate" style={{ color: "var(--clay-text-muted)" }}>{details}</div>}
      </div>

      {/* Actions */}
      {(onDecline || onApprove) && (
        <div className="flex gap-1.5 shrink-0">
          {onDecline && (
            <button
              onClick={onDecline}
              className="clay-btn-ghost text-xs px-3 py-1.5 text-red-500 border-red-200/60"
              style={{ borderRadius: "var(--clay-radius-pill)" }}
            >
              Decline
            </button>
          )}
          {onApprove && (
            <button
              onClick={onApprove}
              className="clay-btn text-xs px-3 py-1.5"
              style={{ borderRadius: "var(--clay-radius-pill)" }}
            >
              Approve
            </button>
          )}
        </div>
      )}
    </div>
  );
}
