import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { GapNightLogoLoader } from "@/components/GapNightLogo";
import { useAuthStore } from "@/hooks/useAuth";
import {
  Star, MapPin, Bed, Users, Wifi, Dumbbell, Car, UtensilsCrossed, Waves,
  Sparkles, Wine, Umbrella, Bell, ConciergeBell, Heart, Shield, Clock,
  MessageCircle, ArrowLeft, Calendar, Check, Share2, Send, ChevronDown,
  Navigation as NavIcon, KeyRound, Dog, Award, Zap, Flame, Tv, Wind,
  WashingMachine, Mountain, TreePine, Home, Ban, Cigarette, PartyPopper,
  AlertTriangle, Info, CreditCard, ShieldCheck,
} from "lucide-react";

function formatReadableDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? "st"
    : day === 2 || day === 22 ? "nd"
    : day === 3 || day === 23 ? "rd" : "th";
  const month = date.toLocaleDateString("en-AU", { month: "long" });
  const year = date.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? "st"
    : day === 2 || day === 22 ? "nd"
    : day === 3 || day === 23 ? "rd" : "th";
  return `${date.toLocaleDateString("en-AU", { month: "short" })} ${day}${suffix}`;
}

interface GapNightRange {
  startDate: string;
  endDate: string;
  nights: number;
  avgRate: number;
  avgDiscount: number;
  totalRate: number;
  originalTotal: number;
  dates: any[];
}

function groupConsecutiveGapNights(gapNights: any[]): GapNightRange[] {
  if (gapNights.length === 0) return [];
  const sorted = [...gapNights].sort((a, b) => a.date.localeCompare(b.date));
  const ranges: GapNightRange[] = [];
  let current: any[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date + "T00:00:00");
    const curr = new Date(sorted[i].date + "T00:00:00");
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current.push(sorted[i]);
    } else {
      ranges.push(buildRange(current));
      current = [sorted[i]];
    }
  }
  ranges.push(buildRange(current));
  return ranges;
}

