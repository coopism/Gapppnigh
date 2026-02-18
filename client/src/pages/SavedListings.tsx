import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Heart, Loader2, ArrowLeft, MapPin, Star, Bed, CalendarDays, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/hooks/useAuth";
import { useSavedListings } from "@/hooks/useSavedListings";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { formatPrice } from "@/lib/utils";

interface SavedItem {
  id: string;
  userId: string;
  propertyId: string | null;
  dealId: string | null;
  itemType: string;
  createdAt: string;
}

interface PropertyData {
  id: string;
  title: string;
  city: string;
  state: string;
  coverImage: string | null;
  baseNightlyRate: number;
  bedrooms: number;
  bathrooms: string;
  maxGuests: number;
  averageRating: string;
  reviewCount: number;
  nearbyHighlight: string | null;
  gapNights?: any[];
}

interface DealData {
  id: string;
  hotelName: string;
  location: string;
  imageUrl: string;
  normalPrice: number;
  dealPrice: number;
  currency: string;
  rating: string;
  reviewCount: number;
  nights: number;
  roomType: string;
}

export default function SavedListings() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuthStore();
  const { toggleSaveProperty, toggleSaveDeal } = useSavedListings();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [properties, setProperties] = useState<Map<string, PropertyData>>(new Map());
  const [deals, setDeals] = useState<Map<string, DealData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login?redirect=/saved");
    }
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    if (!user) return;

    const fetchSaved = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/saved", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const items: SavedItem[] = data.saved || [];
          setSavedItems(items);

          // Fetch property details for saved properties
          const propertyIds = items.filter(i => i.itemType === "property" && i.propertyId).map(i => i.propertyId!);
          const dealIds = items.filter(i => i.itemType === "deal" && i.dealId).map(i => i.dealId!);

          const propMap = new Map<string, PropertyData>();
          const dealMap = new Map<string, DealData>();

          // Fetch properties — API returns {property, host, ...}, extract .property
          await Promise.all(
            propertyIds.map(async (pid) => {
              try {
                const pRes = await fetch(`/api/properties/${pid}`);
                if (pRes.ok) {
                  const pData = await pRes.json();
                  if (pData?.property) {
                    propMap.set(pid, pData.property);
                  }
                }
              } catch {}
            })
          );

          // Fetch deals
          await Promise.all(
            dealIds.map(async (did) => {
              try {
                const dRes = await fetch(`/api/deals/${did}`);
                if (dRes.ok) {
                  const dData = await dRes.json();
                  dealMap.set(did, dData);
                }
              } catch {}
            })
          );

          setProperties(propMap);
          setDeals(dealMap);
        }
      } catch (err) {
        console.error("Failed to fetch saved listings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSaved();
  }, [user]);

  const handleUnsaveProperty = async (propertyId: string) => {
    await toggleSaveProperty(propertyId);
    setSavedItems(prev => prev.filter(i => i.propertyId !== propertyId));
  };

  const handleUnsaveDeal = async (dealId: string) => {
    await toggleSaveDeal(dealId);
    setSavedItems(prev => prev.filter(i => i.dealId !== dealId));
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const savedProperties = savedItems.filter(i => i.itemType === "property" && i.propertyId);
  const savedDeals = savedItems.filter(i => i.itemType === "deal" && i.dealId);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/account">
            <button className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
              Saved Listings
            </h1>
            <p className="text-sm text-muted-foreground">
              {savedItems.length} saved item{savedItems.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : savedItems.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No saved listings yet</h2>
            <p className="text-muted-foreground mb-6">
              Tap the heart icon on any property or deal to save it here.
            </p>
            <Link href="/deals">
              <Button className="rounded-full px-6">Browse deals</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Saved Properties */}
            {savedProperties.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Saved Properties ({savedProperties.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedProperties.map((item) => {
                    const prop = properties.get(item.propertyId!);
                    if (!prop) return null;

                    const lowestGapRate = prop.gapNights?.length
                      ? Math.min(...prop.gapNights.map((gn: any) => gn.discountedRate))
                      : null;
                    const maxDiscount = prop.gapNights?.length
                      ? Math.max(...prop.gapNights.map((gn: any) => gn.gapNightDiscount || 0))
                      : 0;
                    const rawBase = prop.baseNightlyRate;
                    const basePrice = typeof rawBase === "number" && !isNaN(rawBase) ? rawBase / 100 : 0;
                    const dealPrice = lowestGapRate && !isNaN(lowestGapRate) ? lowestGapRate / 100 : basePrice;

                    return (
                      <div key={item.id} className="bg-card rounded-xl overflow-hidden border border-border/50 hover:shadow-lg transition-all group">
                        <Link href={`/stays/${prop.id}`} className="block">
                          <div className="relative w-full aspect-[4/3] overflow-hidden">
                            <img
                              src={prop.coverImage || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop"}
                              alt={prop.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {maxDiscount > 0 && (
                              <Badge className="absolute top-2 left-2 bg-rose-500 text-white font-bold text-xs">
                                {maxDiscount}% OFF
                              </Badge>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{prop.title}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3" />
                              <span>{prop.city}, {prop.state}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs mt-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="font-bold">{Number(prop.averageRating) > 0 ? prop.averageRating : "New"}</span>
                              <span className="text-muted-foreground">· {prop.bedrooms} bed · {prop.maxGuests} guests</span>
                            </div>
                            <div className="flex items-end justify-between mt-2 pt-2 border-t border-border/50">
                              <div className="flex items-baseline gap-1.5">
                                {lowestGapRate && lowestGapRate < prop.baseNightlyRate ? (
                                  <>
                                    <span className="text-xs line-through text-muted-foreground">{formatPrice(basePrice, "AUD")}</span>
                                    <span className="font-bold text-primary">{formatPrice(dealPrice, "AUD")}</span>
                                  </>
                                ) : (
                                  <span className="font-bold text-primary">{formatPrice(basePrice, "AUD")}</span>
                                )}
                                <span className="text-xs text-muted-foreground">/ night</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                        <div className="px-3 pb-3">
                          <button
                            onClick={() => handleUnsaveProperty(item.propertyId!)}
                            className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-destructive py-2 rounded-lg hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Saved Deals */}
            {savedDeals.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Saved Deals ({savedDeals.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedDeals.map((item) => {
                    const deal = deals.get(item.dealId!);
                    if (!deal) return null;

                    const safeNormal = typeof deal.normalPrice === "number" && !isNaN(deal.normalPrice) ? deal.normalPrice : 0;
                    const safeDeal = typeof deal.dealPrice === "number" && !isNaN(deal.dealPrice) ? deal.dealPrice : 0;
                    const discountPercent = safeNormal > 0 ? Math.round(((safeNormal - safeDeal) / safeNormal) * 100) : 0;

                    return (
                      <div key={item.id} className="bg-card rounded-xl overflow-hidden border border-border/50 hover:shadow-lg transition-all group">
                        <Link href={`/deal/${deal.id}`} className="block">
                          <div className="relative w-full aspect-[4/3] overflow-hidden">
                            <img
                              src={deal.imageUrl}
                              alt={deal.hotelName}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <Badge className="absolute top-2 left-2 bg-rose-500 text-white font-bold text-xs">
                              {discountPercent}% OFF
                            </Badge>
                          </div>
                          <div className="p-3">
                            <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{deal.hotelName}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3" />
                              <span>{deal.location}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs mt-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="font-bold">{deal.rating}</span>
                              <span className="text-muted-foreground">· {deal.nights} night{deal.nights !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="flex items-end justify-between mt-2 pt-2 border-t border-border/50">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xs line-through text-muted-foreground">{formatPrice(deal.normalPrice, deal.currency)}</span>
                                <span className="font-bold text-primary">{formatPrice(deal.dealPrice, deal.currency)}</span>
                                <span className="text-xs text-muted-foreground">/ night</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                        <div className="px-3 pb-3">
                          <button
                            onClick={() => handleUnsaveDeal(item.dealId!)}
                            className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-destructive py-2 rounded-lg hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
