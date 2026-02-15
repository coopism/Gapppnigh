import { useState, useRef, useEffect } from "react";
import { X, Search, MapPin, Calendar, Users, Clock, ChevronDown, Minus, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, addDays, addMonths, startOfMonth, endOfMonth } from "date-fns";

interface LocationSuggestion {
  city: string;
  state: string;
}

interface SearchBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  // Search
  searchInput: string;
  setSearchInput: (value: string) => void;
  debouncedSearch: string;
  setDebouncedSearch: (value: string) => void;
  recentSearches: string[];
  setRecentSearches: (searches: string[] | ((prev: string[]) => string[])) => void;
  locationSuggestions: LocationSuggestion[];
  // Date
  dateMode: "within" | "month" | "specific";
  setDateMode: (mode: "within" | "month" | "specific") => void;
  withinOption: "anytime" | "7days" | "14days" | "21days";
  setWithinOption: (option: "anytime" | "7days" | "14days" | "21days") => void;
  selectedMonth: number | null;
  setSelectedMonth: (month: number | null) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  checkoutDate: Date | undefined;
  setCheckoutDate: (date: Date | undefined) => void;
  nights: number;
  setNights: (nights: number) => void;
  // Guests
  guests: number;
  setGuests: (guests: number) => void;
}

const MONTHS_BY_YEAR = (() => {
  const yearGroups: { year: number; months: { label: string; value: number; monthIndex: number }[] }[] = [];
  const now = new Date();
  const endDate = new Date(2026, 11, 31);
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
})();

