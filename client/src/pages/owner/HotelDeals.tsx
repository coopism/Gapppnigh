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
import { 
  Building2, ArrowLeft, RefreshCw, Loader2, Check, Calendar, 
  DollarSign, Percent, AlertTriangle, Zap
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
  reason: string;
  suggestedDiscountPercent: number;
}

export default function HotelDeals() {
  const [, params] = useRoute("/owner/hotels/:hotelId/deals");
  const hotelId = params?.hotelId;
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [candidates, setCandidates] = useState<OrphanCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [discountPercent, setDiscountPercent] = useState(25);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: hotel, isLoading: hotelLoading } = useQuery<HotelProfile>({
    queryKey: ["/api/owner/hotels", hotelId],
    enabled: !!hotelId && isAuthenticated,
  });

  const { data: roomTypes } = useQuery<RoomTypeRecord[]>({
    queryKey: ["/api/owner/hotels", hotelId, "room-types"],
    enabled: !!hotelId && isAuthenticated,
  });

  const { data: existingDeals, isLoading: dealsLoading } = useQuery<PublishedDeal[]>({
    queryKey: ["/api/owner/hotels", hotelId, "deals"],
    enabled: !!hotelId && isAuthenticated,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/owner/hotels/${hotelId}/deals/generate-orphans`);
      return response.json();
    },
    onSuccess: (data: OrphanCandidate[]) => {
      setCandidates(data);
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
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map(c => c.id)));
    }
  };

  const handlePublish = () => {
    const dealsToPublish = candidates
      .filter(c => selectedIds.has(c.id))
      .map(c => ({
        roomTypeId: c.roomTypeId,
        date: c.date,
        barRate: c.barRate,
        dealPrice: Math.round(c.barRate * (1 - discountPercent / 100)),
        discountPercent,
        reason: c.reason,
      }));
    
    publishMutation.mutate(dealsToPublish);
  };

  const publishedCount = existingDeals?.filter(d => d.status === "PUBLISHED").length || 0;
  const draftCount = existingDeals?.filter(d => d.status === "DRAFT").length || 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
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
        <Link href={`/owner/hotels/${hotelId}`} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {hotel.name}
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Gap Night Deals</h1>
            <p className="text-muted-foreground mt-1">{hotel.name}</p>
          </div>
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
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Detect Orphan Nights</CardTitle>
                <CardDescription>
                  Scan your availability to find gap nights that can be sold at a discount
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerateOrphans}
                  disabled={isGenerating}
                  data-testid="button-generate-orphans"
                >
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Scanning...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 mr-2" />Detect Orphan Nights</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {candidates.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Orphan Night Candidates</CardTitle>
                      <CardDescription>
                        Select nights to publish as deals
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-48">
                        <Label className="text-sm">Discount: {discountPercent}%</Label>
                        <Slider
                          value={[discountPercent]}
                          onValueChange={([val]) => setDiscountPercent(val)}
                          min={10}
                          max={70}
                          step={5}
                          className="mt-2"
                          data-testid="slider-discount"
                        />
                      </div>
                      <Button
                        onClick={handlePublish}
                        disabled={selectedIds.size === 0 || publishMutation.isPending}
                        data-testid="button-publish-deals"
                      >
                        {publishMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Publishing...</>
                        ) : (
                          <>Publish {selectedIds.size} Deal{selectedIds.size !== 1 ? "s" : ""}</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedIds.size === candidates.length && candidates.length > 0}
                            onCheckedChange={toggleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Room Type</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>BAR Rate</TableHead>
                        <TableHead>Deal Price</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.map(candidate => {
                        const dealPrice = Math.round(candidate.barRate * (1 - discountPercent / 100));
                        return (
                          <TableRow key={candidate.id}>
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
                              <span className="text-green-600 font-semibold">A${dealPrice}</span>
                              <Badge variant="secondary" className="ml-2">-{discountPercent}%</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {candidate.reason}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {existingDeals && existingDeals.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Published Deals</CardTitle>
                  <CardDescription>Your active gap night deals</CardDescription>
                </CardHeader>
                <CardContent>
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
                        <TableRow key={deal.id}>
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
          </>
        )}
      </main>
    </div>
  );
}
