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
      <div className="bg-card rounded-2xl overflow-visible border border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover-elevate flex flex-row sm:flex-col">
        {/* Image Section - identical to DealCard */}
        <div className="relative max-w-[140px] w-full h-[140px] sm:w-full sm:h-auto sm:aspect-[4/3] overflow-hidden shrink-0 rounded-l-2xl sm:rounded-l-none sm:rounded-t-2xl">
          <img
            src={property.coverImage || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop"}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop';
            }}
          />
          
          {/* Top badges - hidden on mobile compact layout */}
          <div className="absolute top-3 left-3 hidden sm:flex items-center gap-2">
            <Badge className="bg-card text-foreground font-semibold shadow-sm flex items-center gap-1.5 px-2.5 py-1">
              <Heart className="w-3.5 h-3.5 fill-primary text-primary" />
              <span>Rare Find</span>
            </Badge>
            {maxDiscount > 0 && (
              <Badge className="bg-amber-500 text-white font-bold shadow-sm px-2.5 py-1">
                {maxDiscount}% OFF
              </Badge>
            )}
          </div>
          
          {/* Score badge at bottom right - hidden on mobile compact layout */}
          <div className="absolute bottom-3 right-3 hidden sm:block">
            <div className="bg-primary text-white font-bold rounded-full px-3 py-1.5 text-sm shadow-lg flex items-center gap-1">
              <span className="text-xs font-medium opacity-90">SCORE</span>
              <span className="text-base">{dealScore}</span>
            </div>
          </div>
        </div>

        {/* Content Section - identical structure to DealCard */}
        <div className="p-3 sm:p-4 bg-card flex-1 min-w-0">
          {/* Mobile-only badges */}
          <div className="flex items-center gap-2 mb-1.5 sm:hidden">
            {maxDiscount > 0 && (
              <Badge className="bg-amber-500 text-white font-bold text-[10px] px-1.5 py-0.5">
                {maxDiscount}% OFF
              </Badge>
            )}
            <span className="text-xs font-bold text-primary">SCORE {dealScore}</span>
          </div>

          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
            <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {property.title}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-sm">{Number(property.averageRating) > 0 ? property.averageRating : "New"}</span>
              {Number(property.reviewCount) > 0 && (
                <span className="text-xs text-muted-foreground">({property.reviewCount})</span>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center text-muted-foreground text-sm mb-1.5">
            <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span className="line-clamp-1">{property.city}, {property.state}</span>
          </div>

          {/* Nearby highlight - hidden on mobile */}
          {property.nearbyHighlight && (
            <div className="hidden sm:flex items-center text-primary text-xs mb-1.5">
              <Navigation className="w-3 h-3 mr-1.5 shrink-0" />
              <span>{property.nearbyHighlight}</span>
            </div>
          )}

          {/* Room type + capacity - matches DealCard */}
          <div className="flex items-center text-muted-foreground text-xs sm:text-sm mb-1.5">
            <Bed className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>{property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""} · {property.bathrooms} bath</span>
            <span className="mx-1.5 text-border">•</span>
            <Users className="w-3.5 h-3.5 mr-1 shrink-0" />
            <span>{property.maxGuests || 2}</span>
          </div>

          {/* Amenities icons - hidden on mobile */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 mb-3">
              {property.amenities.slice(0, 4).map((amenity: string) => {
                const Icon = AMENITY_ICONS[amenity];
                if (!Icon) return null;
                return (
                  <div key={amenity} className="text-muted-foreground hover:text-primary transition-colors" title={amenity}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                );
              })}
              {property.amenities.length > 4 && (
                <span className="text-xs text-muted-foreground">+{property.amenities.length - 4}</span>
              )}
            </div>
          )}

          {/* Availability hint + Price - identical layout to DealCard */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="font-medium">{getGapNightRangeLabel(property)}</span>
            </div>
            <div className="text-right">
              {lowestGapRate && lowestGapRate < property.baseNightlyRate ? (
                <>
                  <span className="text-xs line-through text-muted-foreground">{formatPrice(basePrice, "AUD")}</span>
                  <span className="ml-1 font-bold text-primary">{formatPrice(dealPrice, "AUD")}</span>
                </>
              ) : (
                <span className="font-bold text-primary">{formatPrice(basePrice, "AUD")}</span>
              )}
              <div className="text-[10px] text-muted-foreground">/night</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
