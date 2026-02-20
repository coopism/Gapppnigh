import { useState } from "react";
import { Link } from "wouter";
import { Star, MapPin, Bed, Heart, Wifi, Dumbbell, Car, UtensilsCrossed, Waves, Sparkles, Navigation, CalendarDays, Wine, Umbrella, Bell, ConciergeBell, Users, LogIn, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/hooks/useAuth";
import { useSavedListings } from "@/hooks/useSavedListings";
import { HeartPulse } from "@/components/ui/motion";

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  "WiFi": Wifi,
  "Gym": Dumbbell,
  "Parking": Car,
  "Restaurant": UtensilsCrossed,
  "Pool": Waves,
  "Spa": Sparkles,
  "Bar": Wine,
  "Beach Access": Umbrella,
  "Room Service": Bell,
  "Concierge": ConciergeBell,
  "Kitchen": UtensilsCrossed,
  "Air Conditioning": Sparkles,
  "TV": Sparkles,
  "Balcony": Sparkles,
  "BBQ": UtensilsCrossed,
  "Garden": Sparkles,
};

interface PropertyDealCardProps {
  property: any;
}

function calculateDealScore(property: any): number {
  let score = 50;
  const maxDiscount = property.gapNights?.length > 0
    ? Math.max(...property.gapNights.map((gn: any) => gn.gapNightDiscount || 0))
    : 0;
  score += Math.min(maxDiscount * 0.8, 25);
  const gapCount = property.gapNightCount || 0;
  score += Math.min(gapCount * 0.5, 8);
  const rating = Number(property.averageRating || 0);
  if (rating >= 4.5) score += 7;
  else if (rating >= 4.0) score += 4;
  else if (rating >= 3.5) score += 2;
  if (property.instantBook) score += 3;
  if (property.selfCheckIn) score += 2;
  return Math.min(Math.round(score), 99);
}

function getGapNightRangeLabel(property: any): string {
  const gapNights = property.gapNights || [];
  if (gapNights.length === 0) return "No availability";
  // Group consecutive dates into ranges
  const dates = gapNights.map((gn: any) => gn.date).sort();
  let ranges = 0;
  let maxConsecutive = 1;
  let currentConsecutive = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T00:00:00");
    const curr = new Date(dates[i] + "T00:00:00");
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      ranges++;
      currentConsecutive = 1;
    }
  }
  ranges++; // count last range
  if (maxConsecutive > 1) {
    return `${gapNights.length} gap nights · up to ${maxConsecutive} consecutive`;
  }
  return `${gapNights.length} gap night${gapNights.length !== 1 ? "s" : ""} available`;
}