export function SearchBottomSheet({
  isOpen,
  onClose,
  onApply,
  searchInput,
  setSearchInput,
  debouncedSearch,
  setDebouncedSearch,
  recentSearches,
  setRecentSearches,
  locationSuggestions,
  dateMode,
  setDateMode,
  withinOption,
  setWithinOption,
  selectedMonth,
  setSelectedMonth,
  selectedDate,
  setSelectedDate,
  checkoutDate,
  setCheckoutDate,
  nights,
  setNights,
  guests,
  setGuests,
}: SearchBottomSheetProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<"where" | "when" | "who">("where");
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter suggestions
  const filteredSuggestions = locationSuggestions.filter(loc => {
    const searchLower = searchInput.toLowerCase();
    return (
      loc.city.toLowerCase().includes(searchLower) ||
      loc.state.toLowerCase().includes(searchLower) ||
      `${loc.city}, ${loc.state}`.toLowerCase().includes(searchLower)
    );
  });

  // Handle select suggestion
  const handleSelectSuggestion = (location: LocationSuggestion) => {
    const locationString = `${location.city}, ${location.state}`;
    setSearchInput(locationString);
    setDebouncedSearch(locationString);
    setShowSuggestions(false);
    setRecentSearches((prev: string[]) => {
      const filtered = prev.filter((s: string) => s !== locationString);
      return [locationString, ...filtered].slice(0, 3);
    });
    setActiveTab("when");
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setShowSuggestions(true);
  };

  // Get display text for date
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
        if (selectedDate && checkoutDate) {
          return `${format(selectedDate, "MMM d")} - ${format(checkoutDate, "MMM d")}`;
        }
        if (selectedDate) return format(selectedDate, "MMM d");
        return "Select dates";
      default:
        return "Anytime";
    }
  };

  // Handle date select
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setDateMode("specific");
    if (!selectedDate || (selectedDate && checkoutDate)) {
      setSelectedDate(date);
      setCheckoutDate(addDays(date, nights));
    } else {
      const diffDays = Math.ceil((date.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays <= 3) {
        setCheckoutDate(date);
        setNights(diffDays);
      } else if (diffDays <= 0) {
        setSelectedDate(date);
        setCheckoutDate(addDays(date, nights));
      } else {
        setCheckoutDate(addDays(selectedDate, 3));
        setNights(3);
      }
    }
  };

  // Handle within select
  const handleWithinSelect = (option: "anytime" | "7days" | "14days" | "21days") => {
    setWithinOption(option);
    setSelectedDate(undefined);
    setCheckoutDate(undefined);
  };

  // Handle month select
  const handleMonthSelect = (monthValue: number) => {
    setSelectedMonth(monthValue);
    setSelectedDate(undefined);
    setCheckoutDate(undefined);
  };

  // Handle apply
  const handleApply = () => {
    onApply();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div 
        className="flex-1 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="bg-background rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-border/50">
          <h2 className="text-lg font-semibold">Search</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/50">
          {[
            { id: "where", label: "Where", icon: MapPin },
            { id: "when", label: "When", icon: Calendar },
            { id: "who", label: "Who", icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* WHERE Tab */}
          {activeTab === "where" && (
            <div className="space-y-4" ref={searchRef}>
              {/* Search Input */}
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search destinations..."
                  className="w-full pl-12 pr-10 py-4 bg-muted rounded-xl text-base font-medium outline-none focus:ring-2 focus:ring-primary/20"
                />
                {searchInput && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-background"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Suggestions */}
              {showSuggestions && (
                <div className="space-y-4">
                  {recentSearches.length > 0 && !searchInput && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Recent Searches
                      </div>
                      <div className="space-y-1">
                        {recentSearches.map((recent, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSearchInput(recent);
                              setDebouncedSearch(recent);
                              setShowSuggestions(false);
                              setActiveTab("when");
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-muted rounded-xl text-sm font-medium flex items-center gap-3 transition-colors"
                          >
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {recent}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {searchInput ? "Matching Destinations" : "Popular Destinations"}
                    </div>
                    <div className="space-y-1">
                      {filteredSuggestions.length > 0 ? (
                        filteredSuggestions.slice(0, 6).map((loc) => (
                          <button
                            key={`${loc.city}-${loc.state}`}
                            onClick={() => handleSelectSuggestion(loc)}
                            className="w-full text-left px-4 py-3 hover:bg-muted rounded-xl flex items-center gap-3 group transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <MapPin className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{loc.city}</div>
                              <div className="text-xs text-muted-foreground">{loc.state}, Australia</div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No destinations found for "{searchInput}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WHEN Tab */}
          {activeTab === "when" && (
            <div className="space-y-4">
              {/* Mode Tabs */}
              <div className="flex gap-1 p-1 bg-muted rounded-xl">
                {[
                  { value: "within", label: "Within" },
                  { value: "month", label: "By Month" },
                  { value: "specific", label: "Specific" },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setDateMode(mode.value as any)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dateMode === mode.value
                        ? "bg-card shadow-sm text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Within Options */}
              {dateMode === "within" && (
                <div className="space-y-2">
                  {[
                    { value: "anytime", label: "Anytime" },
                    { value: "7days", label: "Next 7 days" },
                    { value: "14days", label: "Next 14 days" },
                    { value: "21days", label: "Next 21 days" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleWithinSelect(option.value as any)}
                      className={`w-full px-4 py-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                        withinOption === option.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {option.label}
                      {withinOption === option.value && <Check className="w-5 h-5" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Month Selection */}
              {dateMode === "month" && (
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {MONTHS_BY_YEAR.map((yearGroup) => (
                    <div key={yearGroup.year}>
                      <div className="text-sm font-bold text-foreground mb-2">{yearGroup.year}</div>
                      <div className="grid grid-cols-3 gap-2">
                        {yearGroup.months.map((month) => (
                          <button
                            key={month.value}
                            onClick={() => handleMonthSelect(month.value)}
                            className={`px-3 py-3 rounded-xl text-sm font-medium transition-colors text-center ${
                              selectedMonth === month.value
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {month.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Specific Dates */}
              {dateMode === "specific" && (
                <div className="space-y-4">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => date < new Date() || date > new Date(2026, 11, 31)}
                    className="rounded-xl border mx-auto"
                  />
                  {selectedDate && checkoutDate && (
                    <div className="text-center text-sm text-muted-foreground">
                      {format(selectedDate, "MMM d")} → {format(checkoutDate, "MMM d")} ({nights} night{nights > 1 ? "s" : ""})
                    </div>
                  )}
                </div>
              )}

              {/* Nights Selector */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <div>
                  <div className="font-semibold text-foreground">Nights</div>
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
                    className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold text-lg">{nights}</span>
                  <button
                    onClick={() => {
                      const newNights = Math.min(3, nights + 1);
                      setNights(newNights);
                      if (selectedDate) {
                        setCheckoutDate(addDays(selectedDate, newNights));
                      }
                    }}
                    disabled={nights >= 3}
                    className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WHO Tab */}
          {activeTab === "who" && (
            <div className="space-y-4">
              {/* Guests */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <div>
                  <div className="font-semibold text-foreground">Guests</div>
                  <div className="text-xs text-muted-foreground">Number of travelers</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    disabled={guests <= 1}
                    className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold text-lg">{guests}</span>
                  <button
                    onClick={() => setGuests(Math.min(8, guests + 1))}
                    disabled={guests >= 8}
                    className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Show Deals Button */}
        <div className="p-4 border-t border-border/50 bg-background">
          <Button 
            onClick={handleApply}
            className="w-full h-14 rounded-xl font-semibold text-base"
            size="lg"
          >
            Show deals
          </Button>
        </div>
      </div>
    </div>
  );
}
