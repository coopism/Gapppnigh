import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Search, Users, MapPin, Star, SlidersHorizontal, X, Bed, DollarSign, Home, Wifi, Car, Waves, Flame, Tv, Dumbbell, TreePine } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion";

const AMENITY_OPTIONS = [
  { label: "WiFi", icon: Wifi },
  { label: "Parking", icon: Car },
  { label: "Pool", icon: Waves },
  { label: "Kitchen", icon: Flame },
  { label: "TV", icon: Tv },
  { label: "Gym", icon: Dumbbell },
  { label: "Garden", icon: TreePine },
];

export default function Stays() {
  const [, setLocation] = useLocation();
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("");
  const [guestsFilter, setGuestsFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  useEffect(() => { loadProperties(); }, []);

  const loadProperties = async () => {
    try {
      let url = "/api/properties?limit=50";
      if (cityFilter) url += `&city=${encodeURIComponent(cityFilter)}`;
      if (guestsFilter) url += `&guests=${guestsFilter}`;
      if (minPrice) url += `&minPrice=${minPrice}`;
      if (maxPrice) url += `&maxPrice=${maxPrice}`;
      if (bedrooms) url += `&bedrooms=${bedrooms}`;
      if (propertyType) url += `&type=${propertyType}`;
      if (selectedAmenities.length > 0) url += `&amenities=${selectedAmenities.join(",")}`;

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

  const clearFilters = () => {
    setCityFilter("");
    setGuestsFilter("");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setPropertyType("");
    setSelectedAmenities([]);
    setShowFilters(false);
    setIsLoading(true);
    setTimeout(() => loadProperties(), 50);
  };

  const activeFilterCount = [minPrice, maxPrice, bedrooms, propertyType].filter(Boolean).length + selectedAmenities.length;

  const toggleAmenity = (a: string) => {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Hero / Search Section */}
        <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border/30 py-8 sm:py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <FadeIn direction="none" duration={0.4}>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-1">Gap Night Stays</h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">Discounted short-term rentals on gap nights between existing bookings</p>
            </FadeIn>

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
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-11 px-4 rounded-xl relative">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>
                )}
              </Button>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="mt-4 bg-card border border-border/50 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Filters</h3>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <X className="w-3 h-3" /> Clear all
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><DollarSign className="w-3 h-3" /> Min Price</label>
                    <Input type="number" placeholder="$0" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="h-9 text-sm rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><DollarSign className="w-3 h-3" /> Max Price</label>
                    <Input type="number" placeholder="$999" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="h-9 text-sm rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Bed className="w-3 h-3" /> Bedrooms</label>
                    <select className="w-full rounded-lg border p-2 text-xs h-9 bg-background" value={bedrooms} onChange={e => setBedrooms(e.target.value)}>
                      <option value="">Any</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                      <option value="4">4+</option>
                      <option value="5">5+</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Home className="w-3 h-3" /> Type</label>
                    <select className="w-full rounded-lg border p-2 text-xs h-9 bg-background" value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                      <option value="">Any</option>
                      <option value="entire_place">Entire Place</option>
                      <option value="private_room">Private Room</option>
                      <option value="shared_room">Shared Room</option>
                      <option value="unique_stay">Unique Stay</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Amenities</label>
                  <div className="flex flex-wrap gap-2">
                    {AMENITY_OPTIONS.map(a => (
                      <button key={a.label} onClick={() => toggleAmenity(a.label)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedAmenities.includes(a.label)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}>
                        <a.icon className="w-3 h-3" />
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSearch} size="sm" className="w-full rounded-lg">Apply Filters</Button>
              </div>
            )}
          </div>
        </div>

        {/* Recently Viewed */}
        <RecentlyViewedSection onNavigate={(id) => setLocation(`/stays/${id}`)} />

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
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" staggerDelay={0.07}>
                {properties.map((prop: any) => (
                  <StaggerItem key={prop.id}>
                    <PropertyCard property={prop} onClick={() => setLocation(`/stays/${prop.id}`)} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
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

function RecentlyViewedSection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gn_recently_viewed") || "[]");
      setItems(stored.slice(0, 6));
    } catch {}
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">Recently Viewed</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((item: any) => (
          <button key={item.id} onClick={() => onNavigate(item.id)}
            className="flex-shrink-0 w-48 bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-md hover:border-primary/30 transition-all text-left group">
            <div className="w-full h-28 overflow-hidden">
              <img
                src={item.coverImage || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400"}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400"; }}
              />
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold line-clamp-1 group-hover:text-primary transition-colors">{item.title}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                <MapPin className="w-2.5 h-2.5" /> {item.city}
              </p>
              <p className="text-xs font-bold mt-1">${(item.baseNightlyRate / 100).toFixed(0)} <span className="text-[10px] font-normal text-muted-foreground">/ night</span></p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
