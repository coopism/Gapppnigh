import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Search, MapPin, Calendar, Users, ChevronDown, Check, ArrowRight, Sparkles, Clock, BadgePercent, Hotel, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOCATION_SUGGESTIONS = [
  { city: "Melbourne", state: "VIC", country: "Australia" },
  { city: "Sydney", state: "NSW", country: "Australia" },
  { city: "Gold Coast", state: "QLD", country: "Australia" },
  { city: "Brisbane", state: "QLD", country: "Australia" },
  { city: "Perth", state: "WA", country: "Australia" },
  { city: "Adelaide", state: "SA", country: "Australia" },
  { city: "Hobart", state: "TAS", country: "Australia" },
  { city: "Byron Bay", state: "NSW", country: "Australia" },
  { city: "Cairns", state: "QLD", country: "Australia" },
  { city: "Blue Mountains", state: "NSW", country: "Australia" },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "Up to 70% Off",
    description: "Gap nights are priced to sell fast, often at massive discounts from regular rates.",
  },
  {
    icon: Clock,
    title: "Limited Availability",
    description: "These deals appear when hotels have 1-3 night gaps between bookings. Book fast!",
  },
  {
    icon: Hotel,
    title: "Same Quality",
    description: "Same rooms, same service, same amenities. Just a fraction of the price.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Hotels have gaps",
    description: "When guests check out on Friday and new guests arrive Monday, that Saturday night sits empty.",
  },
  {
    step: "2",
    title: "Empty rooms = lost revenue",
    description: "Hotels would rather fill the room at a discount than let it sit vacant and earn nothing.",
  },
  {
    step: "3",
    title: "You save big",
    description: "We partner with hotels to offer these gap nights at clearance prices. Everyone wins!",
  },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = LOCATION_SUGGESTIONS.filter(loc => {
    const searchLower = search.toLowerCase();
    return (
      loc.city.toLowerCase().includes(searchLower) ||
      loc.state.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (search.trim()) {
      setLocation(`/deals?search=${encodeURIComponent(search.trim())}`);
    } else {
      setLocation("/deals");
    }
  };

  const handleSelectSuggestion = (location: typeof LOCATION_SUGGESTIONS[0]) => {
    const locationString = `${location.city}, ${location.country}`;
    setSearch(locationString);
    setShowSuggestions(false);
    setLocation(`/deals?search=${encodeURIComponent(locationString)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-20 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Australia's #1 Gap Night Marketplace</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Luxury Hotels at
              <span className="text-primary block">Clearance Prices</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Discover "gap nights" — single-night openings between bookings that hotels sell at up to 70% off. Same room, same service, incredible savings.
            </p>
          </div>

          {/* Search Bar */}
          <div 
            className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-border/50 p-2"
            ref={searchRef}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  type="text"
                  placeholder="Where do you want to stay?"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-12 pr-4 py-4 text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
                  data-testid="input-hero-search"
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-border/50 overflow-hidden z-50 max-h-[300px] overflow-y-auto">
                    <div className="p-2">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-2">
                        Popular Destinations
                      </div>
                      {filteredSuggestions.slice(0, 6).map((loc) => (
                        <button
                          key={loc.city}
                          onClick={() => handleSelectSuggestion(loc)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg transition-colors text-left"
                          data-testid={`suggestion-${loc.city.toLowerCase()}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{loc.city}</div>
                            <div className="text-xs text-muted-foreground">{loc.state}, {loc.country}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button 
                size="lg" 
                onClick={handleSearch}
                className="px-6 rounded-xl"
                data-testid="button-hero-search"
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-12 text-center">
            <div>
              <div className="text-3xl font-bold text-foreground">15+</div>
              <div className="text-sm text-muted-foreground">Active Deals</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">50%</div>
              <div className="text-sm text-muted-foreground">Avg. Savings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">4.5</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Avg. Rating
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is a Gap Night? */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What is a Gap Night?
            </h2>
            <p className="text-lg text-muted-foreground">
              A gap night is a short vacancy (1-3 nights) that appears between existing hotel bookings. 
              Instead of letting these rooms sit empty, smart hotels offer them at steep discounts.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Gap Nights are Cheap */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Are Gap Nights So Cheap?
            </h2>
            <p className="text-lg text-muted-foreground">
              It's simple economics: an empty room earns zero revenue. Hotels prefer to sell gap nights 
              at a discount rather than waste inventory.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {FEATURES.map((feature) => (
              <div 
                key={feature.title} 
                className="bg-white rounded-2xl p-6 border border-border/50 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Find Your Gap Night?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Browse available deals across Australia. New gap nights are added daily as hotels update their availability.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => setLocation("/deals")}
            className="px-8 rounded-xl"
            data-testid="button-browse-deals"
          >
            Browse All Deals
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-foreground text-white/60">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-2xl font-bold text-white">
              Gap<span className="text-primary">Night</span>
            </div>
            <div className="text-sm">
              © 2026 GapNight. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
