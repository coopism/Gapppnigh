import { useState, useMemo } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building2, ArrowLeft, RefreshCw, Loader2, Calendar, 
  DollarSign, Percent, AlertTriangle, Zap, Info, Edit2, X
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import type { HotelProfile, RoomTypeRecord, PublishedDeal } from "@shared/schema";

interface OrphanCandidate {
  id: string;
  hotelId: string;
  roomTypeId: string;
  roomTypeName: string;
  date: string;
  barRate: number;
  available: number;
  suggestedDiscountPercent: number;
  overridePrice?: number;
}

type SortOption = 'soonest' | 'cheapest' | 'biggest_discount';
type PricingMode = 'percent_off' | 'floor_price' | 'fixed_price';

interface RoomTypePricing {
  mode: PricingMode;
  discountPercent: number;
  floorPrice: number;
  fixedPrice: number;
}

export default function HotelDeals() {
  const [, params] = useRoute("/owner/hotels/:hotelId/deals");
  const hotelId = params?.hotelId;
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [candidates, setCandidates] = useState<OrphanCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<number>(30);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [defaultPricing, setDefaultPricing] = useState<RoomTypePricing>({
    mode: 'percent_off',
    discountPercent: 25,
    floorPrice: 100,
    fixedPrice: 150,
  });
  
  const [roomTypePricing, setRoomTypePricing] = useState<Record<string, RoomTypePricing>>({});
  const [selectedRoomTypeForPricing, setSelectedRoomTypeForPricing] = useState<string>('default');
  
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('soonest');
  
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');

  const { data: hotel, isLoading: hotelLoading } = useQuery<HotelProfile>({
    queryKey: ["/api/owner/hotels", hotelId],
    enabled: !!hotelId && isAuthenticated,
  });

  const { data: roomTypes } = useQuery<RoomTypeRecord[]>({
    queryKey: ["/api/owner/hotels", hotelId, "room-types"],
    enabled: !!hotelId && isAuthenticated,
  });

  const { data: existingDeals } = useQuery<PublishedDeal[]>({
    queryKey: ["/api/owner/hotels", hotelId, "deals"],
    enabled: !!hotelId && isAuthenticated,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/owner/hotels/${hotelId}/deals/generate-orphans?days=${dateRange}`);
      return response.json();
    },
    onSuccess: (data: OrphanCandidate[]) => {
      setCandidates(data);
      setSelectedIds(new Set(data.map(c => c.id)));
      toast({ title: `Found ${data.length} orphan night candidates` });
    },
    onError: () => {
      toast({ title: "Failed to generate orphan nights", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (dealsToPublish: any[]) => {
      const response = await apiRequest("POST", `/api/owner/hotels/${hotelId}/deals/publish`, {
        deals: dealsToPublish,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/hotels", hotelId, "deals"] });
      setCandidates([]);
      setSelectedIds(new Set());
      toast({ title: "Deals published successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to publish deals", variant: "destructive" });
    },
  });

  const getPricingForRoomType = (roomTypeId: string): RoomTypePricing => {
    return roomTypePricing[roomTypeId] || defaultPricing;
  };

  const getCurrentPricing = (): RoomTypePricing => {
    if (selectedRoomTypeForPricing === 'default') {
      return defaultPricing;
    }
    return roomTypePricing[selectedRoomTypeForPricing] || defaultPricing;
  };

  const updateCurrentPricing = (updates: Partial<RoomTypePricing>) => {
    if (selectedRoomTypeForPricing === 'default') {
      setDefaultPricing(prev => ({ ...prev, ...updates }));
    } else {
      setRoomTypePricing(prev => ({
        ...prev,
        [selectedRoomTypeForPricing]: {
          ...(prev[selectedRoomTypeForPricing] || defaultPricing),
          ...updates,
        },
      }));
    }
  };

  const clearRoomTypePricing = (roomTypeId: string) => {
    setRoomTypePricing(prev => {
      const next = { ...prev };
      delete next[roomTypeId];
      return next;
    });
  };

  const calculateDealPrice = (barRate: number, roomTypeId: string, overridePrice?: number): number => {
    if (overridePrice !== undefined) {
      return overridePrice;
    }
    
    const pricing = getPricingForRoomType(roomTypeId);
    
    switch (pricing.mode) {
      case 'percent_off':
        return Math.round(barRate * (1 - pricing.discountPercent / 100));
      case 'floor_price':
        return pricing.floorPrice;
      case 'fixed_price':
        return pricing.fixedPrice;
      default:
        return barRate;
    }
  };

  const getDiscountPercent = (barRate: number, dealPrice: number): number => {
    if (barRate === 0) return 0;
    return Math.round((1 - dealPrice / barRate) * 100);
  };

  const filteredCandidates = useMemo(() => {
    let filtered = [...candidates];
    
    if (roomTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.roomTypeId === roomTypeFilter);
    }
    
    switch (sortBy) {
      case 'cheapest':
        filtered.sort((a, b) => 
          calculateDealPrice(a.barRate, a.roomTypeId, a.overridePrice) - 
          calculateDealPrice(b.barRate, b.roomTypeId, b.overridePrice)
        );
        break;
      case 'biggest_discount':
        filtered.sort((a, b) => {
          const discountA = getDiscountPercent(a.barRate, calculateDealPrice(a.barRate, a.roomTypeId, a.overridePrice));
          const discountB = getDiscountPercent(b.barRate, calculateDealPrice(b.barRate, b.roomTypeId, b.overridePrice));
          return discountB - discountA;
        });
        break;
      default:
        filtered.sort((a, b) => a.date.localeCompare(b.date));
    }
    
    return filtered;
  }, [candidates, roomTypeFilter, sortBy, defaultPricing, roomTypePricing]);

  if (!isAuthenticated) {
    setLocation("/owner/login");
    return null;
  }

  if (hotelLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Hotel Not Found</CardTitle>
          </CardHeader>
          <CardFooter>
            <Link href="/owner/dashboard"><Button>Back to Dashboard</Button></Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleGenerateOrphans = async () => {
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCandidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
    }
  };

  const handleStartEdit = (candidate: OrphanCandidate) => {
    setEditingCandidateId(candidate.id);
    const currentPrice = calculateDealPrice(candidate.barRate, candidate.roomTypeId, candidate.overridePrice);
    setEditingPrice(currentPrice.toString());
  };

  const handleSaveEdit = (candidateId: string) => {
    const price = parseInt(editingPrice);
    if (!isNaN(price) && price > 0) {
      setCandidates(prev => prev.map(c => 
        c.id === candidateId ? { ...c, overridePrice: price } : c
      ));
    }
    setEditingCandidateId(null);
    setEditingPrice('');
  };

  const handleClearOverride = (candidateId: string) => {
    setCandidates(prev => prev.map(c => 
      c.id === candidateId ? { ...c, overridePrice: undefined } : c
    ));
  };

  const handlePublish = () => {
    const dealsToPublish = candidates
      .filter(c => selectedIds.has(c.id))
      .map(c => {
        const dealPrice = calculateDealPrice(c.barRate, c.roomTypeId, c.overridePrice);
        return {
          roomTypeId: c.roomTypeId,
          date: c.date,
          barRate: c.barRate,
          dealPrice,
          discountPercent: getDiscountPercent(c.barRate, dealPrice),
        };
      });
    
    publishMutation.mutate(dealsToPublish);
  };

  const publishedCount = existingDeals?.filter(d => d.status === "PUBLISHED").length || 0;
  const draftCount = existingDeals?.filter(d => d.status === "DRAFT").length || 0;
  const currentPricing = getCurrentPricing();
  const hasCustomPricing = selectedRoomTypeForPricing !== 'default' && roomTypePricing[selectedRoomTypeForPricing];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/owner/dashboard" className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">GapNight</span>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Link href={`/owner/hotels/${hotelId}`}>
          <Button variant="ghost" className="mb-6" data-testid="button-back-hotel">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {hotel.name}
          </Button>
        </Link>

        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gap Night Deals</h1>
            <p className="text-muted-foreground mt-1">{hotel.name}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(parseInt(v))}>
              <SelectTrigger className="w-[140px]" data-testid="select-date-range">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="14">Next 14 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={handleGenerateOrphans} disabled={isGenerating} data-testid="button-refresh-ari">
              <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? "Refreshing..." : "Refresh ARI"}
            </Button>
          </div>
        </div>

        <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            ARI data is simulated for this demo. In production, this connects to your property management system.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                Published
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{publishedCount}</div>
              <p className="text-sm text-muted-foreground">Active deals</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                Draft
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{draftCount}</div>
              <p className="text-sm text-muted-foreground">Unpublished</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-muted-foreground" />
                Candidates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{candidates.length}</div>
              <p className="text-sm text-muted-foreground">Ready to publish</p>
            </CardContent>
          </Card>
        </div>

        {!roomTypes || roomTypes.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Room Types</CardTitle>
              <CardDescription>
                You need to add room types and availability before you can detect orphan nights.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href={`/owner/hotels/${hotelId}`}>
                <Button>Add Room Types</Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-lg">Detected Orphan Nights</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                        <SelectTrigger className="w-[160px]" data-testid="filter-room-type">
                          <SelectValue placeholder="Room type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All room types</SelectItem>
                          {roomTypes.map(rt => (
                            <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                        <SelectTrigger className="w-[150px]" data-testid="sort-by">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="soonest">Soonest</SelectItem>
                          <SelectItem value="cheapest">Cheapest</SelectItem>
                          <SelectItem value="biggest_discount">Biggest discount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isGenerating ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : filteredCandidates.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No orphan nights detected.</p>
                      <p className="text-sm">Click "Refresh ARI" to fetch availability data.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox 
                                checked={filteredCandidates.length > 0 && selectedIds.size === filteredCandidates.length}
                                onCheckedChange={toggleSelectAll}
                                data-testid="checkbox-select-all"
                              />
                            </TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Room Type</TableHead>
                            <TableHead>Avail.</TableHead>
                            <TableHead>BAR Rate</TableHead>
                            <TableHead>Deal Price</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCandidates.map(candidate => {
                            const dealPrice = calculateDealPrice(candidate.barRate, candidate.roomTypeId, candidate.overridePrice);
                            const discount = getDiscountPercent(candidate.barRate, dealPrice);
                            const isEditing = editingCandidateId === candidate.id;
                            const hasOverride = candidate.overridePrice !== undefined;
                            
                            return (
                              <TableRow key={candidate.id} data-testid={`row-candidate-${candidate.id}`}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedIds.has(candidate.id)}
                                    onCheckedChange={() => toggleSelect(candidate.id)}
                                    data-testid={`checkbox-candidate-${candidate.id}`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {format(parseISO(candidate.date), "EEE, MMM d")}
                                </TableCell>
                                <TableCell>{candidate.roomTypeName}</TableCell>
                                <TableCell>{candidate.available}</TableCell>
                                <TableCell>A${candidate.barRate}</TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-muted-foreground">A$</span>
                                      <Input
                                        type="number"
                                        value={editingPrice}
                                        onChange={(e) => setEditingPrice(e.target.value)}
                                        className="w-20 h-8"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveEdit(candidate.id);
                                          if (e.key === 'Escape') setEditingCandidateId(null);
                                        }}
                                        data-testid={`input-price-${candidate.id}`}
                                      />
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-8 px-2"
                                        onClick={() => handleSaveEdit(candidate.id)}
                                      >
                                        Save
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className={`font-semibold ${hasOverride ? 'text-blue-600' : 'text-green-600'}`}>
                                        A${dealPrice}
                                      </span>
                                      <Badge variant="secondary">-{discount}%</Badge>
                                      {hasOverride && (
                                        <Badge variant="outline" className="text-xs">Custom</Badge>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {!isEditing && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => handleStartEdit(candidate)}
                                        data-testid={`button-edit-${candidate.id}`}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {hasOverride && !isEditing && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-muted-foreground"
                                        onClick={() => handleClearOverride(candidate.id)}
                                        data-testid={`button-clear-${candidate.id}`}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
                {filteredCandidates.length > 0 && (
                  <CardFooter className="border-t p-4">
                    <Button
                      onClick={handlePublish}
                      disabled={selectedIds.size === 0 || publishMutation.isPending}
                      className="w-full"
                      data-testid="button-publish-deals"
                    >
                      {publishMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />Publishing...</>
                      ) : (
                        <>Publish {selectedIds.size} Deal{selectedIds.size !== 1 ? "s" : ""}</>
                      )}
                    </Button>
                  </CardFooter>
                )}
              </Card>

              {existingDeals && existingDeals.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Published Deals</CardTitle>
                    <CardDescription>Your active gap night deals</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Deal Price</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {existingDeals.map(deal => (
                          <TableRow key={deal.id} data-testid={`row-deal-${deal.id}`}>
                            <TableCell>{format(parseISO(deal.date), "EEE, MMM d, yyyy")}</TableCell>
                            <TableCell>A${deal.dealPrice}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">-{deal.discountPercent}%</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={deal.status === "PUBLISHED" ? "default" : "outline"}>
                                {deal.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing Controls
                  </CardTitle>
                  <CardDescription>Set pricing per room type or use default</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Room Type</Label>
                    <Select value={selectedRoomTypeForPricing} onValueChange={setSelectedRoomTypeForPricing}>
                      <SelectTrigger data-testid="select-room-type-pricing">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">All Room Types (Default)</SelectItem>
                        {roomTypes.map(rt => (
                          <SelectItem key={rt.id} value={rt.id}>
                            {rt.name}
                            {roomTypePricing[rt.id] ? ' (Custom)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasCustomPricing && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => clearRoomTypePricing(selectedRoomTypeForPricing)}
                        data-testid="button-clear-room-pricing"
                      >
                        Clear Custom Pricing
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Pricing Mode</Label>
                    <Select 
                      value={currentPricing.mode} 
                      onValueChange={(v) => updateCurrentPricing({ mode: v as PricingMode })}
                    >
                      <SelectTrigger data-testid="select-pricing-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent_off">% off BAR</SelectItem>
                        <SelectItem value="floor_price">Floor Price</SelectItem>
                        <SelectItem value="fixed_price">Fixed Price</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {currentPricing.mode === 'percent_off' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Discount</Label>
                        <span className="text-lg font-semibold text-primary">{currentPricing.discountPercent}%</span>
                      </div>
                      <Slider
                        value={[currentPricing.discountPercent]}
                        onValueChange={([val]) => updateCurrentPricing({ discountPercent: val })}
                        min={10}
                        max={70}
                        step={5}
                        data-testid="slider-discount"
                      />
                      <p className="text-xs text-muted-foreground">
                        Discount percentage applied to the BAR
                      </p>
                    </div>
                  )}

                  {currentPricing.mode === 'floor_price' && (
                    <div className="space-y-3">
                      <Label>Floor Price (A$)</Label>
                      <Input
                        type="number"
                        value={currentPricing.floorPrice}
                        onChange={(e) => updateCurrentPricing({ floorPrice: parseInt(e.target.value) || 0 })}
                        min={0}
                        data-testid="input-floor-price"
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum price per night
                      </p>
                    </div>
                  )}

                  {currentPricing.mode === 'fixed_price' && (
                    <div className="space-y-3">
                      <Label>Fixed Price (A$)</Label>
                      <Input
                        type="number"
                        value={currentPricing.fixedPrice}
                        onChange={(e) => updateCurrentPricing({ fixedPrice: parseInt(e.target.value) || 0 })}
                        min={0}
                        data-testid="input-fixed-price"
                      />
                      <p className="text-xs text-muted-foreground">
                        Exact price per night for all deals
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Selected</span>
                    <span className="font-medium">{selectedIds.size} nights</span>
                  </div>
                  {selectedIds.size > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Avg. Deal Price</span>
                        <span className="font-medium text-green-600">
                          A${Math.round(
                            candidates
                              .filter(c => selectedIds.has(c.id))
                              .reduce((sum, c) => sum + calculateDealPrice(c.barRate, c.roomTypeId, c.overridePrice), 0) / selectedIds.size
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Avg. Discount</span>
                        <span className="font-medium">
                          {Math.round(
                            candidates
                              .filter(c => selectedIds.has(c.id))
                              .reduce((sum, c) => {
                                const dealPrice = calculateDealPrice(c.barRate, c.roomTypeId, c.overridePrice);
                                return sum + getDiscountPercent(c.barRate, dealPrice);
                              }, 0) / selectedIds.size
                          )}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Custom Prices</span>
                        <span className="font-medium">
                          {candidates.filter(c => selectedIds.has(c.id) && c.overridePrice !== undefined).length}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {Object.keys(roomTypePricing).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Room Type Pricing</CardTitle>
                    <CardDescription>Custom pricing rules by room type</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(roomTypePricing).map(([rtId, pricing]) => {
                      const rt = roomTypes.find(r => r.id === rtId);
                      return (
                        <div key={rtId} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                          <span className="text-sm font-medium">{rt?.name || rtId}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {pricing.mode === 'percent_off' && `-${pricing.discountPercent}%`}
                              {pricing.mode === 'floor_price' && `A$${pricing.floorPrice}`}
                              {pricing.mode === 'fixed_price' && `A$${pricing.fixedPrice}`}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => clearRoomTypePricing(rtId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
