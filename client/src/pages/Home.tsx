import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useDeals, type SortOption } from "@/hooks/use-deals";
import { DealCard } from "@/components/DealCard";
import { PropertyDealCard } from "@/components/PropertyDealCard";
import { DealsMap } from "@/components/DealsMap";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Search, MapPin, Calendar, Users, ChevronDown, Filter, Clock, Minus, Plus, Check, LayoutGrid, Map, X, Loader2, Zap, KeyRound, CookingPot, Bath, SlidersHorizontal, Home as HomeIcon, DoorOpen, Bed, Car, Wifi, Wind, Dog, Waves, ChevronUp, Tv, Dumbbell, TreePine, Flame, PlugZap } from "lucide-react";
import { debounce } from "@/lib/utils";
import { GapNightLogoLoader } from "@/components/GapNightLogo";
import { StaggerContainer, StaggerItem } from "@/components/ui/motion";
import { CloudBackground } from "@/components/ui/clay";
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

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [placeType, setPlaceType] = useState<"any" | "room" | "entire">("any");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000);
  const [filterBedrooms, setFilterBedrooms] = useState(0); // 0 = Any
  const [filterBeds, setFilterBeds] = useState(0);
  const [filterBathrooms, setFilterBathrooms] = useState(0);
  const [filterInstantBook, setFilterInstantBook] = useState(false);
  const [filterSelfCheckIn, setFilterSelfCheckIn] = useState(false);
  const [filterKitchen, setFilterKitchen] = useState(false);
  const [filterPool, setFilterPool] = useState(false);
  const [filterParking, setFilterParking] = useState(false);
  const [filterWifi, setFilterWifi] = useState(false);
  const [filterAC, setFilterAC] = useState(false);
  const [filterWasher, setFilterWasher] = useState(false);
  const [filterPets, setFilterPets] = useState(false);
  const [filterTV, setFilterTV] = useState(false);
  const [filterGym, setFilterGym] = useState(false);
  const [filterGarden, setFilterGarden] = useState(false);
  const [filterBBQ, setFilterBBQ] = useState(false);
  const [filterDryer, setFilterDryer] = useState(false);
  const [filterEV, setFilterEV] = useState(false);
  const [showMoreAmenities, setShowMoreAmenities] = useState(false);

  const activeFilterCount = [
    placeType !== "any",
    priceMin > 0 || priceMax < 1000,
    filterBedrooms > 0,
    filterBeds > 0,
    filterBathrooms > 0,
    filterInstantBook,
    filterSelfCheckIn,
    filterKitchen,
    filterPool,
    filterParking,
    filterWifi,
    filterAC,
    filterWasher,
    filterPets,
    filterTV,
    filterGym,
    filterGarden,
    filterBBQ,
    filterDryer,
    filterEV,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setPlaceType("any");
    setPriceMin(0);
    setPriceMax(1000);
    setFilterBedrooms(0);
    setFilterBeds(0);
    setFilterBathrooms(0);
    setFilterInstantBook(false);
    setFilterSelfCheckIn(false);
    setFilterKitchen(false);
    setFilterPool(false);
    setFilterParking(false);
    setFilterWifi(false);
    setFilterAC(false);
    setFilterWasher(false);
    setFilterPets(false);
    setFilterTV(false);
    setFilterGym(false);
    setFilterGarden(false);
    setFilterBBQ(false);
    setFilterDryer(false);
    setFilterEV(false);
    setShowMoreAmenities(false);
  };

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
    sort: sortBy,
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
    nights: nights > 0 ? nights : undefined,
    minGuests: guests > 1 ? guests : undefined,
  });

  // Fetch properties alongside deals — pass date filters so "When" tab works
  const { data: propertiesData, isLoading: propsLoading } = useQuery({
    queryKey: ["properties", debouncedSearch, guests, dateFilters.startDate, dateFilters.endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (debouncedSearch) params.set("city", debouncedSearch);
      if (guests > 1) params.set("guests", guests.toString());
      if (dateFilters.startDate) params.set("startDate", dateFilters.startDate);
      if (dateFilters.endDate) params.set("endDate", dateFilters.endDate);
      const res = await fetch(`/api/properties?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.properties || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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

    // Apply client-side filters
    return result.filter((item: any) => {
      // Price filter
      const price = item._type === "deal" ? item.dealPrice : (item.baseNightlyRate ? item.baseNightlyRate / 100 : 0);
      if (priceMin > 0 && price < priceMin) return false;
      if (priceMax < 1000 && price > priceMax) return false;

      // Place type filter (properties only — deals don't have propertyType)
      if (placeType !== "any" && item._type === "property") {
        const pt = (item.propertyType || "entire_place").toLowerCase();
        if (placeType === "entire" && pt !== "entire_place" && pt !== "unique_stay") return false;
        if (placeType === "room" && pt !== "private_room" && pt !== "shared_room") return false;
      }

      // Bedrooms / beds / bathrooms (properties only)
      if (item._type === "property") {
        if (filterBedrooms > 0 && (item.bedrooms || 0) < filterBedrooms) return false;
        if (filterBeds > 0 && (item.beds || 0) < filterBeds) return false;
        if (filterBathrooms > 0 && (item.bathrooms || 0) < filterBathrooms) return false;
      }

      // Amenity-based filters
      const amenities = (item.amenities || []).map((a: string) => a.toLowerCase());
      if (filterKitchen && !amenities.some((a: string) => a.includes("kitchen"))) return false;
      if (filterPool && !amenities.some((a: string) => a.includes("pool") || a.includes("hot tub"))) return false;
      if (filterParking && !amenities.some((a: string) => a.includes("parking"))) return false;
      if (filterWifi && !amenities.some((a: string) => a.includes("wifi") || a.includes("wi-fi"))) return false;
      if (filterAC && !amenities.some((a: string) => a.includes("air conditioning") || a.includes("ac"))) return false;
      if (filterWasher && !amenities.some((a: string) => a.includes("washer") || a.includes("washing"))) return false;
      if (filterTV && !amenities.some((a: string) => a.includes("tv") || a.includes("television"))) return false;
      if (filterGym && !amenities.some((a: string) => a.includes("gym") || a.includes("fitness"))) return false;
      if (filterGarden && !amenities.some((a: string) => a.includes("garden") || a.includes("yard"))) return false;
      if (filterBBQ && !amenities.some((a: string) => a.includes("bbq") || a.includes("barbecue") || a.includes("grill"))) return false;
      if (filterDryer && !amenities.some((a: string) => a.includes("dryer"))) return false;
      if (filterEV && !amenities.some((a: string) => a.includes("ev") || a.includes("charger") || a.includes("electric vehicle"))) return false;

      // Self check-in (property field)
      if (filterSelfCheckIn && item._type === "property" && !item.selfCheckIn) return false;

      // Pets
      if (filterPets && item._type === "property" && !item.petFriendly) return false;

      return true;
    });
  }, [deals, propertiesData, placeType, priceMin, priceMax, filterBedrooms, filterBeds, filterBathrooms, filterInstantBook, filterSelfCheckIn, filterKitchen, filterPool, filterParking, filterWifi, filterAC, filterWasher, filterPets, filterTV, filterGym, filterGarden, filterBBQ, filterDryer, filterEV]);

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
    <CloudBackground>
      <div className="relative" style={{ zIndex: 1 }}>
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
          {/* Fix #3: Mobile filter button — always visible */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
                activeFilterCount > 0
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-foreground/30"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-border bg-card text-sm font-medium">
                  Sort: {currentSortLabel}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={() => setSortBy(opt.value)}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Desktop: Full Search Bar - 3 sections */}
        <div className="hidden lg:flex justify-center mb-10">
          <div className="clay-card p-2 flex items-center gap-1 max-w-3xl w-full" style={{ borderRadius: "var(--clay-radius-pill)", padding: "6px" }}>
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

            {/* Filter Button — next to search */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative h-12 w-12 rounded-full border shrink-0 flex items-center justify-center transition-all ${
                activeFilterCount > 0
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:border-foreground/50"
              }`}
              aria-label="Filters"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Expanded Filter Panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Booking options */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Booking options</h4>
                <div className="space-y-2">
                  {[
                    { key: "instantBook", label: "Instant Book", desc: "Book without waiting for approval", icon: Zap, active: filterInstantBook, toggle: () => setFilterInstantBook(!filterInstantBook) },
                    { key: "selfCheckIn", label: "Self check-in", desc: "Access with a lockbox or keypad", icon: KeyRound, active: filterSelfCheckIn, toggle: () => setFilterSelfCheckIn(!filterSelfCheckIn) },
                    { key: "pets", label: "Allows pets", desc: "Bring your furry friends", icon: Dog, active: filterPets, toggle: () => setFilterPets(!filterPets) },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={f.toggle}
                      className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-all text-left ${
                        f.active
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:border-foreground/30"
                      }`}
                    >
                      <f.icon className={`w-5 h-5 shrink-0 ${f.active ? "text-foreground" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{f.label}</p>
                        <p className="text-xs text-muted-foreground">{f.desc}</p>
                      </div>
                      {f.active && <Check className="w-4 h-4 text-foreground shrink-0" />}
                    </button>
                  ))}
                </div>

                {/* Type of place */}
                <h4 className="font-semibold text-sm mt-5 mb-3">Type of place</h4>
                <div className="flex gap-1 p-1 bg-muted rounded-xl">
                  {(["any", "room", "entire"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setPlaceType(t)}
                      className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        placeType === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {t === "any" ? "Any type" : t === "entire" ? "Entire home" : "Room"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Amenities</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "wifi", label: "Wi-Fi", icon: Wifi, active: filterWifi, toggle: () => setFilterWifi(!filterWifi) },
                    { key: "kitchen", label: "Kitchen", icon: CookingPot, active: filterKitchen, toggle: () => setFilterKitchen(!filterKitchen) },
                    { key: "parking", label: "Free parking", icon: Car, active: filterParking, toggle: () => setFilterParking(!filterParking) },
                    { key: "pool", label: "Pool / Hot tub", icon: Waves, active: filterPool, toggle: () => setFilterPool(!filterPool) },
                    ...(showMoreAmenities ? [
                      { key: "ac", label: "Air conditioning", icon: Wind, active: filterAC, toggle: () => setFilterAC(!filterAC) },
                      { key: "washer", label: "Washing machine", icon: Wind, active: filterWasher, toggle: () => setFilterWasher(!filterWasher) },
                      { key: "tv", label: "TV", icon: Tv, active: filterTV, toggle: () => setFilterTV(!filterTV) },
                      { key: "gym", label: "Gym / Fitness", icon: Dumbbell, active: filterGym, toggle: () => setFilterGym(!filterGym) },
                      { key: "garden", label: "Garden / Yard", icon: TreePine, active: filterGarden, toggle: () => setFilterGarden(!filterGarden) },
                      { key: "bbq", label: "BBQ / Grill", icon: Flame, active: filterBBQ, toggle: () => setFilterBBQ(!filterBBQ) },
                      { key: "dryer", label: "Dryer", icon: Wind, active: filterDryer, toggle: () => setFilterDryer(!filterDryer) },
                      { key: "ev", label: "EV Charger", icon: PlugZap, active: filterEV, toggle: () => setFilterEV(!filterEV) },
                    ] : []),
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={f.toggle}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-medium ${
                        f.active
                          ? "border-foreground bg-foreground/5 text-foreground"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      <f.icon className="w-5 h-5" />
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowMoreAmenities(!showMoreAmenities)}
                  className="text-sm font-semibold underline underline-offset-2 text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1"
                >
                  {showMoreAmenities ? <>Show less <ChevronUp className="w-3 h-3" /></> : <>Show more <ChevronDown className="w-3 h-3" /></>}
                </button>
              </div>

              {/* Price range */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Price range</h4>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Minimum</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={priceMin || ""}
                          onChange={e => setPriceMin(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full h-10 pl-7 pr-3 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="flex items-end pb-2 text-muted-foreground">—</div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Maximum</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={priceMax >= 1000 ? "" : priceMax}
                          onChange={e => setPriceMax(parseInt(e.target.value) || 1000)}
                          placeholder="1000+"
                          className="w-full h-10 pl-7 pr-3 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rooms and beds */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Rooms and beds</h4>
                <div className="space-y-3">
                  {[
                    { label: "Bedrooms", value: filterBedrooms, set: setFilterBedrooms },
                    { label: "Beds", value: filterBeds, set: setFilterBeds },
                    { label: "Bathrooms", value: filterBathrooms, set: setFilterBathrooms },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-sm">{r.label}</span>
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => r.set(Math.max(0, r.value - 1))}
                          disabled={r.value <= 0}
                          className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{r.value === 0 ? "Any" : r.value + "+"}</span>
                        <button
                          onClick={() => r.set(Math.min(8, r.value + 1))}
                          disabled={r.value >= 8}
                          className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
              <button onClick={clearAllFilters} className="text-sm font-semibold underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors">
                Clear all
              </button>
              <Button onClick={() => setShowFilters(false)} className="rounded-xl px-6">
                Show {combinedItems.length} {combinedItems.length === 1 ? "stay" : "stays"}
              </Button>
            </div>
          </div>
        )}

        {/* Section Header + Sort + View Toggle - Aligned */}
        <div className="flex items-center justify-between mb-6 gap-4">
          {/* Left: Title + Results count */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Explore today's deals</h2>
            {!isLoading && (
              <span className="text-sm text-muted-foreground">
                {combinedItems.length} {combinedItems.length === 1 ? 'stay' : 'stays'} found
              </span>
            )}
          </div>

          {/* Right: View Toggle + Sort */}
          <div className="flex items-center gap-2">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-lg border-border gap-2 font-medium h-9" data-testid="button-sort">
                  <span className="hidden sm:inline">Sort:</span>
                  <span className="sm:hidden">{currentSortLabel}</span>
                  <span className="hidden sm:inline">{currentSortLabel}</span>
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
          {isLoading ? "Loading stays..." : `${combinedItems.length} stays found`}
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
        ) : combinedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No stays found</h3>
            <p className="text-muted-foreground max-w-md">
              No gap night stays available right now. Check back soon or try searching for a different location.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setSearchInput("");
                setDebouncedSearch("");
              }}
              data-testid="button-clear-filters"
            >
              Clear filters
            </Button>
          </div>
        ) : viewMode === "map" ? (
          <div className="h-[500px] md:h-[600px] rounded-xl overflow-hidden border border-border/50">
            <DealsMap deals={combinedItems.filter((i: any) => i._type === "deal") || []} properties={combinedItems.filter((i: any) => i._type === "property") || []} />
          </div>
        ) : (
          <>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" staggerDelay={0.06}>
              {combinedItems.map((item, idx) => (
                <StaggerItem key={item._key}>
                  {item._type === "deal" ? (
                    <DealCard deal={item} />
                  ) : (
                    <PropertyDealCard property={item} />
                  )}
                </StaggerItem>
              ))}
            </StaggerContainer>
            {/* Fix #6: Mobile scroll indicator — shows when more than 3 items */}
            {combinedItems.length > 3 && (
              <div className="md:hidden flex flex-col items-center mt-4 mb-2 animate-bounce">
                <ChevronDown className="w-5 h-5 text-muted-foreground/50" />
                <span className="text-[10px] text-muted-foreground/50 font-medium">Scroll for more</span>
              </div>
            )}
          </>
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
    </CloudBackground>
  );
}