export function PropertyDealCard({ property }: PropertyDealCardProps) {
  const { user } = useAuthStore();
  const { isPropertySaved, toggleSaveProperty } = useSavedListings();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const isSaved = isPropertySaved(property.id);
  const hasAvailability = (property.gapNights?.length || 0) > 0;
  
  const lowestGapRate = property.gapNights?.length > 0
    ? Math.min(...property.gapNights.map((gn: any) => gn.discountedRate))
    : null;

  const maxDiscount = property.gapNights?.length > 0
    ? Math.max(...property.gapNights.map((gn: any) => gn.gapNightDiscount || 0))
    : 0;

  const basePrice = property.baseNightlyRate / 100;
  const dealPrice = lowestGapRate ? lowestGapRate / 100 : basePrice;

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      setShowLoginDialog(true);
      return;
    }
    
    await toggleSaveProperty(property.id);
  };

  return (
    <>
      <Link 
        href={hasAvailability ? `/stays/${property.id}` : "#"}
        className={`block group ${!hasAvailability ? "pointer-events-auto" : ""}`}
        data-testid={`property-card-${property.id}`}
        onClick={!hasAvailability ? (e: React.MouseEvent) => e.preventDefault() : undefined}
      >
      <div className={`clay-card clay-hover overflow-hidden flex flex-col h-full transition-all duration-300 ${
        !hasAvailability ? "opacity-55 grayscale-[40%] cursor-default" : ""
      }`} style={{ padding: 0 }}>
        {/* Image Section */}
        <div className="relative w-full aspect-[4/3] overflow-hidden"
          style={{ borderRadius: "var(--clay-radius-lg) var(--clay-radius-lg) 0 0" }}>
          <img
            src={property.coverImage || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop"}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

          {/* Discount badge top-left */}
          {maxDiscount > 0 && (
            <div className="absolute top-3 left-3">
              <span className="clay-badge-deal">{maxDiscount}% OFF</span>
            </div>
          )}

          {/* Rating badge top-right */}
          {Number(property.averageRating) > 0 && (
            <div className="absolute top-3 right-3">
              <span className="clay-badge-rating">
                <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                {property.averageRating}
                {property.reviewCount > 0 && <span style={{ fontWeight: 400, color: "var(--clay-text-muted)" }}>({property.reviewCount})</span>}
              </span>
            </div>
          )}

          {/* Bottom row: Gap Night badge + save button */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            {hasAvailability && (
              <span className="clay-badge-gn">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Gap Night
              </span>
            )}
            <button
              onClick={handleSaveClick}
              className="ml-auto p-2 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              style={{ background: "rgba(255,255,255,0.85)", boxShadow: "var(--clay-shadow-xs)" }}
              aria-label={isSaved ? "Remove from saved" : "Save this property"}
              aria-pressed={isSaved}
            >
              <HeartPulse isSaved={isSaved}>
                <Heart className={`w-4 h-4 transition-all duration-200 ${isSaved ? "fill-rose-500 text-rose-500" : "fill-transparent text-rose-400"}`} />
              </HeartPulse>
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-bold text-sm md:text-base leading-tight line-clamp-1 mb-1 group-hover:opacity-80 transition-opacity"
            style={{ color: "var(--clay-text)", fontFamily: "var(--font-display)" }}>
            {property.title}
          </h3>

          <div className="flex items-center gap-1 mb-1.5" style={{ color: "var(--clay-text-muted)" }}>
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs line-clamp-1">{property.city}, {property.state}</span>
          </div>

          {property.nearbyHighlight && (
            <div className="flex items-center gap-1 mb-1.5" style={{ color: "var(--clay-primary)" }}>
              <Navigation className="w-3 h-3 shrink-0" />
              <span className="text-xs line-clamp-1">{property.nearbyHighlight}</span>
            </div>
          )}

          <div className="flex items-center gap-1 mb-2" style={{ color: "var(--clay-text-muted)" }}>
            <Bed className="w-3 h-3 shrink-0" />
            <span className="text-xs">{property.bedrooms} bed · {property.bathrooms} bath · {property.maxGuests || 2} guests</span>
          </div>

          <div className={`flex items-center gap-1.5 text-xs mb-1.5 ${hasAvailability ? "" : "text-rose-500 font-medium"}`}
            style={hasAvailability ? { color: "var(--clay-text-muted)" } : {}}>
            <CalendarDays className="w-3 h-3" />
            <span>{getGapNightRangeLabel(property)}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: "#059669" }}>
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Free cancellation within 24hrs
          </div>

          <div className="mt-auto pt-3 flex items-end justify-between" style={{ borderTop: "1px solid rgba(107,122,154,0.12)" }}>
            <span className="clay-badge-approval text-xs">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Host approval
            </span>
            <div className="text-right">
              <div className="flex items-baseline gap-1.5 justify-end">
                {lowestGapRate && lowestGapRate < property.baseNightlyRate ? (
                  <>
                    <span className="text-xs line-through" style={{ color: "var(--clay-text-light)" }}>{formatPrice(basePrice, "AUD")}</span>
                    <span className="font-bold text-base md:text-lg" style={{ color: "var(--clay-primary)", fontFamily: "var(--font-display)" }}>{formatPrice(dealPrice, "AUD")}</span>
                  </>
                ) : (
                  <span className="font-bold text-base md:text-lg" style={{ color: "var(--clay-primary)", fontFamily: "var(--font-display)" }}>{formatPrice(basePrice, "AUD")}</span>
                )}
              </div>
              <span className="text-[10px]" style={{ color: "var(--clay-text-light)" }}>/ night</span>
            </div>
          </div>
        </div>
      </div>
    </Link>

    {/* Login Dialog for unauthenticated users trying to save */}
    <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to save properties</DialogTitle>
          <DialogDescription>
            Create an account or sign in to save your favorite properties and access them anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Link href="/login">
            <Button className="w-full gap-2" onClick={() => setShowLoginDialog(false)}>
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowLoginDialog(false)}>
              <UserPlus className="w-4 h-4" />
              Create Account
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
