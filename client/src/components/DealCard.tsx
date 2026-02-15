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
  const discountPercent = Math.round(
    ((deal.normalPrice - deal.dealPrice) / deal.normalPrice) * 100
  );

  return (
    <Link href={`/deal/${deal.id}`} className="block group" data-testid={`deal-card-${deal.id}`}>
      <div className="bg-card rounded-xl overflow-hidden border border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
        {/* Image Section - Consistent aspect ratio */}
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <img
            src={deal.imageUrl}
            alt={deal.hotelName}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop';
            }}
          />
          
          {/* Top badges - stack on mobile, side by side on desktop */}
          <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
            <Badge className="bg-white/95 text-foreground font-semibold shadow-sm flex items-center gap-1 px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs">
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
              <span>Rare Find</span>
            </Badge>
            <Badge className="bg-rose-500 text-white font-bold shadow-sm px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs">
              {discountPercent}% OFF
            </Badge>
          </div>
          
          {/* Score badge at bottom right */}
          <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3">
            <div className="bg-primary text-white font-bold rounded-full px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm shadow-lg flex items-center gap-1">
              <span className="text-[9px] md:text-[10px] font-medium opacity-90 uppercase hidden sm:inline">Score</span>
              <span>{deal.dealScore}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-3 md:p-4 flex flex-col flex-1">
          {/* Hotel name + rating */}
          <div className="flex items-start justify-between gap-2 mb-1.5 md:mb-2">
            <h3 className="font-semibold text-foreground text-sm md:text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {deal.hotelName}
            </h3>
            <div className="flex items-center gap-0.5 shrink-0">
              <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-xs md:text-sm">{deal.rating}</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center text-muted-foreground text-xs md:text-sm mb-1.5 md:mb-2">
            <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 shrink-0" />
            <span className="line-clamp-1">{deal.location}</span>
          </div>

          {/* Nearby highlight */}
          {deal.nearbyHighlight && (
            <div className="flex items-center text-primary text-xs mb-1.5 md:mb-2">
              <Navigation className="w-3 h-3 md:w-3 md:h-3 mr-1 md:mr-1.5 shrink-0" />
              <span className="line-clamp-1">{deal.nearbyHighlight}</span>
            </div>
          )}

          {/* Room type + capacity */}
          <div className="flex items-center text-muted-foreground text-xs mb-2 md:mb-3">
            <Bed className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5 shrink-0" />
            <span className="line-clamp-1">{deal.roomType}</span>
          </div>

          {/* Amenities icons */}
          {deal.amenities && deal.amenities.length > 0 && (
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              {deal.amenities.slice(0, 4).map((amenity) => {
                const Icon = AMENITY_ICONS[amenity];
                if (!Icon) return null;
                return (
                  <div key={amenity} className="text-muted-foreground hover:text-primary transition-colors" title={amenity}>
                    <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                );
              })}
              {deal.amenities.length > 4 && (
                <span className="text-[10px] md:text-xs text-muted-foreground">+{deal.amenities.length - 4}</span>
              )}
            </div>
          )}

          {/* Bottom: Price block - prominent */}
          <div className="mt-auto pt-2 md:pt-3 border-t border-border/50">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                <CalendarDays className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span>{deal.nights} night{deal.nights !== 1 ? 's' : ''}</span>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-1.5 md:gap-2 justify-end">
                  <span className="text-xs line-through text-muted-foreground">{formatPrice(deal.normalPrice, deal.currency)}</span>
                  <span className="font-bold text-base md:text-lg text-primary">{formatPrice(deal.dealPrice, deal.currency)}</span>
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground">per night</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
