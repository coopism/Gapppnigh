import { useState } from "react";
import { useDeals, type SortOption } from "@/hooks/use-deals";
import { DealCard } from "@/components/DealCard";
import { Navigation } from "@/components/Navigation";
import { Search, Filter, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["All Deals", "Last Minute", "Trending", "Beach", "City", "Luxury", "Boutique"];

export default function Home() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Deals");
  const [sortBy, setSortBy] = useState<SortOption>("best");

  const { data: deals, isLoading, error } = useDeals({
    search: search || undefined,
    category: activeCategory,
    sort: sortBy,
  });

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        {/* Search Bar */}
        <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-background rounded-2xl shadow-lg border border-border/50 p-2 flex items-center gap-2">
            <div className="flex-1 pl-3">
              <label className="text-xs font-bold text-primary uppercase tracking-wider block mb-0.5">
                Where to?
              </label>
              <div className="flex items-center">
                <Search className="w-4 h-4 text-muted-foreground mr-2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Try 'Melbourne' or 'Sydney'"
                  className="border-none shadow-none focus-visible:ring-0 p-0 h-auto text-lg font-medium placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
            <div className="hidden sm:block h-10 w-px bg-border mx-2"></div>
            <div className="hidden sm:block px-4">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                When?
              </div>
              <div className="text-sm font-medium">Anytime • 1 night</div>
            </div>
            <Button size="icon" className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`
                whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all
                ${
                  activeCategory === cat
                    ? "bg-foreground text-background shadow-md transform scale-105"
                    : "bg-background border border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filter & Sort Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-display font-bold">Today's Deals</h2>
            <Badge variant="secondary" className="rounded-full px-2.5">
              {deals?.length || 0}
            </Badge>
          </div>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full border-border h-9 gap-2">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sort by:</span> 
                  <span className="font-bold capitalize">{sortBy}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setSortBy("best")}>Best Match</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("cheapest")}>Lowest Price</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("discount")}>Biggest Discount</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("rating")}>Highest Rated</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="icon" className="rounded-full border-border h-9 w-9">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* List Content */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl p-4 flex gap-4 border border-border/50">
                <Skeleton className="w-32 h-32 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="pt-4 flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </div>
            ))
          ) : error ? (
            <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <Filter className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold mb-2">Something went wrong</h3>
              <p className="text-muted-foreground max-w-xs mx-auto mb-6">
                We couldn't load the deals right now. Please try again later.
              </p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          ) : deals?.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
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
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            deals?.map((deal) => (
              <div key={deal.id} className="animate-fade-in">
                <DealCard deal={deal} />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
