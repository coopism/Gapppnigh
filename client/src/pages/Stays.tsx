import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-xl font-bold">
            Gap<span className="text-emerald-500">Night</span>
            <span className="text-sm font-normal text-muted-foreground ml-2">Stays</span>
          </a>
          <div className="flex items-center gap-3">
            <a href="/host/login" className="text-sm text-muted-foreground hover:text-foreground">Become a Host</a>
            <a href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign In</a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gap Night Stays</h1>
          <p className="text-muted-foreground">Book discounted short-term rentals on gap nights between existing bookings</p>
        </div>

        <div className="flex gap-3 mb-6 flex-wrap">
          <Input placeholder="Search by city..." value={cityFilter}
            onChange={e => setCityFilter(e.target.value)} className="max-w-xs"
            onKeyDown={e => e.key === "Enter" && handleSearch()} />
          <Input placeholder="Guests" type="number" min="1" value={guestsFilter}
            onChange={e => setGuestsFilter(e.target.value)} className="w-24"
            onKeyDown={e => e.key === "Enter" && handleSearch()} />
          <Button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700">Search</Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">No properties found</h3>
            <p className="text-muted-foreground">Try adjusting your search filters or check back later for new listings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((prop: any) => (
              <PropertyCard key={prop.id} property={prop} onClick={() => setLocation(`/stays/${prop.id}`)} />
            ))}
          </div>
        )}
      </div>

      <footer className="border-t bg-white dark:bg-gray-800 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>GapNight - Fill gap nights, save on stays</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="/host/login" className="hover:text-foreground">Host Dashboard</a>
            <a href="/terms" className="hover:text-foreground">Terms</a>
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
          </div>
        </div>
      </footer>
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
    <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <div className="relative">
        <img
          src={property.coverImage || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"}
          alt={property.title}
          className="w-full h-48 object-cover"
        />
        {property.gapNightCount > 0 && (
          <Badge className="absolute top-3 left-3 bg-emerald-500">
            {property.gapNightCount} Gap Night{property.gapNightCount !== 1 ? "s" : ""}
          </Badge>
        )}
        {maxDiscount > 0 && (
          <Badge className="absolute top-3 right-3 bg-red-500">
            Up to {maxDiscount}% OFF
          </Badge>
        )}
        {property.host?.isSuperhost && (
          <Badge className="absolute bottom-3 left-3 bg-amber-500">Superhost</Badge>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-semibold text-sm line-clamp-1">{property.title}</h3>
          {Number(property.averageRating) > 0 && (
            <span className="text-sm flex items-center gap-1">
              ★ {property.averageRating}
              <span className="text-muted-foreground">({property.reviewCount})</span>
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{property.city}, {property.state}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {property.propertyType === "entire_place" ? "Entire place" :
           property.propertyType === "private_room" ? "Private room" :
           property.propertyType === "shared_room" ? "Shared room" : "Unique stay"}
          {" · "}{property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}
          {" · "}{property.maxGuests} guest{property.maxGuests !== 1 ? "s" : ""}
        </p>
        {property.nearbyHighlight && (
          <p className="text-xs text-emerald-600 mt-1">{property.nearbyHighlight}</p>
        )}
        <div className="mt-3 flex items-baseline gap-2">
          {lowestGapRate ? (
            <>
              <span className="text-sm line-through text-muted-foreground">
                ${(property.baseNightlyRate / 100).toFixed(0)}
              </span>
              <span className="text-lg font-bold text-emerald-600">
                ${(lowestGapRate / 100).toFixed(0)}
              </span>
              <span className="text-sm text-muted-foreground">/night</span>
            </>
          ) : (
            <>
              <span className="text-lg font-bold">${(property.baseNightlyRate / 100).toFixed(0)}</span>
              <span className="text-sm text-muted-foreground">/night</span>
            </>
          )}
        </div>
        {property.host && (
          <p className="text-xs text-muted-foreground mt-2">
            Hosted by {property.host.name}
            {property.host.averageResponseTime && (
              <span> · Responds in ~{property.host.averageResponseTime < 60 
                ? `${property.host.averageResponseTime}min` 
                : `${Math.round(property.host.averageResponseTime / 60)}hr`}</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
