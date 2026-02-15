import { useState } from "react";
import { Link } from "wouter";
import { Star, MapPin, Bed, Heart, Wifi, Dumbbell, Car, UtensilsCrossed, Waves, Sparkles, Navigation, CalendarDays, Wine, Umbrella, Bell, ConciergeBell, Users } from "lucide-react";
import type { Deal } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

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
};

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  
  const discountPercent = Math.round(
    ((deal.normalPrice - deal.dealPrice) / deal.normalPrice) * 100
  );

  // Only show "Rare Find" for top 15% of deals (score >= 85)
  const isRareFind = deal.dealScore >= 85;

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaved(!isSaved);
  };

  return (
    <Link href={`/deal/${deal.id}`} className="block group" data-testid={`deal-card-${deal.id}`}>
      <div className="bg-card rounded-xl overflow-hidden border border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
        {/* Image Section */}
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <img
            src={deal.imageUrl}
            alt={deal.hotelName}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop';
            }}
          />
          
          {/* Discount badge - ONLY badge on image, top-left */}
          <div className="absolute top-2 left-2 md:top-3 md:left-3">
            <Badge className="bg-rose-500 text-white font-bold shadow-sm px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs">
              {discountPercent}% OFF
            </Badge>
          </div>

          {/* Save heart - top-right of image */}
          <button
            onClick={handleSaveClick}
            className="absolute top-2 right-2 md:top-3 md:right-3 p-1.5 md:p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label={isSaved ? "Remove from saved" : "Save this deal"}
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
            {deal.hotelName}
          </h3>

          {/* Rating with review count */}
          <div className="flex items-center gap-1.5 mb-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-xs md:text-sm">{deal.rating}</span>
            {deal.reviewCount > 0 && (
              <span className="text-xs text-muted-foreground">({deal.reviewCount})</span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center text-muted-foreground text-xs md:text-sm mb-1">
            <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 shrink-0" />
            <span className="line-clamp-1">{deal.location}</span>
          </div>

          {/* Highlight line (1 max) */}
          {deal.nearbyHighlight && (
            <div className="flex items-center text-primary text-xs mb-1">
              <Navigation className="w-3 h-3 md:w-3 md:h-3 mr-1 shrink-0" />
              <span className="line-clamp-1">{deal.nearbyHighlight}</span>
            </div>
          )}

          {/* Room type + guests */}
          <div className="flex items-center text-muted-foreground text-xs mb-1.5">
            <Bed className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 shrink-0" />
            <span className="line-clamp-1">{deal.roomType} · {deal.maxGuests || 2} guests</span>
          </div>

          {/* Amenities - max 3 icons + +N */}
          {deal.amenities && deal.amenities.length > 0 && (
            <div className="flex items-center gap-2 mb-1.5">
              {deal.amenities.slice(0, 3).map((amenity) => {
                const Icon = AMENITY_ICONS[amenity];
                if (!Icon) return null;
                return (
                  <div key={amenity} className="text-muted-foreground hover:text-primary transition-colors" title={amenity}>
                    <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                );
              })}
              {deal.amenities.length > 3 && (
                <span className="text-[10px] md:text-xs text-muted-foreground">+{deal.amenities.length - 3}</span>
              )}
            </div>
          )}

          {/* Rare Find tag - in content area, only for top 15% */}
          {isRareFind && (
            <div className="flex items-center gap-1 mb-1.5">
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
              <span className="text-xs font-medium text-rose-500">Rare Find</span>
            </div>
          )}

          {/* Availability line */}
          <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground mb-2">
            <CalendarDays className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span>{deal.nights} night{deal.nights !== 1 ? 's' : ''} available</span>
          </div>

          {/* Price block - standardized bottom-right */}
          <div className="mt-auto pt-2 border-t border-border/50">
            <div className="flex items-end justify-end">
              <div className="text-right">
                <div className="flex items-baseline gap-1.5 md:gap-2 justify-end">
                  <span className="text-xs line-through text-muted-foreground/80">{formatPrice(deal.normalPrice, deal.currency)}</span>
                  <span className="font-bold text-base md:text-lg text-primary">{formatPrice(deal.dealPrice, deal.currency)}</span>
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground">/ night</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
