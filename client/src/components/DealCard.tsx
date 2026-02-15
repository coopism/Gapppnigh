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
          
          {/* Top badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge className="bg-white/95 text-foreground font-semibold shadow-sm flex items-center gap-1.5 px-2.5 py-1">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span className="text-xs">Rare Find</span>
            </Badge>
            <Badge className="bg-rose-500 text-white font-bold shadow-sm px-2.5 py-1 text-xs">
              {discountPercent}% OFF
            </Badge>
          </div>
          
          {/* Score badge at bottom right */}
          <div className="absolute bottom-3 right-3">
            <div className="bg-primary text-white font-bold rounded-full px-3 py-1.5 text-sm shadow-lg flex items-center gap-1">
              <span className="text-[10px] font-medium opacity-90 uppercase">Score</span>
              <span className="text-base">{deal.dealScore}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col flex-1">
          {/* Hotel name + rating */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-foreground text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {deal.hotelName}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-sm">{deal.rating}</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center text-muted-foreground text-sm mb-2">
            <MapPin className="w-4 h-4 mr-1.5 shrink-0" />
            <span className="line-clamp-1">{deal.location}</span>
          </div>

          {/* Nearby highlight */}
          {deal.nearbyHighlight && (
            <div className="flex items-center text-primary text-xs mb-2">
              <Navigation className="w-3 h-3 mr-1.5 shrink-0" />
              <span>{deal.nearbyHighlight}</span>
            </div>
          )}

          {/* Room type + capacity */}
          <div className="flex items-center text-muted-foreground text-xs mb-3">
            <Bed className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>{deal.roomType}</span>
            <span className="mx-2 text-border">•</span>
            <Users className="w-3.5 h-3.5 mr-1 shrink-0" />
            <span>{deal.maxGuests || 2} guests</span>
          </div>

          {/* Amenities icons */}
          {deal.amenities && deal.amenities.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              {deal.amenities.slice(0, 4).map((amenity) => {
                const Icon = AMENITY_ICONS[amenity];
                if (!Icon) return null;
                return (
                  <div key={amenity} className="text-muted-foreground hover:text-primary transition-colors" title={amenity}>
                    <Icon className="w-4 h-4" />
                  </div>
                );
              })}
              {deal.amenities.length > 4 && (
                <span className="text-xs text-muted-foreground">+{deal.amenities.length - 4}</span>
              )}
            </div>
          )}

          {/* Bottom: Availability + Price */}
          <div className="mt-auto pt-3 border-t border-border/50 flex items-end justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{deal.nights} night{deal.nights !== 1 ? 's' : ''}</span>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-xs line-through text-muted-foreground">{formatPrice(deal.normalPrice, deal.currency)}</span>
                <span className="font-bold text-lg text-primary">{formatPrice(deal.dealPrice, deal.currency)}</span>
              </div>
              <span className="text-xs text-muted-foreground">/night</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
