import { useState, useRef, useEffect } from "react";
import { useDeals, type SortOption } from "@/hooks/use-deals";
import { DealCard } from "@/components/DealCard";
import { Navigation } from "@/components/Navigation";
import { Search, MapPin, Calendar, Users, ChevronDown, Filter, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = ["All Deals", "Last Minute", "Trending", "Beach", "City", "Luxury", "Boutique"];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "best", label: "Deal Score" },
  { value: "cheapest", label: "Lowest Price" },
  { value: "discount", label: "Biggest Discount" },
  { value: "rating", label: "Highest Rated" },
];

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

export default function Home() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Deals");
  const [sortBy, setSortBy] = useState<SortOption>("best");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: deals, isLoading, error } = useDeals({
    search: search || undefined,
    category: activeCategory,
    sort: sortBy,
  });

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || "Deal Score";

  // Filter suggestions based on input
  const filteredSuggestions = LOCATION_SUGGESTIONS.filter(loc => {
    const searchLower = search.toLowerCase();
    return (
      loc.city.toLowerCase().includes(searchLower) ||
      loc.state.toLowerCase().includes(searchLower) ||
      loc.country.toLowerCase().includes(searchLower)
    );
  });

  // Handle clicking outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (location: typeof LOCATION_SUGGESTIONS[0]) => {
    const locationString = `${location.city}, ${location.country}`;
    setSearch(locationString);
    setShowSuggestions(false);
    
    // Add to recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== locationString);
      return [locationString, ...filtered].slice(0, 3);
    });
  };

  const handleClearSearch = () => {
    setSearch("");
    setShowSuggestions(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Search Bar - 3 sections */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-full shadow-lg border border-border/50 p-2 flex items-center gap-1 max-w-3xl w-full relative">
            {/* WHERE - with autocomplete */}
            <div className="flex-1 px-4 py-2 border-r border-border/50 relative" ref={searchRef}>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Where
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search destinations..."
                  className="bg-transparent border-none outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground w-full"
                  data-testid="input-search"
                />
                {search && (
                  <button
                    onClick={handleClearSearch}
                    className="text-muted-foreground hover:text-foreground text-xs"
                    data-testid="button-clear-search"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {search ? `Searching: ${search}` : "↔ Anywhere"}
              </div>

              {/* Autocomplete Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-border/50 overflow-hidden z-50 min-w-[300px]">
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && !search && (
                    <div className="p-3 border-b border-border/50">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Recent Searches
                      </div>
                      {recentSearches.map((recent, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSearch(recent);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-2"
                          data-testid={`recent-search-${i}`}
                        >
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {recent}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Suggestions */}
                  <div className="p-3">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {search ? "Matching Destinations" : "Popular Destinations"}
                    </div>
                    {filteredSuggestions.length > 0 ? (
                      <div className="space-y-1">
                        {filteredSuggestions.slice(0, 6).map((loc, i) => (
                          <button
                            key={i}
                            onClick={() => handleSelectSuggestion(loc)}
                            className="w-full text-left px-3 py-2.5 hover:bg-primary/5 rounded-lg flex items-center gap-3 group transition-colors"
                            data-testid={`suggestion-${loc.city.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <MapPin className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {loc.city}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {loc.state}, {loc.country}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No destinations found for "{search}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* WHEN */}
            <div className="flex-1 px-4 py-2 border-r border-border/50">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                When
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Anytime</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Gap Nights Only</div>
            </div>

            {/* WHO */}
            <div className="flex-1 px-4 py-2">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Who
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">1 Guest</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">1 Night</div>
            </div>

            {/* Search Button */}
            <Button 
              size="icon" 
              className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg shrink-0"
              data-testid="button-search"
              onClick={() => setShowSuggestions(false)}
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              data-testid={`chip-category-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              className={`
                whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all
                ${
                  activeCategory === cat
                    ? "bg-foreground text-background shadow-md"
                    : "bg-white border border-border text-foreground hover:border-foreground/30"
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Section Header + Sort */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Explore today's deals</h2>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-lg border-border gap-2 font-semibold" data-testid="button-sort">
                  {currentSortLabel}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuItem 
                    key={opt.value} 
                    onClick={() => setSortBy(opt.value)}
                    data-testid={`sort-option-${opt.value}`}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Deals Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-border/50">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-border">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <Filter className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-lg font-bold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mb-6">
              We couldn't load the deals right now. Please try again later.
            </p>
            <Button onClick={() => window.location.reload()} data-testid="button-retry">Retry</Button>
          </div>
        ) : deals?.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-border">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">No deals found</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <Button 
              variant="link" 
              onClick={() => {
                setSearch("");
                setActiveCategory("All Deals");
              }}
              className="mt-2 text-primary"
              data-testid="button-clear-filters"
            >
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {deals?.map((deal) => (
              <div key={deal.id} className="animate-fade-in">
                <DealCard deal={deal} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
