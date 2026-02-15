import { Link } from "wouter";
import { Star, MapPin, Bed, Heart, Wifi, Dumbbell, Car, UtensilsCrossed, Waves, Sparkles, Navigation, CalendarDays, Wine, Umbrella, Bell, ConciergeBell, Users } from "lucide-react";
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
  const lowestGapRate = property.gapNights?.length > 0
    ? Math.min(...property.gapNights.map((gn: any) => gn.discountedRate))
    : null;

  const maxDiscount = property.gapNights?.length > 0
    ? Math.max(...property.gapNights.map((gn: any) => gn.gapNightDiscount || 0))
    : 0;

  const basePrice = property.baseNightlyRate / 100;
  const dealPrice = lowestGapRate ? lowestGapRate / 100 : basePrice;
  const dealScore = calculateDealScore(property);

  return (
    <Link href={`/stays/${property.id}`} className="block group" data-testid={`property-card-${property.id}`}>
      <div className="bg-card rounded-xl overflow-hidden border border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
        {/* Image Section - Consistent aspect ratio */}
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <img
            src={property.coverImage || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop"}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop';
            }}
          />
          
          {/* Top badges - stack on mobile, side by side on desktop */}
          <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
            <Badge className="bg-white/95 text-foreground font-semibold shadow-sm flex items-center gap-1 px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs">
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
              <span>Rare Find</span>
            </Badge>
            {maxDiscount > 0 && (
              <Badge className="bg-rose-500 text-white font-bold shadow-sm px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs">
                {maxDiscount}% OFF
              </Badge>
            )}
          </div>
          
          {/* Score badge at bottom right */}
          <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3">
            <div className="bg-primary text-white font-bold rounded-full px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm shadow-lg flex items-center gap-1">
              <span className="text-[9px] md:text-[10px] font-medium opacity-90 uppercase hidden sm:inline">Score</span>
              <span>{dealScore}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-3 md:p-4 flex flex-col flex-1">
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2 mb-1.5 md:mb-2">
            <h3 className="font-semibold text-foreground text-sm md:text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {property.title}
            </h3>
            <div className="flex items-center gap-0.5 shrink-0">
              <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-xs md:text-sm">{Number(property.averageRating) > 0 ? property.averageRating : "New"}</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center text-muted-foreground text-xs md:text-sm mb-1.5 md:mb-2">
            <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 shrink-0" />
            <span className="line-clamp-1">{property.city}, {property.state}</span>
          </div>

          {/* Nearby highlight */}
          {property.nearbyHighlight && (
            <div className="flex items-center text-primary text-xs mb-1.5 md:mb-2">
              <Navigation className="w-3 h-3 md:w-3 md:h-3 mr-1 md:mr-1.5 shrink-0" />
              <span className="line-clamp-1">{property.nearbyHighlight}</span>
            </div>
          )}

          {/* Room type */}
          <div className="flex items-center text-muted-foreground text-xs mb-2 md:mb-3">
            <Bed className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5 shrink-0" />
            <span className="line-clamp-1">{property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""} · {property.bathrooms} bath</span>
          </div>

          {/* Amenities icons */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              {property.amenities.slice(0, 4).map((amenity: string) => {
                const Icon = AMENITY_ICONS[amenity];
                if (!Icon) return null;
                return (
                  <div key={amenity} className="text-muted-foreground hover:text-primary transition-colors" title={amenity}>
                    <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                );
              })}
              {property.amenities.length > 4 && (
                <span className="text-[10px] md:text-xs text-muted-foreground">+{property.amenities.length - 4}</span>
              )}
            </div>
          )}

          {/* Bottom: Price block */}
          <div className="mt-auto pt-2 md:pt-3 border-t border-border/50">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                <CalendarDays className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span>{getGapNightRangeLabel(property)}</span>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-1.5 md:gap-2 justify-end">
                  {lowestGapRate && lowestGapRate < property.baseNightlyRate ? (
                    <>
                      <span className="text-xs line-through text-muted-foreground">{formatPrice(basePrice, "AUD")}</span>
                      <span className="font-bold text-base md:text-lg text-primary">{formatPrice(dealPrice, "AUD")}</span>
                    </>
                  ) : (
                    <span className="font-bold text-base md:text-lg text-primary">{formatPrice(basePrice, "AUD")}</span>
                  )}
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
