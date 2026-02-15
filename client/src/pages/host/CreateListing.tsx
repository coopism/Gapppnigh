import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Check, ChevronLeft, ChevronRight, Cloud, CloudOff, Loader2, Plus, X,
  ExternalLink, Clipboard, Home, MapPin, Users, Bed, Bath, Camera,
  Calendar, CalendarDays, Clock, DollarSign, Shield, Sparkles, RefreshCw,
  AlertTriangle, CheckCircle2, Search, Wifi, Car, Waves, Flame,
  Wind, Tv, TreePine, Dumbbell, ArrowUpDown, Upload, Smartphone,
  SkipForward, Eye, Rocket, Link2, FileText, Settings, ChevronDown,
} from "lucide-react";

// ========================================
// TYPES
// ========================================

interface DraftData {
  id: string;
  currentStep: number;
  airbnbUrl: string | null;
  title: string | null;
  description: string | null;
  propertyType: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  maxGuests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: string | null;
  amenities: string[] | null;
  houseRules: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  minNotice: number | null;
  prepBuffer: boolean | null;
  baseNightlyRate: number | null;
  cleaningFee: number | null;
  gapNightDiscount: number | null;
  weekdayMultiplier: string | null;
  weekendMultiplier: string | null;
  manualApproval: boolean | null;
  autoPublish: boolean | null;
  selfCheckIn: boolean | null;
  petFriendly: boolean | null;
  smokingAllowed: boolean | null;
  nearbyHighlight: string | null;
  checkInInstructions: string | null;
  coverImage: string | null;
  images: string[] | null;
  lastSavedAt: string;
  status: string;
}

interface ICalConnection {
  id: string;
  icalUrl: string;
  label: string;
  status: string;
  lastSyncAt: string | null;
  lastError: string | null;
  blockedDates: any[];
  detectedGapNights: any[];
}

// ========================================
// CONSTANTS
// ========================================

const STEPS = [
  { label: "Start", icon: Rocket },
  { label: "Details", icon: FileText },
  { label: "Basics", icon: Home },
  { label: "Calendar", icon: Calendar },
  { label: "Pricing", icon: DollarSign },
  { label: "Publish", icon: Eye },
];

const PROPERTY_TYPES = [
  { value: "entire_place", label: "Entire place" },
  { value: "private_room", label: "Private room" },
  { value: "shared_room", label: "Shared room" },
  { value: "unique_stay", label: "Unique stay" },
];

const CATEGORIES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "cabin", label: "Cabin" },
  { value: "villa", label: "Villa" },
  { value: "cottage", label: "Cottage" },
  { value: "loft", label: "Loft" },
  { value: "studio", label: "Studio" },
  { value: "townhouse", label: "Townhouse" },
];

const AMENITY_OPTIONS = [
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

// ========================================
// AUTOSAVE HOOK
// ========================================

function useAutosave(draftId: string | null, data: Record<string, any>, enabled: boolean) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "offline" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDataRef = useRef<string>("");
  const isOnlineRef = useRef(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => { isOnlineRef.current = true; setSaveStatus("idle"); };
    const handleOffline = () => { isOnlineRef.current = false; setSaveStatus("offline"); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const save = useCallback(async (saveData: Record<string, any>) => {
    if (!draftId || !enabled) return;

    const dataStr = JSON.stringify(saveData);
    if (dataStr === lastDataRef.current) return;

    if (!isOnlineRef.current) {
      // Save to localStorage for offline recovery
      try {
        localStorage.setItem(`gn-draft-${draftId}`, dataStr);
      } catch {}
      setSaveStatus("offline");
      return;
    }

    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/host/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: dataStr,
      });
      if (res.ok) {
        lastDataRef.current = dataStr;
        setLastSaved(new Date());
        setSaveStatus("saved");
        // Clear offline cache on successful save
        try { localStorage.removeItem(`gn-draft-${draftId}`); } catch {}
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  }, [draftId, enabled]);

  // Debounced autosave
  useEffect(() => {
    if (!draftId || !enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(data), 800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data, draftId, enabled, save]);

  return { saveStatus, lastSaved, save };
}

// ========================================
// SAVE STATUS INDICATOR
// ========================================

function SaveIndicator({ status, lastSaved }: { status: string; lastSaved: Date | null }) {
  const formatTime = (d: Date) => d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center gap-2 text-xs" role="status" aria-live="polite">
      {status === "saving" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving…</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Cloud className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">Saved {lastSaved ? formatTime(lastSaved) : ""}</span>
        </>
      )}
      {status === "offline" && (
        <>
          <CloudOff className="w-3 h-3 text-amber-500" />
          <span className="text-amber-600">Offline — changes saved locally</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle className="w-3 h-3 text-destructive" />
          <span className="text-destructive">Save failed — retrying</span>
        </>
      )}
      {status === "idle" && (
        <>
          <Check className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">Draft saved automatically</span>
        </>
      )}
    </div>
  );
}

