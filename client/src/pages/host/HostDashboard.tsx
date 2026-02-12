import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GapNightLogoLoader } from "@/components/GapNightLogo";
import {
  Home, CalendarDays, Calendar, MessageSquare, UserCircle, ChevronLeft, ChevronRight,
  BookOpen, TrendingUp, Clock, CheckCircle2, HelpCircle, DollarSign, LogOut
} from "lucide-react";

export default function HostDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [host, setHost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
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
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/host/logout", { method: "POST", credentials: "include" });
    setLocation("/host/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <GapNightLogoLoader size={48} className="mb-3" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  if (!host) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-display text-foreground">
              Gap<span className="text-primary">Night</span>
            </h1>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Host</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground font-medium hidden sm:inline">
              {host.name}
            </span>
            
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6 bg-muted/50">
            <TabsTrigger value="overview" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="properties" className="gap-1.5"><Home className="w-3.5 h-3.5" /> Properties</TabsTrigger>
            <TabsTrigger value="bookings" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Bookings</TabsTrigger>
            <TabsTrigger value="availability" className="gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Calendar</TabsTrigger>
            <TabsTrigger value="qa" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Q&A</TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5"><UserCircle className="w-3.5 h-3.5" /> Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="properties"><PropertiesTab /></TabsContent>
          <TabsContent value="bookings"><BookingsTab /></TabsContent>
          <TabsContent value="availability"><AvailabilityTab /></TabsContent>
          <TabsContent value="qa"><QATab /></TabsContent>
          <TabsContent value="profile"><ProfileTab host={host} onUpdate={checkAuth} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/host/stats", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setStats(data.stats))
      .catch(() => {});
    fetch("/api/host/bookings", { credentials: "include" })
      .then(r => r.ok ? r.json() : { bookings: [] })
      .then(data => setBookings(data.bookings || []))
      .catch(() => {});
    fetch("/api/host/properties", { credentials: "include" })
      .then(r => r.ok ? r.json() : { properties: [] })
      .then(data => setProperties(data.properties || []))
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <GapNightLogoLoader size={40} className="mb-3" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading stats...</p>
      </div>
    );
  }

  // Today's data
  const today = new Date().toISOString().split("T")[0];
  const pendingBookings = bookings.filter(b => b.status === "PENDING_APPROVAL");
  const upcomingCheckins = bookings.filter(b => b.status === "CONFIRMED" && b.checkInDate >= today).sort((a, b) => a.checkInDate.localeCompare(b.checkInDate)).slice(0, 3);
  const currentlyHosting = bookings.filter(b => b.status === "CONFIRMED" && b.checkInDate <= today && b.checkOutDate >= today);

  // Performance metrics - only count host decisions (exclude payment failures, cancellations)
  const hostDecisionStatuses = ["CONFIRMED", "COMPLETED", "DECLINED"];
  const hostDecisionBookings = bookings.filter(b => hostDecisionStatuses.includes(b.status));
  const approvedCount = bookings.filter(b => b.status === "CONFIRMED" || b.status === "COMPLETED").length;
  const acceptanceRate = hostDecisionBookings.length > 0 ? Math.round((approvedCount / hostDecisionBookings.length) * 100) : 100;

  const statCards = [
    { label: "Active Listings", value: stats.totalProperties, icon: Home },
    { label: "Total Bookings", value: stats.totalBookings, icon: BookOpen },
    { label: "Revenue", value: `$${stats.totalRevenue?.toLocaleString() || 0}`, icon: DollarSign },
    { label: "Acceptance Rate", value: `${acceptanceRate}%`, icon: CheckCircle2, accent: acceptanceRate >= 90 ? "text-primary" : "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className={`text-2xl font-bold ${c.accent || "text-foreground"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Today section - Airbnb style */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-lg font-bold text-foreground">Today</h2>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="divide-y divide-border/50">
          {/* Pending actions */}
          {pendingBookings.length > 0 && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm font-semibold text-foreground">Pending Approval ({pendingBookings.length})</span>
              </div>
              <div className="space-y-2">
                {pendingBookings.slice(0, 3).map(b => (
                  <div key={b.id} className="flex items-center justify-between bg-amber-500/5 rounded-lg p-3 border border-amber-500/10">
                    <div>
                      <p className="text-sm font-medium text-foreground">{b.guestFirstName} {b.guestLastName}</p>
                      <p className="text-xs text-muted-foreground">{b.propertyTitle} · {b.checkInDate} → {b.checkOutDate}</p>
                    </div>
                    <Badge variant="secondary" className="text-amber-600 text-xs">Review</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Currently hosting */}
          {currentlyHosting.length > 0 && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-semibold text-foreground">Currently Hosting ({currentlyHosting.length})</span>
              </div>
              {currentlyHosting.map(b => (
                <div key={b.id} className="flex items-center gap-3 bg-primary/5 rounded-lg p-3 border border-primary/10">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                    {(b.guestFirstName || "G").charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{b.guestFirstName} {b.guestLastName}</p>
                    <p className="text-xs text-muted-foreground">{b.propertyTitle} · Check-out {b.checkOutDate}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming check-ins */}
          {upcomingCheckins.length > 0 && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Upcoming Check-ins</span>
              </div>
              <div className="space-y-2">
                {upcomingCheckins.map(b => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-sm">
                        {(b.guestFirstName || "G").charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{b.guestFirstName} {b.guestLastName}</p>
                        <p className="text-xs text-muted-foreground">{b.propertyTitle}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{b.checkInDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nothing happening */}
          {pendingBookings.length === 0 && currentlyHosting.length === 0 && upcomingCheckins.length === 0 && (
            <div className="px-5 py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">You're all caught up! No pending actions.</p>
            </div>
          )}
        </div>
      </div>

      {/* Your listings quick view */}
      {properties.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">Your Listings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {properties.slice(0, 4).map(prop => (
              <div key={prop.id} className="bg-card rounded-xl border border-border/50 overflow-hidden flex">
                <div className="w-20 h-20 shrink-0">
                  <img
                    src={prop.coverImage || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=200&fit=crop"}
                    alt={prop.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=200&fit=crop"; }}
                  />
                </div>
                <div className="p-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">{prop.title}</h3>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${prop.status === "approved" ? "bg-primary" : prop.status === "pending_approval" ? "bg-amber-500" : "bg-destructive"}`} />
                  </div>
                  <p className="text-xs text-muted-foreground">{prop.city}, {prop.state}</p>
                  <p className="text-xs text-foreground font-medium mt-1">
                    ${((prop.baseNightlyRate || 0) / 100).toFixed(0)}/night · {prop.bedrooms} bed{prop.bedrooms !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PropertiesTab() {
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadProperties(); }, []);

  const loadProperties = async () => {
    try {
      const res = await fetch("/api/host/properties", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
      }
    } catch { } finally { setIsLoading(false); }
  };

  if (isLoading) return <div className="text-center py-12">Loading properties...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Properties</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Property"}
        </Button>
      </div>

      {showForm && <NewPropertyForm onCreated={() => { loadProperties(); setShowForm(false); }} />}

      {properties.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground mb-4">No properties yet. List your first property to start receiving bookings!</p>
            <Button onClick={() => setShowForm(true)}>List Your Property</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {properties.map((prop: any) => (
            <PropertyCard key={prop.id} property={prop} onUpdate={loadProperties} />
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyCard({ property, onUpdate }: { property: any; onUpdate: () => void }) {
  const [showPhotos, setShowPhotos] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: property.title || "",
    description: property.description || "",
    propertyType: property.propertyType || "entire_place",
    category: property.category || "apartment",
    address: property.address || "",
    city: property.city || "",
    state: property.state || "",
    postcode: property.postcode || "",
    maxGuests: property.maxGuests || 2,
    bedrooms: property.bedrooms || 1,
    beds: property.beds || 1,
    bathrooms: property.bathrooms || "1",
    baseNightlyRate: ((property.baseNightlyRate || 0) / 100).toFixed(2),
    cleaningFee: ((property.cleaningFee || 0) / 100).toFixed(2),
    minNights: property.minNights || 1,
    houseRules: property.houseRules || "",
    checkInInstructions: property.checkInInstructions || "",
    nearbyHighlight: property.nearbyHighlight || "",
    selfCheckIn: property.selfCheckIn || false,
    petFriendly: property.petFriendly || false,
  });

  const loadPhotos = async () => {
    try {
      const res = await fetch(`/api/host/properties/${property.id}/photos`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (showPhotos) loadPhotos();
  }, [showPhotos]);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append("photos", f));
      const res = await fetch(`/api/host/properties/${property.id}/photos`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        toast({ title: `${data.photos.length} photo(s) uploaded!` });
        loadPhotos();
        onUpdate();
      } else {
        const data = await res.json();
        toast({ title: "Upload failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadFiles(Array.from(files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    if (files.length > 0) uploadFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleDelete = async (photoId: string) => {
    try {
      const res = await fetch(`/api/host/properties/${property.id}/photos/${photoId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Photo removed" });
        loadPhotos();
        onUpdate();
      }
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleSetCover = async (photoId: string) => {
    try {
      const res = await fetch(`/api/host/properties/${property.id}/photos/${photoId}/cover`, {
        method: "PUT",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Cover photo updated" });
        loadPhotos();
        onUpdate();
      }
    } catch {
      toast({ title: "Failed to set cover", variant: "destructive" });
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/host/properties/${property.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...editForm,
          baseNightlyRate: Math.round(parseFloat(editForm.baseNightlyRate) * 100),
          cleaningFee: editForm.cleaningFee ? Math.round(parseFloat(editForm.cleaningFee) * 100) : 0,
        }),
      });
      if (res.ok) {
        toast({ title: "Property updated!" });
        setShowEdit(false);
        onUpdate();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const amenityOptions = ["WiFi", "Kitchen", "Pool", "Parking", "Air Conditioning", "Heating",
    "Washer", "Dryer", "TV", "Beach Access", "Garden", "BBQ", "Gym", "Elevator", "Balcony"];

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      <div className="p-4">
        <div className="flex gap-4">
          <div className="w-32 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
            {property.coverImage ? (
              <img src={property.coverImage} alt={property.title} className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=200&fit=crop"; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No photo</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{property.title}</h3>
              <Badge variant={
                property.status === "approved" ? "default" :
                property.status === "pending_approval" ? "secondary" : "destructive"
              }>
                {property.status === "pending_approval" ? "Pending Review" : property.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{property.city}, {property.state} · {property.propertyType}</p>
            <p className="text-sm mt-1">
              ${((property.baseNightlyRate || 0) / 100).toFixed(0)}/night
              {" · "}{property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}
              {" · "}{property.maxGuests} guest{property.maxGuests !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="ghost" size="sm" className="text-xs px-2 h-7 text-primary"
                onClick={() => { setShowEdit(!showEdit); if (!showEdit) setShowPhotos(false); }}>
                {showEdit ? "Cancel Edit" : "Edit Property"}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs px-2 h-7 text-primary"
                onClick={() => { setShowPhotos(!showPhotos); if (!showPhotos) setShowEdit(false); }}>
                {showPhotos ? "Hide Photos" : "Photos"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {showEdit && (
        <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Base Rate ($/night)</label>
              <Input type="number" step="0.01" value={editForm.baseNightlyRate} onChange={e => setEditForm({...editForm, baseNightlyRate: e.target.value})} className="h-9 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={3} className="text-sm" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select className="w-full rounded-md border p-2 text-xs h-9 bg-background" value={editForm.propertyType} onChange={e => setEditForm({...editForm, propertyType: e.target.value})}>
                <option value="entire_place">Entire Place</option>
                <option value="private_room">Private Room</option>
                <option value="shared_room">Shared Room</option>
                <option value="unique_stay">Unique Stay</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select className="w-full rounded-md border p-2 text-xs h-9 bg-background" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="cabin">Cabin</option>
                <option value="villa">Villa</option>
                <option value="cottage">Cottage</option>
                <option value="loft">Loft</option>
                <option value="studio">Studio</option>
                <option value="townhouse">Townhouse</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cleaning Fee ($)</label>
              <Input type="number" step="0.01" value={editForm.cleaningFee} onChange={e => setEditForm({...editForm, cleaningFee: e.target.value})} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Min Nights</label>
              <Input type="number" value={editForm.minNights} onChange={e => setEditForm({...editForm, minNights: parseInt(e.target.value) || 1})} className="h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Address</label>
              <Input value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">City</label>
              <Input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">State</label>
              <Input value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Postcode</label>
              <Input value={editForm.postcode} onChange={e => setEditForm({...editForm, postcode: e.target.value})} className="h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Max Guests</label>
              <Input type="number" value={editForm.maxGuests} onChange={e => setEditForm({...editForm, maxGuests: parseInt(e.target.value) || 1})} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Bedrooms</label>
              <Input type="number" value={editForm.bedrooms} onChange={e => setEditForm({...editForm, bedrooms: parseInt(e.target.value) || 0})} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Beds</label>
              <Input type="number" value={editForm.beds} onChange={e => setEditForm({...editForm, beds: parseInt(e.target.value) || 1})} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Bathrooms</label>
              <Input value={editForm.bathrooms} onChange={e => setEditForm({...editForm, bathrooms: e.target.value})} className="h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">House Rules</label>
              <Textarea value={editForm.houseRules} onChange={e => setEditForm({...editForm, houseRules: e.target.value})} rows={2} className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Check-in Instructions</label>
              <Textarea value={editForm.checkInInstructions} onChange={e => setEditForm({...editForm, checkInInstructions: e.target.value})} rows={2} className="text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nearby Highlight</label>
            <Input value={editForm.nearbyHighlight} onChange={e => setEditForm({...editForm, nearbyHighlight: e.target.value})} className="h-9 text-sm" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={editForm.selfCheckIn} onChange={e => setEditForm({...editForm, selfCheckIn: e.target.checked})} />
              Self check-in
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={editForm.petFriendly} onChange={e => setEditForm({...editForm, petFriendly: e.target.checked})} />
              Pet friendly
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Photo Manager with Drag & Drop */}
      {showPhotos && (
        <div className="px-4 pb-4 border-t border-border/50 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground">Photos ({photos.length})</h4>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleUpload}
              />
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading..." : "+ Upload Photos"}
              </Button>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            className={`rounded-lg border-2 border-dashed p-4 mb-3 text-center transition-colors cursor-pointer ${
              dragOver ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="text-xs text-muted-foreground">
              {uploading ? "Uploading..." : dragOver ? "Drop photos here!" : "Drag & drop photos here, or click to browse"}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">JPG, PNG, WebP · Max 10MB each</p>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {photos.map((photo: any) => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square">
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  {photo.isCover && (
                    <div className="absolute top-1 left-1">
                      <Badge className="text-[10px] bg-primary/90 px-1.5 py-0.5">Cover</Badge>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {!photo.isCover && (
                      <button onClick={() => handleSetCover(photo.id)}
                        className="text-white text-[10px] bg-white/20 rounded px-1.5 py-1 hover:bg-white/30">
                        Set Cover
                      </button>
                    )}
                    <button onClick={() => handleDelete(photo.id)}
                      className="text-white text-[10px] bg-red-500/60 rounded px-1.5 py-1 hover:bg-red-500/80">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LocationStep({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAddress = async (q: string) => {
    if (q.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=au&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { "Accept-Language": "en" } }
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch {} finally { setSearching(false); }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), 400);
  };

  const selectSuggestion = (s: any) => {
    const addr = s.address || {};
    const road = [addr.house_number, addr.road].filter(Boolean).join(" ");
    const city = addr.city || addr.town || addr.suburb || addr.village || "";
    const state = addr.state || "";
    const postcode = addr.postcode || "";
    setForm({ ...form, address: road || s.display_name.split(",")[0], city, state, postcode });
    setQuery(s.display_name);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <label className="text-sm font-medium mb-1 block">Search Address</label>
        <Input placeholder="Start typing an address..." value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className="h-11" />
        {searching && <span className="absolute right-3 top-9 text-xs text-muted-foreground">Searching...</span>}
        {showSuggestions && (
          <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button key={i} type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                onClick={() => selectSuggestion(s)}>
                {s.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Street Address *</label>
        <Input placeholder="123 Main Street" value={form.address}
          onChange={e => setForm({...form, address: e.target.value})} className="h-11" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">City *</label>
          <Input placeholder="Sydney" value={form.city}
            onChange={e => setForm({...form, city: e.target.value})} className="h-11" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">State</label>
          <Input placeholder="NSW" value={form.state}
            onChange={e => setForm({...form, state: e.target.value})} className="h-11" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Postcode</label>
          <Input placeholder="2000" value={form.postcode}
            onChange={e => setForm({...form, postcode: e.target.value})} className="h-11" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Nearby Highlight</label>
          <Input placeholder="e.g. 5 min walk to beach" value={form.nearbyHighlight}
            onChange={e => setForm({...form, nearbyHighlight: e.target.value})} className="h-11" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Search above to auto-fill, or enter manually below. Address data powered by OpenStreetMap.</p>
    </div>
  );
}

function NewPropertyForm({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", propertyType: "entire_place", category: "apartment",
    address: "", city: "", state: "", postcode: "",
    maxGuests: 2, bedrooms: 1, beds: 1, bathrooms: "1",
    baseNightlyRate: "", cleaningFee: "", minNights: 1,
    houseRules: "", checkInInstructions: "", nearbyHighlight: "",
    amenities: [] as string[], selfCheckIn: false, petFriendly: false,
    coverImage: "",
  });

  const totalSteps = 5;
  const amenityOptions = ["WiFi", "Kitchen", "Pool", "Parking", "Air Conditioning", "Heating",
    "Washer", "Dryer", "TV", "Beach Access", "Garden", "BBQ", "Gym", "Elevator", "Balcony"];

  const toggleAmenity = (a: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter(x => x !== a)
        : [...prev.amenities, a],
    }));
  };

  const canProceed = () => {
    if (step === 1) return form.title && form.propertyType && form.category;
    if (step === 2) return form.address && form.city;
    if (step === 3) return true;
    if (step === 4) return form.baseNightlyRate;
    return true;
  };

  const handleSubmit = async () => {
    if (!form.title || !form.address || !form.city || !form.baseNightlyRate) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/host/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          baseNightlyRate: Math.round(parseFloat(form.baseNightlyRate) * 100),
          cleaningFee: form.cleaningFee ? Math.round(parseFloat(form.cleaningFee) * 100) : 0,
          images: form.coverImage ? [form.coverImage] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Property submitted!", description: "Your property is pending admin approval." });
      onCreated();
    } catch {
      toast({ title: "Error", description: "Failed to create property", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = ["About Your Property", "Location", "Space Details", "Pricing", "Extras & Submit"];

  return (
    <div className="mb-6">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">List Your Property</h2>
          <span className="text-xs text-muted-foreground">Step {step} of {totalSteps}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">{stepTitles[step - 1]}</p>
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-5">
        {/* Step 1: About */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">What's your property called? *</label>
              <Input placeholder="e.g. Stunning Bondi Beach Apartment" value={form.title}
                onChange={e => setForm({...form, title: e.target.value})} className="text-base h-11" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Describe your place</label>
              <Textarea placeholder="What makes your property special? Describe the space, the neighbourhood, and what guests will love..."
                value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Property Type</label>
                <select className="w-full rounded-lg border border-border bg-background p-2.5 text-sm" value={form.propertyType}
                  onChange={e => setForm({...form, propertyType: e.target.value})}>
                  <option value="entire_place">Entire Place</option>
                  <option value="private_room">Private Room</option>
                  <option value="shared_room">Shared Room</option>
                  <option value="unique_stay">Unique Stay</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select className="w-full rounded-lg border border-border bg-background p-2.5 text-sm" value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="cabin">Cabin</option>
                  <option value="villa">Villa</option>
                  <option value="cottage">Cottage</option>
                  <option value="loft">Loft</option>
                  <option value="studio">Studio</option>
                  <option value="townhouse">Townhouse</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location with address autocomplete */}
        {step === 2 && (
          <LocationStep form={form} setForm={setForm} />
        )}

        {/* Step 3: Space Details */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Max Guests</label>
                <Input type="number" min="1" value={form.maxGuests}
                  onChange={e => setForm({...form, maxGuests: parseInt(e.target.value) || 1})} className="h-11 text-center text-lg" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Bedrooms</label>
                <Input type="number" min="0" value={form.bedrooms}
                  onChange={e => setForm({...form, bedrooms: parseInt(e.target.value) || 0})} className="h-11 text-center text-lg" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Beds</label>
                <Input type="number" min="1" value={form.beds}
                  onChange={e => setForm({...form, beds: parseInt(e.target.value) || 1})} className="h-11 text-center text-lg" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Bathrooms</label>
                <Input value={form.bathrooms}
                  onChange={e => setForm({...form, bathrooms: e.target.value})} className="h-11 text-center text-lg" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">What amenities do you offer?</label>
              <div className="flex flex-wrap gap-2">
                {amenityOptions.map(a => (
                  <button key={a} type="button"
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.amenities.includes(a)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleAmenity(a)}>{a}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-6 pt-2">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" checked={form.selfCheckIn} onChange={e => setForm({...form, selfCheckIn: e.target.checked})}
                  className="w-4 h-4 rounded" />
                Self check-in available
              </label>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" checked={form.petFriendly} onChange={e => setForm({...form, petFriendly: e.target.checked})}
                  className="w-4 h-4 rounded" />
                Pet friendly
              </label>
            </div>
          </div>
        )}

        {/* Step 4: Pricing */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="max-w-sm">
              <label className="text-sm font-medium mb-1 block">Base Rate per Night (AUD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input type="number" step="0.01" placeholder="189.00" value={form.baseNightlyRate}
                  onChange={e => setForm({...form, baseNightlyRate: e.target.value})} className="h-12 pl-8 text-lg" />
              </div>
            </div>
            <div className="max-w-sm">
              <label className="text-sm font-medium mb-1 block">Cleaning Fee (optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input type="number" step="0.01" placeholder="85.00" value={form.cleaningFee}
                  onChange={e => setForm({...form, cleaningFee: e.target.value})} className="h-11 pl-8" />
              </div>
            </div>
            <div className="max-w-xs">
              <label className="text-sm font-medium mb-1 block">Minimum Nights</label>
              <Input type="number" min="1" value={form.minNights}
                onChange={e => setForm({...form, minNights: parseInt(e.target.value) || 1})} className="h-11" />
            </div>
            {form.baseNightlyRate && (
              <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground max-w-sm">
                Guests will see <span className="font-semibold text-foreground">${parseFloat(form.baseNightlyRate).toFixed(0)}/night</span>
                {form.cleaningFee && <> + <span className="font-semibold text-foreground">${parseFloat(form.cleaningFee).toFixed(0)}</span> cleaning fee</>}
                {" "}+ 8% service fee
              </div>
            )}
          </div>
        )}

        {/* Step 5: Extras & Submit */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">House Rules</label>
              <Textarea placeholder="e.g. No smoking, no parties, quiet hours after 10pm..."
                value={form.houseRules} onChange={e => setForm({...form, houseRules: e.target.value})} rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Check-in Instructions</label>
              <Textarea placeholder="e.g. Self check-in via smart lock. Code will be sent 24hrs before..."
                value={form.checkInInstructions} onChange={e => setForm({...form, checkInInstructions: e.target.value})} rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Cover Image URL (optional)</label>
              <Input placeholder="https://..." value={form.coverImage}
                onChange={e => setForm({...form, coverImage: e.target.value})} />
              <p className="text-xs text-muted-foreground mt-1">You can upload more photos after your property is created.</p>
            </div>

            {/* Summary */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-1.5">
              <h4 className="text-sm font-semibold mb-2">Review Your Listing</h4>
              <p className="text-sm"><span className="text-muted-foreground">Title:</span> {form.title || "—"}</p>
              <p className="text-sm"><span className="text-muted-foreground">Location:</span> {form.city ? `${form.address}, ${form.city}${form.state ? `, ${form.state}` : ""}` : "—"}</p>
              <p className="text-sm"><span className="text-muted-foreground">Type:</span> {form.propertyType} · {form.category}</p>
              <p className="text-sm"><span className="text-muted-foreground">Space:</span> {form.maxGuests} guests · {form.bedrooms} bed{form.bedrooms !== 1 ? "s" : ""} · {form.bathrooms} bath</p>
              <p className="text-sm"><span className="text-muted-foreground">Rate:</span> ${form.baseNightlyRate || "—"}/night</p>
              {form.amenities.length > 0 && <p className="text-sm"><span className="text-muted-foreground">Amenities:</span> {form.amenities.join(", ")}</p>}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
            Back
          </Button>
          {step < totalSteps ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit for Review"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingsTab() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadBookings(); }, [filter]);

  const loadBookings = async () => {
    try {
      const url = filter ? `/api/host/bookings?status=${filter}` : "/api/host/bookings";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch { } finally { setIsLoading(false); }
  };

  const handleAction = async (bookingId: string, action: "approve" | "decline", reason?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/host/bookings/${bookingId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: action === "approve" ? "Booking approved!" : "Booking declined", description: data.message });
        setSelectedBooking(null);
        setDeclineReason("");
        loadBookings();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Action failed", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === "CONFIRMED" || s === "COMPLETED") return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
    if (s === "PENDING_APPROVAL") return "bg-amber-500/10 text-amber-700 border-amber-200";
    if (s === "DECLINED") return "bg-red-500/10 text-red-700 border-red-200";
    if (s === "PAYMENT_FAILED") return "bg-red-500/10 text-red-700 border-red-200";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold">Bookings</h2>
        <div className="flex flex-wrap gap-2">
          {["", "PENDING_APPROVAL", "CONFIRMED", "COMPLETED", "DECLINED"].map(s => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}>
              {s === "" ? "All" : s === "PENDING_APPROVAL" ? "Pending" : s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent><p className="text-muted-foreground">No bookings found</p></CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {bookings.map((b: any) => (
            <div key={b.id}
              className="bg-card rounded-xl border border-border/50 p-4 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => setSelectedBooking(b)}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{b.id}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(b.status)}`}>
                      {b.status === "PENDING_APPROVAL" ? "PENDING" : b.status}
                    </span>
                    {b.idVerified && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">ID Verified</span>}
                  </div>
                  <p className="font-semibold text-sm">{b.propertyTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.guestFirstName} {b.guestLastName} · {b.checkInDate} → {b.checkOutDate} · {b.nights} night{b.nights !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm font-bold text-primary mt-1">${((b.totalPrice || 0) / 100).toFixed(2)} AUD</p>
                </div>
                {b.status === "PENDING_APPROVAL" && (
                  <div className="flex gap-2 shrink-0 ml-3">
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }}>
                      Review
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedBooking(null); setDeclineReason(""); }}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Booking Details</h3>
                  <p className="text-xs text-muted-foreground font-mono">{selectedBooking.id}</p>
                </div>
                <button onClick={() => { setSelectedBooking(null); setDeclineReason(""); }}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">✕</button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor(selectedBooking.status)}`}>
                  {selectedBooking.status === "PENDING_APPROVAL" ? "PENDING APPROVAL" : selectedBooking.status}
                </span>
                {selectedBooking.idVerified && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">ID Verified</span>
                )}
              </div>

              {/* Property */}
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="font-semibold text-sm">{selectedBooking.propertyTitle}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedBooking.checkInDate} → {selectedBooking.checkOutDate} · {selectedBooking.nights} night{selectedBooking.nights !== 1 ? "s" : ""} · {selectedBooking.guests} guest{selectedBooking.guests !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Guest Info */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Guest Information</h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                  <p className="text-sm"><span className="font-medium">{selectedBooking.guestFirstName} {selectedBooking.guestLastName}</span></p>
                  {selectedBooking.guestEmail && <p className="text-xs text-muted-foreground">{selectedBooking.guestEmail}</p>}
                  {selectedBooking.guestPhone && <p className="text-xs text-muted-foreground">{selectedBooking.guestPhone}</p>}
                  {selectedBooking.userCreatedAt && (
                    <p className="text-xs text-muted-foreground">Member since {new Date(selectedBooking.userCreatedAt).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}</p>
                  )}
                </div>
              </div>

              {/* Guest Message */}
              {selectedBooking.guestMessage && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Note to Host</h4>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm italic">"{selectedBooking.guestMessage}"</p>
                  </div>
                </div>
              )}

              {/* Special Requests */}
              {selectedBooking.specialRequests && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Special Requests</h4>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm">{selectedBooking.specialRequests}</p>
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment</h4>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span>Total</span>
                    <span className="font-bold text-primary">${((selectedBooking.totalPrice || 0) / 100).toFixed(2)} AUD</span>
                  </div>
                </div>
              </div>

              {/* Decline reason input */}
              {selectedBooking.status === "PENDING_APPROVAL" && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actions</h4>
                  <Textarea
                    placeholder="Reason for declining (optional)..."
                    value={declineReason}
                    onChange={e => setDeclineReason(e.target.value)}
                    rows={2}
                    className="text-sm mb-3"
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1" disabled={actionLoading}
                      onClick={() => handleAction(selectedBooking.id, "approve")}>
                      {actionLoading ? "Processing..." : "Approve Booking"}
                    </Button>
                    <Button variant="destructive" className="flex-1" disabled={actionLoading}
                      onClick={() => handleAction(selectedBooking.id, "decline", declineReason || "Host declined the booking request")}>
                      Decline
                    </Button>
                  </div>
                </div>
              )}

              {/* Decline reason display */}
              {selectedBooking.status === "DECLINED" && selectedBooking.hostDeclineReason && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Decline Reason</h4>
                  <div className="bg-red-500/5 border border-red-200 rounded-lg p-3">
                    <p className="text-sm">{selectedBooking.hostDeclineReason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AvailabilityTab() {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProp, setSelectedProp] = useState("");
  const [availability, setAvailability] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Add form
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGap, setIsGap] = useState(true);
  const [pricingMode, setPricingMode] = useState<"discount" | "rate">("discount");
  const [rate, setRate] = useState("");
  const [discount, setDiscount] = useState("25");
  const [notes, setNotes] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Calendar state
  const [calendarBase, setCalendarBase] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Tooltip
  const [tooltip, setTooltip] = useState<{ date: string; x: number; y: number } | null>(null);

  useEffect(() => {
    fetch("/api/host/properties", { credentials: "include" })
      .then(r => r.ok ? r.json() : { properties: [] })
      .then(data => {
        setProperties(data.properties || []);
        if (data.properties?.length > 0) setSelectedProp(data.properties[0].id);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedProp) loadAvailability();
  }, [selectedProp]);

  const loadAvailability = async () => {
    try {
      const res = await fetch(`/api/host/properties/${selectedProp}/availability`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAvailability(data.availability || []);
      }
    } catch { }
  };

  // Build a lookup map: date string -> availability record
  const availMap = useMemo(() => {
    const map: Record<string, any> = {};
    availability.forEach(a => { map[a.date] = a; });
    return map;
  }, [availability]);

  const handleAddAvailability = async () => {
    if (!startDate || !selectedProp) {
      toast({ title: "Error", description: "Select a property and start date", variant: "destructive" });
      return;
    }

    const dates: any[] = [];
    const start = new Date(startDate + "T00:00:00");
    const end = endDate ? new Date(endDate + "T00:00:00") : start;

    // Calculate rate and discount based on pricing mode
    let finalRate: number | undefined;
    let finalDiscount = 0;
    const baseRate = selectedProperty?.baseNightlyRate || 0;

    if (isGap) {
      if (pricingMode === "discount" && discount) {
        finalDiscount = parseInt(discount);
        // Rate is base rate (backend applies discount)
        finalRate = baseRate || undefined;
      } else if (pricingMode === "rate" && rate) {
        finalRate = Math.round(parseFloat(rate) * 100);
        // Calculate equivalent discount for display
        if (baseRate > 0) {
          finalDiscount = Math.round((1 - (finalRate / baseRate)) * 100);
          if (finalDiscount < 0) finalDiscount = 0;
        }
      }
    } else if (rate) {
      finalRate = Math.round(parseFloat(rate) * 100);
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push({
        date: d.toISOString().split("T")[0],
        isAvailable: true,
        isGapNight: isGap,
        nightlyRate: finalRate,
        gapNightDiscount: isGap ? finalDiscount : 0,
        notes: notes || undefined,
      });
    }

    try {
      const res = await fetch(`/api/host/properties/${selectedProp}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dates }),
      });

      if (res.ok) {
        toast({ title: "Dates added", description: `${dates.length} date${dates.length > 1 ? "s" : ""} marked as available` });
        loadAvailability();
        setStartDate("");
        setEndDate("");
        setNotes("");
        setShowAddForm(false);
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update availability", variant: "destructive" });
    }
  };

  // Calendar helpers
  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfWeek(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  function nextMonth(y: number, m: number): { year: number; month: number } {
    return m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 };
  }

  function prevMonth(y: number, m: number): { year: number; month: number } {
    return m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 };
  }

  function renderMonth(year: number, month: number) {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const cells: JSX.Element[] = [];
    // Empty leading cells
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="w-9 h-9" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const avail = availMap[dateStr];
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;

      let bgClass = "bg-transparent text-foreground";
      let ringClass = "";

      if (avail) {
        if (avail.isGapNight) {
          bgClass = "bg-primary text-primary-foreground font-semibold";
        } else if (avail.isAvailable) {
          bgClass = "bg-primary/15 text-foreground font-medium";
        } else {
          bgClass = "bg-muted text-muted-foreground line-through";
        }
      }

      if (isToday) {
        ringClass = "ring-2 ring-foreground ring-offset-1 ring-offset-background";
      }

      if (isPast && !avail) {
        bgClass = "text-muted-foreground/40";
      }

      cells.push(
        <div
          key={dateStr}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm cursor-default transition-colors relative ${bgClass} ${ringClass}`}
          onMouseEnter={(e) => {
            if (avail) {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({ date: dateStr, x: rect.left + rect.width / 2, y: rect.top - 8 });
            }
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          {day}
        </div>
      );
    }

    return (
      <div className="flex-1 min-w-[260px]">
        <h3 className="text-sm font-semibold text-foreground text-center mb-3">
          {MONTH_NAMES[month]} {year}
        </h3>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map(d => (
            <div key={d} className="w-9 h-7 flex items-center justify-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells}
        </div>
      </div>
    );
  }

  const month2 = nextMonth(calendarBase.year, calendarBase.month);

  // Gap night count summary
  const gapNightCount = availability.filter(a => a.isGapNight).length;
  const availableCount = availability.filter(a => a.isAvailable && !a.isGapNight).length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <GapNightLogoLoader size={40} className="mb-3" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading calendar...</p>
      </div>
    );
  }

  const selectedProperty = properties.find(p => p.id === selectedProp);

  return (
    <div>
      {properties.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/50 text-center py-16">
          <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Add a property first to manage availability.</p>
        </div>
      ) : (
        <>
          {/* Property selector + add button */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center justify-between">
            <select
              className="rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={selectedProp}
              onChange={e => setSelectedProp(e.target.value)}
            >
              {properties.map((p: any) => (
                <option key={p.id} value={p.id}>{p.title} — {p.city}</option>
              ))}
            </select>
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} variant={showAddForm ? "outline" : "default"}>
              {showAddForm ? "Cancel" : "+ Add Gap Night"}
            </Button>
          </div>

          {/* Add availability form - compact */}
          {showAddForm && (
            <div className="bg-card rounded-xl border border-border/50 p-5 mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Add Available Dates</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">End Date</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                    <input type="checkbox" checked={isGap} onChange={e => setIsGap(e.target.checked)} className="rounded" />
                    Gap Night
                  </label>
                  {isGap && (
                    <div className="flex rounded-lg border border-border overflow-hidden h-9">
                      <button
                        type="button"
                        className={`flex-1 text-xs font-medium transition-colors ${pricingMode === "discount" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                        onClick={() => { setPricingMode("discount"); setRate(""); }}
                      >Discount %</button>
                      <button
                        type="button"
                        className={`flex-1 text-xs font-medium transition-colors ${pricingMode === "rate" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                        onClick={() => { setPricingMode("rate"); setDiscount(""); }}
                      >Set Rate</button>
                    </div>
                  )}
                </div>
              </div>
              {isGap && (
                <div className="mb-3">
                  {pricingMode === "discount" ? (
                    <div className="max-w-xs">
                      <label className="text-xs font-medium text-muted-foreground">Discount off base rate ({selectedProperty ? `$${(selectedProperty.baseNightlyRate / 100).toFixed(0)}/night` : ""})</label>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="1" max="90" value={discount} onChange={e => setDiscount(e.target.value)} className="h-9 text-sm" placeholder="25" />
                        <span className="text-sm text-muted-foreground shrink-0">%</span>
                        {selectedProperty && discount && (
                          <span className="text-xs text-primary font-medium shrink-0">
                            = ${((selectedProperty.baseNightlyRate / 100) * (1 - parseInt(discount) / 100)).toFixed(0)}/night
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-xs">
                      <label className="text-xs font-medium text-muted-foreground">Custom rate per night</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <Input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} className="h-9 text-sm"
                          placeholder={selectedProperty ? `${(selectedProperty.baseNightlyRate / 100).toFixed(0)}` : ""} />
                        {selectedProperty && rate && (
                          <span className="text-xs text-primary font-medium shrink-0">
                            {Math.round((1 - parseFloat(rate) / (selectedProperty.baseNightlyRate / 100)) * 100)}% off
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="h-9 text-sm flex-1" />
                <Button size="sm" onClick={handleAddAvailability} className="shrink-0">Save Dates</Button>
              </div>
            </div>
          )}

          {/* Legend + summary */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-primary" />
              <span>Gap Night ({gapNightCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-primary/15 border border-primary/30" />
              <span>Available ({availableCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full ring-2 ring-foreground ring-offset-1 ring-offset-background" />
              <span>Today</span>
            </div>
          </div>

          {/* Calendar - 2 months side by side */}
          <div className="bg-card rounded-xl border border-border/50 p-6">
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => setCalendarBase(prevMonth(calendarBase.year, calendarBase.month))}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCalendarBase(nextMonth(calendarBase.year, calendarBase.month))}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-8 flex-col sm:flex-row">
              {renderMonth(calendarBase.year, calendarBase.month)}
              {renderMonth(month2.year, month2.month)}
            </div>
          </div>

          {/* Tooltip */}
          {tooltip && availMap[tooltip.date] && (
            <div
              className="fixed z-50 pointer-events-none"
              style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
            >
              <div className="bg-foreground text-background rounded-lg px-3 py-2 text-xs shadow-lg max-w-[200px]">
                {(() => {
                  const a = availMap[tooltip.date];
                  const rateDisplay = ((a.nightlyRate || 0) / 100).toFixed(0);
                  return (
                    <>
                      <div className="font-semibold mb-0.5">
                        {new Date(tooltip.date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      {a.isGapNight && <div className="text-primary-foreground/80">Gap Night · -{a.gapNightDiscount}% off</div>}
                      <div>${rateDisplay}/night{a.isGapNight && a.gapNightDiscount > 0 && ` → $${(Math.round(a.nightlyRate * (1 - a.gapNightDiscount / 100)) / 100).toFixed(0)}`}</div>
                      {a.notes && <div className="mt-0.5 opacity-75">{a.notes}</div>}
                      {!a.isAvailable && <div className="text-red-300 mt-0.5">Booked</div>}
                    </>
                  );
                })()}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function QATab() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // FAQ form
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [faqProperty, setFaqProperty] = useState("");
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");

  useEffect(() => {
    loadQuestions();
    fetch("/api/host/properties", { credentials: "include" })
      .then(r => r.ok ? r.json() : { properties: [] })
      .then(data => {
        setProperties(data.properties || []);
        if (data.properties?.length > 0) setFaqProperty(data.properties[0].id);
      }).catch(() => {});
  }, []);

  const loadQuestions = async () => {
    try {
      const res = await fetch("/api/host/qa", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch { } finally { setIsLoading(false); }
  };

  const handleAnswer = async (questionId: string) => {
    const answer = answerText[questionId];
    if (!answer?.trim()) return;

    try {
      const res = await fetch(`/api/host/qa/${questionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answer }),
      });
      if (res.ok) {
        toast({ title: "Answer posted!" });
        loadQuestions();
        setAnswerText(prev => ({ ...prev, [questionId]: "" }));
      }
    } catch {
      toast({ title: "Error", description: "Failed to post answer", variant: "destructive" });
    }
  };

  const handlePublishFaq = async () => {
    if (!faqQuestion.trim() || !faqAnswer.trim() || !faqProperty) return;
    try {
      const res = await fetch(`/api/host/properties/${faqProperty}/faq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: faqQuestion, answer: faqAnswer }),
      });
      if (res.ok) {
        toast({ title: "FAQ published", description: "This will now appear on your listing page." });
        loadQuestions();
        setFaqQuestion("");
        setFaqAnswer("");
        setShowFaqForm(false);
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to publish FAQ", variant: "destructive" });
    }
  };

  const handleDeleteFaq = async (questionId: string) => {
    try {
      const res = await fetch(`/api/host/qa/${questionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "FAQ removed" });
        loadQuestions();
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-center py-12">Loading questions...</div>;

  const hostFaqs = questions.filter(q => q.isHostFaq);
  const guestUnanswered = questions.filter(q => !q.isHostFaq && !q.answer);
  const guestAnswered = questions.filter(q => !q.isHostFaq && q.answer);

  return (
    <div className="space-y-8">
      {/* Publish FAQ Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Published FAQs</h2>
            <p className="text-xs text-muted-foreground">These appear on your listing page for guests to see.</p>
          </div>
          <Button size="sm" onClick={() => setShowFaqForm(!showFaqForm)} variant={showFaqForm ? "outline" : "default"}>
            {showFaqForm ? "Cancel" : "+ Add FAQ"}
          </Button>
        </div>

        {showFaqForm && (
          <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Property</label>
                <select className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm"
                  value={faqProperty} onChange={e => setFaqProperty(e.target.value)}>
                  {properties.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Question (what guests commonly ask)</label>
                <Input value={faqQuestion} onChange={e => setFaqQuestion(e.target.value)}
                  placeholder="e.g. Do you allow dogs?" className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Answer</label>
                <Textarea value={faqAnswer} onChange={e => setFaqAnswer(e.target.value)}
                  placeholder="e.g. Yes, well-behaved dogs are welcome..." rows={2} className="text-sm" />
              </div>
              <Button size="sm" onClick={handlePublishFaq}
                disabled={!faqQuestion.trim() || !faqAnswer.trim()}>
                Publish FAQ to Listing
              </Button>
            </div>
          </div>
        )}

        {hostFaqs.length > 0 ? (
          <div className="grid gap-3">
            {hostFaqs.map((q: any) => (
              <div key={q.id} className="bg-card rounded-xl border border-border/50 p-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">{q.propertyTitle}</p>
                  <p className="font-medium text-sm text-foreground">Q: {q.question}</p>
                  <p className="text-sm text-primary mt-1">A: {q.answer}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDeleteFaq(q.id)}>Remove</Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border/50 p-6 text-center">
            <HelpCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No FAQs published yet. Add common questions guests might ask about your property.</p>
          </div>
        )}
      </div>

      {/* Guest Questions */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Guest Questions</h2>

        {guestUnanswered.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3 text-amber-500 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Needs Reply ({guestUnanswered.length})
            </h3>
            <div className="grid gap-3">
              {guestUnanswered.map((q: any) => (
                <Card key={q.id}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{q.propertyTitle} · {q.userName}</p>
                    <p className="font-medium text-sm mb-3">"{q.question}"</p>
                    <div className="flex gap-2">
                      <Textarea placeholder="Type your answer..."
                        value={answerText[q.id] || ""}
                        onChange={e => setAnswerText(prev => ({ ...prev, [q.id]: e.target.value }))}
                        rows={2} className="flex-1 text-sm" />
                      <Button size="sm"
                        onClick={() => handleAnswer(q.id)} disabled={!answerText[q.id]?.trim()}>Reply</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {guestAnswered.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Answered ({guestAnswered.length})</h3>
            <div className="grid gap-3">
              {guestAnswered.map((q: any) => (
                <div key={q.id} className="bg-card rounded-xl border border-border/50 p-4">
                  <p className="text-xs text-muted-foreground mb-1">{q.propertyTitle} · {q.userName}</p>
                  <p className="font-medium text-sm">Q: "{q.question}"</p>
                  <p className="text-sm mt-1 text-primary">A: {q.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {guestUnanswered.length === 0 && guestAnswered.length === 0 && (
          <div className="bg-card rounded-xl border border-border/50 p-6 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No guest questions yet. Questions from potential guests will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ host, onUpdate }: { host: any; onUpdate: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(host.name || "");
  const [phone, setPhone] = useState(host.phone || "");
  const [bio, setBio] = useState(host.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/host/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, phone, bio }),
      });
      if (res.ok) {
        toast({ title: "Profile updated!" });
        onUpdate();
      } else {
        toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const responseTime = host.averageResponseTime || 60;
  const responseTimeLabel = responseTime < 60 ? `${responseTime} min` : `${Math.round(responseTime / 60)} hr${Math.round(responseTime / 60) !== 1 ? "s" : ""}`;

  return (
    <div className="max-w-2xl">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
          {(host.name || "H").charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{host.name}</h2>
          <p className="text-sm text-muted-foreground">{host.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Host since {host.createdAt ? new Date(host.createdAt).toLocaleDateString("en-AU", { month: "long", year: "numeric" }) : "N/A"}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
          <p className="text-2xl font-bold text-primary">{responseTimeLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg Response</p>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
          <p className="text-2xl font-bold text-primary">{host.responseRate || 100}%</p>
          <p className="text-xs text-muted-foreground mt-1">Response Rate</p>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
          <p className="text-2xl font-bold text-primary">{host.totalProperties || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Listings</p>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Edit Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-10" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+61 4XX XXX XXX" className="h-10" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
          <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
            placeholder="Tell guests about yourself, your hosting style, and what makes your properties special..." className="text-sm" />
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}
