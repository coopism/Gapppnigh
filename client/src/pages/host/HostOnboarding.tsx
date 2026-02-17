import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { GapNightLogoLoader } from "@/components/GapNightLogo";
import {
  Home, Building2, DoorOpen, Sparkles, ChevronRight, ChevronLeft,
  Camera, MapPin, DollarSign, CalendarCheck, Percent, Eye, Upload,
  X, Check, Loader2, Wifi, Car, Waves, Flame, Wind, Tv, TreePine,
  Dumbbell, ArrowUpDown, Bed, Bath, Users, Link2, Search, CalendarDays, ToggleRight,
} from "lucide-react";

// ========================================
// CONSTANTS
// ========================================

const SERVICE_FEE_PERCENT = 7;

const PROPERTY_TYPES = [
  { value: "entire_place", label: "Entire place", desc: "Guests have the whole place to themselves", icon: Home },
  { value: "private_room", label: "Private room", desc: "Guests have their own room but share some spaces", icon: DoorOpen },
  { value: "shared_room", label: "Shared room", desc: "Guests share a room or common area", icon: Building2 },
  { value: "unique_stay", label: "Unique stay", desc: "Treehouse, tiny home, boat, etc.", icon: Sparkles },
];

const CATEGORIES = [
  "Apartment", "House", "Cabin", "Villa", "Cottage", "Loft", "Studio", "Townhouse",
];

const AMENITIES = [
  { name: "WiFi", icon: Wifi },
  { name: "Parking", icon: Car },
  { name: "Pool", icon: Waves },
  { name: "Kitchen", icon: Flame },
  { name: "Air Conditioning", icon: Wind },
  { name: "Heating", icon: Flame },
  { name: "TV", icon: Tv },
  { name: "Washer", icon: Wind },
  { name: "Dryer", icon: Wind },
  { name: "Garden", icon: TreePine },
  { name: "Gym", icon: Dumbbell },
  { name: "Beach Access", icon: Waves },
  { name: "BBQ", icon: Flame },
  { name: "Elevator", icon: ArrowUpDown },
  { name: "Balcony", icon: Home },
];

const TOTAL_STEPS = 10;

function hostEarnings(price: number): string {
  const earnings = price * (1 - SERVICE_FEE_PERCENT / 100);
  return `$${earnings.toFixed(0)}`;
}

