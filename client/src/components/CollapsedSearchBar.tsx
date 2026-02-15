import { Search, MapPin, Calendar, Users } from "lucide-react";

interface CollapsedSearchBarProps {
  searchInput: string;
  dateDisplay: string;
  guests: number;
  onClick: () => void;
}

export function CollapsedSearchBar({ searchInput, dateDisplay, guests, onClick }: CollapsedSearchBarProps) {
  // Format the summary string
  const whereText = searchInput || "Anywhere";
  const whenText = dateDisplay || "Anytime";
  const whoText = `${guests} guest${guests > 1 ? "s" : ""}`;

  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-full shadow-md border border-border/50 px-4 py-3 flex items-center gap-3 hover:shadow-lg transition-shadow"
      aria-label="Open search"
    >
      <Search className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 text-left">
        <div className="text-sm font-semibold text-foreground truncate">
          {whereText}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {whenText} · {whoText}
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
        <Search className="w-4 h-4 text-primary-foreground" />
      </div>
    </button>
  );
}

// Alternative version with pill segments
export function CollapsedSearchBarPill({ searchInput, dateDisplay, guests, onClick }: CollapsedSearchBarProps) {
  const whereText = searchInput || "Anywhere";
  const whenText = dateDisplay || "Anytime";
  const whoText = `${guests} guest${guests > 1 ? "s" : ""}`;

  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-full shadow-md border border-border/50 px-2 py-2 flex items-center gap-1 hover:shadow-lg transition-shadow"
      aria-label="Open search"
    >
      {/* Where */}
      <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full hover:bg-muted/50 transition-colors">
        <MapPin className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground truncate">{whereText}</span>
      </div>
      
      <div className="w-px h-6 bg-border/50" />
      
      {/* When */}
      <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full hover:bg-muted/50 transition-colors">
        <Calendar className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground truncate">{whenText}</span>
      </div>
      
      <div className="w-px h-6 bg-border/50" />
      
      {/* Who + Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted/50 transition-colors">
        <Users className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground truncate">{whoText}</span>
      </div>
      
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 ml-1">
        <Search className="w-4 h-4 text-primary-foreground" />
      </div>
    </button>
  );
}
