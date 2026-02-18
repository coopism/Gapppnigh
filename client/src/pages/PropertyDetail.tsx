import { useState, useEffect, useRef } from "react";
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
  Sparkles, Wine, Umbrella, Bell, ConciergeBell, Heart, Shield, Clock, HelpCircle,
  MessageCircle, ArrowLeft, Calendar, Check, Share2, Send, ChevronDown,
  Navigation as NavIcon, KeyRound, Dog, Award, Zap, Flame, Tv, Wind,
  WashingMachine, Mountain, TreePine, Home, Ban, Cigarette, PartyPopper,
  AlertTriangle, Info, CreditCard, ShieldCheck,
} from "lucide-react";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

function PropertyMap({ latitude, longitude, title }: { latitude: number; longitude: number; title: string }) {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = L.map(mapContainer.current, {
      attributionControl: false,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    }).setView([latitude, longitude], 14);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    const icon = L.divIcon({
      className: "gn-prop-marker-wrap",
      html: `
        <svg width="44" height="52" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 10px rgba(0,0,0,0.22));">
          <path d="M22 0C10.954 0 2 8.954 2 20c0 14 20 32 20 32s20-18 20-32C42 8.954 33.046 0 22 0z" fill="#0ea5a5"/>
          <circle cx="22" cy="20" r="8" fill="white"/>
        </svg>
      `,
      iconSize: [44, 52],
      iconAnchor: [22, 52],
    });

    L.marker([latitude, longitude], { icon }).addTo(map);

    return () => { map.remove(); };
  }, [latitude, longitude]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-[280px] rounded-xl overflow-hidden border border-border/50"
    />
  );
}

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