function buildRange(dates: any[]): GapNightRange {
  const totalOriginal = dates.reduce((sum: number, d: any) => sum + d.nightlyRate, 0);
  const totalDiscounted = dates.reduce((sum: number, d: any) => {
    return sum + Math.round(d.nightlyRate * (1 - (d.gapNightDiscount || 0) / 100));
  }, 0);
  const avgDiscount = Math.round(dates.reduce((sum: number, d: any) => sum + (d.gapNightDiscount || 0), 0) / dates.length);
  // End date is the day AFTER the last night (checkout day)
  const lastDate = new Date(dates[dates.length - 1].date + "T00:00:00");
  lastDate.setDate(lastDate.getDate() + 1);
  const endDate = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}-${String(lastDate.getDate()).padStart(2, "0")}`;
  return {
    startDate: dates[0].date,
    endDate,
    nights: dates.length,
    avgRate: Math.round(totalDiscounted / dates.length),
    avgDiscount,
    totalRate: totalDiscounted,
    originalTotal: totalOriginal,
    dates,
  };
}

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  "WiFi": Wifi, "Gym": Dumbbell, "Parking": Car, "Restaurant": UtensilsCrossed,
  "Pool": Waves, "Spa": Sparkles, "Bar": Wine, "Beach Access": Umbrella,
  "Room Service": Bell, "Concierge": ConciergeBell, "Kitchen": UtensilsCrossed,
  "Air Conditioning": Wind, "Heating": Flame, "TV": Tv, "Garden": TreePine,
  "BBQ": Flame, "Balcony": Mountain, "Washer": WashingMachine, "Dryer": Wind,
  "Elevator": Home, "Pet Friendly": Dog,
};

export default function PropertyDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [property, setProperty] = useState<any>(null);
  const [hostData, setHostData] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [qa, setQa] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/properties/${params.id}`)
        .then(r => {
          if (!r.ok) throw new Error("Not found");
          return r.json();
        })
        .then(data => {
          setProperty(data.property);
          setHostData(data.host);
          setAvailability(data.availability || []);
          setPhotos(data.photos || []);
          setQa(data.qa || []);
          setReviews(data.reviews || []);
        })
        .catch(() => setProperty(null))
        .finally(() => setIsLoading(false));
    }
  }, [params.id]);

  // Loading - matches DealDetail exactly
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col items-center justify-center min-h-[60vh]">
          <GapNightLogoLoader size={64} className="mb-4" />
          <p className="text-muted-foreground text-sm animate-pulse">Loading property...</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Not found - matches DealDetail exactly
  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navigation />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md mx-auto px-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Property not found</h1>
              <p className="text-muted-foreground">
                Sorry, we couldn't find the property you're looking for. It may have been removed.
              </p>
            </div>
            <Link href="/deals">
              <Button size="lg" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Deals
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const gapNights = availability.filter((a: any) => a.isGapNight && a.isAvailable);
  const ranges = groupConsecutiveGapNights(gapNights);
  const maxDiscount = gapNights.length > 0
    ? Math.max(...gapNights.map((gn: any) => gn.gapNightDiscount || 0))
    : 0;

  const selectedGapRange = selectedRange !== null ? ranges[selectedRange] : null;

  const handleBooking = () => {
    if (selectedGapRange) {
      setLocation(`/booking/property/${params.id}?checkIn=${selectedGapRange.startDate}&checkOut=${selectedGapRange.endDate}&nights=${selectedGapRange.nights}`);
    }
  };

  const handleAskQuestion = async () => {
    if (!user) {
      setLocation(`/login?redirect=/stays/${params.id}`);
      return;
    }
    if (questionText.trim().length < 5) {
      toast({ title: "Question too short", description: "Please write at least 5 characters.", variant: "destructive" });
      return;
    }
    setAskingQuestion(true);
    try {
      const res = await fetch(`/api/properties/${params.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: questionText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setQa(prev => [{ ...data.question, userName: user.name || "You" }, ...prev]);
      setQuestionText("");
      toast({ title: "Question submitted", description: "The host will be notified and can respond." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAskingQuestion(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Link - matches DealDetail */}
        <Link href="/deals" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to deals</span>
        </Link>

        {/* Photo Gallery - Airbnb style: 1 large + up to 4 small */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-4 sm:grid-rows-2 gap-2 max-h-[420px]">
            <div className="sm:col-span-2 sm:row-span-2">
              <img
                src={property.coverImage || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop"}
                alt={property.title}
                className="w-full h-full object-cover min-h-[280px] sm:min-h-full"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'; }}
              />
            </div>
            {(photos.length > 0 ? photos.slice(0, 4) : [
              { url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop" },
              { url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop" },
              { url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=300&fit=crop" },
              { url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=300&fit=crop" },
            ]).map((photo: any, i: number) => (
              <div key={i} className="hidden sm:block">
                <img
                  src={photo.url}
                  alt={`${property.title} ${i + 2}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop'; }}
                />
              </div>
            ))}
          </div>
          {/* Action buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button variant="secondary" size="icon" className="rounded-full bg-card/90 backdrop-blur shadow-lg" aria-label="Share">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full bg-card/90 backdrop-blur shadow-lg text-destructive" aria-label="Favorite">
              <Heart className="w-4 h-4" />
            </Button>
          </div>
          {maxDiscount > 0 && (
            <div className="absolute top-4 left-4">
              <Badge className="bg-amber-500 text-white font-bold shadow-lg px-3 py-1.5 text-sm">
                {maxDiscount}% OFF
              </Badge>
            </div>
          )}
        </div>

        {/* Title + Quick Stats + Booking sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {/* Left: Main info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & meta */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className="rounded-md border-foreground/20 text-xs font-semibold uppercase tracking-wider">
                  {property.propertyType === "entire_place" ? "Entire Place" : property.propertyType === "private_room" ? "Private Room" : "Stay"}
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{property.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {property.city}, {property.state}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-foreground">{Number(property.averageRating) > 0 ? property.averageRating : "New"}</span>
                  {Number(property.totalReviews) > 0 && <span>({property.totalReviews} reviews)</span>}
                </span>
              </div>

              {/* Quick stats bar - Airbnb style */}
              <div className="flex flex-wrap gap-3 mt-4 text-sm text-foreground">
                <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                  <Users className="w-4 h-4 text-muted-foreground" /> {property.maxGuests || 2} guests
                </span>
                <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                  <Bed className="w-4 h-4 text-muted-foreground" /> {property.bedrooms} bedroom{property.bedrooms !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                  <Bed className="w-4 h-4 text-muted-foreground" /> {property.beds || property.bedrooms} bed{(property.beds || property.bedrooms) !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                  <Waves className="w-4 h-4 text-muted-foreground" /> {property.bathrooms} bath{Number(property.bathrooms) !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <hr className="border-border/50" />

            {/* Highlights - Airbnb style feature callouts */}
            <div className="space-y-4">
              {property.selfCheckIn && (
                <div className="flex gap-4">
                  <KeyRound className="w-6 h-6 text-foreground shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Self check-in</h3>
                    <p className="text-xs text-muted-foreground">Check yourself in with the lockbox or smart lock.</p>
                  </div>
                </div>
              )}
              {property.petFriendly && (
                <div className="flex gap-4">
                  <Dog className="w-6 h-6 text-foreground shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Pets welcome</h3>
                    <p className="text-xs text-muted-foreground">Bring your furry friends along for the stay.</p>
                  </div>
                </div>
              )}
              {property.cancellationPolicy === "flexible" && (
                <div className="flex gap-4">
                  <Calendar className="w-6 h-6 text-foreground shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Free cancellation</h3>
                    <p className="text-xs text-muted-foreground">Cancel up to 24 hours before check-in for a full refund.</p>
                  </div>
                </div>
              )}
              {property.nearbyHighlight && (
                <div className="flex gap-4">
                  <NavIcon className="w-6 h-6 text-foreground shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Great location</h3>
                    <p className="text-xs text-muted-foreground">{property.nearbyHighlight}</p>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-border/50" />

            {/* About this space - expandable like Airbnb */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-3">About this space</h2>
              <div className={`text-muted-foreground text-sm leading-relaxed ${!showFullDesc && property.description?.length > 300 ? "line-clamp-4" : ""}`}>
                {property.description}
              </div>
              {property.description?.length > 300 && (
                <button
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="text-sm font-semibold text-foreground underline underline-offset-4 mt-2 flex items-center gap-1 hover:text-primary transition-colors"
                >
                  Show {showFullDesc ? "less" : "more"} <ChevronDown className={`w-4 h-4 transition-transform ${showFullDesc ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>

            <hr className="border-border/50" />

            {/* Amenities - Airbnb style 2-column grid */}
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">What this place offers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(showAllAmenities ? property.amenities : property.amenities.slice(0, 8)).map((amenity: string) => {
                    const Icon = AMENITY_ICONS[amenity] || Check;
                    return (
                      <div key={amenity} className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0">
                        <Icon className="w-5 h-5 text-foreground" />
                        <span className="text-sm text-foreground">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
                {property.amenities.length > 8 && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowAllAmenities(!showAllAmenities)}
                  >
                    {showAllAmenities ? "Show less" : `Show all ${property.amenities.length} amenities`}
                  </Button>
                )}
              </div>
            )}

            <hr className="border-border/50" />

            {/* Host info - Airbnb style */}
            {hostData && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  Hosted by {hostData.name}
                  {hostData.idVerified && (
                    <span title="ID Verified" className="inline-flex items-center gap-1 text-sm font-medium text-primary"><ShieldCheck className="w-5 h-5" /></span>
                  )}
                </h2>
                <Link href={`/host-profile/${hostData.id}`}>
                  <div className="flex items-start gap-4 hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xl shrink-0">
                      {hostData.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                        <span>{hostData.totalProperties} listing{hostData.totalProperties !== 1 ? "s" : ""}</span>
                        <span>{hostData.totalReviews || 0} review{(hostData.totalReviews || 0) !== 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Responds in ~{hostData.averageResponseTime < 60 ? `${hostData.averageResponseTime} min` : `${Math.round(hostData.averageResponseTime / 60)} hr`}</span>
                      </div>
                      {hostData.bio && <p className="text-sm text-muted-foreground">{hostData.bio}</p>}
                    </div>
                  </div>
                </Link>
              </div>
            )}

            <hr className="border-border/50" />

            {/* Things to know - Airbnb signature section */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Things to know</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* House rules */}
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-3">House rules</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><Clock className="w-4 h-4 shrink-0" /> Check-in: {property.checkInTime || "15:00"}</p>
                    <p className="flex items-center gap-2"><Clock className="w-4 h-4 shrink-0" /> Checkout: {property.checkOutTime || "10:00"}</p>
                    <p className="flex items-center gap-2"><Users className="w-4 h-4 shrink-0" /> {property.maxGuests || 2} guests maximum</p>
                    {property.houseRules && property.houseRules.split(/[,.\n]/).filter(Boolean).slice(0, 3).map((rule: string, i: number) => (
                      <p key={i} className="flex items-center gap-2"><Ban className="w-4 h-4 shrink-0" /> {rule.trim()}</p>
                    ))}
                  </div>
                </div>
                {/* Safety & property */}
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-3">Safety & property</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><Shield className="w-4 h-4 shrink-0" /> ID verification required</p>
                    <p className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> Security deposit may apply</p>
                    {property.selfCheckIn && <p className="flex items-center gap-2"><KeyRound className="w-4 h-4 shrink-0" /> Self check-in with lockbox</p>}
                  </div>
                </div>
                {/* Cancellation policy */}
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-3">Cancellation policy</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {property.cancellationPolicy === "flexible" ? (
                      <>
                        <p className="flex items-center gap-2"><Check className="w-4 h-4 shrink-0 text-primary" /> Free cancellation before 24h</p>
                        <p className="text-xs">Full refund if cancelled at least 24 hours before check-in.</p>
                      </>
                    ) : property.cancellationPolicy === "moderate" ? (
                      <>
                        <p className="flex items-center gap-2"><Info className="w-4 h-4 shrink-0" /> Moderate policy</p>
                        <p className="text-xs">Full refund if cancelled 5 days before check-in. 50% refund after that.</p>
                      </>
                    ) : (
                      <>
                        <p className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> Strict policy</p>
                        <p className="text-xs">50% refund if cancelled at least 7 days before check-in.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Sticky Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Availability Selector */}
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-lg">
                <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">Available Gap Nights</h3>
                  </div>
                </div>

                <div className="p-2 max-h-[280px] overflow-y-auto">
                  {ranges.length > 0 ? (
                    ranges.map((range, idx) => {
                      const isSelected = selectedRange === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedRange(idx)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg transition-all mb-1 last:mb-0 ${
                            isSelected
                              ? 'bg-primary/10 border-2 border-primary'
                              : 'bg-background border-2 border-transparent hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-foreground text-sm">
                                {formatShortDate(range.startDate)} – {formatShortDate(range.endDate)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {range.nights} night{range.nights > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-foreground text-sm">
                              {formatPrice(range.totalRate / 100, "AUD")}
                            </div>
                            <div className="text-xs text-primary font-medium">
                              {range.avgDiscount}% off
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No gap nights available
                    </div>
                  )}
                </div>

                {/* Price summary + book */}
                <div className="p-4 border-t border-border/50">
                  {selectedGapRange ? (
                    <>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-2xl font-bold text-foreground">
                          {formatPrice(selectedGapRange.totalRate / 100, "AUD")}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(selectedGapRange.originalTotal / 100, "AUD")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {formatPrice(selectedGapRange.avgRate / 100, "AUD")}/night · {selectedGapRange.nights} night{selectedGapRange.nights > 1 ? "s" : ""}
                      </p>
                      <Button className="w-full h-12 text-base font-semibold rounded-xl" onClick={handleBooking}>
                        Request Booking
                      </Button>
                    </>
                  ) : (
                    <Button disabled className="w-full h-12 text-base font-semibold rounded-xl">
                      Select Dates to Book
                    </Button>
                  )}
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    {property.cancellationPolicy === "flexible" ? "Free cancellation" : property.cancellationPolicy === "moderate" ? "Moderate cancellation" : "Strict cancellation"} · You won't be charged yet
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-border/50 mb-8" />

        {/* Q&A + Reviews - Full width below */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Q&A Section */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Questions & Answers
            </h2>

            {/* Host FAQs */}
            {(() => {
              const hostFaqs = qa.filter((q: any) => q.isHostFaq && q.isPublic);
              const guestQs = qa.filter((q: any) => !q.isHostFaq && q.isPublic);
              return (
                <>
                  {hostFaqs.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">Frequently Asked</h3>
                      <div className="space-y-2">
                        {hostFaqs.map((q: any) => (
                          <div key={q.id} className="bg-card rounded-xl border border-border/50 p-4">
                            <p className="font-medium text-sm text-foreground">Q: {q.question}</p>
                            <p className="text-sm text-muted-foreground mt-1.5">A: {q.answer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ask a question form */}
                  <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                    <div className="p-4 border-b border-border/50">
                      <div className="flex gap-2">
                        <Input
                          placeholder={user ? "Ask the host a question..." : "Sign in to ask a question"}
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          disabled={!user || askingQuestion}
                          className="flex-1"
                        />
                        <Button
                          size="icon"
                          onClick={handleAskQuestion}
                          disabled={!questionText.trim() || askingQuestion}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      {!user && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <Link href={`/login?redirect=/stays/${params.id}`} className="text-primary hover:underline">Sign in</Link> to ask a question
                        </p>
                      )}
                    </div>
                    {guestQs.length > 0 ? (
                      <div className="divide-y divide-border/50">
                        {guestQs.map((q: any) => (
                          <div key={q.id} className="p-4">
                            <p className="font-medium text-sm text-foreground">Q: {q.question}</p>
                            {q.answer ? (
                              <p className="text-sm text-muted-foreground mt-2">A: {q.answer}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-2 italic">Awaiting host response</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {hostFaqs.length > 0 ? "Have another question? Ask above!" : "No questions yet. Be the first to ask!"}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Reviews */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Reviews {reviews.length > 0 ? `(${reviews.length})` : ""}
            </h2>
            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((r: any) => (
                  <div key={r.id} className="bg-card rounded-xl p-4 border border-border/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm">
                        {(r.userName || "G").charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">{r.userName || "Guest"}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(r.createdAt).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex ml-auto">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.comment}</p>
                    {r.hostResponse && (
                      <div className="mt-3 pl-4 border-l-2 border-primary/30">
                        <p className="text-xs font-medium text-primary">Host response:</p>
                        <p className="text-sm text-muted-foreground">{r.hostResponse}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border/50 p-8 text-center">
                <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No reviews yet. Be the first to stay here!</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
