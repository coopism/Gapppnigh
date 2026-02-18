import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useDeals } from "@/hooks/use-deals";
import { Navigation } from "@/components/Navigation";
import { PropertyDealCard } from "@/components/PropertyDealCard";
import { Search, MapPin, ArrowRight, Star, X, Home, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { GapNightLogoLoader } from "@/components/GapNightLogo";
import { FadeIn, BlurFade, StaggerContainer, StaggerItem, SlideIn } from "@/components/ui/motion";

const LOCATION_SUGGESTIONS = [
  { city: "Melbourne", state: "VIC" },
  { city: "Geelong", state: "VIC" },
  { city: "Mornington", state: "VIC" },
  { city: "Cape Schanck", state: "VIC" },
  { city: "Macedon", state: "VIC" },
  { city: "Sydney", state: "NSW" },
  { city: "Gold Coast", state: "QLD" },
  { city: "Brisbane", state: "QLD" },
  { city: "Perth", state: "WA" },
  { city: "Adelaide", state: "SA" },
];

const TICKER_ITEMS = [
  { location: "Mornington Peninsula", label: "Tonight", price: "$89" },
  { location: "St Kilda, Melbourne", label: "Tomorrow", price: "$112" },
  { location: "Byron Bay", label: "Tonight", price: "$145" },
  { location: "Daylesford", label: "This weekend", price: "$98" },
  { location: "Noosa Heads", label: "Tonight", price: "$167" },
  { location: "Barossa Valley", label: "Tomorrow", price: "$79" },
  { location: "Fremantle, Perth", label: "Tonight", price: "$103" },
  { location: "Hunter Valley", label: "This weekend", price: "$134" },
  { location: "Lorne, Great Ocean Rd", label: "Tonight", price: "$119" },
  { location: "Palm Beach, Sydney", label: "Tomorrow", price: "$188" },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const dealsRef = useRef<HTMLElement>(null);

  const { data: deals, isLoading: dealsLoading } = useDeals({ sort: "best" });

  // Fetch properties (stays) for the landing page
  const { data: propertiesData, isLoading: propsLoading } = useQuery({
    queryKey: ["landing-properties"],
    queryFn: async () => {
      const res = await fetch("/api/properties?limit=6");
      if (!res.ok) return [];
      const data = await res.json();
      return data.properties || [];
    },
  });

  const properties = propertiesData || [];
  const hasDeals = deals && deals.length > 0;
  const hasProperties = properties.length > 0;
  const isLoading = dealsLoading || propsLoading;

  const filteredSuggestions = LOCATION_SUGGESTIONS.filter(loc => {
    const searchLower = search.toLowerCase();
    return (
      loc.city.toLowerCase().includes(searchLower) ||
      loc.state.toLowerCase().includes(searchLower) ||
      `${loc.city}, ${loc.state}`.toLowerCase().includes(searchLower)
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
    const locationString = `${location.city}, ${location.state}`;
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
      
      {/* Hero Section - Dictionary Definition Focus */}
      <section className="relative overflow-visible min-h-[90vh] flex items-center bg-gradient-to-br from-background via-muted/30 to-background py-12 md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,165,165,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(14,165,165,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(14,165,165,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,165,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto">
            {/* Dictionary Card */}
            <BlurFade duration={0.7}>
            <div className="bg-card/90 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-border/50 shadow-2xl">
              {/* Header with title and pronunciation */}
              <FadeIn direction="none" duration={0.6} delay={0.2}>
              <div className="mb-6 md:mb-8">
                <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-2 md:mb-3">
                  Gap Night
                </h1>
                <div className="flex items-center gap-2 md:gap-3 text-muted-foreground">
                  <span className="text-lg md:text-xl italic">gap-night /ˈgæp nite/</span>
                  <span className="text-xs md:text-sm bg-muted px-2 md:px-3 py-0.5 md:py-1 rounded-full font-medium">noun</span>
                </div>
              </div>
              </FadeIn>
              
              {/* Definition */}
              <div className="space-y-4 md:space-y-6">
                <FadeIn delay={0.4} duration={0.6}>
                <p className="text-lg md:text-2xl text-foreground leading-relaxed">
                  An unsold night between hotel bookings — discounted so it doesn't go unused.
                </p>
                </FadeIn>
                <FadeIn delay={0.55} duration={0.6}>
                <p className="hidden md:block text-lg text-muted-foreground">
                  Hotels list these nights directly on GapNight, so you get real discounts on real rooms.
                </p>
                </FadeIn>
                
                {/* Search Bar - Mobile optimized */}
                <div 
                  className="bg-muted rounded-2xl md:rounded-full border border-border/50 p-2 md:p-1.5 mt-6 md:mt-8 focus-within:ring-2 focus-within:ring-primary transition-all"
                  ref={searchRef}
                >
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                    <div className="flex-1 relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary pointer-events-none" />
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
                        className="w-full pl-12 pr-10 py-3.5 md:py-4 text-base bg-transparent border-0 outline-none placeholder:text-muted-foreground rounded-xl md:rounded-full"
                        data-testid="input-hero-search"
                      />
                      {search && (
                        <button
                          onClick={() => {
                            setSearch("");
                            setShowSuggestions(false);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Clear search"
                          data-testid="button-clear-search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      
                      {showSuggestions && search && filteredSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-popover rounded-2xl shadow-2xl border border-border/50 overflow-visible z-50 max-h-[320px] overflow-y-auto">
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
                                  <div className="text-sm text-muted-foreground">{loc.state}, Australia</div>
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
                
              </div>
            </div>
            </BlurFade>
          </div>
        </div>
      </section>

      {/* Deals Preview Section */}
      <section ref={dealsRef} className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <FadeIn direction="up" duration={0.5}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Explore today's gap night stays
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
          </FadeIn>

          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading && (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <GapNightLogoLoader size={64} className="mb-4" />
                <p className="text-muted-foreground text-sm animate-pulse">Finding gap nights...</p>
              </div>
            )}
            {!isLoading && !hasDeals && !hasProperties && (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">No stays found</h3>
                  <p className="text-muted-foreground mb-6">
                    No gap night stays available right now. Check back soon or try searching for a different location.
                  </p>
                  <Button 
                    onClick={() => setLocation("/deals")}
                    className="rounded-full"
                    data-testid="button-browse-empty-deals"
                  >
                    Browse All Locations
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
            {/* Show deal cards if any */}
            {!isLoading && hasDeals && deals!.slice(0, 6).map((deal) => {
              const discountPercent = Math.round(
                ((deal.normalPrice - deal.dealPrice) / deal.normalPrice) * 100
              );
              const checkIn = format(parseISO(deal.checkInDate), "EEE d MMM");
              const checkOut = format(parseISO(deal.checkOutDate), "EEE d MMM");

              return (
                <StaggerItem key={deal.id}>
                <div 
                  onClick={() => setLocation(`/deal/${deal.id}`)}
                  className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group hover-elevate"
                  data-testid={`preview-deal-${deal.id}`}
                >
                  <div className="flex gap-4 p-4">
                    <div className="w-28 h-28 rounded-xl overflow-hidden shrink-0">
                      <img
                        src={deal.imageUrl}
                        alt={deal.hotelName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop';
                        }}
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
                          {formatPrice(deal.normalPrice, deal.currency)}
                        </span>
                        <span className="text-lg font-bold text-foreground">
                          {formatPrice(deal.dealPrice, deal.currency)}
                        </span>
                        <Badge className="bg-amber-500 text-white text-xs">
                          {discountPercent}% off
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                </StaggerItem>
              );
            })}
            {/* Show property cards */}
            {!isLoading && hasProperties && properties.slice(0, hasDeals ? 3 : 6).map((prop: any) => (
              <StaggerItem key={prop.id}>
                <PropertyDealCard property={prop} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── TICKER STRIP ─────────────────────────────────────────────────── */}
      {/* A departures-board feel: deals scrolling past, ambient urgency    */}
      <section className="py-0 bg-background border-y border-border/40 overflow-hidden">
        <div className="relative flex">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />

          {/* Scrolling track — duplicated for seamless loop */}
          <div className="flex animate-ticker whitespace-nowrap py-3.5 gap-0">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2.5 px-6 text-sm text-muted-foreground shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="font-medium text-foreground">{item.location}</span>
                <span className="text-muted-foreground/60">·</span>
                <span>{item.label}</span>
                <span className="text-muted-foreground/60">·</span>
                <span className="font-semibold text-primary">{item.price}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOST PITCH ───────────────────────────────────────────────────── */}
      {/* Editorial layout. Not a feature list. Not a bullet grid.          */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">

            {/* Eyebrow */}
            <FadeIn direction="up" duration={0.5}>
              <div className="flex items-center gap-3 mb-10 md:mb-14">
                <div className="h-px flex-1 bg-border/60 max-w-[48px]" />
                <span className="text-xs font-bold tracking-[0.18em] uppercase text-muted-foreground">For hosts</span>
              </div>
            </FadeIn>

            <div className="grid md:grid-cols-[1fr_1.1fr] gap-12 md:gap-20 items-start">

              {/* Left — the big statement */}
              <SlideIn from="left">
                <div>
                  <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-[1.1] mb-6">
                    Your spare night is someone's{" "}
                    <span className="text-primary italic">perfect</span>{" "}
                    night.
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                    You've got a gap between bookings. It's sitting there, earning nothing. 
                    List it on GapNight and it's gone by morning.
                  </p>
                  <Button
                    size="lg"
                    onClick={() => setLocation("/host/onboarding")}
                    className="rounded-full px-7 group"
                    data-testid="button-become-host"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    List your property
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </SlideIn>

              {/* Right — honest, human breakdown */}
              <SlideIn from="right" delay={0.15}>
                <div className="space-y-0 divide-y divide-border/50">

                  <div className="py-6 first:pt-0">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground mb-1">You set the price. We find the guest.</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Pick a discounted rate for the night you want to fill. Guests searching for last-minute stays see it immediately.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Star className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground mb-1">Approve every booking yourself.</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          No auto-accepts. You review each request and decide. Your property, your call.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground mb-1">Only the nights you choose.</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Gap Night doesn't touch your regular calendar. You list specific nights — nothing else changes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-6 last:pb-0">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Search className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground mb-1">ID-verified guests only.</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Every guest who books has verified their identity. You know who's staying before you say yes.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </SlideIn>

            </div>
          </div>
        </div>
      </section>

      {/* ── GUT-CHECK CTA ────────────────────────────────────────────────── */}
      {/* Dark. Minimal. Confident. Not a template.                          */}
      <section className="relative py-20 md:py-28 bg-neutral-950 overflow-hidden">
        {/* Subtle texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(14,165,165,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_20%,rgba(14,165,165,0.07),transparent_50%)]" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-2xl">
            <FadeIn direction="up" duration={0.6}>
              {/* The line that makes you feel something */}
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary/80 mb-5">Tonight</p>
              <h2 className="text-5xl md:text-7xl font-display font-bold text-white leading-[1.0] mb-6">
                Tonight's<br />looking good.
              </h2>
              <p className="text-white/50 text-lg mb-10 max-w-sm leading-relaxed">
                Hosts have listed their spare nights. The prices drop as the clock ticks. Have a look.
              </p>
            </FadeIn>
            <FadeIn direction="up" delay={0.2} duration={0.5}>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  onClick={() => setLocation("/deals")}
                  className="rounded-full px-8 bg-primary hover:bg-primary/90 text-white"
                  data-testid="button-see-whats-available"
                >
                  See what's available
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation("/host/onboarding")}
                  className="rounded-full px-8 border-white/20 text-white/80 hover:bg-white/10 hover:text-white bg-transparent"
                  data-testid="button-cta-list-property"
                >
                  List a property
                </Button>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-12 bg-neutral-900 dark:bg-neutral-950 text-white/60">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="text-2xl font-bold text-white mb-3">
                Gap<span className="text-primary">Night</span>
              </div>
              <p className="text-sm max-w-sm leading-relaxed">
                Australia's marketplace for gap nights. Real properties, real hosts, real discounts on unsold 1-night openings.
              </p>
            </div>
            <div>
              <div className="font-semibold text-white mb-3">Explore</div>
              <ul className="space-y-2 text-sm">
                <li><a href="/deals" className="transition-colors opacity-60 hover:opacity-100" data-testid="link-footer-deals">Browse stays</a></li>
                <li><a href="/host/onboarding" className="transition-colors opacity-60 hover:opacity-100" data-testid="link-footer-host">Become a host</a></li>
                <li><a href="/contact" className="transition-colors opacity-60 hover:opacity-100" data-testid="link-footer-contact">Contact us</a></li>
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