// ========================================
// PROGRESS BAR (bottom fixed)
// ========================================

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50">
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Step {step + 1} of {total}</span>
        <div className="flex gap-2" id="onboarding-nav" />
      </div>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function HostOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [host, setHost] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [publishing, setPublishing] = useState(false);

  // Form data
  const [propertyType, setPropertyType] = useState("entire_place");
  const [category, setCategory] = useState("Apartment");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Address
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postcode, setPostcode] = useState("");

  // Basics
  const [maxGuests, setMaxGuests] = useState(2);
  const [bedrooms, setBedrooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [bathrooms, setBathrooms] = useState("1");
  const [amenities, setAmenities] = useState<string[]>(["WiFi"]);

  // Pricing
  const [weekdayPrice, setWeekdayPrice] = useState(150);
  const [weekendPrice, setWeekendPrice] = useState(180);
  const [holidayPrice, setHolidayPrice] = useState(220);

  // Booking settings
  const [bookingMode, setBookingMode] = useState<"approve" | "instant">("approve");

  // Airbnb calendar sync + auto-listing
  const [icalUrl, setIcalUrl] = useState("");
  const [autoList, setAutoList] = useState(true);

  // Address autocomplete
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const addressDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Gap night discounts
  const [gap3, setGap3] = useState(35);
  const [gap7, setGap7] = useState(30);
  const [gap31, setGap31] = useState(25);
  const [gapOver31, setGapOver31] = useState(20);

  // Auth check
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/host/me", { credentials: "include" });
        if (!res.ok) { setLocation("/host/login"); return; }
        const data = await res.json();
        setHost(data.host);
      } catch { setLocation("/host/login"); }
      finally { setAuthLoading(false); }
    })();
  }, [setLocation]);

  // Navigation
  // Address autocomplete search
  const searchAddress = (query: string) => {
    setAddressQuery(query);
    setAddress(query);
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    if (query.length < 4) { setAddressSuggestions([]); return; }
    addressDebounceRef.current = setTimeout(async () => {
      setAddressSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=au&format=json&addressdetails=1&limit=5`,
          { headers: { "Accept-Language": "en" } }
        );
        if (res.ok) {
          const data = await res.json();
          setAddressSuggestions(data);
        }
      } catch {}
      finally { setAddressSearching(false); }
    }, 300);
  };

  const selectAddress = (item: any) => {
    const addr = item.address || {};
    const road = [addr.house_number, addr.road].filter(Boolean).join(" ");
    setAddress(road || item.display_name.split(",")[0]);
    setAddressQuery(road || item.display_name.split(",")[0]);
    setCity(addr.city || addr.town || addr.suburb || addr.village || "");
    setStateName(addr.state || "");
    setPostcode(addr.postcode || "");
    setAddressSuggestions([]);
  };

  const canGoNext = (): boolean => {
    switch (step) {
      case 0: return !!propertyType;
      case 1: return title.trim().length >= 5;
      case 2: return description.trim().length >= 20;
      case 3: return photos.length >= 1;
      case 4: return address.trim().length > 0 && city.trim().length > 0;
      case 5: return weekdayPrice > 0;
      case 6: return true;
      case 7: return true; // iCal is optional
      case 8: return true;
      case 9: return true;
      default: return false;
    }
  };

  const next = () => { if (canGoNext() && step < TOTAL_STEPS - 1) setStep(s => s + 1); };
  const back = () => { if (step > 0) setStep(s => s - 1); };

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append("photos", f));
      const res = await fetch("/api/host/onboarding/photos", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setPhotos(prev => [...prev, ...(data.urls || [])]);
      } else {
        toast({ title: "Upload failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  // Publish
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch("/api/host/onboarding/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          propertyType,
          category: category.toLowerCase(),
          title,
          description,
          photos,
          address,
          city,
          state: stateName,
          postcode,
          maxGuests,
          bedrooms,
          beds,
          bathrooms,
          amenities,
          weekdayPrice: Math.round(weekdayPrice * 100),
          weekendPrice: Math.round(weekendPrice * 100),
          holidayPrice: Math.round(holidayPrice * 100),
          cleaningFee: 0,
          instantBook: bookingMode === "instant",
          gapDiscounts: { gap3, gap7, gap31, gapOver31 },
          icalUrl: icalUrl.trim() || undefined,
          autoList,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Property listed!", description: "Your property has been submitted for review." });
        setLocation("/host/dashboard");
      } else {
        toast({ title: "Error", description: data.error || "Failed to publish", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to connect", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <GapNightLogoLoader size={48} className="mb-3" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  // ========================================
  // STEP RENDERERS
  // ========================================

  const renderStep = () => {
    switch (step) {
      // STEP 0: Property Type
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold font-display">What type of place will guests have?</h1>
              <p className="text-muted-foreground mt-2">Choose the option that best describes your property.</p>
            </div>
            <div className="grid gap-3">
              {PROPERTY_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setPropertyType(t.value)}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
                    propertyType === t.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <t.icon className={`w-8 h-8 shrink-0 ${propertyType === t.value ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-semibold">{t.label}</p>
                    <p className="text-sm text-muted-foreground">{t.desc}</p>
                  </div>
                  {propertyType === t.value && <Check className="w-5 h-5 text-primary ml-auto shrink-0" />}
                </button>
              ))}
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      category === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      // STEP 1: Title
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold font-display">Give your place a name</h1>
              <p className="text-muted-foreground mt-2">Short titles work best. Have fun with it — you can always change it later.</p>
            </div>
            <div>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Sunny Beachside Apartment"
                className="text-lg h-14"
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground mt-2">{title.length}/80</p>
            </div>
          </div>
        );

      // STEP 2: Description
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold font-display">Describe your place</h1>
              <p className="text-muted-foreground mt-2">Share what makes your space special and what guests can expect.</p>
            </div>
            <div>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Tell guests about your space, the neighbourhood, and what makes it unique..."
                rows={8}
                className="text-base"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground mt-2">{description.length}/2000</p>
            </div>
          </div>
        );

      // STEP 3: Photos
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold font-display">Add some photos</h1>
              <p className="text-muted-foreground mt-2">You'll need at least 1 photo to get started. You can add more later.</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((url, i) => (
                  <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Cover</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full h-32 border-dashed border-2 flex flex-col gap-2"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="w-6 h-6 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-6 h-6" /> Click to upload photos</>
              )}
            </Button>
          </div>
        );

      // STEP 4: Address + Basics (with autocomplete)
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold font-display">Where's your place located?</h1>
              <p className="text-muted-foreground mt-2">Your address is only shared with guests after they book.</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <label className="text-sm font-medium">Street address</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={addressQuery || address}
                    onChange={e => searchAddress(e.target.value)}
                    placeholder="Start typing your address..."
                    className="pl-9"
                  />
                  {addressSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                {addressSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                    {addressSuggestions.map((item: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => selectAddress(item)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border/30 last:border-0 flex items-start gap-2"
                      >
                        <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{item.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Melbourne" />
                </div>
                <div>
                  <label className="text-sm font-medium">State</label>
                  <Input value={stateName} onChange={e => setStateName(e.target.value)} placeholder="VIC" />
                </div>
              </div>
              <div className="w-1/2">
                <label className="text-sm font-medium">Postcode</label>
                <Input value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="3000" />
              </div>
            </div>

            <hr className="border-border/50" />

            <div>
              <h2 className="text-xl font-bold mb-4">Property basics</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Guests", value: maxGuests, set: setMaxGuests, icon: Users },
                  { label: "Bedrooms", value: bedrooms, set: setBedrooms, icon: Bed },
                  { label: "Beds", value: beds, set: setBeds, icon: Bed },
                  { label: "Bathrooms", value: Number(bathrooms), set: (v: number) => setBathrooms(String(v)), icon: Bath },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between bg-card border border-border/50 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => item.set(Math.max(1, item.value - 1))} className="w-8 h-8 rounded-full border flex items-center justify-center text-lg hover:bg-muted">−</button>
                      <span className="w-6 text-center font-semibold text-sm">{item.value}</span>
                      <button onClick={() => item.set(item.value + 1)} className="w-8 h-8 rounded-full border flex items-center justify-center text-lg hover:bg-muted">+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map(a => {
                  const active = amenities.includes(a.name);
                  return (
                    <button
                      key={a.name}
                      onClick={() => setAmenities(prev => active ? prev.filter(x => x !== a.name) : [...prev, a.name])}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-all ${
                        active ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-foreground/30"
                      }`}
                    >
                      <a.icon className="w-3.5 h-3.5" />
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      // STEP 5: Pricing (typed inputs, no cleaning fee)
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold font-display">Set your price</h1>
              <p className="text-muted-foreground mt-2">You can adjust these anytime. We recommend competitive pricing to attract your first guests.</p>
            </div>

            <div className="space-y-4">
              {[
                { label: "Weekday price", sublabel: "Mon – Thu", value: weekdayPrice, set: setWeekdayPrice },
                { label: "Weekend price", sublabel: "Fri – Sun", value: weekendPrice, set: setWeekendPrice },
                { label: "Public holiday price", sublabel: "Auto-detected", value: holidayPrice, set: setHolidayPrice },
              ].map(p => (
                <div key={p.label} className="bg-card border border-border/50 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.sublabel}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={p.value || ""}
                        onChange={e => p.set(Math.max(0, Number(e.target.value)))}
                        className="w-28 text-right text-2xl font-bold h-12"
                        min={0}
                      />
                      <span className="text-sm text-muted-foreground">/night</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Guest pays <strong>${p.value}</strong> · You earn <strong>{hostEarnings(p.value)}</strong>
                    <span className="text-muted-foreground/60"> ({SERVICE_FEE_PERCENT}% GapNight service fee)</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      // STEP 6: Booking settings
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold font-display">Pick your booking settings</h1>
              <p className="text-muted-foreground mt-2">You can change this at any time.</p>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => setBookingMode("approve")}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  bookingMode === "approve" ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"
                }`}
              >
                <div className="flex items-start gap-4">
                  <CalendarCheck className={`w-8 h-8 shrink-0 mt-0.5 ${bookingMode === "approve" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">Approve your first 5 bookings</p>
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Recommended</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start by reviewing reservation requests, then switch to Instant Book so guests can book automatically.
                    </p>
                  </div>
                  {bookingMode === "approve" && <Check className="w-5 h-5 text-primary shrink-0 mt-1" />}
                </div>
              </button>

              <button
                onClick={() => setBookingMode("instant")}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  bookingMode === "instant" ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"
                }`}
              >
                <div className="flex items-start gap-4">
                  <Sparkles className={`w-8 h-8 shrink-0 mt-0.5 ${bookingMode === "instant" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className="font-semibold text-lg">Use Instant Book</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Let guests book automatically. Listings with Instant Book tend to get more bookings.
                    </p>
                  </div>
                  {bookingMode === "instant" && <Check className="w-5 h-5 text-primary shrink-0 mt-1" />}
                </div>
              </button>
            </div>
          </div>
        );

      // STEP 7: Airbnb Calendar Sync + Auto-listing
      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold font-display">Sync your Airbnb calendar</h1>
              <p className="text-muted-foreground mt-2">
                Connect your Airbnb calendar so we can automatically detect gap nights and list them for you. This step is optional — you can always add it later.
              </p>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <p className="font-semibold">Airbnb iCal link</p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">How to find your iCal link:</strong> In Airbnb → Calendar → Availability settings → Export calendar → Copy the link
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Paste your Airbnb calendar URL (.ics)</label>
                <Input
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  value={icalUrl}
                  onChange={e => setIcalUrl(e.target.value)}
                  className="h-11 font-mono text-xs"
                />
              </div>
              {icalUrl && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  <span>Calendar link added — we'll sync it after publishing.</span>
                </div>
              )}
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ToggleRight className={`w-6 h-6 ${autoList ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-semibold">Auto-list gap nights</p>
                    <p className="text-xs text-muted-foreground">Automatically publish gap nights as discounted deals when detected in your calendar.</p>
                  </div>
                </div>
                <button
                  onClick={() => setAutoList(!autoList)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${autoList ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${autoList ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Don't have an Airbnb listing yet? No worries — skip this step and add it later from your dashboard.
            </p>
          </div>
        );

      // STEP 8: Gap night discounts
      case 8:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold font-display">Set gap night discounts</h1>
              <p className="text-muted-foreground mt-2">
                Gap nights are empty nights between bookings. Offering a discount helps fill them and earn extra income. We auto-adjust the discount based on how soon the gap night is.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { label: "Gap nights in 3 days or less", sublabel: "Last-minute — highest discount", value: gap3, set: setGap3, color: "text-red-500" },
                { label: "Gap nights within 7 days", sublabel: "Short notice", value: gap7, set: setGap7, color: "text-orange-500" },
                { label: "Gap nights within 31 days", sublabel: "Some planning time", value: gap31, set: setGap31, color: "text-amber-500" },
                { label: "Gap nights after 31 days", sublabel: "Plenty of notice", value: gapOver31, set: setGapOver31, color: "text-green-500" },
              ].map(d => (
                <div key={d.label} className="bg-card border border-border/50 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{d.label}</p>
                      <p className="text-xs text-muted-foreground">{d.sublabel}</p>
                    </div>
                    <span className={`text-2xl font-bold ${d.color}`}>{d.value}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={d.value}
                    onChange={e => d.set(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ${weekdayPrice} night → Guest pays <strong>${Math.round(weekdayPrice * (1 - d.value / 100))}</strong> · You earn <strong>{hostEarnings(Math.round(weekdayPrice * (1 - d.value / 100)))}</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      // STEP 9: Review & Publish
      case 9:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold font-display">Review your listing</h1>
              <p className="text-muted-foreground mt-2">Make sure everything looks good. You can edit anything after publishing.</p>
            </div>

            <div className="space-y-4">
              {/* Preview card */}
              {photos.length > 0 && (
                <div className="rounded-2xl overflow-hidden border border-border/50">
                  <img src={photos[0]} alt="" className="w-full h-48 object-cover" />
                </div>
              )}

              <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
                <h2 className="text-xl font-bold">{title || "Untitled"}</h2>
                <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>

                <hr className="border-border/50" />

                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{PROPERTY_TYPES.find(t => t.value === propertyType)?.label}</span></div>
                  <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{category}</span></div>
                  <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{city}{stateName ? `, ${stateName}` : ""}</span></div>
                  <div><span className="text-muted-foreground">Guests:</span> <span className="font-medium">{maxGuests}</span></div>
                  <div><span className="text-muted-foreground">Bedrooms:</span> <span className="font-medium">{bedrooms}</span></div>
                  <div><span className="text-muted-foreground">Beds:</span> <span className="font-medium">{beds}</span></div>
                  <div><span className="text-muted-foreground">Photos:</span> <span className="font-medium">{photos.length}</span></div>
                  <div><span className="text-muted-foreground">Booking:</span> <span className="font-medium">{bookingMode === "instant" ? "Instant Book" : "Manual approval"}</span></div>
                </div>

                <hr className="border-border/50" />

                <div>
                  <p className="text-sm font-semibold mb-1">Pricing</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Weekday</p>
                      <p className="font-bold">${weekdayPrice}</p>
                      <p className="text-[10px] text-muted-foreground">earn {hostEarnings(weekdayPrice)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Weekend</p>
                      <p className="font-bold">${weekendPrice}</p>
                      <p className="text-[10px] text-muted-foreground">earn {hostEarnings(weekendPrice)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Holiday</p>
                      <p className="font-bold">${holidayPrice}</p>
                      <p className="text-[10px] text-muted-foreground">earn {hostEarnings(holidayPrice)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-1">Gap night discounts</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">≤ 3 days:</span><span className="font-medium text-red-500">{gap3}% off</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">≤ 7 days:</span><span className="font-medium text-orange-500">{gap7}% off</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">≤ 31 days:</span><span className="font-medium text-amber-500">{gap31}% off</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">&gt; 31 days:</span><span className="font-medium text-green-500">{gapOver31}% off</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => step === 0 ? setLocation("/host/login") : back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" /> {step === 0 ? "Back" : "Back"}
          </button>
          <span className="text-sm font-medium text-muted-foreground">
            {host?.name ? `Hi, ${host.name.split(" ")[0]}` : ""}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {renderStep()}
      </div>

      {/* Bottom bar with progress + nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50">
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
        </div>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Step {step + 1} of {TOTAL_STEPS}</span>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={back}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <Button size="sm" onClick={next} disabled={!canGoNext()} className="gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={handlePublish} disabled={publishing} className="gap-1">
                {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</> : <><Eye className="w-4 h-4" /> Publish listing</>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
