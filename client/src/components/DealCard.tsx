import { Link } from "wouter";
import { Star, MapPin } from "lucide-react";
import type { Deal } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  // Calculate discount percentage
  const discountPercent = Math.round(
    ((deal.normalPrice - deal.dealPrice) / deal.normalPrice) * 100
  );

  return (
    <Link href={`/deal/${deal.id}`} className="block group">
      <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50 hover:shadow-xl hover:border-primary/20 transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex flex-col sm:flex-row h-full">
          {/* Image Section */}
          <div className="relative sm:w-1/3 h-48 sm:h-auto overflow-hidden">
            {/* Unsplash hotel room image */}
            <img
              src={deal.imageUrl}
              alt={deal.hotelName}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute top-3 left-3">
              <Badge className="bg-white/95 text-foreground font-bold shadow-sm backdrop-blur-sm">
                {deal.nights} Night{deal.nights > 1 ? "s" : ""}
              </Badge>
            </div>
            {deal.dealScore > 85 && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25">
                  Great Deal
                </Badge>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-5 flex flex-col justify-between flex-1">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors">
                    {deal.hotelName}
                  </h3>
                  <div className="flex items-center text-muted-foreground mt-1 text-sm">
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                    {deal.location}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center bg-secondary px-2 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="font-bold text-sm">{deal.rating}</span>
                    <span className="text-xs text-muted-foreground ml-1">({deal.reviewCount})</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {deal.categoryTags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 bg-accent/50 text-accent-foreground rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Total for {deal.nights} nights</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary font-display">
                    {deal.currency} {deal.dealPrice}
                  </span>
                  <span className="text-sm text-muted-foreground line-through decoration-destructive/50">
                    {deal.currency} {deal.normalPrice}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 font-bold">
                  Save {discountPercent}%
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
