import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useDeals, type SortOption } from "@/hooks/use-deals";
import { DealCard } from "@/components/DealCard";
import { PropertyDealCard } from "@/components/PropertyDealCard";
import { DealsMap } from "@/components/DealsMap";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Search, MapPin, Calendar, Users, ChevronDown, Filter, Clock, Minus, Plus, Check, LayoutGrid, Map, X, Loader2 } from "lucide-react";
import { debounce } from "@/lib/utils";
import { GapNightLogoLoader } from "@/components/GapNightLogo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CollapsedSearchBar } from "@/components/CollapsedSearchBar";
import { SearchBottomSheet } from "@/components/SearchBottomSheet";
import { format, addMonths, addDays, startOfMonth, endOfMonth } from "date-fns";

const CATEGORIES = ["All Deals", "Last Minute", "Trending", "Beach", "City", "Luxury", "Boutique"];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "best", label: "Deal Score" },
  { value: "cheapest", label: "Lowest Price" },
  { value: "discount", label: "Biggest Discount" },
  { value: "rating", label: "Highest Rated" },
];

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

type DateMode = "within" | "month" | "specific";
type WithinOption = "anytime" | "7days" | "14days" | "21days";

// Generate months grouped by year from now until December 2026
const generateMonthsByYear = () => {
  const yearGroups: { year: number; months: { label: string; value: number; monthIndex: number }[] }[] = [];
  const now = new Date();
  const endDate = new Date(2026, 11, 31); // December 2026
  let current = new Date(now.getFullYear(), now.getMonth(), 1);
  let index = 0;
  
  while (current <= endDate) {
    const year = current.getFullYear();
    let yearGroup = yearGroups.find(g => g.year === year);
    if (!yearGroup) {
      yearGroup = { year, months: [] };
      yearGroups.push(yearGroup);
    }
    yearGroup.months.push({
      label: format(current, "MMMM"),
      value: index,
      monthIndex: current.getMonth(),
    });
    current = addMonths(current, 1);
    index++;
  }
  return yearGroups;
};

const MONTHS_BY_YEAR = generateMonthsByYear();

