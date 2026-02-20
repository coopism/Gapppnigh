/**
 * GapNight Claymorphism Component Library
 * Matches the soft sky / clay card mockup aesthetic.
 */
import React from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   CloudBackground — full-page sky gradient with drifting blobs
───────────────────────────────────────────────────────────── */
export function CloudBackground({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("clay-sky min-h-screen relative", className)}>
      {/* CSS-only cloud blobs */}
      <div className="clay-cloud-blob animate-cloud-1 w-[520px] h-[320px] -top-20 -left-32 opacity-70" />
      <div className="clay-cloud-blob animate-cloud-2 w-[480px] h-[280px] top-1/4 -right-24 opacity-60" />
      <div className="clay-cloud-blob animate-cloud-3 w-[400px] h-[240px] top-1/2 left-1/4 opacity-50" />
      <div className="clay-cloud-blob animate-cloud-1 w-[320px] h-[200px] bottom-10 right-10 opacity-55" style={{ animationDelay: "4s" }} />
      <div className="clay-cloud-blob animate-cloud-2 w-[280px] h-[180px] bottom-1/3 -left-16 opacity-45" style={{ animationDelay: "8s" }} />
      <div className="relative z-10">{children}</div>
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
   ClayDealCard — large rounded card matching mockup exactly
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
  currentPrice: string;
  isApprovalRequired?: boolean;
  isGapNight?: boolean;
  nightCount?: string;
  onClick?: () => void;
  className?: string;
  badge?: React.ReactNode;
}

export function ClayDealCard({
  image, imageAlt = "", discountPercent, rating, reviewCount,
  title, location, highlight, originalPrice, currentPrice,
  isApprovalRequired, isGapNight = true, nightCount,
  onClick, className, badge,
}: ClayDealCardProps) {
  return (
    <div
      className={cn(
        "clay-card clay-hover overflow-hidden group",
        onClick && "cursor-pointer",
        className
      )}
      style={{ padding: 0, borderRadius: "var(--clay-radius-lg)" }}
      onClick={onClick}
    >
      {/* Image area */}
      <div className="relative h-52 sm:h-56 overflow-hidden"
        style={{ borderRadius: "var(--clay-radius-lg) var(--clay-radius-lg) 0 0" }}>
        <img
          src={image}
          alt={imageAlt}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop";
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Top-left: discount badge */}
        {discountPercent !== undefined && discountPercent > 0 && (
          <div className="absolute top-3 left-3">
            <ClayBadgeDeal>{discountPercent}% OFF</ClayBadgeDeal>
          </div>
        )}

        {/* Top-right: rating badge */}
        {rating !== undefined && (
          <div className="absolute top-3 right-3">
            <ClayBadgeRating value={rating} count={reviewCount} />
          </div>
        )}

        {/* Bottom: night count + Gap Night badge */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          {nightCount && (
            <span className="text-xs text-white/90 font-medium drop-shadow">{nightCount}</span>
          )}
          {isGapNight && (
            <ClayBadgeGN>Gap Night</ClayBadgeGN>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="p-4">
        <h3 className="font-bold text-base leading-snug mb-0.5 truncate"
          style={{ color: "var(--clay-text)", fontFamily: "var(--font-display)" }}>
          {title}
        </h3>

        <div className="flex items-center gap-1 mb-1.5">
          <svg className="w-3 h-3 fill-amber-400 shrink-0" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /></svg>
          <span className="text-xs font-medium truncate" style={{ color: "var(--clay-text-muted)" }}>{location}</span>
        </div>

        {highlight && (
          <p className="text-xs mb-2 truncate" style={{ color: "var(--clay-text-muted)" }}>
            <svg className="w-3 h-3 inline mr-0.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            {highlight}
          </p>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
          <div className="flex flex-col gap-0.5">
            {isApprovalRequired && <ClayBadgeApproval />}
            {badge}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {originalPrice && (
              <span className="text-xs line-through" style={{ color: "var(--clay-text-light)" }}>
                {originalPrice}
              </span>
            )}
            <span className="text-lg font-bold" style={{ color: "var(--clay-text)", fontFamily: "var(--font-display)" }}>
              {currentPrice}
            </span>
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
