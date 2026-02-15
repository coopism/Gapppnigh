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
import { useAuth } from "@/hooks/use-auth";

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
  if (gapNights.length === 0) return "Available";
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
  const { isAuthenticated } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  
  const lowestGapRate = property.gapNights?.length > 0
    ? Math.min(...property.gapNights.map((gn: any) => gn.discountedRate))
    : null;

  const maxDiscount = property.gapNights?.length > 0
    ? Math.max(...property.gapNights.map((gn: any) => gn.gapNightDiscount || 0))
    : 0;

  const basePrice = property.baseNightlyRate / 100;
  const dealPrice = lowestGapRate ? lowestGapRate / 100 : basePrice;

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    
    setIsSaved(!isSaved);
  };

  return (
    <>
      <Link href={`/stays/${property.id}`} className="block group" data-testid={`property-card-${property.id}`}>
      <div className="bg-card rounded-xl overflow-hidden border border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
        {/* Image Section */}
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <img
            src={property.coverImage || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop"}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop';
            }}
          />
          
          {/* Discount badge - ONLY badge on image, top-left */}
          {maxDiscount > 0 && (
            <div className="absolute top-2 left-2 md:top-3 md:left-3">
              <Badge className="bg-rose-500 text-white font-bold shadow-sm px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs">
                {maxDiscount}% OFF
              </Badge>
            </div>
          )}

          {/* Save heart - top-right of image */}
          <button
            onClick={handleSaveClick}
            className="absolute top-2 right-2 md:top-3 md:right-3 p-1.5 md:p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label={isSaved ? "Remove from saved" : "Save this property"}
            aria-pressed={isSaved}
          >
            <Heart 
              className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-200 ${
                isSaved 
                  ? "fill-rose-500 text-rose-500" 
                  : "fill-transparent text-white hover:fill-white/30"
              }`} 
            />
          </button>
        </div>

        {/* Content Section - Tightened spacing */}
        <div className="p-2.5 md:p-3 flex flex-col flex-1">
          {/* Title */}
          <h3 className="font-semibold text-foreground text-sm md:text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors mb-1">
            {property.title}
          </h3>

          {/* Rating with review count */}
          <div className="flex items-center gap-1.5 mb-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-xs md:text-sm">{Number(property.averageRating) > 0 ? property.averageRating : "New"}</span>
            {property.reviewCount > 0 && (
              <span className="text-xs text-muted-foreground">({property.reviewCount})</span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center text-muted-foreground text-xs md:text-sm mb-1">
            <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 shrink-0" />
            <span className="line-clamp-1">{property.city}, {property.state}</span>
          </div>

          {/* Highlight line (1 max) */}
          {property.nearbyHighlight && (
            <div className="flex items-center text-primary text-xs mb-1">
              <Navigation className="w-3 h-3 md:w-3 md:h-3 mr-1 shrink-0" />
              <span className="line-clamp-1">{property.nearbyHighlight}</span>
            </div>
          )}

          {/* Room type + guests */}
          <div className="flex items-center text-muted-foreground text-xs mb-1.5">
            <Bed className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 shrink-0" />
            <span className="line-clamp-1">{property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""} · {property.bathrooms} bath · {property.maxGuests || 2} guests</span>
          </div>

          {/* Amenities - max 3 icons + +N */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              {property.amenities.slice(0, 3).map((amenity: string) => {
                const Icon = AMENITY_ICONS[amenity];
                if (!Icon) return null;
                return (
                  <div key={amenity} className="text-muted-foreground hover:text-primary transition-colors" title={amenity}>
                    <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                );
              })}
              {property.amenities.length > 3 && (
                <span className="text-[10px] md:text-xs text-muted-foreground">+{property.amenities.length - 3}</span>
              )}
            </div>
          )}

          {/* Availability line */}
          <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground mb-2">
            <CalendarDays className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span>{getGapNightRangeLabel(property)}</span>
          </div>

          {/* Price block - standardized bottom-right */}
          <div className="mt-auto pt-2 border-t border-border/50">
            <div className="flex items-end justify-end">
              <div className="text-right">
                <div className="flex items-baseline gap-1.5 md:gap-2 justify-end">
                  {lowestGapRate && lowestGapRate < property.baseNightlyRate ? (
                    <>
                      <span className="text-xs line-through text-muted-foreground/80">{formatPrice(basePrice, "AUD")}</span>
                      <span className="font-bold text-base md:text-lg text-primary">{formatPrice(dealPrice, "AUD")}</span>
                    </>
                  ) : (
                    <span className="font-bold text-base md:text-lg text-primary">{formatPrice(basePrice, "AUD")}</span>
                  )}
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground">/ night</span>
              </div>
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