function MessageHostButton({ hostId, hostName, propertyId, propertyTitle }: { hostId: string; hostName: string; propertyId: string; propertyTitle: string }) {
  const { user } = useAuthStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const handleOpen = () => {
    if (!user) {
      setLocation(`/login?redirect=/stays/${propertyId}`);
      return;
    }
    setOpen(true);
  };

  const send = async () => {
    if (!msg.trim() || sending) return;
    if (!user) {
      setLocation(`/login?redirect=/stays/${propertyId}`);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ hostId, propertyId, subject: propertyTitle, message: msg.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Message sent!", description: `Your message to ${hostName} has been sent.` });
        setOpen(false);
        setMsg("");
        setLocation(`/messages/${data.conversationId}`);
      } else {
        toast({ title: "Error", description: data.error || "Failed to send", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to connect", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button variant="outline" className="mt-4 gap-2" onClick={handleOpen}>
        <MessageCircle className="w-4 h-4" /> Message {hostName}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Message {hostName}</h3>
            <p className="text-sm text-muted-foreground mb-4">About: {propertyTitle}</p>
            <textarea
              className="w-full border border-border rounded-xl p-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={4}
              placeholder="Hi! I have a question about your property..."
              value={msg}
              onChange={e => setMsg(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={send} disabled={!msg.trim() || sending} className="gap-1.5">
                <Send className="w-3.5 h-3.5" /> {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
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

function generateFixedNightWindows(gapNights: any[], nightCount: number): GapNightRange[] {
  if (gapNights.length === 0) return [];
  const sorted = [...gapNights].sort((a, b) => a.date.localeCompare(b.date));
  // Group into consecutive runs first
  const runs: any[][] = [];
  let current: any[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date + "T00:00:00");
    const curr = new Date(sorted[i].date + "T00:00:00");
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current.push(sorted[i]);
    } else {
      runs.push(current);
      current = [sorted[i]];
    }
  }
  runs.push(current);
  // Generate sliding windows of nightCount from each run
  const windows: GapNightRange[] = [];
  for (const run of runs) {
    if (run.length < nightCount) continue;
    for (let i = 0; i <= run.length - nightCount; i++) {
      windows.push(buildRange(run.slice(i, i + nightCount)));
    }
  }
  return windows;
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
  const [nightFilter, setNightFilter] = useState<number>(1);
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
          // Track recently viewed
          try {
            const key = "gn_recently_viewed";
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            const entry = {
              id: data.property.id,
              title: data.property.title,
              city: data.property.city,
              state: data.property.state,
              coverImage: data.property.coverImage,
              baseNightlyRate: data.property.baseNightlyRate,
              propertyType: data.property.propertyType,
              viewedAt: Date.now(),
            };
            const filtered = existing.filter((e: any) => e.id !== entry.id);
            filtered.unshift(entry);
            localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)));
          } catch {}
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
  const ranges = generateFixedNightWindows(gapNights, nightFilter);
  const maxDiscount = gapNights.length > 0
    ? Math.max(...gapNights.map((gn: any) => gn.gapNightDiscount || 0))
    : 0;

  const selectedGapRange = selectedRange !== null ? ranges[selectedRange] : null;

  const handleBooking = () => {
    if (selectedGapRange) {
      setLocation(`/booking/property/${params.id}?checkIn=${selectedGapRange.startDate}&checkOut=${selectedGapRange.endDate}&nights=${selectedGapRange.nights}`);
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
            <Button variant="secondary" size="icon" className="rounded-full bg-card/90 backdrop-blur shadow-lg" aria-label="Share"
              onClick={async () => {
                const url = window.location.href;
                const title = property?.title || "Check out this property on GapNight";
                if (navigator.share) {
                  try { await navigator.share({ title, url }); } catch {}
                } else {
                  try { await navigator.clipboard.writeText(url); alert("Link copied to clipboard!"); } catch {}
                }
              }}>
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
                <MessageHostButton hostId={hostData.id} hostName={hostData.name} propertyId={property.id} propertyTitle={property.title} />
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

            {/* Location */}
            {property.latitude && property.longitude && (
              <>
                <hr className="border-border/50" />
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">Where you'll be</h2>
                  <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {property.city}{property.state ? `, ${property.state}` : ""}
                  </p>
                  <PropertyMap
                    latitude={parseFloat(property.latitude)}
                    longitude={parseFloat(property.longitude)}
                    title={property.title}
                  />
                </div>
              </>
            )}
          </div>

          {/* Right Sidebar - Sticky Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Availability Selector */}
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-lg">
                <div className="px-4 py-3 border-b border-border/50 bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">Available Gap Nights</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">Nights:</span>
                    {[1, 2, 3].map(n => (
                      <button
                        key={n}
                        onClick={() => { setNightFilter(n); setSelectedRange(null); }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          nightFilter === n
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
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
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <p className="text-xs text-emerald-600 font-medium">Free cancellation within 24 hours of booking</p>
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-1">You won't be charged yet</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-border/50 mb-8" />

        {/* Q&A + Reviews - Full width below */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* FAQ Section - Host-authored */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Frequently Asked Questions
            </h2>

            {qa.filter((q: any) => q.isPublic && q.answer).length > 0 ? (
              <div className="space-y-2">
                {qa.filter((q: any) => q.isPublic && q.answer).map((q: any) => (
                  <div key={q.id} className="bg-card rounded-xl border border-border/50 p-4">
                    <p className="font-medium text-sm text-foreground">{q.question}</p>
                    <p className="text-sm text-muted-foreground mt-1.5">{q.answer}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border/50 p-6 text-center">
                <p className="text-sm text-muted-foreground">No FAQs added yet.</p>
              </div>
            )}

            {hostData && (
              <div className="mt-4 bg-muted/50 rounded-xl p-4 flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">Still have questions?</p>
                  <p className="text-xs text-muted-foreground">Send {hostData.name} a private message.</p>
                </div>
                <MessageHostButton hostId={hostData.id} hostName={hostData.name} propertyId={property.id} propertyTitle={property.title} />
              </div>
            )}
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
