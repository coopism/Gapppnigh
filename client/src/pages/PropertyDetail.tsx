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
  MessageCircle, ArrowLeft, Calendar, Check, Share2, Send,
  Navigation as NavIcon,
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
  // End date is the day AFTER the last night
  const lastDate = new Date(dates[dates.length - 1].date + "T00:00:00");
  lastDate.setDate(lastDate.getDate() + 1);
  const endDate = lastDate.toISOString().split("T")[0];
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
  "Air Conditioning": Sparkles, "TV": Sparkles, "Garden": Sparkles,
  "BBQ": UtensilsCrossed, "Balcony": Sparkles,
};

export default function PropertyDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [property, setProperty] = useState<any>(null);
  const [hostData, setHostData] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [qa, setQa] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [askingQuestion, setAskingQuestion] = useState(false);

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

        {/* Main Content - Two Column Layout matching DealDetail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Left Column - Image */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden">
              <img
                src={property.coverImage || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop"}
                alt={property.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop';
                }}
              />
            </div>
            {/* Action buttons on image - matches DealDetail */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button variant="secondary" size="icon" className="rounded-full bg-card/90 backdrop-blur shadow-lg" aria-label="Share">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="icon" className="rounded-full bg-card/90 backdrop-blur shadow-lg text-destructive" aria-label="Favorite">
                <Heart className="w-4 h-4" />
              </Button>
            </div>
            {/* Discount badge */}
            {maxDiscount > 0 && (
              <div className="absolute top-4 left-4">
                <Badge className="bg-amber-500 text-white font-bold shadow-lg px-3 py-1.5 text-sm">
                  {maxDiscount}% OFF
                </Badge>
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div>
            {/* Category Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="rounded-md border-foreground/20 text-xs font-semibold uppercase tracking-wider">
                {property.propertyType === "entire_place" ? "Entire Place" : property.propertyType === "private_room" ? "Private Room" : "Stay"}
              </Badge>
              {property.host?.isSuperhost && (
                <Badge variant="outline" className="rounded-md border-foreground/20 text-xs font-semibold uppercase tracking-wider">Superhost</Badge>
              )}
              {property.petFriendly && (
                <Badge variant="outline" className="rounded-md border-foreground/20 text-xs font-semibold uppercase tracking-wider">Pet Friendly</Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {property.title}
            </h1>

            {/* Location + Rating - matches DealDetail */}
            <div className="flex items-center gap-4 text-muted-foreground mb-6">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{property.city}, {property.state}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-foreground">{Number(property.averageRating) > 0 ? property.averageRating : "New"}</span>
                {Number(property.totalReviews) > 0 && (
                  <span className="text-muted-foreground">({property.totalReviews} reviews)</span>
                )}
              </div>
            </div>

            {/* Availability Selector - matches DealDetail's gap night selector */}
            <div className="bg-card rounded-xl border border-border/50 mb-6 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">Available Gap Nights</h3>
                </div>
              </div>
              
              <div className="p-2">
                {ranges.length > 0 ? (
                  ranges.map((range, idx) => {
                    const isSelected = selectedRange === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedRange(idx)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all mb-1 last:mb-0 hover-elevate ${
                          isSelected 
                            ? 'bg-primary/10 border-2 border-primary' 
                            : 'bg-background border-2 border-transparent'
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
                              {formatShortDate(range.startDate)} - {formatShortDate(range.endDate)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {range.nights} night{range.nights > 1 ? 's' : ''} · {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
                              <span className="mx-1">·</span>
                              <Users className="w-3 h-3" />
                              <span>{property.maxGuests || 2}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-xs line-through text-muted-foreground">
                              {formatPrice(range.originalTotal / 100, "AUD")}
                            </span>
                            <span className="font-bold text-primary">
                              {formatPrice(range.totalRate / 100, "AUD")}
                            </span>
                          </div>
                          <div className="text-xs text-primary font-medium">
                            {range.avgDiscount}% off · {formatPrice(range.avgRate / 100, "AUD")}/night
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No gap nights currently available
                  </div>
                )}
              </div>
            </div>

            {/* Book Now Section - matches DealDetail */}
            <div className="bg-card rounded-xl p-5 border border-border/50">
              {selectedGapRange ? (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        {formatShortDate(selectedGapRange.startDate)} - {formatShortDate(selectedGapRange.endDate)} · {selectedGapRange.nights} night{selectedGapRange.nights > 1 ? 's' : ''}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-foreground">
                          {formatPrice(selectedGapRange.totalRate / 100, "AUD")}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(selectedGapRange.originalTotal / 100, "AUD")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatPrice(selectedGapRange.avgRate / 100, "AUD")}/night
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20">Selected</Badge>
                  </div>
                  <Button className="w-full h-12 text-base font-semibold rounded-xl" onClick={handleBooking}>
                    Request Booking
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-4">
                    Select available gap nights above to continue
                  </p>
                  <Button disabled className="w-full h-12 text-base font-semibold rounded-xl">
                    Select Dates to Book
                  </Button>
                </div>
              )}
              <div className="text-center text-sm text-muted-foreground mt-3">
                {property.cancellationPolicy === "flexible" ? "Free cancellation" : property.cancellationPolicy === "moderate" ? "Moderate cancellation policy" : "Strict cancellation policy"}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - matches DealDetail layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* About this place */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">About this place</h2>
              <div className="bg-card rounded-xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-foreground">{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''} · {property.bathrooms} bath</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                    <Users className="w-4 h-4" />
                    <span>Sleeps {property.maxGuests || 2}</span>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {property.description}
                </p>
                
                {property.nearbyHighlight && (
                  <div className="flex items-center gap-2 text-primary text-sm mb-4 p-3 bg-primary/10 rounded-lg">
                    <NavIcon className="w-4 h-4 shrink-0" />
                    <span className="font-medium">{property.nearbyHighlight}</span>
                  </div>
                )}

                {property.amenities && property.amenities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Amenities</h4>
                    <div className="flex flex-wrap gap-3">
                      {property.amenities.map((amenity: string) => {
                        const Icon = AMENITY_ICONS[amenity] || Check;
                        return (
                          <div key={amenity} className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-lg">
                            <Icon className="w-4 h-4" />
                            <span>{amenity}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Host info */}
            {hostData && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Your host</h2>
                <Link href={`/host-profile/${hostData.id}`}>
                  <div className="bg-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {hostData.name?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{hostData.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {hostData.isSuperhost && <Badge variant="secondary" className="text-[10px]">Superhost</Badge>}
                          <span>{hostData.totalProperties} listing{hostData.totalProperties !== 1 ? "s" : ""}</span>
                          <span>·</span>
                          <span>Responds in ~{hostData.averageResponseTime < 60 ? `${hostData.averageResponseTime}min` : `${Math.round(hostData.averageResponseTime / 60)}hr`}</span>
                        </div>
                      </div>
                    </div>
                    {hostData.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{hostData.bio}</p>
                    )}
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Right column - Q&A + Reviews */}
          <div className="space-y-6">
            {/* Q&A Section */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Questions & Answers
              </h2>
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                {/* Ask a question */}
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
                {qa.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {qa.filter((q: any) => q.isPublic).map((q: any) => (
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
                    No questions yet. Be the first to ask!
                  </div>
                )}
              </div>
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">
                  Reviews ({reviews.length})
                </h2>
                <div className="space-y-3">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="bg-card rounded-xl p-4 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{r.userName || "Guest"}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
                        </span>
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
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
