import { useState, useEffect, useMemo } from "react";
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
  Home, CalendarDays, MessageSquare, UserCircle, ChevronLeft, ChevronRight,
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
            {host.isSuperhost && <Badge variant="secondary" className="text-xs">Superhost</Badge>}
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

  useEffect(() => {
    fetch("/api/host/stats", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setStats(data.stats))
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

  const cards = [
    { label: "Active Properties", value: stats.totalProperties, icon: Home },
    { label: "Total Bookings", value: stats.totalBookings, icon: BookOpen },
    { label: "Pending Approval", value: stats.pendingBookings, icon: Clock, accent: stats.pendingBookings > 0 ? "text-amber-500" : undefined },
    { label: "Confirmed", value: stats.confirmedBookings, icon: CheckCircle2, accent: "text-primary" },
    { label: "Total Revenue", value: `$${stats.totalRevenue?.toLocaleString() || 0}`, icon: DollarSign },
    { label: "Unanswered Q's", value: stats.unansweredQuestions, icon: HelpCircle, accent: stats.unansweredQuestions > 0 ? "text-amber-500" : undefined },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-card rounded-xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <c.icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{c.label}</span>
          </div>
          <p className={`text-2xl font-bold ${c.accent || "text-foreground"}`}>{c.value}</p>
        </div>
      ))}
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
            <Card key={prop.id}>
              <CardContent className="p-4 flex gap-4">
                {prop.coverImage && (
                  <img src={prop.coverImage} alt={prop.title} className="w-32 h-24 object-cover rounded-lg" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{prop.title}</h3>
                    <Badge variant={
                      prop.status === "approved" ? "default" :
                      prop.status === "pending_approval" ? "secondary" :
                      "destructive"
                    }>
                      {prop.status === "pending_approval" ? "Pending Review" : prop.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{prop.city}, {prop.state} - {prop.propertyType}</p>
                  <p className="text-sm mt-1">
                    ${((prop.baseNightlyRate || 0) / 100).toFixed(0)}/night
                    {" · "}{prop.bedrooms} bed{prop.bedrooms !== 1 ? "s" : ""}
                    {" · "}{prop.maxGuests} guest{prop.maxGuests !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewPropertyForm({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.address || !form.city || !form.baseNightlyRate) {
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

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add New Property</CardTitle>
        <CardDescription>Your property will be reviewed by our team before going live.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input placeholder="Stunning Bondi Beach Apartment" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm font-medium">Cover Image URL</label>
              <Input placeholder="https://..." value={form.coverImage} onChange={e => setForm({...form, coverImage: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description *</label>
            <Textarea placeholder="Describe your property..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} required />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <select className="w-full rounded-md border p-2 text-sm" value={form.propertyType} onChange={e => setForm({...form, propertyType: e.target.value})}>
                <option value="entire_place">Entire Place</option>
                <option value="private_room">Private Room</option>
                <option value="shared_room">Shared Room</option>
                <option value="unique_stay">Unique Stay</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select className="w-full rounded-md border p-2 text-sm" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
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
              <label className="text-sm font-medium">Base Rate ($/night) *</label>
              <Input type="number" step="0.01" placeholder="189.00" value={form.baseNightlyRate} onChange={e => setForm({...form, baseNightlyRate: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm font-medium">Cleaning Fee ($)</label>
              <Input type="number" step="0.01" placeholder="85.00" value={form.cleaningFee} onChange={e => setForm({...form, cleaningFee: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Address *</label>
              <Input placeholder="123 Main St" value={form.address} onChange={e => setForm({...form, address: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm font-medium">City *</label>
              <Input placeholder="Sydney" value={form.city} onChange={e => setForm({...form, city: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm font-medium">State</label>
              <Input placeholder="NSW" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium">Postcode</label>
              <Input placeholder="2000" value={form.postcode} onChange={e => setForm({...form, postcode: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Max Guests</label>
              <Input type="number" value={form.maxGuests} onChange={e => setForm({...form, maxGuests: parseInt(e.target.value) || 1})} />
            </div>
            <div>
              <label className="text-sm font-medium">Bedrooms</label>
              <Input type="number" value={form.bedrooms} onChange={e => setForm({...form, bedrooms: parseInt(e.target.value) || 0})} />
            </div>
            <div>
              <label className="text-sm font-medium">Beds</label>
              <Input type="number" value={form.beds} onChange={e => setForm({...form, beds: parseInt(e.target.value) || 1})} />
            </div>
            <div>
              <label className="text-sm font-medium">Min Nights</label>
              <Input type="number" value={form.minNights} onChange={e => setForm({...form, minNights: parseInt(e.target.value) || 1})} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {amenityOptions.map(a => (
                <Badge key={a} variant={form.amenities.includes(a) ? "default" : "outline"}
                  className="cursor-pointer" onClick={() => toggleAmenity(a)}>{a}</Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">House Rules</label>
              <Textarea placeholder="No smoking, no parties..." value={form.houseRules} onChange={e => setForm({...form, houseRules: e.target.value})} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Check-in Instructions</label>
              <Textarea placeholder="Self check-in via smart lock..." value={form.checkInInstructions} onChange={e => setForm({...form, checkInInstructions: e.target.value})} rows={2} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Nearby Highlight</label>
            <Input placeholder="5 min walk to beach" value={form.nearbyHighlight} onChange={e => setForm({...form, nearbyHighlight: e.target.value})} />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.selfCheckIn} onChange={e => setForm({...form, selfCheckIn: e.target.checked})} />
              Self check-in
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.petFriendly} onChange={e => setForm({...form, petFriendly: e.target.checked})} />
              Pet friendly
            </label>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Property for Review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function BookingsTab() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
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
        loadBookings();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Action failed", variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Bookings</h2>
        <div className="flex gap-2">
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
        <div className="grid gap-4">
          {bookings.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm">{b.id}</span>
                      <Badge variant={
                        b.status === "CONFIRMED" ? "default" :
                        b.status === "PENDING_APPROVAL" ? "secondary" :
                        b.status === "DECLINED" ? "destructive" : "outline"
                      }>{b.status}</Badge>
                      {b.idVerified && <Badge variant="outline" className="text-primary">ID Verified</Badge>}
                    </div>
                    <p className="font-semibold">{b.propertyTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      Guest: {b.guestName || `${b.guestFirstName} ${b.guestLastName}`}
                      {b.guestEmail && ` (${b.guestEmail})`}
                    </p>
                    <p className="text-sm mt-1">
                      {b.checkInDate} → {b.checkOutDate} ({b.nights} night{b.nights !== 1 ? "s" : ""})
                      {" · "}{b.guests} guest{b.guests !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm font-medium mt-1">${((b.totalPrice || 0) / 100).toFixed(2)} AUD</p>
                    {b.guestMessage && (
                      <p className="text-sm mt-2 p-2 bg-muted rounded italic">"{b.guestMessage}"</p>
                    )}
                  </div>

                  {b.status === "PENDING_APPROVAL" && (
                    <div className="flex gap-2">
                      <Button size="sm"
                        onClick={() => handleAction(b.id, "approve")}>Approve</Button>
                      <Button size="sm" variant="destructive"
                        onClick={() => handleAction(b.id, "decline", "Not available for these dates")}>Decline</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
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

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push({
        date: d.toISOString().split("T")[0],
        isAvailable: true,
        isGapNight: isGap,
        nightlyRate: rate ? Math.round(parseFloat(rate) * 100) : undefined,
        gapNightDiscount: isGap ? parseInt(discount) : 0,
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">End Date</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Rate ($/night)</label>
                  <Input type="number" step="0.01" placeholder={selectedProperty ? `${(selectedProperty.baseNightlyRate / 100).toFixed(0)}` : ""}
                    value={rate} onChange={e => setRate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Discount %</label>
                  <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} disabled={!isGap} className="h-9 text-sm" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <label className="flex items-center gap-2 text-sm shrink-0">
                  <input type="checkbox" checked={isGap} onChange={e => setIsGap(e.target.checked)} className="rounded" />
                  Gap Night
                </label>
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
  const [isLoading, setIsLoading] = useState(true);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => { loadQuestions(); }, []);

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

  if (isLoading) return <div className="text-center py-12">Loading questions...</div>;

  const unanswered = questions.filter(q => !q.answer);
  const answered = questions.filter(q => q.answer);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Questions & Answers</h2>

      {unanswered.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-amber-500">Unanswered ({unanswered.length})</h3>
          <div className="grid gap-4">
            {unanswered.map((q: any) => (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">{q.propertyTitle} · {q.userName}</p>
                  <p className="font-medium mb-3">"{q.question}"</p>
                  <div className="flex gap-2">
                    <Textarea placeholder="Type your answer..."
                      value={answerText[q.id] || ""}
                      onChange={e => setAnswerText(prev => ({ ...prev, [q.id]: e.target.value }))}
                      rows={2} className="flex-1" />
                    <Button
                      onClick={() => handleAnswer(q.id)} disabled={!answerText[q.id]?.trim()}>Reply</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {answered.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Answered ({answered.length})</h3>
          <div className="grid gap-4">
            {answered.map((q: any) => (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">{q.propertyTitle} · {q.userName}</p>
                  <p className="font-medium">Q: "{q.question}"</p>
                  <p className="text-sm mt-1 text-primary">A: {q.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {questions.length === 0 && (
        <Card className="text-center py-12">
          <CardContent><p className="text-muted-foreground">No questions yet. Questions from potential guests will appear here.</p></CardContent>
        </Card>
      )}
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

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold mb-6">Your Profile</h2>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input value={host.email} disabled className="opacity-60" />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+61 4XX XXX XXX" />
          </div>
          <div>
            <label className="text-sm font-medium">Bio</label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
              placeholder="Tell guests about yourself..." />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Response Time: ~{host.averageResponseTime || 60} minutes</p>
            <p>Response Rate: {host.responseRate || 100}%</p>
            <p>Member since: {host.createdAt ? new Date(host.createdAt).toLocaleDateString() : "N/A"}</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