// ========================================
// PROGRESS BAR
// ========================================

function ProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i <= currentStep ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function CreateListing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Auth
  const [host, setHost] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Draft state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Form state (flat object for autosave)
  const [form, setForm] = useState({
    airbnbUrl: "",
    title: "",
    description: "",
    propertyType: "entire_place",
    category: "apartment",
    address: "",
    city: "",
    state: "",
    postcode: "",
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: "1",
    amenities: [] as string[],
    houseRules: "",
    checkInTime: "15:00",
    checkOutTime: "10:00",
    minNotice: 1,
    prepBuffer: false,
    baseNightlyRate: 0,
    cleaningFee: 0,
    gapNightDiscount: 30,
    weekdayMultiplier: "1.0",
    weekendMultiplier: "1.0",
    manualApproval: true,
    autoPublish: false,
    selfCheckIn: false,
    petFriendly: false,
    smokingAllowed: false,
    nearbyHighlight: "",
    checkInInstructions: "",
    coverImage: "",
    images: [] as string[],
  });

  // iCal state
  const [icalConnections, setIcalConnections] = useState<ICalConnection[]>([]);
  const [icalUrl, setIcalUrl] = useState("");
  const [icalTesting, setIcalTesting] = useState(false);
  const [icalTestResult, setIcalTestResult] = useState<any>(null);
  const [icalConnecting, setIcalConnecting] = useState(false);

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Address search
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [addressSearching, setAddressSearching] = useState(false);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressWrapperRef = useRef<HTMLDivElement>(null);

  // Amenity search
  const [amenitySearch, setAmenitySearch] = useState("");

  // Autosave
  const autosaveData = {
    ...form,
    currentStep: step,
    baseNightlyRate: form.baseNightlyRate ? Math.round(form.baseNightlyRate * 100) : null,
    cleaningFee: form.cleaningFee ? Math.round(form.cleaningFee * 100) : 0,
  };
  const { saveStatus, lastSaved } = useAutosave(draftId, autosaveData, step > 0);

  // ========================================
  // AUTH CHECK
  // ========================================

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/host/me", { credentials: "include" });
        if (!res.ok) {
          setLocation("/host/login");
          return;
        }
        const data = await res.json();
        setHost(data.host);
      } catch {
        setLocation("/host/login");
      } finally {
        setIsAuthLoading(false);
      }
    })();
  }, [setLocation]);

  // Click outside to close address suggestions
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (addressWrapperRef.current && !addressWrapperRef.current.contains(e.target as Node)) {
        setShowAddressSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ========================================
  // HANDLERS
  // ========================================

  const createDraft = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/host/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setDraftId(data.draft.id);
        setStep(1);
        toast({ title: "Draft created!", description: "Your progress is saved automatically." });
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create draft", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const updateForm = (updates: Partial<typeof form>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const toggleAmenity = (name: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(name)
        ? prev.amenities.filter(a => a !== name)
        : [...prev.amenities, name],
    }));
  };

  // Address search
  const searchAddress = async (q: string) => {
    if (q.length < 3) { setAddressSuggestions([]); return; }
    setAddressSearching(true);
    try {
      const res = await fetch(`/api/address-search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setAddressSuggestions(data);
        setShowAddressSuggestions(data.length > 0);
      }
    } catch {} finally { setAddressSearching(false); }
  };

  const handleAddressQueryChange = (val: string) => {
    setAddressQuery(val);
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    addressDebounceRef.current = setTimeout(() => searchAddress(val), 500);
  };

  const selectAddress = (s: any) => {
    const addr = s.address || {};
    const road = [addr.house_number, addr.road].filter(Boolean).join(" ");
    updateForm({
      address: road || s.display_name.split(",")[0],
      city: addr.city || addr.town || addr.suburb || addr.village || "",
      state: addr.state || "",
      postcode: addr.postcode || "",
    });
    setAddressQuery(s.display_name);
    setShowAddressSuggestions(false);
  };

  // Photo upload
  const handlePhotoUpload = async (files: File[]) => {
    if (!draftId || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append("photos", f));
      const res = await fetch(`/api/host/drafts/${draftId}/photos`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        updateForm({
          images: data.draft.images || [],
          coverImage: data.draft.coverImage || "",
        });
        toast({ title: `${data.uploadedUrls.length} photo(s) uploaded!` });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // iCal test
  const testIcal = async () => {
    if (!icalUrl || !draftId) return;
    setIcalTesting(true);
    setIcalTestResult(null);
    try {
      const res = await fetch(`/api/host/drafts/${draftId}/ical/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ icalUrl }),
      });
      const data = await res.json();
      setIcalTestResult(data);
    } catch {
      setIcalTestResult({ error: "Failed to test link" });
    } finally {
      setIcalTesting(false);
    }
  };

  // iCal connect
  const connectIcal = async () => {
    if (!icalUrl || !draftId) return;
    setIcalConnecting(true);
    try {
      const res = await fetch(`/api/host/drafts/${draftId}/ical/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ icalUrl, label: "Airbnb" }),
      });
      if (res.ok) {
        const data = await res.json();
        setIcalConnections(prev => [...prev, data.connection]);
        setIcalUrl("");
        setIcalTestResult(null);
        toast({ title: "Calendar connected!", description: data.message });
      }
    } catch {
      toast({ title: "Failed to connect", variant: "destructive" });
    } finally {
      setIcalConnecting(false);
    }
  };

  // Sync iCal
  const syncIcal = async (connectionId: string) => {
    try {
      const res = await fetch(`/api/host/ical/${connectionId}/sync`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setIcalConnections(prev => prev.map(c => c.id === connectionId ? data.connection : c));
        toast({ title: "Calendar synced!" });
      }
    } catch {
      toast({ title: "Sync failed", variant: "destructive" });
    }
  };

  // Publish
  const handlePublish = async () => {
    if (!draftId) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/host/drafts/${draftId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Listing published!", description: "Submitted for review." });
        setLocation("/host/dashboard");
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to publish", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  // ========================================
  // VALIDATION
  // ========================================

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) return true; // Optional step
    if (step === 2) return !!(form.title && form.city);
    if (step === 3) return true; // Optional step
    if (step === 4) return form.baseNightlyRate > 0;
    return true;
  };

  // ========================================
  // RENDER
  // ========================================

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredAmenities = amenitySearch
    ? AMENITY_OPTIONS.filter(a => a.name.toLowerCase().includes(amenitySearch.toLowerCase()))
    : AMENITY_OPTIONS;

  // All gap nights from all connections
  const allGapNights = icalConnections.flatMap(c => (c.detectedGapNights || []) as any[]);
  const allBlockedDates = icalConnections.flatMap(c => (c.blockedDates || []) as any[]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/host/dashboard">
              <button className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Back to dashboard">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-base font-bold font-display">Create Listing</h1>
              {step > 0 && (
                <p className="text-xs text-muted-foreground">{STEPS[step]?.label} — Step {step} of {STEPS.length - 1}</p>
              )}
            </div>
          </div>
          {draftId && <SaveIndicator status={saveStatus} lastSaved={lastSaved} />}
        </div>
        {step > 0 && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-3">
            <ProgressBar currentStep={step} totalSteps={STEPS.length} />
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 pb-32">

        {/* ============ STEP 0: Start Listing ============ */}
        {step === 0 && (
          <div className="space-y-8">
            <div className="text-center pt-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">List your property on GapNight</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Turn empty nights between bookings into revenue. Most hosts publish in under 5 minutes.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Your listing stays as a draft until you publish</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Progress is saved automatically. Come back anytime.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Sync your Airbnb calendar to detect gap nights</p>
                  <p className="text-xs text-muted-foreground mt-0.5">We'll find single-night gaps between your bookings.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Set your gap night discount once</p>
                  <p className="text-xs text-muted-foreground mt-0.5">GapNight suggests gap nights — you approve or auto-publish.</p>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-base font-bold rounded-xl"
              onClick={createDraft}
              disabled={isCreating}
            >
              {isCreating ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating draft…</>
              ) : (
                <><Plus className="mr-2 h-5 w-5" /> Create listing</>
              )}
            </Button>
          </div>
        )}

        {/* ============ STEP 1: Bring Details ============ */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold mb-1">Bring details from your existing listing</h2>
              <p className="text-sm text-muted-foreground">Speed up setup by referencing your Airbnb listing, or skip to enter manually.</p>
            </div>

            {/* Option A: Airbnb link */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Paste your Airbnb listing URL</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                We don't import automatically from Airbnb. Use this as a reference while you paste your content.
              </p>
              <Input
                placeholder="https://airbnb.com/rooms/..."
                value={form.airbnbUrl}
                onChange={e => updateForm({ airbnbUrl: e.target.value })}
                className="h-12"
              />
              {form.airbnbUrl && (
                <a
                  href={form.airbnbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                >
                  <ExternalLink className="w-3 h-3" /> Open Airbnb in new tab
                </a>
              )}
            </div>

            {/* Option B: Quick paste */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Clipboard className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Quick paste your content</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Copy your title, description, and house rules from Airbnb and paste them here.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                  <Input
                    placeholder="e.g. Stunning Bondi Beach Apartment"
                    value={form.title}
                    onChange={e => updateForm({ title: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                  <Textarea
                    placeholder="Paste your property description here..."
                    value={form.description}
                    onChange={e => updateForm({ description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">House rules</label>
                  <Textarea
                    placeholder="e.g. No smoking, no parties, quiet hours after 10pm..."
                    value={form.houseRules}
                    onChange={e => updateForm({ houseRules: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ STEP 2: Basics ============ */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold mb-1">Property basics</h2>
              <p className="text-sm text-muted-foreground">Tell us about your space.</p>
            </div>

            {/* Property type + category */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Home className="w-4 h-4 text-primary" /> Property type</h3>
              <div className="grid grid-cols-2 gap-2">
                {PROPERTY_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => updateForm({ propertyType: t.value })}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition-all min-h-[44px] ${
                      form.propertyType === t.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => updateForm({ category: c.value })}
                      className={`px-3 py-2 rounded-full text-xs font-medium border transition-all min-h-[44px] ${
                        form.category === c.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title + Description (if not already filled in step 1) */}
            {!form.title && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold">Listing details</h3>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
                  <Input
                    placeholder="e.g. Stunning Bondi Beach Apartment"
                    value={form.title}
                    onChange={e => updateForm({ title: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                  <Textarea
                    placeholder="What makes your property special?"
                    value={form.description}
                    onChange={e => updateForm({ description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Address */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Location</h3>
              <div className="relative" ref={addressWrapperRef}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Search address</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Start typing an Australian address..."
                    value={addressQuery}
                    onChange={e => handleAddressQueryChange(e.target.value)}
                    onFocus={() => addressSuggestions.length > 0 && setShowAddressSuggestions(true)}
                    className="h-11 pl-10"
                  />
                  {addressSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                {showAddressSuggestions && (
                  <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                    {addressSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        className="w-full text-left px-3 py-3 text-sm hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 min-h-[44px]"
                        onClick={() => selectAddress(s)}
                      >
                        {s.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">City *</label>
                  <Input value={form.city} onChange={e => updateForm({ city: e.target.value })} className="h-11" placeholder="Sydney" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">State</label>
                  <Input value={form.state} onChange={e => updateForm({ state: e.target.value })} className="h-11" placeholder="NSW" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Postcode</label>
                  <Input value={form.postcode} onChange={e => updateForm({ postcode: e.target.value })} className="h-11" placeholder="2000" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nearby highlight</label>
                  <Input value={form.nearbyHighlight} onChange={e => updateForm({ nearbyHighlight: e.target.value })} className="h-11" placeholder="5 min to beach" />
                </div>
              </div>
            </div>

            {/* Space details */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Space details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Guests", icon: Users, key: "maxGuests", min: 1 },
                  { label: "Bedrooms", icon: Bed, key: "bedrooms", min: 0 },
                  { label: "Beds", icon: Bed, key: "beds", min: 1 },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors min-h-[44px] min-w-[44px]"
                        onClick={() => updateForm({ [f.key]: Math.max(f.min, (form as any)[f.key] - 1) })}
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-semibold">{(form as any)[f.key]}</span>
                      <button
                        type="button"
                        className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors min-h-[44px] min-w-[44px]"
                        onClick={() => updateForm({ [f.key]: (form as any)[f.key] + 1 })}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Bathrooms</label>
                  <Input
                    value={form.bathrooms}
                    onChange={e => updateForm({ bathrooms: e.target.value })}
                    className="h-11 text-center"
                    placeholder="1"
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold">Amenities</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search amenities..."
                  value={amenitySearch}
                  onChange={e => setAmenitySearch(e.target.value)}
                  className="h-10 pl-10 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {filteredAmenities.map(a => (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => toggleAmenity(a.name)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all min-h-[44px] ${
                      form.amenities.includes(a.name)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <a.icon className="w-3.5 h-3.5" />
                    {a.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2.5 text-sm cursor-pointer min-h-[44px]">
                  <input type="checkbox" checked={form.selfCheckIn} onChange={e => updateForm({ selfCheckIn: e.target.checked })} className="w-5 h-5 rounded" />
                  Self check-in
                </label>
                <label className="flex items-center gap-2.5 text-sm cursor-pointer min-h-[44px]">
                  <input type="checkbox" checked={form.petFriendly} onChange={e => updateForm({ petFriendly: e.target.checked })} className="w-5 h-5 rounded" />
                  Pet friendly
                </label>
              </div>
            </div>

            {/* Photos */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Camera className="w-4 h-4 text-primary" /> Photos</h3>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={e => {
                  const files = e.target.files;
                  if (files) handlePhotoUpload(Array.from(files));
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors min-h-[44px]"
              >
                {uploading ? (
                  <><Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-muted-foreground" /><p className="text-sm text-muted-foreground">Uploading…</p></>
                ) : (
                  <>
                    <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Drag & drop or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · Max 10MB each</p>
                  </>
                )}
              </button>
              {/* Mobile upload CTA */}
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:hidden gap-2 min-h-[44px]"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Smartphone className="w-4 h-4" /> Upload from phone
              </Button>
              {form.images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {form.images.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {url === form.coverImage && (
                        <Badge className="absolute top-1 left-1 text-[10px] bg-primary/90 px-1.5 py-0.5">Cover</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ STEP 3: Connect Availability (iCal) ============ */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold mb-1">Connect your calendar</h2>
              <p className="text-sm text-muted-foreground">Sync your Airbnb calendar so we can detect gap nights automatically.</p>
            </div>

            {/* iCal input */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Sync Airbnb Calendar (recommended)</h3>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">How to find your iCal link:</strong> In Airbnb → Calendar → Availability settings → Export calendar → Copy the link
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Airbnb iCal URL (.ics)</label>
                <Input
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  value={icalUrl}
                  onChange={e => setIcalUrl(e.target.value)}
                  className="h-11 font-mono text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testIcal}
                  disabled={!icalUrl || icalTesting}
                  className="gap-1.5 min-h-[44px]"
                >
                  {icalTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Test link
                </Button>
                <Button
                  size="sm"
                  onClick={connectIcal}
                  disabled={!icalUrl || icalConnecting || (icalTestResult && !icalTestResult.valid)}
                  className="gap-1.5 min-h-[44px]"
                >
                  {icalConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                  Sync now
                </Button>
              </div>

              {/* Test result */}
              {icalTestResult && (
                <div className={`rounded-xl p-3 text-sm ${icalTestResult.valid ? "bg-emerald-500/10 border border-emerald-200" : "bg-destructive/10 border border-destructive/20"}`}>
                  {icalTestResult.valid ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-emerald-700">{icalTestResult.message}</p>
                        {icalTestResult.detectedGapNights?.length > 0 && (
                          <p className="text-xs text-emerald-600 mt-1">
                            🎯 {icalTestResult.detectedGapNights.length} gap night(s) detected!
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive">{icalTestResult.error}</p>
                        {icalTestResult.help && <p className="text-xs text-muted-foreground mt-1">{icalTestResult.help}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Connected calendars */}
            {icalConnections.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold">Connected calendars</h3>
                {icalConnections.map(conn => (
                  <div key={conn.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <div className="flex items-center gap-2">
                      {conn.status === "connected" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{conn.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {conn.status === "connected" ? `Last synced ${conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString() : "never"}` : conn.lastError}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => syncIcal(conn.id)} className="gap-1 min-h-[44px]">
                      <RefreshCw className="w-3 h-3" /> Sync
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Calendar preview */}
            {(allBlockedDates.length > 0 || allGapNights.length > 0) && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold">Calendar preview</h3>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-red-400/60" />
                    <span className="text-muted-foreground">Blocked ({allBlockedDates.length})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-400/60" />
                    <span className="text-muted-foreground">Free</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-primary" />
                    <span className="text-muted-foreground">Gap Night ({allGapNights.length})</span>
                  </div>
                </div>
                {allGapNights.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-primary">Detected gap nights:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allGapNights.slice(0, 20).map((gn: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                          {gn.date} ({gn.gapSize}n)
                        </Badge>
                      ))}
                      {allGapNights.length > 20 && (
                        <Badge variant="secondary" className="text-xs">+{allGapNights.length - 20} more</Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============ STEP 4: Gap Night Rules + Pricing ============ */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold mb-1">Gap night rules & pricing</h2>
              <p className="text-sm text-muted-foreground">Set your defaults once — GapNight uses these to suggest gap nights.</p>
            </div>

            {/* Check-in / Check-out */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Schedule</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Check-in time</label>
                  <Input type="time" value={form.checkInTime} onChange={e => updateForm({ checkInTime: e.target.value })} className="h-11" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Check-out time</label>
                  <Input type="time" value={form.checkOutTime} onChange={e => updateForm({ checkOutTime: e.target.value })} className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Minimum notice</label>
                  <select
                    value={form.minNotice}
                    onChange={e => updateForm({ minNotice: parseInt(e.target.value) })}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm min-h-[44px]"
                  >
                    <option value={0}>Same day</option>
                    <option value={1}>1 day</option>
                    <option value={2}>2 days</option>
                    <option value={3}>3 days</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Prep buffer</label>
                  <label className="flex items-center gap-2.5 h-11 cursor-pointer min-h-[44px]">
                    <input type="checkbox" checked={form.prepBuffer} onChange={e => updateForm({ prepBuffer: e.target.checked })} className="w-5 h-5 rounded" />
                    <span className="text-sm">Block day after booking</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Pricing</h3>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Base nightly price (AUD) *</label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="189"
                    value={form.baseNightlyRate || ""}
                    onChange={e => updateForm({ baseNightlyRate: parseFloat(e.target.value) || 0 })}
                    className="h-14 pl-8 text-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Gap night discount: <span className="text-primary font-bold">{form.gapNightDiscount}%</span>
                  {form.baseNightlyRate > 0 && (
                    <span className="ml-2 text-muted-foreground">
                      = ${(form.baseNightlyRate * (1 - form.gapNightDiscount / 100)).toFixed(0)}/night
                    </span>
                  )}
                </label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={form.gapNightDiscount}
                  onChange={e => updateForm({ gapNightDiscount: parseInt(e.target.value) })}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                  style={{ minHeight: "44px" }}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>10%</span>
                  <span>60%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Cleaning fee</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      step="1"
                      placeholder="85"
                      value={form.cleaningFee || ""}
                      onChange={e => updateForm({ cleaningFee: parseFloat(e.target.value) || 0 })}
                      className="h-11 pl-8"
                    />
                  </div>
                </div>
              </div>

              {form.baseNightlyRate > 0 && (
                <div className="bg-muted/30 rounded-xl p-3 text-sm">
                  <p className="text-muted-foreground">
                    Guests will see <span className="font-bold text-foreground">${form.baseNightlyRate}/night</span>
                    {form.cleaningFee > 0 && <> + <span className="font-bold text-foreground">${form.cleaningFee}</span> cleaning fee</>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gap night price: <span className="font-bold text-primary">${(form.baseNightlyRate * (1 - form.gapNightDiscount / 100)).toFixed(0)}/night</span>
                  </p>
                </div>
              )}
            </div>

            {/* Approval toggle */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> Gap night approval</h3>
              <label className="flex items-center justify-between cursor-pointer min-h-[44px]">
                <div>
                  <p className="text-sm font-medium">Manual approval for suggested gap nights</p>
                  <p className="text-xs text-muted-foreground">Review each gap night before it goes live</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.manualApproval}
                  onChange={e => updateForm({ manualApproval: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
              </label>
              {!form.manualApproval && (
                <div className="bg-amber-500/10 border border-amber-200 rounded-xl p-3">
                  <label className="flex items-start gap-2.5 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={form.autoPublish}
                      onChange={e => updateForm({ autoPublish: e.target.checked })}
                      className="w-5 h-5 rounded mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-amber-700">Auto-publish gap nights</p>
                      <p className="text-xs text-amber-600">I understand that gap nights will be published automatically based on my rules.</p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ STEP 5: Review & Publish ============ */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-bold mb-1">Review & publish</h2>
              <p className="text-sm text-muted-foreground">Check everything looks good, then publish your listing.</p>
            </div>

            {/* Summary card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Cover image */}
              {form.coverImage && (
                <div className="aspect-video w-full overflow-hidden">
                  <img src={form.coverImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-lg font-bold">{form.title || "Untitled listing"}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {[form.city, form.state].filter(Boolean).join(", ") || "No location set"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Home className="w-4 h-4" />
                    <span>{PROPERTY_TYPES.find(t => t.value === form.propertyType)?.label} · {CATEGORIES.find(c => c.value === form.category)?.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{form.maxGuests} guests · {form.bedrooms} bed{form.bedrooms !== 1 ? "s" : ""} · {form.bathrooms} bath</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    <span>${form.baseNightlyRate || 0}/night</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-primary font-medium">{form.gapNightDiscount}% gap night discount</span>
                  </div>
                </div>

                {form.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.amenities.map(a => (
                      <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                    ))}
                  </div>
                )}

                {icalConnections.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">{icalConnections.length} calendar(s) connected</span>
                    {allGapNights.length > 0 && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{allGapNights.length} gap nights detected</Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Camera className="w-4 h-4" />
                  <span>{form.images.length} photo(s)</span>
                </div>
              </div>
            </div>

            {/* Publish CTA */}
            <Button
              size="lg"
              className="w-full h-14 text-base font-bold rounded-xl gap-2"
              onClick={handlePublish}
              disabled={isPublishing || !form.title || !form.city || !form.baseNightlyRate}
            >
              {isPublishing ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Publishing…</>
              ) : (
                <><Rocket className="h-5 w-5" /> Publish listing</>
              )}
            </Button>

            {(!form.title || !form.city || !form.baseNightlyRate) && (
              <p className="text-xs text-destructive text-center">
                Missing required fields: {[!form.title && "title", !form.city && "city", !form.baseNightlyRate && "price"].filter(Boolean).join(", ")}
              </p>
            )}

            {/* Next best actions */}
            <div className="bg-muted/30 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold">After publishing, you can:</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="w-4 h-4 text-primary" /> Add a second calendar (Booking.com, etc.)
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Camera className="w-4 h-4 text-primary" /> Add more photos
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4 text-primary" /> Enable auto-suggest gap nights
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky bottom CTA bar */}
      {step > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 z-40">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="gap-1.5 min-h-[44px] rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>

            <div className="flex items-center gap-2">
              {step < 5 && step !== 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(step + 1)}
                  className="text-xs text-muted-foreground gap-1 min-h-[44px]"
                >
                  <SkipForward className="w-3 h-3" /> Skip for now
                </Button>
              )}
              {step < 5 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="gap-1.5 min-h-[44px] rounded-xl font-bold px-6"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
