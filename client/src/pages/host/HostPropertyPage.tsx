import React, { useState, useEffect, useRef } from "react";
import { useLocation, useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/Navigation";
import { GapNightLogoLoader } from "@/components/GapNightLogo";
import { ArrowLeft, ImageIcon, Settings, DollarSign, Calendar, Copy, Check, RefreshCw, ChevronDown, ChevronUp, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";

const PLATFORM_HELP: { label: string; steps: string }[] = [
  { label: "Airbnb", steps: "Airbnb → Calendar → Availability settings → Export calendar → Copy link" },
  { label: "Stayz / HomeAway", steps: "Stayz → My Properties → select property → Calendar → Export → Copy iCal link" },
  { label: "Booking.com", steps: "Booking.com Extranet → Calendar → Sync calendars → Export → Copy the .ics URL" },
  { label: "VRBO", steps: "VRBO → Dashboard → Calendar → Import/Export → Export Calendar → Copy link" },
  { label: "TripAdvisor / FlipKey", steps: "TripAdvisor Rentals → Manage listing → Calendar → Export calendar → Copy link" },
  { label: "Google Calendar", steps: "Google Calendar → Settings → select calendar → Integrate calendar → Copy Secret address in iCal format" },
];

export default function HostPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState<any>(null);
  // Calendar sync UI state
  const [exportUrl, setExportUrl] = useState("");
  const [exportCopied, setExportCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [platformHelpOpen, setPlatformHelpOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");

  useEffect(() => { loadProperty(); }, [id]);

  const loadExportUrl = async (propertyId: string) => {
    try {
      const res = await fetch(`/api/host/properties/${propertyId}/ical-export`, { credentials: "include" });
      if (res.ok) { const d = await res.json(); setExportUrl(d.exportUrl || ""); }
    } catch {}
  };

  const handleCopyExportUrl = async () => {
    if (!exportUrl) return;
    await navigator.clipboard.writeText(exportUrl);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  const handleManualSync = async () => {
    if (!property) return;
    setIsSyncing(true); setSyncResult(null);
    try {
      const res = await fetch(`/api/host/properties/${property.id}/ical-sync`, { method: "POST", credentials: "include" });
      const d = await res.json();
      setSyncResult({ success: res.ok, message: d.message || (res.ok ? "Sync complete." : "Sync failed.") });
    } catch { setSyncResult({ success: false, message: "Could not reach server. Try again." }); }
    finally { setIsSyncing(false); }
  };

  const loadProperty = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/host/properties", { credentials: "include" });
      if (!res.ok) { setLocation("/host/login"); return; }
      const data = await res.json();
      const prop = (data.properties || []).find((p: any) => p.id === id);
      if (!prop) { setLocation("/host/dashboard"); return; }
      setProperty(prop);
      const gnr = prop.gapNightRule;
      setEditForm({
        title: prop.title || "", description: prop.description || "",
        propertyType: prop.propertyType || "entire_place", category: prop.category || "apartment",
        address: prop.address || "", city: prop.city || "", state: prop.state || "", postcode: prop.postcode || "",
        maxGuests: prop.maxGuests || 2, bedrooms: prop.bedrooms || 1, beds: prop.beds || 1, bathrooms: prop.bathrooms || "1",
        cleaningFee: ((prop.cleaningFee || 0) / 100).toFixed(2), minNights: prop.minNights || 1,
        houseRules: prop.houseRules || "", checkInInstructions: prop.checkInInstructions || "",
        nearbyHighlight: prop.nearbyHighlight || "", selfCheckIn: prop.selfCheckIn || false,
        petFriendly: prop.petFriendly || false, smokingAllowed: prop.smokingAllowed || false,
        instantBook: prop.instantBook || false, checkInTime: prop.checkInTime || "15:00",
        checkOutTime: prop.checkOutTime || "10:00", amenities: prop.amenities || [],
        weekdayPrice: ((gnr?.weekdayPrice ?? prop.baseNightlyRate ?? 0) / 100),
        weekendPrice: ((gnr?.weekendPrice ?? Math.round((prop.baseNightlyRate ?? 0) * 1.2)) / 100),
        holidayPrice: ((gnr?.holidayPrice ?? Math.round((prop.baseNightlyRate ?? 0) * 1.4)) / 100),
        gap3: gnr?.gap3 ?? 35, gap7: gnr?.gap7 ?? 30, gap31: gnr?.gap31 ?? 25, gapOver31: gnr?.gapOver31 ?? 20,
        minNotice: gnr?.minNotice ?? 1, prepBuffer: gnr?.prepBuffer || false,
        manualApproval: gnr?.manualApproval ?? true, icalUrl: prop.icalUrl || "",
      });
      const pr = await fetch(`/api/host/properties/${prop.id}/photos`, { credentials: "include" });
      if (pr.ok) { const d = await pr.json(); setPhotos(d.photos || []); }
      loadExportUrl(prop.id);
    } catch { setLocation("/host/dashboard"); }
    finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    if (!editForm || !property) return;
    setIsSaving(true); setSaveMsg(""); setSaveError("");
    try {
      const { gap3, gap7, gap31, gapOver31, weekdayPrice, weekendPrice, holidayPrice, minNotice, prepBuffer, manualApproval, icalUrl, ...fields } = editForm;
      const wdp = Math.round(Number(weekdayPrice) * 100);
      const res = await fetch(`/api/host/properties/${property.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          ...fields, baseNightlyRate: wdp, cancellationPolicy: "flexible",
          cleaningFee: editForm.cleaningFee ? Math.round(parseFloat(editForm.cleaningFee) * 100) : 0,
          icalUrl: icalUrl || null,
          gapNightRule: { gap3, gap7, gap31, gapOver31, weekdayPrice: wdp,
            weekendPrice: Math.round(Number(weekendPrice) * 100), holidayPrice: Math.round(Number(holidayPrice) * 100),
            minNotice, prepBuffer, manualApproval, checkInTime: editForm.checkInTime, checkOutTime: editForm.checkOutTime },
        }),
      });
      if (res.ok) { setSaveMsg("Changes saved."); loadProperty(); }
      else { const d = await res.json(); setSaveError(d.error || "Failed to save."); }
    } catch { setSaveError("Failed to save. Please try again."); }
    finally { setIsSaving(false); }
  };

  const uploadFiles = async (files: File[]) => {
    if (!property || !files.length) return;
    setUploading(true);
    try {
      const fd = new FormData(); files.forEach(f => fd.append("photos", f));
      const res = await fetch(`/api/host/properties/${property.id}/photos`, { method: "POST", credentials: "include", body: fd });
      if (res.ok) { const pr = await fetch(`/api/host/properties/${property.id}/photos`, { credentials: "include" }); if (pr.ok) { const d = await pr.json(); setPhotos(d.photos || []); } }
    } catch {} finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleDelete = async (photoId: string) => {
    await fetch(`/api/host/properties/${property.id}/photos/${photoId}`, { method: "DELETE", credentials: "include" });
    setPhotos(p => p.filter(x => x.id !== photoId));
  };

  const handleSetCover = async (photoId: string) => {
    await fetch(`/api/host/properties/${property.id}/photos/${photoId}/cover`, { method: "PUT", credentials: "include" });
    const pr = await fetch(`/api/host/properties/${property.id}/photos`, { credentials: "include" });
    if (pr.ok) { const d = await pr.json(); setPhotos(d.photos || []); }
  };

  if (isLoading || !editForm) return (
    <div className="min-h-screen bg-background"><Navigation />
      <div className="flex items-center justify-center min-h-[60vh]"><GapNightLogoLoader /></div>
    </div>
  );

  const Feedback = () => (<>
    {saveMsg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">{saveMsg}</p>}
    {saveError && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-4">{saveError}</p>}
  </>);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/host/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{property.title}</h1>
              <Badge variant={property.status === "approved" ? "default" : property.status === "pending_approval" ? "secondary" : "destructive"}>
                {property.status === "pending_approval" ? "Pending Review" : property.status}
              </Badge>
            </div>
            {property.status === "rejected" && property.rejectionReason && (
              <p className="text-xs text-destructive mt-0.5"><span className="font-semibold">Declined:</span> {property.rejectionReason}</p>
            )}
            <p className="text-sm text-muted-foreground">{property.city}, {property.state}</p>
          </div>
          {property.coverImage && <img src={property.coverImage} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0 hidden sm:block" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
        </div>

        <Tabs defaultValue="details">
          <TabsList className="mb-6 bg-muted/50">
            <TabsTrigger value="details" className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Details</TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Pricing</TabsTrigger>
            <TabsTrigger value="photos" className="gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Photos ({photos.length})</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Calendar className="w-3.5 h-3.5" /> Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Feedback />
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground">Title</label><Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="h-9 text-sm" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Nearby Highlight</label><Input value={editForm.nearbyHighlight} onChange={e => setEditForm({...editForm, nearbyHighlight: e.target.value})} className="h-9 text-sm" /></div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Description</label><Textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={4} className="text-sm" /></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground">Type</label>
                  <select className="w-full rounded-md border p-2 text-xs h-9 bg-background" value={editForm.propertyType} onChange={e => setEditForm({...editForm, propertyType: e.target.value})}>
                    <option value="entire_place">Entire Place</option><option value="private_room">Private Room</option><option value="shared_room">Shared Room</option><option value="unique_stay">Unique Stay</option>
                  </select></div>
                <div><label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select className="w-full rounded-md border p-2 text-xs h-9 bg-background" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                    <option value="apartment">Apartment</option><option value="house">House</option><option value="cabin">Cabin</option><option value="villa">Villa</option><option value="cottage">Cottage</option><option value="loft">Loft</option><option value="studio">Studio</option><option value="townhouse">Townhouse</option>
                  </select></div>
                <div><label className="text-xs font-medium text-muted-foreground">Cleaning Fee ($)</label><Input type="number" step="0.01" value={editForm.cleaningFee} onChange={e => setEditForm({...editForm, cleaningFee: e.target.value})} className="h-9 text-sm" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Min Nights</label><Input type="number" value={editForm.minNights} onChange={e => setEditForm({...editForm, minNights: parseInt(e.target.value) || 1})} className="h-9 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground">Address</label><Input value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="h-9 text-sm" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">City</label><Input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="h-9 text-sm" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">State</label><Input value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} className="h-9 text-sm" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Postcode</label><Input value={editForm.postcode} onChange={e => setEditForm({...editForm, postcode: e.target.value})} className="h-9 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground">Max Guests</label><Input type="number" value={editForm.maxGuests} onChange={e => setEditForm({...editForm, maxGuests: parseInt(e.target.value) || 1})} className="h-9 text-sm" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Bedrooms</label><Input type="number" value={editForm.bedrooms} onChange={e => setEditForm({...editForm, bedrooms: parseInt(e.target.value) || 0})} className="h-9 text-sm" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Beds</label><Input type="number" value={editForm.beds} onChange={e => setEditForm({...editForm, beds: parseInt(e.target.value) || 1})} className="h-9 text-sm" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Bathrooms</label><Input value={editForm.bathrooms} onChange={e => setEditForm({...editForm, bathrooms: e.target.value})} className="h-9 text-sm" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground">House Rules</label><Textarea value={editForm.houseRules} onChange={e => setEditForm({...editForm, houseRules: e.target.value})} rows={3} className="text-sm" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Check-in Instructions</label><Textarea value={editForm.checkInInstructions} onChange={e => setEditForm({...editForm, checkInInstructions: e.target.value})} rows={3} className="text-sm" /></div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Amenities</label>
                <div className="flex flex-wrap gap-1.5">
                  {["WiFi","Kitchen","Pool","Parking","Air Conditioning","TV","Washer","Dryer","Gym","Hot Tub","BBQ","Garden","Balcony","Fireplace","Beach Access","Ski Access","EV Charger","Workspace"].map(a => (
                    <button key={a} type="button" onClick={() => { const cur = editForm.amenities || []; setEditForm({...editForm, amenities: cur.includes(a) ? cur.filter((x: string) => x !== a) : [...cur, a]}); }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${(editForm.amenities||[]).includes(a) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{a}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {[{key:"selfCheckIn",label:"Self check-in"},{key:"petFriendly",label:"Pet friendly"},{key:"smokingAllowed",label:"Smoking allowed"},{key:"instantBook",label:"Instant book"},{key:"prepBuffer",label:"Block day after booking"},{key:"manualApproval",label:"Manual approval required"}].map(({key,label}) => (
                  <label key={key} className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={editForm[key]} onChange={e => setEditForm({...editForm, [key]: e.target.checked})} className="w-4 h-4 rounded" />{label}</label>
                ))}
              </div>
              <div className="flex gap-2 pt-2"><Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button></div>
            </div>
          </TabsContent>

          <TabsContent value="pricing">
            <Feedback />
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-bold">Set your price</h4>
                {([{label:"Weekday price",sublabel:"Mon – Thu",key:"weekdayPrice"},{label:"Weekend price",sublabel:"Fri – Sun",key:"weekendPrice"},{label:"Public holiday price",sublabel:"Auto-detected",key:"holidayPrice"}] as const).map(p => (
                  <div key={p.key} className="bg-card border border-border/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div><p className="font-semibold text-sm">{p.label}</p><p className="text-xs text-muted-foreground">{p.sublabel}</p></div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-muted-foreground">$</span>
                        <Input type="number" value={editForm[p.key]||""} onChange={e => setEditForm({...editForm, [p.key]: Math.max(0, Number(e.target.value))})} className="w-24 text-right text-xl font-bold h-10" min={0} />
                        <span className="text-xs text-muted-foreground">/night</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Guest pays <strong>${Number(editForm[p.key]).toFixed(0)}</strong> · You earn <strong>${(Number(editForm[p.key])*0.93).toFixed(0)}</strong> <span className="text-muted-foreground/60">(7% fee)</span></p>
                  </div>
                ))}
              </div>
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-bold">Gap night discounts</h4>
                {([{label:"3 days or less",sublabel:"Last-minute",key:"gap3",color:"text-red-500"},{label:"Within 7 days",sublabel:"Short notice",key:"gap7",color:"text-orange-500"},{label:"Within 31 days",sublabel:"Some planning time",key:"gap31",color:"text-amber-500"},{label:"After 31 days",sublabel:"Plenty of notice",key:"gapOver31",color:"text-green-500"}] as const).map(d => (
                  <div key={d.key} className="bg-card border border-border/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div><p className="font-semibold text-sm">{d.label}</p><p className="text-xs text-muted-foreground">{d.sublabel}</p></div>
                      <span className={`text-2xl font-bold ${d.color}`}>{editForm[d.key]}%</span>
                    </div>
                    <input type="range" min={5} max={60} step={5} value={editForm[d.key]} onChange={e => setEditForm({...editForm, [d.key]: parseInt(e.target.value)})} className="w-full accent-primary" />
                    <p className="text-xs text-muted-foreground mt-1">${Number(editForm.weekdayPrice).toFixed(0)} → Guest pays <strong>${Math.round(Number(editForm.weekdayPrice)*(1-editForm[d.key]/100))}</strong> · You earn <strong>${Math.round(Number(editForm.weekdayPrice)*(1-editForm[d.key]/100)*0.93)}</strong></p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2"><Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Pricing"}</Button></div>
            </div>
          </TabsContent>

          <TabsContent value="photos">
            <div className="space-y-4">
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => { const f = e.target.files; if (f) uploadFiles(Array.from(f)); }} />
              <div className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")); if (f.length) uploadFiles(f); }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{uploading ? "Uploading..." : dragOver ? "Drop photos here!" : "Drag & drop photos, or click to browse"}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WebP, AVIF, HEIC · Max 10MB each</p>
              </div>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {photos.map((photo: any) => (
                    <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square">
                      <img src={photo.url} alt="" className="w-full h-full object-cover" />
                      {photo.isCover && <div className="absolute top-1 left-1"><Badge className="text-[10px] bg-primary/90 px-1.5 py-0.5">Cover</Badge></div>}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {!photo.isCover && <button onClick={() => handleSetCover(photo.id)} className="text-white text-[10px] bg-white/20 rounded px-1.5 py-1 hover:bg-white/30">Set Cover</button>}
                        <button onClick={() => handleDelete(photo.id)} className="text-white text-[10px] bg-red-500/60 rounded px-1.5 py-1 hover:bg-red-500/80">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Feedback />
            <div className="space-y-5">
              {/* Check-in / Check-out / Notice */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground">Check-in Time</label><Input type="time" value={editForm.checkInTime} onChange={e => setEditForm({...editForm, checkInTime: e.target.value})} className="h-9 text-sm" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Check-out Time</label><Input type="time" value={editForm.checkOutTime} onChange={e => setEditForm({...editForm, checkOutTime: e.target.value})} className="h-9 text-sm" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Min Notice</label>
                  <select className="w-full rounded-md border p-2 text-xs h-9 bg-background" value={editForm.minNotice} onChange={e => setEditForm({...editForm, minNotice: parseInt(e.target.value)})}>
                    <option value={0}>Same day</option><option value={1}>1 day</option><option value={2}>2 days</option><option value={3}>3 days</option><option value={7}>1 week</option>
                  </select></div>
              </div>

              {/* Cancellation policy */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2">
                <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold">Cancellation policy:</span>
                <span className="text-xs text-foreground font-medium">Flexible — 24 hours (non-negotiable for all GapNight hosts)</span>
              </div>

              {/* ── CALENDAR SYNC ── */}
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="bg-muted/40 px-4 py-3 border-b border-border/60">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Calendar Sync</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Keep your availability in sync across all platforms to prevent double bookings.</p>
                </div>

                <div className="p-4 space-y-5">
                  {/* EXPORT — GapNight → other platforms */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">Export GapNight bookings to other platforms</p>
                    <p className="text-[11px] text-muted-foreground">Copy this link and paste it into your other platform's calendar import settings. They'll automatically stay in sync.</p>
                    {exportUrl ? (
                      <div className="flex gap-2">
                        <Input readOnly value={exportUrl} className="h-8 text-[10px] font-mono bg-muted/30 flex-1" />
                        <Button size="sm" variant="outline" className="h-8 px-3 shrink-0" onClick={handleCopyExportUrl}>
                          {exportCopied ? <><Check className="w-3.5 h-3.5 mr-1 text-green-600" /><span className="text-xs text-green-600">Copied</span></> : <><Copy className="w-3.5 h-3.5 mr-1" /><span className="text-xs">Copy</span></>}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">Loading export link…</p>
                    )}
                  </div>

                  <div className="border-t border-border/40" />

                  {/* IMPORT — other platforms → GapNight */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">Import bookings from another platform</p>
                    <p className="text-[11px] text-muted-foreground">Paste the iCal (.ics) link from your other listing platform. GapNight will sync it every 3 hours automatically.</p>

                    {/* Platform help accordion */}
                    <button
                      type="button"
                      onClick={() => setPlatformHelpOpen(o => !o)}
                      className="flex items-center gap-1.5 text-[11px] text-primary font-medium hover:underline"
                    >
                      {platformHelpOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      Where do I find my iCal link?
                    </button>

                    {platformHelpOpen && (
                      <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-2">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {PLATFORM_HELP.map(p => (
                            <button
                              key={p.label}
                              type="button"
                              onClick={() => setSelectedPlatform(p.label)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                                selectedPlatform === p.label
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border/60 text-muted-foreground hover:border-primary/40"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        {selectedPlatform && (
                          <p className="text-[11px] text-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                            <strong>{selectedPlatform}:</strong>{" "}
                            {PLATFORM_HELP.find(p => p.label === selectedPlatform)?.steps}
                          </p>
                        )}
                        {!selectedPlatform && (
                          <p className="text-[11px] text-muted-foreground">Select your platform above to see instructions.</p>
                        )}
                      </div>
                    )}

                    <Input
                      value={editForm.icalUrl}
                      onChange={e => setEditForm({...editForm, icalUrl: e.target.value})}
                      placeholder="https://example.com/calendar/ical/your-listing.ics"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="border-t border-border/40" />

                  {/* Manual sync trigger */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold">Sync now</p>
                      <p className="text-[11px] text-muted-foreground">GapNight auto-syncs every 3 hours. Tap to sync immediately.</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 px-3 shrink-0" onClick={handleManualSync} disabled={isSyncing}>
                      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
                      <span className="text-xs">{isSyncing ? "Syncing…" : "Sync now"}</span>
                    </Button>
                  </div>

                  {syncResult && (
                    <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                      syncResult.success
                        ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                        : "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                    }`}>
                      {syncResult.success
                        ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                      {syncResult.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-1"><Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Settings"}</Button></div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
