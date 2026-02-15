import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Search, Users, MapPin, Star } from "lucide-react";

export default function Stays() {
  const [, setLocation] = useLocation();
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("");
  const [guestsFilter, setGuestsFilter] = useState("");

  useEffect(() => { loadProperties(); }, []);

  const loadProperties = async () => {
    try {
      let url = "/api/properties?limit=50";
      if (cityFilter) url += `&city=${encodeURIComponent(cityFilter)}`;
      if (guestsFilter) url += `&guests=${guestsFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
      }
    } catch (err) {
      console.error("Failed to load properties:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setIsLoading(true);
    loadProperties();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Hero / Search Section */}
        <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border/30 py-8 sm:py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-1">Gap Night Stays</h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">Discounted short-term rentals on gap nights between existing bookings</p>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by city..."
                  value={cityFilter}
                  onChange={e => setCityFilter(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="pl-9 h-11 rounded-xl"
                />
              </div>
              <div className="relative w-full sm:w-28">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Guests"
                  type="number"
                  min="1"
                  value={guestsFilter}
                  onChange={e => setGuestsFilter(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="pl-9 h-11 rounded-xl"
                />
              </div>
              <Button onClick={handleSearch} className="h-11 px-6 rounded-xl font-semibold">
                <Search className="w-4 h-4 mr-2 sm:hidden" />
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {isLoading ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="rounded-xl overflow-hidden">
                    <div className="h-44 sm:h-48 bg-muted animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                      <div className="h-5 bg-muted rounded animate-pulse w-1/3 mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : properties.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No properties found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">Try adjusting your search filters or check back later for new listings.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">{properties.length} {properties.length === 1 ? "property" : "properties"} found</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {properties.map((prop: any) => (
                  <PropertyCard key={prop.id} property={prop} onClick={() => setLocation(`/stays/${prop.id}`)} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function PropertyCard({ property, onClick }: { property: any; onClick: () => void }) {
  const lowestGapRate = property.gapNights?.length > 0
    ? Math.min(...property.gapNights.map((gn: any) => gn.discountedRate))
    : null;

  const maxDiscount = property.gapNights?.length > 0
    ? Math.max(...property.gapNights.map((gn: any) => gn.gapNightDiscount || 0))
    : 0;

  return (
    <Card className="overflow-hidden cursor-pointer group hover:shadow-xl hover:border-primary/30 transition-all border-border/50 rounded-xl flex flex-col h-full" onClick={onClick}>
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        <img
          src={property.coverImage || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"; }}
        />
        <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
          {property.gapNightCount > 0 && (
            <Badge className="bg-emerald-500 text-white text-[10px] md:text-xs font-semibold shadow-sm px-1.5 py-0.5 md:px-2 md:py-1">
              {property.gapNightCount} Gap Night{property.gapNightCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {maxDiscount > 0 && (
          <Badge className="absolute top-2 right-2 md:top-3 md:right-3 bg-rose-500 text-white text-[10px] md:text-xs font-bold shadow-sm px-1.5 py-0.5 md:px-2 md:py-1">
            {maxDiscount}% OFF
          </Badge>
        )}
      </div>
      <CardContent className="p-3 md:p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-2 mb-1 md:mb-1.5">
          <h3 className="font-semibold text-sm md:text-base line-clamp-1 text-foreground group-hover:text-primary transition-colors">{property.title}</h3>
          {Number(property.averageRating) > 0 && (
            <span className="text-xs md:text-sm flex items-center gap-0.5 shrink-0 text-foreground">
              <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-amber-400 text-amber-400" />
              {Number(property.averageRating).toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 mb-1 md:mb-1.5">
          <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
          <span className="line-clamp-1">{property.city}, {property.state}</span>
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {property.propertyType === "entire_place" ? "Entire place" :
           property.propertyType === "private_room" ? "Private room" :
           property.propertyType === "shared_room" ? "Shared room" : "Unique stay"}
          {" · "}{property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}
        </p>
        {property.nearbyHighlight && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 line-clamp-1">{property.nearbyHighlight}</p>
        )}
        <div className="mt-auto pt-2 md:pt-3 border-t border-border/50 mt-2 md:mt-3">
          <div className="flex items-end justify-between">
            <div className="text-xs text-muted-foreground">
              {property.maxGuests} guest{property.maxGuests !== 1 ? "s" : ""}
            </div>
            <div className="text-right">
              {lowestGapRate ? (
                <div className="flex items-baseline gap-1.5 justify-end">
                  <span className="text-xs line-through text-muted-foreground">
                    ${(property.baseNightlyRate / 100).toFixed(0)}
                  </span>
                  <span className="text-base md:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ${(lowestGapRate / 100).toFixed(0)}
                  </span>
                </div>
              ) : (
                <span className="text-base md:text-lg font-bold">${(property.baseNightlyRate / 100).toFixed(0)}</span>
              )}
              <span className="text-[10px] md:text-xs text-muted-foreground"> per night</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
