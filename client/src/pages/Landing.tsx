import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useDeals } from "@/hooks/use-deals";
import { Navigation } from "@/components/Navigation";
import { PropertyDealCard } from "@/components/PropertyDealCard";
import { Search, MapPin, ArrowRight, Star, X, Home, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { GapNightLogoLoader } from "@/components/GapNightLogo";
import { FadeIn, BlurFade, StaggerContainer, StaggerItem, SlideIn } from "@/components/ui/motion";
import { CloudBackground, ClayPanel, ClayChip, ClayDealCard } from "@/components/ui/clay";
import { HeroBackground } from "@/components/ui/clay/HeroBackground";
import { CloudBankCurtain } from "@/components/ui/clay/CloudBankCurtain";

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
    <HeroBackground>
      <div className="relative" style={{ zIndex: 1 }}>
        <Navigation />

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative pt-14 pb-8 md:pt-20 md:pb-10 flex flex-col items-center px-4">
          <BlurFade duration={0.65}>
            {/* Floating definition card — compact, centered */}
            <div className="clay-panel" style={{
              padding: "32px 36px 28px",
              maxWidth: "520px",
              width: "100%",
              margin: "0 auto",
            }}>
              {/* Title + pronunciation */}
              <h1 className="font-display font-bold mb-1.5" style={{ fontSize: "2rem", lineHeight: 1.15, color: "var(--clay-text)" }}>
                Gap Night
              </h1>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm italic" style={{ color: "var(--clay-text-muted)" }}>
                  /ˈgæp nāit/ &nbsp; gæp nāɪt
                </span>
                <span style={{
                  background: "rgba(74,143,231,0.13)",
                  color: "var(--clay-primary)",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "2px 10px",
                  borderRadius: "20px",
                  border: "1px solid rgba(74,143,231,0.20)",
                }}>noun</span>
              </div>

              {/* Definition */}
              <p className="text-base leading-relaxed mb-1" style={{ color: "var(--clay-text)" }}>
                An unsold night between bookings —<br />
                discounted so it doesn't go unused.
              </p>
              <p className="text-sm mb-5" style={{ color: "var(--clay-text-muted)" }}>
                Hotels call them gap nights.{" "}
                <strong style={{ color: "var(--clay-text)" }}>We help you book them.</strong>
              </p>

              {/* ── INLINE SEARCH BAR ── */}
              <div ref={searchRef} className="relative">
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(248,247,255,0.95)",
                  border: "1.5px solid rgba(200,200,240,0.60)",
                  borderRadius: "14px",
                  boxShadow: "inset 0 2px 8px rgba(100,120,200,0.06)",
                  overflow: "hidden",
                  height: "48px",
                }}>
                  <Search className="shrink-0 ml-4 w-4 h-4" style={{ color: "var(--clay-text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Where do you want to stay?"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-3 py-0 bg-transparent border-0 outline-none text-sm"
                    style={{ color: "var(--clay-text)", height: "100%" }}
                    data-testid="input-hero-search"
                  />
                  {search && (
                    <button
                      onClick={() => { setSearch(""); setShowSuggestions(false); }}
                      className="p-1.5 mr-1 rounded-full hover:bg-black/5 transition-colors"
                      aria-label="Clear"
                    >
                      <X className="w-3.5 h-3.5" style={{ color: "var(--clay-text-muted)" }} />
                    </button>
                  )}
                  <button
                    onClick={handleSearch}
                    className="clay-btn shrink-0 mr-1.5 inline-flex items-center gap-1.5 text-sm px-4"
                    style={{ height: "36px", borderRadius: "10px", whiteSpace: "nowrap" }}
                    data-testid="button-hero-search"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Search
                  </button>
                </div>

                {/* Autocomplete dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden" style={{
                    background: "rgba(255,255,255,0.97)",
                    borderRadius: "16px",
                    boxShadow: "0 12px 40px rgba(100,120,200,0.20)",
                    border: "1px solid rgba(200,200,240,0.50)",
                  }}>
                    <div className="p-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5" style={{ color: "var(--clay-text-muted)" }}>
                        Popular Destinations
                      </div>
                      {filteredSuggestions.slice(0, 5).map((loc) => (
                        <button
                          key={loc.city}
                          onClick={() => handleSelectSuggestion(loc)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-blue-50/60"
                          data-testid={`suggestion-${loc.city.toLowerCase()}`}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(74,143,231,0.10)" }}>
                            <MapPin className="w-4 h-4" style={{ color: "var(--clay-primary)" }} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm" style={{ color: "var(--clay-text)" }}>{loc.city}</div>
                            <div className="text-xs" style={{ color: "var(--clay-text-muted)" }}>{loc.state}, Australia</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </BlurFade>

          {/* CTA button below card */}
          <FadeIn delay={0.7} duration={0.5}>
            <button
              onClick={() => setLocation("/deals")}
              className="clay-btn mt-6 inline-flex items-center gap-2 px-8 py-3.5"
              style={{ fontSize: "0.9375rem" }}
              data-testid="button-browse-deals"
            >
              Browse today's deals
              <ArrowRight className="w-4 h-4" />
            </button>
          </FadeIn>
        </section>

        {/* ── CLOUD BANK CURTAIN (scroll-linked fog reveal) ──────────── */}
        <CloudBankCurtain />

        {/* ── DEALS PREVIEW ───────────────────────────────────────────── */}
        <section ref={dealsRef} className="py-10 md:py-14 px-4" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(14px)" }}>
          <div className="max-w-5xl mx-auto">
            <FadeIn direction="up" duration={0.5}>
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-1" style={{ color: "var(--clay-text)" }}>
                  Explore today's gap night stays
                </h2>
                <p className="text-sm md:text-base" style={{ color: "var(--clay-text-muted)" }}>
                  Limited-time clearance deals on unsold hotel nights.
                </p>
              </div>


              {/* Time-window chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                {[
                  { label: "Tonight", icon: <Clock className="w-3.5 h-3.5" /> },
                  { label: "Next 3 Days" },
                  { label: "Next 7 Days" },
                  { label: "All Upcoming" },
                ].map(({ label, icon }, i) => (
                  <ClayChip key={label} active={i === 0} icon={icon}
                    onClick={() => setLocation(`/deals?when=${label.toLowerCase().replace(/ /g, "-")}`)}>
                    {label}
                  </ClayChip>
                ))}
              </div>
            </FadeIn>

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <GapNightLogoLoader size={56} className="mb-3" />
                <p className="text-sm animate-pulse" style={{ color: "var(--clay-text-muted)" }}>Finding gap nights...</p>
              </div>
            )}

            {!isLoading && !hasDeals && !hasProperties && (
              <div className="text-center py-16">
                <div className="clay-card-sm inline-flex items-center justify-center w-16 h-16 mb-4">
                  <Search className="w-7 h-7" style={{ color: "var(--clay-text-muted)" }} />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "var(--clay-text)" }}>No stays right now</h3>
                <p className="mb-6 text-sm" style={{ color: "var(--clay-text-muted)" }}>Check back soon or browse all locations.</p>
                <button className="clay-btn px-6 py-3 text-sm" style={{ borderRadius: "var(--clay-radius-pill)" }}
                  onClick={() => setLocation("/deals")} data-testid="button-browse-empty-deals">
                  Browse All Locations
                </button>
              </div>
            )}

            {/* Deals section with slight white wash */}
            <div className="mt-6 rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(8px)", padding: "20px 0 0" }}>
              <div className="px-4 pb-4">
                <h3 className="text-lg md:text-xl font-display font-bold mb-4" style={{ color: "var(--clay-text)" }}>
                  Explore today's gap night stays
                </h3>
              </div>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 pb-4">
              {!isLoading && hasDeals && deals!.slice(0, 4).map((deal) => {
                const discountPercent = Math.round(((deal.normalPrice - deal.dealPrice) / deal.normalPrice) * 100);
                const midPrice = deal.normalPrice > deal.dealPrice
                  ? formatPrice(Math.round((deal.normalPrice + deal.dealPrice) / 2), deal.currency)
                  : undefined;
                return (
                  <StaggerItem key={deal.id}>
                    <ClayDealCard
                      image={deal.imageUrl}
                      imageAlt={deal.hotelName}
                      discountPercent={discountPercent}
                      rating={Number(deal.rating) || 8.5}
                      title={deal.hotelName}
                      location={deal.location}
                      highlight={undefined}
                      originalPrice={formatPrice(deal.normalPrice, deal.currency)}
                      slashedMidPrice={midPrice}
                      currentPrice={formatPrice(deal.dealPrice, deal.currency)}
                      isGapNight={true}
                      isApprovalRequired={true}
                      nightCount={`${format(parseISO(deal.checkInDate), "d MMM")} → ${format(parseISO(deal.checkOutDate), "d MMM")}`}
                      onClick={() => setLocation(`/deal/${deal.id}`)}
                    />
                  </StaggerItem>
                );
              })}
              {!isLoading && hasProperties && properties.slice(0, hasDeals ? 2 : 4).map((prop: any) => (
                <StaggerItem key={prop.id}>
                  <PropertyDealCard property={prop} />
                </StaggerItem>
              ))}
            </StaggerContainer>
            </div>

            {/* Browse all CTA */}
            {(hasDeals || hasProperties) && !isLoading && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setLocation("/deals")}
                  className="clay-btn inline-flex items-center gap-2 px-8 py-3.5"
                  style={{ fontSize: "0.9375rem" }}
                  data-testid="button-view-all-deals"
                >
                  Browse All Deals
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── TICKER STRIP ───────────────────────────────────────────── */}
        <section className="py-0 overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.40)", borderBottom: "1px solid rgba(255,255,255,0.40)" }}>
        <div className="relative flex">
          <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, var(--clay-sky-start), transparent)" }} />
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, var(--clay-sky-end), transparent)" }} />
          <div className="flex animate-ticker whitespace-nowrap py-3 gap-0">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-5 text-sm shrink-0" style={{ color: "var(--clay-text-muted)" }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--clay-primary)" }} />
                <span className="font-medium" style={{ color: "var(--clay-text)" }}>{item.location}</span>
                <span className="opacity-50">·</span>
                <span>{item.label}</span>
                <span className="opacity-50">·</span>
                <span className="font-semibold" style={{ color: "var(--clay-primary)" }}>{item.price}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

        {/* ── HOST PITCH ────────────────────────────────────────────── */}
        <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">

            {/* Eyebrow */}
            <FadeIn direction="up" duration={0.5}>
              <div className="flex items-center gap-3 mb-10 md:mb-14">
                <div className="h-px flex-1 max-w-[48px]" style={{ background: "rgba(107,122,154,0.3)" }} />
                <span className="text-xs font-bold tracking-[0.18em] uppercase" style={{ color: "var(--clay-text-muted)" }}>For hosts</span>
              </div>
            </FadeIn>

            <div className="grid md:grid-cols-[1fr_1.1fr] gap-12 md:gap-20 items-start">

              {/* Left — the big statement */}
              <SlideIn from="left">
                <div>
                  <h2 className="text-4xl md:text-5xl font-display font-bold leading-[1.1] mb-6" style={{ color: "var(--clay-text)" }}>
                    Your spare night is someone's{" "}
                    <span style={{ color: "var(--clay-primary)" }} className="italic">perfect</span>{" "}
                    night.
                  </h2>
                  <p className="text-lg leading-relaxed mb-8" style={{ color: "var(--clay-text-muted)" }}>
                    You've got a gap between bookings. It's sitting there, earning nothing.{" "}
                    List it on GapNight and it's gone by morning.
                  </p>
                  <button
                    onClick={() => setLocation("/host/onboarding")}
                    className="clay-btn px-7 py-3.5 text-base inline-flex items-center gap-2 group"
                    style={{ borderRadius: "var(--clay-radius-pill)" }}
                    data-testid="button-become-host"
                  >
                    <Home className="w-4 h-4" />
                    List your property
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </SlideIn>

              {/* Right — editorial numbered rows, no icons */}
              <SlideIn from="right" delay={0.15}>
                <div className="divide-y divide-border/50">

                  {([
                    { n: "01", title: "You set the price. We find the guest.", body: "Pick a discounted rate for the night you want to fill. Guests searching for last-minute stays see it immediately." },
                    { n: "02", title: "Approve every booking yourself.", body: "No auto-accepts. You review each request and decide. Your property, your call." },
                    { n: "03", title: "Only the nights you choose.", body: "Gap Night doesn't touch your regular calendar. You list specific nights — nothing else changes." },
                    { n: "04", title: "ID-verified guests only.", body: "Every guest who books has verified their identity. You know who's staying before you say yes." },
                  ] as const).map(({ n, title, body }) => (
                    <div key={n} className="relative py-6 first:pt-0 last:pb-0 pl-14 overflow-hidden">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-6xl font-bold text-border/40 leading-none select-none tabular-nums">
                        {n}
                      </span>
                      <div className="font-semibold mb-1" style={{ color: "var(--clay-text)" }}>{title}</div>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--clay-text-muted)" }}>{body}</p>
                    </div>
                  ))}

                </div>
              </SlideIn>

            </div>
          </div>
        </div>
      </section>

        {/* ── FOOTER ────────────────────────────────────────────────── */}
        <footer className="py-12 mt-8" style={{ background: "rgba(26,43,74,0.95)", color: "rgba(255,255,255,0.65)" }}>
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="text-2xl font-bold mb-3" style={{ color: "#fff" }}>
                Gap<span style={{ color: "var(--clay-primary-light)" }}>Night</span>
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
    </HeroBackground>
  );
}