export default function Home() {
  const searchParams = useSearch();
  const urlSearch = new URLSearchParams(searchParams).get("search") || "";
  
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [activeCategory, setActiveCategory] = useState("All Deals");
  const [sortBy, setSortBy] = useState<SortOption>("best");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const debouncedSetSearch = useMemo(
    () => debounce(setDebouncedSearch, 300),
    []
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setShowSuggestions(true);
    debouncedSetSearch(value);
  }, [debouncedSetSearch]);

  useEffect(() => {
    setSearchInput(urlSearch);
    setDebouncedSearch(urlSearch);
  }, [urlSearch]);

  // Date selection state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateMode, setDateMode] = useState<DateMode>("within");
  const [withinOption, setWithinOption] = useState<WithinOption>("anytime");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [checkoutDate, setCheckoutDate] = useState<Date | undefined>(undefined);
  const dateRef = useRef<HTMLDivElement>(null);

  // Guests selection state
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [guests, setGuests] = useState(1);
  const [nights, setNights] = useState(1);
  const guestRef = useRef<HTMLDivElement>(null);

  // View mode (grid or map)
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // Mobile search sheet state
  const [showMobileSearchSheet, setShowMobileSearchSheet] = useState(false);

  // Calculate date filter values based on selection
  const getDateFilterParams = () => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    if (dateMode === "within") {
      const startDate = formatDate(today);
      switch (withinOption) {
        case "7days":
          return { startDate, endDate: formatDate(addDays(today, 7)) };
        case "14days":
          return { startDate, endDate: formatDate(addDays(today, 14)) };
        case "21days":
          return { startDate, endDate: formatDate(addDays(today, 21)) };
        default: // anytime
          return {};
      }
    } else if (dateMode === "month" && selectedMonth !== null) {
      const monthStart = startOfMonth(addMonths(today, selectedMonth));
      const monthEnd = endOfMonth(monthStart);
      return { startDate: formatDate(monthStart), endDate: formatDate(monthEnd) };
    } else if (dateMode === "specific" && selectedDate) {
      return { startDate: formatDate(selectedDate), endDate: checkoutDate ? formatDate(checkoutDate) : formatDate(selectedDate) };
    }
    return {};
  };

  const dateFilters = getDateFilterParams();

  const { data: deals, isLoading: dealsLoading, error } = useDeals({
    search: debouncedSearch || undefined,
    category: activeCategory,
    sort: sortBy,
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
    nights: nights > 0 ? nights : undefined,
    minGuests: guests > 1 ? guests : undefined,
  });

  // Fetch properties alongside deals
  const { data: propertiesData, isLoading: propsLoading } = useQuery({
    queryKey: ["properties", debouncedSearch, guests],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (debouncedSearch) params.set("city", debouncedSearch);
      if (guests > 1) params.set("guests", guests.toString());
      const res = await fetch(`/api/properties?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.properties || [];
    },
  });

  const isLoading = dealsLoading || propsLoading;

  // Interleave deals and properties so properties are mixed in, not appended
  const combinedItems = useMemo(() => {
    const dealItems = (deals || []).map((d: any) => ({ ...d, _type: "deal" as const, _key: `deal-${d.id}` }));
    const propItems = (propertiesData || []).map((p: any) => ({ ...p, _type: "property" as const, _key: `prop-${p.id}` }));
    // Interleave: insert a property every 3 deals
    const result: any[] = [];
    let pi = 0;
    for (let di = 0; di < dealItems.length; di++) {
      result.push(dealItems[di]);
      if ((di + 1) % 3 === 0 && pi < propItems.length) {
        result.push(propItems[pi++]);
      }
    }
    // Append remaining properties
    while (pi < propItems.length) {
      result.push(propItems[pi++]);
    }
    return result;
  }, [deals, propertiesData]);

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || "Deal Score";

  // Filter suggestions based on input
  const filteredSuggestions = LOCATION_SUGGESTIONS.filter(loc => {
    const searchLower = searchInput.toLowerCase();
    return (
      loc.city.toLowerCase().includes(searchLower) ||
      loc.state.toLowerCase().includes(searchLower) ||
      `${loc.city}, ${loc.state}`.toLowerCase().includes(searchLower)
    );
  });

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      if (guestRef.current && !guestRef.current.contains(event.target as Node)) {
        setShowGuestPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (location: typeof LOCATION_SUGGESTIONS[0]) => {
    const locationString = `${location.city}, ${location.state}`;
    setSearchInput(locationString);
    setDebouncedSearch(locationString);
    setShowSuggestions(false);
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== locationString);
      return [locationString, ...filtered].slice(0, 3);
    });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setShowSuggestions(true);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setDebouncedSearch(searchInput);
      setShowSuggestions(false);
    }
  };

  // Get display text for date selection
  const getDateDisplayText = () => {
    switch (dateMode) {
      case "within":
        switch (withinOption) {
          case "anytime": return "Anytime";
          case "7days": return "Next 7 days";
          case "14days": return "Next 14 days";
          case "21days": return "Next 21 days";
          default: return "Anytime";
        }
      case "month":
        if (selectedMonth === null) return "Select month";
        if (selectedMonth === 0) return "This Month";
        return format(addMonths(new Date(), selectedMonth), "MMM yyyy");
      case "specific":
        if (selectedDate) {
          return format(selectedDate, "MMM d");
        }
        return "Select dates";
      default:
        return "Anytime";
    }
  };

  const getDateSubtext = () => {
    if (dateMode === "specific" && selectedDate && checkoutDate) {
      return `${format(selectedDate, "MMM d")} - ${format(checkoutDate, "MMM d")} (${nights}N)`;
    }
    return `${nights} Night${nights > 1 ? "s" : ""}`;
  };

  const handleWithinSelect = (option: WithinOption) => {
    setWithinOption(option);
    setSelectedDate(undefined);
    setCheckoutDate(undefined);
    setShowDatePicker(false);
  };

  const handleMonthSelect = (monthValue: number) => {
    setSelectedMonth(monthValue);
    setSelectedDate(undefined);
    setCheckoutDate(undefined);
    setShowDatePicker(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // Always set mode to specific when selecting a date
    setDateMode("specific");
    
    if (!selectedDate || (selectedDate && checkoutDate)) {
      // Start fresh selection
      setSelectedDate(date);
      setCheckoutDate(addDays(date, nights));
    } else {
      // Complete the selection
      const diffDays = Math.ceil((date.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays <= 3) {
        setCheckoutDate(date);
        setNights(diffDays);
        setShowDatePicker(false);
      } else if (diffDays <= 0) {
        // Selected earlier date, restart
        setSelectedDate(date);
        setCheckoutDate(addDays(date, nights));
      } else {
        // More than 3 nights, limit to 3
        setCheckoutDate(addDays(selectedDate, 3));
        setNights(3);
        setShowDatePicker(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 w-full">
        {/* Mobile: Collapsed Search Bar */}
        <div className="lg:hidden mb-4">
          <CollapsedSearchBar
            searchInput={searchInput}
            dateDisplay={getDateDisplayText()}
            guests={guests}
            onClick={() => setShowMobileSearchSheet(true)}
          />
        </div>

        {/* Desktop: Full Search Bar - 3 sections */}
        <div className="hidden lg:flex justify-center mb-10">
          <div className="bg-card rounded-full shadow-lg border border-border/50 p-2 flex items-center gap-1 max-w-3xl w-full">
            {/* WHERE - with autocomplete */}
            <div className="flex-1 min-w-0 px-4 py-2 border-b sm:border-b-0 sm:border-r border-border/50 relative" ref={searchRef}>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Where
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search destinations..."
                  className="bg-transparent border-none outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground w-full"
                  data-testid="input-search"
                />
                {searchInput && (
                  <button
                    onClick={handleClearSearch}
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    data-testid="button-clear-search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {searchInput ? `Searching: ${searchInput}` : "↔ Anywhere"}
              </div>

              {/* Autocomplete Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-2xl shadow-xl border border-border/50 overflow-hidden z-50 min-w-0">
                  {recentSearches.length > 0 && !searchInput && (
                    <div className="p-3 border-b border-border/50">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Recent Searches
                      </div>
                      {recentSearches.map((recent, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSearchInput(recent);
                            setDebouncedSearch(recent);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 hover-elevate rounded-lg text-sm font-medium flex items-center gap-2"
                          data-testid={`recent-search-${i}`}
                        >
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {recent}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="p-3">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {searchInput ? "Matching Destinations" : "Popular Destinations"}
                    </div>
                    {filteredSuggestions.length > 0 ? (
                      <div className="space-y-1">
                        {filteredSuggestions.slice(0, 6).map((loc) => (
                          <button
                            key={`${loc.city}-${loc.state}`}
                            onClick={() => handleSelectSuggestion(loc)}
                            className="w-full text-left px-3 py-2.5 hover:bg-primary/5 rounded-lg flex items-center gap-3 group transition-colors"
                            data-testid={`suggestion-${loc.city.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <MapPin className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{loc.city}</div>
                              <div className="text-xs text-muted-foreground">{loc.state}, Australia</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No destinations found for "{searchInput}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* WHEN - with date picker */}
            <div 
              className="flex-1 min-w-0 px-4 py-2 border-b sm:border-b-0 sm:border-r border-border/50 cursor-pointer hover-elevate rounded-lg transition-colors relative" 
              ref={dateRef}
              onClick={() => setShowDatePicker(!showDatePicker)}
              data-testid="date-picker-trigger"
            >
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                When
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{getDateDisplayText()}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{getDateSubtext()}</div>

              {/* Date Picker Dropdown */}
              {showDatePicker && (
                <div 
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-popover rounded-2xl shadow-xl border border-border/50 overflow-hidden z-50 w-[calc(100vw-2rem)] sm:w-[340px] max-w-[340px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4">
                    {/* Mode Tabs */}
                    <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
                      <button
                        onClick={() => setDateMode("within")}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          dateMode === "within" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                        }`}
                        data-testid="date-mode-within"
                      >
                        Within
                      </button>
                      <button
                        onClick={() => setDateMode("month")}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          dateMode === "month" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                        }`}
                        data-testid="date-mode-month"
                      >
                        By Month
                      </button>
                      <button
                        onClick={() => setDateMode("specific")}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          dateMode === "specific" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                        }`}
                        data-testid="date-mode-specific"
                      >
                        Specific
                      </button>
                    </div>

                    {/* Within Options */}
                    {dateMode === "within" && (
                      <div className="space-y-2">
                        {[
                          { value: "anytime" as WithinOption, label: "Anytime" },
                          { value: "7days" as WithinOption, label: "Next 7 days" },
                          { value: "14days" as WithinOption, label: "Next 14 days" },
                          { value: "21days" as WithinOption, label: "Next 21 days" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleWithinSelect(option.value)}
                            className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                              withinOption === option.value ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                            }`}
                            data-testid={`date-option-${option.value}`}
                          >
                            {option.label}
                            {withinOption === option.value && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Month Selection - Grid by Year */}
                    {dateMode === "month" && (
                      <div className="max-h-[320px] overflow-y-auto space-y-4">
                        {MONTHS_BY_YEAR.map((yearGroup) => (
                          <div key={yearGroup.year}>
                            <div className="text-sm font-bold text-foreground mb-2">{yearGroup.year}</div>
                            <div className="grid grid-cols-3 gap-2">
                              {yearGroup.months.map((month) => (
                                <button
                                  key={month.value}
                                  onClick={() => handleMonthSelect(month.value)}
                                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-center ${
                                    selectedMonth === month.value 
                                      ? "bg-primary text-primary-foreground" 
                                      : "bg-muted text-foreground hover-elevate"
                                  }`}
                                  data-testid={`date-month-${month.value}`}
                                >
                                  {month.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Specific Dates - Calendar */}
                    {dateMode === "specific" && (
                      <div>
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={(date) => date < new Date() || date > new Date(2026, 11, 31)}
                          className="rounded-lg border"
                        />
                        {selectedDate && (
                          <div className="mt-2 text-xs text-muted-foreground text-center">
                            {checkoutDate 
                              ? `${format(selectedDate, "MMM d")} → ${format(checkoutDate, "MMM d")} (${nights} night${nights > 1 ? "s" : ""})`
                              : "Select checkout date"
                            }
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nights Selector - always visible at bottom */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
                      <div>
                        <div className="font-semibold text-foreground text-sm">Nights</div>
                        <div className="text-xs text-muted-foreground">1-3 nights only</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const newNights = Math.max(1, nights - 1);
                            setNights(newNights);
                            if (selectedDate) {
                              setCheckoutDate(addDays(selectedDate, newNights));
                            }
                          }}
                          disabled={nights <= 1}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="button-nights-minus"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">{nights}</span>
                        <button
                          onClick={() => {
                            const newNights = Math.min(3, nights + 1);
                            setNights(newNights);
                            if (selectedDate) {
                              setCheckoutDate(addDays(selectedDate, newNights));
                            }
                          }}
                          disabled={nights >= 3}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="button-nights-plus"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* WHO - with guest picker */}
            <div 
              className="flex-1 min-w-0 px-4 py-2 cursor-pointer hover-elevate rounded-lg transition-colors relative" 
              ref={guestRef}
              onClick={() => setShowGuestPicker(!showGuestPicker)}
              data-testid="guest-picker-trigger"
            >
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Who
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{guests} Guest{guests > 1 ? "s" : ""}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Travelers</div>

              {/* Guest Picker Dropdown */}
              {showGuestPicker && (
                <div 
                  className="absolute top-full right-0 mt-2 bg-popover rounded-2xl shadow-xl border border-border/50 overflow-hidden z-50 w-[calc(100vw-2rem)] sm:w-[280px] max-w-[280px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 space-y-4">
                    {/* Guests */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground">Guests</div>
                        <div className="text-xs text-muted-foreground">Number of travelers</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setGuests(Math.max(1, guests - 1))}
                          disabled={guests <= 1}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover-elevate disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="button-guests-minus"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">{guests}</span>
                        <button
                          onClick={() => setGuests(Math.min(8, guests + 1))}
                          disabled={guests >= 8}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover-elevate disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="button-guests-plus"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => setShowGuestPicker(false)}
                      data-testid="button-apply-guests"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Search Button */}
            <Button 
              size="icon" 
              className="h-12 w-12 rounded-full shadow-lg shrink-0"
              data-testid="button-search"
              aria-label="Search deals"
              disabled={isLoading}
              onClick={() => {
                setDebouncedSearch(searchInput);
                setShowSuggestions(false);
                setShowDatePicker(false);
                setShowGuestPicker(false);
              }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Category Chips */}
        <div className="relative w-full mb-6">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              data-testid={`chip-category-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              className={`
                whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all shrink-0
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                ${
                  activeCategory === cat
                    ? "bg-foreground text-background shadow-md"
                    : "bg-card border border-border text-foreground hover-elevate"
                }
              `}
            >
              {cat}
            </button>
          ))}
          </div>
        </div>

        {/* Section Header + Sort + View Toggle */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Explore today's deals</h2>

          <div className="flex items-center gap-2 md:gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
                data-testid="button-view-grid"
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "map" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
                data-testid="button-view-map"
                aria-label="Map view"
              >
                <Map className="w-4 h-4" />
              </button>
            </div>

            <span className="text-sm text-muted-foreground hidden md:inline">Sort by:</span>
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
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {isLoading ? "Loading deals..." : deals ? `${deals.length} deals found` : "No deals found"}
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <GapNightLogoLoader size={64} className="mb-4" />
            <p className="text-muted-foreground text-sm animate-pulse">Finding gap nights...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
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
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No deals found</h3>
            <p className="text-muted-foreground max-w-md">
              Try adjusting your search or filters to find more gap night deals.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setSearchInput("");
                setDebouncedSearch("");
                setActiveCategory("All Deals");
              }}
              data-testid="button-clear-filters"
            >
              Clear filters
            </Button>
          </div>
        ) : viewMode === "map" ? (
          <div className="h-[500px] md:h-[600px] rounded-xl overflow-hidden border border-border/50">
            <DealsMap deals={deals || []} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {combinedItems.map((item, idx) => (
              <div key={item._key} className="animate-fade-in">
                {item._type === "deal" ? (
                  <DealCard deal={item} />
                ) : (
                  <PropertyDealCard property={item} />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Mobile Search Bottom Sheet */}
      <SearchBottomSheet
        isOpen={showMobileSearchSheet}
        onClose={() => setShowMobileSearchSheet(false)}
        onApply={() => {
          setDebouncedSearch(searchInput);
        }}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        debouncedSearch={debouncedSearch}
        setDebouncedSearch={setDebouncedSearch}
        recentSearches={recentSearches}
        setRecentSearches={setRecentSearches}
        locationSuggestions={LOCATION_SUGGESTIONS}
        dateMode={dateMode}
        setDateMode={setDateMode}
        withinOption={withinOption}
        setWithinOption={setWithinOption}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        checkoutDate={checkoutDate}
        setCheckoutDate={setCheckoutDate}
        nights={nights}
        setNights={setNights}
        guests={guests}
        setGuests={setGuests}
      />

      <Footer />
    </div>
  );
}
