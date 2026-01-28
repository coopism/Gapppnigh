import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useDeals } from "@/hooks/use-deals";
import { Navigation } from "@/components/Navigation";
import { Search, MapPin, ArrowRight, Sparkles, Star, Clock, Hotel, CheckCircle2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

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

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: Search,
    title: "Search a location",
    description: "No dates needed — just enter where you want to stay.",
  },
  {
    step: "2",
    icon: Sparkles,
    title: "Pick a gap night deal",
    description: "Browse 1-night openings at clearance prices.",
  },
  {
    step: "3",
    icon: CheckCircle2,
    title: "Book for less",
    description: "Get hotel-approved discounts on real rooms.",
  },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const dealsRef = useRef<HTMLElement>(null);

  const { data: deals, isLoading: dealsLoading } = useDeals({ sort: "best" });

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

  const scrollToDeals = () => {
    dealsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section - Dictionary Definition Focus */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted via-background to-muted/50 dark:from-muted/30 dark:via-background dark:to-muted/20 py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(14,165,165,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(14,165,165,0.05),transparent_40%)]" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto">
            {/* Dictionary Card */}
            <div className="bg-card/80 backdrop-blur-sm rounded-3xl p-6 md:p-12 border border-border/50 shadow-xl">
              {/* Header with title and pronunciation */}
              <div className="mb-6 md:mb-8">
                <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-2 md:mb-3" style={{ fontFamily: "Georgia, serif" }}>
                  Gap Night
                </h1>
                <div className="flex items-center gap-2 md:gap-3 text-muted-foreground">
                  <span className="text-lg md:text-xl italic">[gap-nahyt]</span>
                  <span className="text-xs md:text-sm bg-muted px-2 md:px-3 py-0.5 md:py-1 rounded-full font-medium">noun</span>
                </div>
              </div>
              
              {/* Definition */}
              <div className="space-y-4 md:space-y-6">
                <p className="text-lg md:text-2xl text-foreground leading-relaxed">
                  An unsold night between hotel bookings — discounted so it doesn't go unused.
                </p>
                <p className="hidden md:block text-lg text-muted-foreground">
                  Hotels list these nights directly on GapNight, so you get real discounts on real rooms.
                </p>
                
                {/* Search Bar - Mobile optimized */}
                <div 
                  className="bg-muted rounded-2xl md:rounded-full border border-border/50 p-2 md:p-1.5 mt-6 md:mt-8"
                  ref={searchRef}
                >
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
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
                        className="w-full pl-12 pr-4 py-3.5 md:py-4 text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-muted-foreground rounded-xl md:rounded-full"
                        data-testid="input-hero-search"
                      />
                      
                      {showSuggestions && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-popover rounded-2xl shadow-2xl border border-border/50 overflow-hidden z-50 max-h-[320px] overflow-y-auto">
                          <div className="p-3">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-2">
                              Popular Destinations
                            </div>
                            {filteredSuggestions.slice(0, 6).map((loc) => (
                              <button
                                key={loc.city}
                                onClick={() => handleSelectSuggestion(loc)}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left hover-elevate"
                                data-testid={`suggestion-${loc.city.toLowerCase()}`}
                              >
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <MapPin className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground">{loc.city}</div>
                                  <div className="text-sm text-muted-foreground">{loc.state}, {loc.country}</div>
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
                      className="px-6 rounded-xl md:rounded-full h-12 w-full md:w-auto"
                      data-testid="button-hero-search"
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>
                
                {/* Badges */}
                <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-4">
                  <Badge variant="secondary" className="text-sm py-1.5 px-3">
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    Usually 1 night
                  </Badge>
                  <Badge variant="secondary" className="text-sm py-1.5 px-3">
                    <Hotel className="w-3.5 h-3.5 mr-1.5" />
                    Limited rooms
                  </Badge>
                  <Badge variant="secondary" className="text-sm py-1.5 px-3">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    20–70% off
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Stats Row */}
            <div className="flex flex-wrap justify-center gap-12 md:gap-16 mt-12">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">15+</div>
                <div className="text-sm text-muted-foreground mt-1">Active Deals</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">50%</div>
                <div className="text-sm text-muted-foreground mt-1">Avg. Savings</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground flex items-center justify-center gap-1">
                  4.5 <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div className="text-sm text-muted-foreground mt-1">Avg. Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deals Preview Section */}
      <section ref={dealsRef} className="py-16 md:py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Explore today's gap night deals
              </h2>
              <p className="text-muted-foreground mt-1">Real discounts on real rooms — book before they're gone</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/deals")}
              className="rounded-full w-fit"
              data-testid="button-view-all-deals"
            >
              View All Deals
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dealsLoading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/50 p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-28 h-28 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-28" />
                  </div>
                </div>
              </div>
            ))}
            {!dealsLoading && deals?.slice(0, 6).map((deal) => {
              const discountPercent = Math.round(
                ((deal.normalPrice - deal.dealPrice) / deal.normalPrice) * 100
              );
              const checkIn = format(parseISO(deal.checkInDate), "EEE d MMM");
              const checkOut = format(parseISO(deal.checkOutDate), "EEE d MMM");

              return (
                <div 
                  key={deal.id}
                  onClick={() => setLocation(`/deal/${deal.id}`)}
                  className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                  data-testid={`preview-deal-${deal.id}`}
                >
                  <div className="flex gap-4 p-4">
                    <div className="w-28 h-28 rounded-xl overflow-hidden shrink-0">
                      <img
                        src={deal.imageUrl}
                        alt={deal.hotelName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-sm">{deal.rating}</span>
                        <span className="text-xs text-muted-foreground">({deal.reviewCount})</span>
                      </div>
                      <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {deal.hotelName}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">{deal.location}</p>
                      <p className="text-xs text-muted-foreground mt-1">{checkIn} → {checkOut}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-muted-foreground line-through">
                          {deal.currency}{deal.normalPrice}
                        </span>
                        <span className="text-lg font-bold text-foreground">
                          {deal.currency}{deal.dealPrice}
                        </span>
                        <Badge className="bg-amber-500 text-white text-xs">
                          {discountPercent}% off
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              How it works
            </h2>
            <p className="text-muted-foreground mt-2">Three simple steps to your next great stay</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="text-sm font-bold text-primary mb-2">Step {item.step}</div>
                <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Hotels Section */}
      <section className="py-16 md:py-20 bg-neutral-900 dark:bg-neutral-950 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">For Hotels</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Fill your gap nights without discounting your whole calendar
              </h2>
              <ul className="space-y-3 text-white/70 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span>Only list nights you want to fill</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span>Control price and inventory yourself</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span>Reach new last-minute guests</span>
                </li>
              </ul>
              <Button 
                size="lg"
                onClick={() => setLocation("/list-your-hotel")}
                className="rounded-full"
                data-testid="button-list-hotel"
              >
                List Your Hotel
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 rounded-2xl p-8 border border-white/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Hotel Partners</div>
                    <div className="text-sm text-white/60">Join 50+ Australian hotels</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-sm text-white/80">Avg. gap night fill rate</span>
                    <span className="font-bold text-primary">78%</span>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-sm text-white/80">Revenue recovered</span>
                    <span className="font-bold text-primary">A$2.4M+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to find your gap night?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            New deals are added daily. Start browsing to find your next great stay.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => setLocation("/deals")}
            className="px-8 rounded-full"
            data-testid="button-browse-deals"
          >
            Browse All Deals
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-neutral-900 dark:bg-neutral-950 text-white/60">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="text-2xl font-bold text-white mb-3">
                Gap<span className="text-primary">Night</span>
              </div>
              <p className="text-sm max-w-sm">
                Australia's marketplace for hotel gap nights. Get luxury stays at clearance prices on unsold 1-night openings.
              </p>
            </div>
            <div>
              <div className="font-semibold text-white mb-3">Quick Links</div>
              <ul className="space-y-2 text-sm">
                <li><a href="/deals" className="transition-colors opacity-60 hover:opacity-100" data-testid="link-footer-deals">Browse Deals</a></li>
                <li><a href="/list-your-hotel" className="transition-colors opacity-60 hover:opacity-100" data-testid="link-footer-hotels">For Hotels</a></li>
                <li><a href="/waitlist" className="transition-colors opacity-60 hover:opacity-100" data-testid="link-footer-waitlist">Join Waitlist</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-white mb-3">Legal</div>
              <ul className="space-y-2 text-sm">
                <li><a href="/terms" className="transition-colors opacity-60 hover:opacity-100" data-testid="link-footer-terms">Terms of Service</a></li>
                <li><a href="/privacy" className="transition-colors opacity-60 hover:opacity-100" data-testid="link-footer-privacy">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-white/80">
              © 2026 GapNight. All rights reserved.
            </div>
            <div className="text-xs text-white/40">
              Discounts vary by property and availability.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
