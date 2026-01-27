import { Link } from "wouter";
import { Star, MapPin, Bed, Calendar, Heart } from "lucide-react";
import type { Deal } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const discountPercent = Math.round(
    ((deal.normalPrice - deal.dealPrice) / deal.normalPrice) * 100
  );

  const checkIn = format(parseISO(deal.checkInDate), "yyyy-MM-dd");
  const checkOut = format(parseISO(deal.checkOutDate), "yyyy-MM-dd");

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
            <Badge className="bg-white text-foreground font-semibold shadow-sm flex items-center gap-1.5 px-2.5 py-1">
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
        <div className="p-4">
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

          {/* Room type */}
          <div className="flex items-center text-muted-foreground text-sm mb-1.5">
            <Bed className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>{deal.roomType}</span>
          </div>

          {/* Dates */}
          <div className="flex items-center text-primary text-sm font-medium">
            <Calendar className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>{checkIn} → {checkOut}</span>
            <span className="ml-1.5 text-muted-foreground font-normal">({deal.nights} night{deal.nights > 1 ? "s" : ""})</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
