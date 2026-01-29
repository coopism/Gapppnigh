import { Link } from "wouter";
import { Star, MapPin, Bed, Heart, Wifi, Dumbbell, Car, UtensilsCrossed, Waves, Sparkles, Navigation, CalendarDays, Wine, Umbrella, Bell, ConciergeBell } from "lucide-react";
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
      <div className="bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300">
        {/* Image Section */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={deal.imageUrl}
            alt={deal.hotelName}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          
          {/* Top badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge className="bg-card text-foreground font-semibold shadow-sm flex items-center gap-1.5 px-2.5 py-1">
              <Heart className="w-3.5 h-3.5 fill-primary text-primary" />
              <span>Rare Find</span>
            </Badge>
            <Badge className="bg-amber-500 text-white font-bold shadow-sm px-2.5 py-1">
              {discountPercent}% OFF
            </Badge>
          </div>
          
          {/* Score badge at bottom right */}
          <div className="absolute bottom-3 right-3">
            <div className="bg-primary text-white font-bold rounded-full px-3 py-1.5 text-sm shadow-lg flex items-center gap-1">
              <span className="text-xs font-medium opacity-90">SCORE</span>
              <span className="text-base">{deal.dealScore}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 bg-card">
          {/* Hotel name + rating */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-foreground text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {deal.hotelName}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-sm">{deal.rating}</span>
              <span className="text-xs text-muted-foreground">({deal.reviewCount})</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center text-muted-foreground text-sm mb-1.5">
            <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span className="line-clamp-1">{deal.location}</span>
          </div>

          {/* Nearby highlight */}
          {deal.nearbyHighlight && (
            <div className="flex items-center text-primary text-xs mb-1.5">
              <Navigation className="w-3 h-3 mr-1.5 shrink-0" />
              <span>{deal.nearbyHighlight}</span>
            </div>
          )}

          {/* Room type */}
          <div className="flex items-center text-muted-foreground text-sm mb-1.5">
            <Bed className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>{deal.roomType}</span>
          </div>

          {/* Amenities icons */}
          {deal.amenities && deal.amenities.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              {deal.amenities.slice(0, 4).map((amenity) => {
                const Icon = AMENITY_ICONS[amenity];
                if (!Icon) return null;
                return (
                  <div key={amenity} className="text-muted-foreground hover:text-primary transition-colors" title={amenity}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                );
              })}
              {deal.amenities.length > 4 && (
                <span className="text-xs text-muted-foreground">+{deal.amenities.length - 4}</span>
              )}
            </div>
          )}

          {/* Availability hint + Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="font-medium">{deal.nights === 1 ? '1-3 nights available' : `${deal.nights}+ nights available`}</span>
            </div>
            <div className="text-right">
              <span className="text-xs line-through text-muted-foreground">{formatPrice(deal.normalPrice, deal.currency)}</span>
              <span className="ml-1 font-bold text-primary">{formatPrice(deal.dealPrice, deal.currency)}</span>
              <div className="text-[10px] text-muted-foreground">/night</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
