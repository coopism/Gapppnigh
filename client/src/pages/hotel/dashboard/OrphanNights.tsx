import { useState, useEffect, useMemo } from "react";
import { format, addDays, parseISO } from "date-fns";
import { Link } from "wouter";
import { 
  RefreshCw, 
  Check, 
  X, 
  Info, 
  Eye,
  Upload,
  Moon,
  Sun,
  ArrowLeft,
  Calendar,
  DollarSign,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/ThemeProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import type { 
  Hotel, 
  RoomType, 
  ARIEntry, 
  OrphanNightCandidate, 
  PricingRule, 
  PricingMode 
} from "@shared/schema";

const MOCK_HOTELS: Hotel[] = [
  {
    id: "h_melb_001",
    name: "Crown City Suites",
    location: "Melbourne, Australia",
    roomTypes: [
      { id: "rt_king", name: "King Room", hotelId: "h_melb_001" },
      { id: "rt_twin", name: "Twin Room", hotelId: "h_melb_001" },
      { id: "rt_suite", name: "Executive Suite", hotelId: "h_melb_001" },
    ],
  },
  {
    id: "h_syd_001",
    name: "Harbour View Hotel",
    location: "Sydney, Australia",
    roomTypes: [
      { id: "rt_std", name: "Standard Room", hotelId: "h_syd_001" },
      { id: "rt_deluxe", name: "Deluxe Room", hotelId: "h_syd_001" },
    ],
  },
  {
    id: "h_gc_001",
    name: "Seaside Paradise Resort",
    location: "Gold Coast, Australia",
    roomTypes: [
      { id: "rt_ocean", name: "Ocean View Suite", hotelId: "h_gc_001" },
      { id: "rt_garden", name: "Garden Room", hotelId: "h_gc_001" },
      { id: "rt_penthouse", name: "Penthouse", hotelId: "h_gc_001" },
    ],
  },
];

function generateMockARI(hotel: Hotel, days: number): ARIEntry[] {
  const ari: ARIEntry[] = [];
  const today = new Date();
  
  hotel.roomTypes.forEach(roomType => {
    for (let i = 0; i < days; i++) {
      const date = format(addDays(today, i), "yyyy-MM-dd");
      const randomAvailable = Math.random() > 0.3 ? Math.floor(Math.random() * 5) + 1 : 0;
      const baseRate = roomType.name.includes("Suite") || roomType.name.includes("Penthouse") 
        ? 350 + Math.floor(Math.random() * 150)
        : 180 + Math.floor(Math.random() * 100);
      
      ari.push({
        hotelId: hotel.id,
        roomTypeId: roomType.id,
        date,
        available: randomAvailable,
        barRate: baseRate,
        minStay: Math.random() > 0.7 ? 2 : 1,
        closedToArrival: Math.random() > 0.9,
      });
    }
  });
  
  return ari;
}

function detectOrphanNights(ari: ARIEntry[], hotel: Hotel): OrphanNightCandidate[] {
  const candidates: OrphanNightCandidate[] = [];
  const roomTypeMap = new Map(hotel.roomTypes.map(rt => [rt.id, rt.name]));
  
  const ariByRoomAndDate = new Map<string, ARIEntry>();
  ari.forEach(entry => {
    ariByRoomAndDate.set(`${entry.roomTypeId}_${entry.date}`, entry);
  });
  
  const getEntry = (roomTypeId: string, date: string): ARIEntry | undefined => {
    return ariByRoomAndDate.get(`${roomTypeId}_${date}`);
  };
  
  ari.forEach(entry => {
    if (entry.available === 0) return;
    
    const currentDate = parseISO(entry.date);
    const prevDate = format(addDays(currentDate, -1), "yyyy-MM-dd");
    const nextDate = format(addDays(currentDate, 1), "yyyy-MM-dd");
    
    const prevEntry = getEntry(entry.roomTypeId, prevDate);
    const nextEntry = getEntry(entry.roomTypeId, nextDate);
    
    const prevUnavailable = !prevEntry || prevEntry.available === 0;
    const nextUnavailable = !nextEntry || nextEntry.available === 0;
    
    let isOrphan = false;
    let reason = "";
    let suggestedDiscount = 20;
    
    if (prevUnavailable && nextUnavailable) {
      isOrphan = true;
      reason = "True 1-night gap: sold/blocked on both sides";
      suggestedDiscount = 35;
    }
    else if (prevUnavailable && nextEntry && nextEntry.available > 0 && nextEntry.minStay >= 2) {
      isOrphan = true;
      reason = "Gap created by min-stay on following night";
      suggestedDiscount = 30;
    }
    else if (nextUnavailable && prevEntry && prevEntry.available > 0 && entry.closedToArrival) {
      isOrphan = true;
      reason = "Closed to arrival before blocked period";
      suggestedDiscount = 25;
    }
    else if (entry.minStay >= 2 && (prevUnavailable || nextUnavailable)) {
      isOrphan = true;
      reason = "Restriction-created orphan (min stay + adjacent block)";
      suggestedDiscount = 30;
    }
    
    if (isOrphan) {
      candidates.push({
        id: `on_${entry.hotelId}_${entry.roomTypeId}_${entry.date}`,
        hotelId: entry.hotelId,
        roomTypeId: entry.roomTypeId,
        roomTypeName: roomTypeMap.get(entry.roomTypeId) || "Unknown",
        date: entry.date,
        barRate: entry.barRate,
        available: entry.available,
        reason,
        suggestedDiscountPercent: suggestedDiscount,
        status: 'draft',
        included: true,
      });
    }
  });
  
  return candidates.sort((a, b) => a.date.localeCompare(b.date));
}

function calculateDealPrice(barRate: number, rule: PricingRule, override?: { price?: number; discountPercent?: number }): number {
  if (override?.price !== undefined) {
    return override.price;
  }
  
  if (override?.discountPercent !== undefined) {
    return Math.round(barRate * (1 - override.discountPercent / 100));
  }
  
  switch (rule.mode) {
    case 'percent_off':
      return Math.round(barRate * (1 - rule.value / 100));
    case 'floor_price':
      return rule.value;
    case 'fixed_price':
      return rule.value;
    default:
      return barRate;
  }
}

type SortOption = 'soonest' | 'cheapest' | 'biggest_discount';
type FilterOption = 'all' | 'gap_only' | 'restriction_only';

export default function OrphanNightsDashboard() {
  const { theme, setTheme } = useTheme();
  const [selectedHotelId, setSelectedHotelId] = useState<string>(MOCK_HOTELS[0].id);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<number>(30);
  
  const [ariData, setAriData] = useState<ARIEntry[]>([]);
  const [orphanCandidates, setOrphanCandidates] = useState<OrphanNightCandidate[]>([]);
  
  const [pricingRule, setPricingRule] = useState<PricingRule>({
    mode: 'percent_off',
    value: 25,
    applyTo: 'all',
  });
  
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [gapFilter, setGapFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('soonest');
  
  const selectedHotel = MOCK_HOTELS.find(h => h.id === selectedHotelId)!;
  
  useEffect(() => {
    const savedAri = localStorage.getItem(`gapnight_ari_cache_${selectedHotelId}`);
    const savedCandidates = localStorage.getItem(`gapnight_orphan_candidates_${selectedHotelId}`);
    const savedRule = localStorage.getItem(`gapnight_pricing_rules_${selectedHotelId}`);
    
    setAriData(savedAri ? JSON.parse(savedAri) : []);
    setOrphanCandidates(savedCandidates ? JSON.parse(savedCandidates) : []);
    if (savedRule) {
      setPricingRule(JSON.parse(savedRule));
    } else {
      setPricingRule({ mode: 'percent_off', value: 25, applyTo: 'all' });
    }
  }, [selectedHotelId]);
  
  useEffect(() => {
    localStorage.setItem(`gapnight_ari_cache_${selectedHotelId}`, JSON.stringify(ariData));
    localStorage.setItem(`gapnight_orphan_candidates_${selectedHotelId}`, JSON.stringify(orphanCandidates));
    localStorage.setItem(`gapnight_pricing_rules_${selectedHotelId}`, JSON.stringify(pricingRule));
  }, [ariData, orphanCandidates, pricingRule, selectedHotelId]);
  
  const handleRefreshARI = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    
    const newAri = generateMockARI(selectedHotel, dateRange);
    const candidates = detectOrphanNights(newAri, selectedHotel);
    
    setAriData(newAri);
    setOrphanCandidates(candidates);
    setIsLoading(false);
  };
  
  const filteredCandidates = useMemo(() => {
    let filtered = [...orphanCandidates];
    
    if (roomTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.roomTypeId === roomTypeFilter);
    }
    
    if (gapFilter === 'gap_only') {
      filtered = filtered.filter(c => c.reason.includes('gap') || c.reason.includes('Edge'));
    } else if (gapFilter === 'restriction_only') {
      filtered = filtered.filter(c => c.reason.includes('Restriction') || c.reason.includes('Closed'));
    }
    
    switch (sortBy) {
      case 'cheapest':
        filtered.sort((a, b) => {
          const priceA = calculateDealPrice(a.barRate, pricingRule, { price: a.overridePrice, discountPercent: a.overrideDiscountPercent });
          const priceB = calculateDealPrice(b.barRate, pricingRule, { price: b.overridePrice, discountPercent: b.overrideDiscountPercent });
          return priceA - priceB;
        });
        break;
      case 'biggest_discount':
        filtered.sort((a, b) => {
          const discountA = a.overrideDiscountPercent ?? (pricingRule.mode === 'percent_off' ? pricingRule.value : a.suggestedDiscountPercent);
          const discountB = b.overrideDiscountPercent ?? (pricingRule.mode === 'percent_off' ? pricingRule.value : b.suggestedDiscountPercent);
          return discountB - discountA;
        });
        break;
      default:
        filtered.sort((a, b) => a.date.localeCompare(b.date));
    }
    
    return filtered;
  }, [orphanCandidates, roomTypeFilter, gapFilter, sortBy, pricingRule]);
  
  const updateCandidate = (id: string, updates: Partial<OrphanNightCandidate>) => {
    setOrphanCandidates(prev => 
      prev.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  };
  
  const approveSelected = () => {
    setOrphanCandidates(prev =>
      prev.map(c => c.included && c.status === 'draft' ? { ...c, status: 'approved' } : c)
    );
  };
  
  const publishDeals = () => {
    const toPublish = orphanCandidates.filter(c => c.included && c.status === 'approved');
    
    setOrphanCandidates(prev =>
      prev.map(c => c.included && c.status === 'approved' ? { ...c, status: 'published' } : c)
    );
    
    const publishedDeals = toPublish.map(c => ({
      ...c,
      dealPrice: calculateDealPrice(c.barRate, pricingRule, { price: c.overridePrice, discountPercent: c.overrideDiscountPercent }),
      publishedAt: new Date().toISOString(),
    }));
    
    localStorage.setItem(`gapnight_published_deals_${selectedHotelId}`, JSON.stringify(publishedDeals));
  };
  
  const unpublishDeal = (id: string) => {
    updateCandidate(id, { status: 'approved' });
  };
  
  const applyPricingRule = () => {
    setOrphanCandidates(prev =>
      prev.map(c => {
        if (pricingRule.applyTo === 'selected_room_type' && c.roomTypeId !== pricingRule.selectedRoomTypeId) {
          return c;
        }
        if (pricingRule.applyTo === 'checked_only' && !c.included) {
          return c;
        }
        return { ...c, overridePrice: undefined, overrideDiscountPercent: undefined };
      })
    );
  };
  
  const approvedCount = orphanCandidates.filter(c => c.status === 'approved' && c.included).length;
  const publishedCount = orphanCandidates.filter(c => c.status === 'published').length;
  const draftCount = orphanCandidates.filter(c => c.status === 'draft' && c.included).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">G</span>
              </div>
              <span className="font-display text-xl font-bold">Hotel Dashboard</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
              <SelectTrigger className="w-[220px]" data-testid="select-hotel">
                <SelectValue placeholder="Select hotel" />
              </SelectTrigger>
              <SelectContent>
                {MOCK_HOTELS.map(hotel => (
                  <SelectItem key={hotel.id} value={hotel.id}>{hotel.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Badge variant={isConnected ? "default" : "destructive"} className="whitespace-nowrap">
              {isConnected ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
              {isConnected ? "Connected (Mock)" : "Not connected"}
            </Badge>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              data-testid="button-theme-toggle-dashboard"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Orphan Nights Review</h1>
            <p className="text-muted-foreground">{selectedHotel.name} - {selectedHotel.location}</p>
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
            
            <Button onClick={handleRefreshARI} disabled={isLoading} data-testid="button-refresh-ari">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? "Refreshing..." : "Refresh ARI"}
            </Button>
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            We only use availability + rates data, no guest information is accessed or stored.
          </p>
        </div>

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
                        {selectedHotel.roomTypes.map(rt => (
                          <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={gapFilter} onValueChange={(v) => setGapFilter(v as FilterOption)}>
                      <SelectTrigger className="w-[160px]" data-testid="filter-gap-type">
                        <SelectValue placeholder="Gap type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="gap_only">1-night gaps only</SelectItem>
                        <SelectItem value="restriction_only">Restriction-created</SelectItem>
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
                {isLoading ? (
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
                              checked={filteredCandidates.every(c => c.included)}
                              onCheckedChange={(checked) => {
                                setOrphanCandidates(prev => 
                                  prev.map(c => ({ ...c, included: !!checked }))
                                );
                              }}
                              data-testid="checkbox-select-all"
                            />
                          </TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Room Type</TableHead>
                          <TableHead className="text-center">Avail</TableHead>
                          <TableHead className="text-right">BAR</TableHead>
                          <TableHead className="text-right">Deal Price</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Override</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCandidates.map(candidate => {
                          const dealPrice = calculateDealPrice(
                            candidate.barRate, 
                            pricingRule, 
                            { price: candidate.overridePrice, discountPercent: candidate.overrideDiscountPercent }
                          );
                          const discountPercent = Math.round((1 - dealPrice / candidate.barRate) * 100);
                          const hasOverride = candidate.overridePrice !== undefined || candidate.overrideDiscountPercent !== undefined;
                          
                          return (
                            <TableRow key={candidate.id} className={!candidate.included ? 'opacity-50' : ''}>
                              <TableCell>
                                <Checkbox 
                                  checked={candidate.included}
                                  onCheckedChange={(checked) => updateCandidate(candidate.id, { included: !!checked })}
                                  data-testid={`checkbox-include-${candidate.id}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium whitespace-nowrap">
                                {format(parseISO(candidate.date), "EEE, MMM d")}
                              </TableCell>
                              <TableCell>{candidate.roomTypeName}</TableCell>
                              <TableCell className="text-center">{candidate.available}</TableCell>
                              <TableCell className="text-right">
                                <span className="line-through text-muted-foreground">${candidate.barRate}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="font-bold text-primary">${dealPrice}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    -{discountPercent}%
                                  </Badge>
                                  {hasOverride && (
                                    <Badge variant="outline" className="text-xs">Override</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm text-muted-foreground cursor-help truncate max-w-[150px] block">
                                      {candidate.reason.split(' ').slice(0, 3).join(' ')}...
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{candidate.reason}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    candidate.status === 'published' ? 'default' :
                                    candidate.status === 'approved' ? 'secondary' : 'outline'
                                  }
                                >
                                  {candidate.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  placeholder="$"
                                  className="w-20 h-8 text-right"
                                  value={candidate.overridePrice ?? ''}
                                  onChange={(e) => updateCandidate(candidate.id, { 
                                    overridePrice: e.target.value ? parseInt(e.target.value) : undefined,
                                    overrideDiscountPercent: undefined
                                  })}
                                  data-testid={`input-override-${candidate.id}`}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Button 
                onClick={approveSelected} 
                disabled={draftCount === 0}
                data-testid="button-approve-selected"
              >
                <Check className="w-4 h-4 mr-2" />
                Approve Selected ({draftCount})
              </Button>
              <Link href={`/deals?hotelId=${selectedHotelId}`}>
                <Button variant="outline" data-testid="button-preview-feed">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview in Consumer Feed
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Pricing Rules
                </CardTitle>
                <CardDescription>Set global pricing for orphan nights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pricing Mode</Label>
                  <Select 
                    value={pricingRule.mode} 
                    onValueChange={(v) => setPricingRule(prev => ({ ...prev, mode: v as PricingMode }))}
                  >
                    <SelectTrigger data-testid="select-pricing-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent_off">% off BAR</SelectItem>
                      <SelectItem value="floor_price">Floor price</SelectItem>
                      <SelectItem value="fixed_price">Fixed price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {pricingRule.mode === 'percent_off' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Discount</Label>
                      <span className="text-lg font-bold text-primary">{pricingRule.value}%</span>
                    </div>
                    <Slider
                      value={[pricingRule.value]}
                      onValueChange={([v]) => setPricingRule(prev => ({ ...prev, value: v }))}
                      min={10}
                      max={70}
                      step={5}
                      data-testid="slider-discount"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>10%</span>
                      <span>70%</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>{pricingRule.mode === 'floor_price' ? 'Minimum Price' : 'Fixed Price'}</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={pricingRule.value}
                        onChange={(e) => setPricingRule(prev => ({ ...prev, value: parseInt(e.target.value) || 0 }))}
                        className="pl-9"
                        data-testid="input-price-value"
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Apply to</Label>
                  <Select 
                    value={pricingRule.applyTo} 
                    onValueChange={(v) => setPricingRule(prev => ({ ...prev, applyTo: v as PricingRule['applyTo'] }))}
                  >
                    <SelectTrigger data-testid="select-apply-to">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All detected orphan nights</SelectItem>
                      <SelectItem value="selected_room_type">Selected room type only</SelectItem>
                      <SelectItem value="checked_only">Checked nights only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {pricingRule.applyTo === 'selected_room_type' && (
                  <div className="space-y-2">
                    <Label>Room Type</Label>
                    <Select 
                      value={pricingRule.selectedRoomTypeId || ''} 
                      onValueChange={(v) => setPricingRule(prev => ({ ...prev, selectedRoomTypeId: v }))}
                    >
                      <SelectTrigger data-testid="select-room-type-pricing">
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedHotel.roomTypes.map(rt => (
                          <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <Button onClick={applyPricingRule} className="w-full" data-testid="button-apply-pricing">
                  Apply Pricing Rule
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Publish to GapNight
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{draftCount}</div>
                    <div className="text-xs text-muted-foreground">Draft</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-amber-500">{approvedCount}</div>
                    <div className="text-xs text-muted-foreground">Approved</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">{publishedCount}</div>
                    <div className="text-xs text-muted-foreground">Published</div>
                  </div>
                </div>
                
                <Button 
                  onClick={publishDeals} 
                  className="w-full" 
                  disabled={approvedCount === 0}
                  data-testid="button-publish-deals"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Publish {approvedCount} Deal{approvedCount !== 1 ? 's' : ''}
                </Button>
                
                {publishedCount > 0 && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      {publishedCount} deal{publishedCount !== 1 ? 's' : ''} live on GapNight
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Why do orphan nights exist?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Orphan nights are single-night gaps in your booking calendar that are difficult to sell. 
                  They occur when guests book around a date, leaving isolated nights. 
                  Hotels often discount these to avoid losing revenue on otherwise empty rooms.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
